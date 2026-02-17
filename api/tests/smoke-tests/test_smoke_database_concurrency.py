"""
Concurrency Tests.
Verifies locking mechanisms (Redis) and Transaction Isolation.
"""

import pytest
import uuid
import concurrent.futures
from app.db.models import Machines, Inventory, Rentals

pytestmark = [
    pytest.mark.smoke,
    pytest.mark.database,
    pytest.mark.api,
]


def unique_str(prefix: str):
    return f"{prefix}_{uuid.uuid4().hex[:6]}"


@pytest.mark.database
def test_rental_race_condition_threaded(test_client, db_session, service_header_sync):
    """
    Test Race Condition:
    Two users try to rent the SAME item at the EXACT SAME time.

    Expected behavior with Redis Lock:
    - User A gets 201 Created (Success)
    - User B gets 409 Conflict (Item already rented)

    If Lock fails:
    - Both get 201 (Double Booking - CRITICAL BUG)
    """
    ac = test_client
    headers = service_header_sync

    team_id = ac.post(
        "/db/teams/",
        json={"name": unique_str("Race"), "team_admin_id": 1},
        headers=headers,
    ).json()["id"]
    cat_id = ac.post(
        "/db/categories/", json={"name": unique_str("Cat")}, headers=headers
    ).json()["id"]
    room_id = ac.post(
        "/db/rooms/",
        json={"name": unique_str("Room"), "room_type": "srv"},
        headers=headers,
    ).json()["id"]

    tokens = []
    for i in range(2):
        login = unique_str(f"r{i}")
        u = ac.post(
            "/db/users/",
            json={
                "name": f"Racer{i}",
                "surname": "Test",
                "login": login,
                "email": f"{login}@lab.pl",
                "user_type": "user",
                "team_id": team_id,
            },
            headers=headers,
        ).json()
        token = ac.post(
            "/auth/login", data={"username": login, "password": u["generated_password"]}
        ).json()["access_token"]
        tokens.append(token)

    item = ac.post(
        "/db/inventory/",
        json={
            "name": unique_str("Gold"),
            "quantity": 1,
            "category_id": cat_id,
            "localization_id": room_id,
            "team_id": team_id,
        },
        headers=headers,
    ).json()
    item_id = item["id"]

    def rent_item(token):
        return ac.post(
            "/db/rentals/",
            json={
                "item_id": item_id,
                "quantity": 1,
                "start_date": "2024-01-01",
                "end_date": "2024-01-07",
            },
            headers={"Authorization": f"Bearer {token}"},
        )

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(rent_item, t) for t in tokens]
        results = [f.result() for f in futures]

    status_codes = [r.status_code for r in results]

    assert 201 in status_codes, "First rental should succeed!"
    assert 409 in status_codes, "Second rental should fail with 409 Conflict!"

    db_session.expire_all()
    count = db_session.query(Rentals).filter(Rentals.item_id == item_id).count()
    assert count == 1, f"Should exists only 1, got: {count} (DOUBLE BOOKING!)"

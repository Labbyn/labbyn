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

    team_res = ac.post(
        "/db/teams/",
        json={"name": unique_str("RaceTeam"), "team_admin_id": 1},
        headers=headers,
    )
    team_id = team_res.json()["id"]

    cat_res = ac.post(
        "/db/categories/", json={"name": unique_str("RaceCat")}, headers=headers
    )
    cat_id = cat_res.json()["id"]

    room_res = ac.post(
        "/db/rooms/",
        json={"name": unique_str("RaceRoom"), "room_type": "srv"},
        headers=headers,
    )
    room_id = room_res.json()["id"]

    users = []
    tokens = []
    for i in range(1, 3):
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
        users.append(u)

        auth = ac.post(
            "/auth/login", data={"username": login, "password": u["generated_password"]}
        )
        tokens.append(auth.json()["access_token"])

    item = ac.post(
        "/db/inventory/",
        json={
            "name": unique_str("GoldBar"),
            "quantity": 1,
            "category_id": cat_id,
            "localization_id": room_id,
            "team_id": team_id,
        },
        headers=headers,
    ).json()
    item_id = item["id"]

    def rent_item(token, user_id):
        return ac.post(
            "/db/rentals/",
            json={
                "item_id": item_id,
                "user_id": user_id,
                "start_date": "2024-01-01",
                "end_date": "2024-01-07",
            },
            headers={"Authorization": f"Bearer {token}"},
        )

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        future1 = executor.submit(rent_item, tokens[0], users[0]["id"])
        future2 = executor.submit(rent_item, tokens[1], users[1]["id"])

        res1 = future1.result()
        res2 = future2.result()

    status_codes = [res1.status_code, res2.status_code]

    assert 201 in status_codes, "At least one rental should succeed"
    assert (
        409 in status_codes
    ), "One rental should fail with Conflict (Double Booking prevented!)"

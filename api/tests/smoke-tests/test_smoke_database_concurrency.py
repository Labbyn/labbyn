"""
Concurrency Tests.
Verifies locking mechanisms (Redis) and Transaction Isolation.
"""

import pytest
import uuid
import asyncio
from sqlalchemy import select, func
from app.db.models import Machines, Inventory, Rentals

pytestmark = [
    pytest.mark.smoke,
    pytest.mark.database,
    pytest.mark.api,
    pytest.mark.asyncio,
]


def unique_str(prefix: str):
    """
    Generate unique string for testing purposes.
    """
    return f"{prefix}_{uuid.uuid4().hex[:6]}"


@pytest.mark.database
async def test_rental_race_condition_async(test_client, db_session, service_header):
    """
    Test Race Condition:
    Two users try to rent the SAME item at the EXACT SAME time.

    Expected behavior with Redis Lock:
    - User A gets 201 Created (Success)
    - User B gets 409 Conflict (Item already rented)
    """
    ac = test_client
    headers = service_header

    team_resp = await ac.post(
        "/db/teams/",
        json={"name": unique_str("Race")},
        headers=headers,
    )
    team_id = team_resp.json()["id"]

    cat_resp = await ac.post(
        "/db/categories/", json={"name": unique_str("Cat")}, headers=headers
    )
    cat_id = cat_resp.json()["id"]

    room_resp = await ac.post(
        "/db/rooms/",
        json={"name": unique_str("Room"), "room_type": "srv", "team_id": team_id},
        headers=headers,
    )
    room_id = room_resp.json()["id"]

    tokens = []
    for i in range(2):
        login = unique_str(f"r{i}")
        u_resp = await ac.post(
            "/db/users/",
            json={
                "name": f"Racer{i}",
                "surname": "Test",
                "login": login,
                "email": f"{login}@lab.pl",
                "user_type": "user",
                "team_ids": [team_id],
            },
            headers=headers,
        )
        u = u_resp.json()

        auth_resp = await ac.post(
            "/auth/login", data={"username": login, "password": u["generated_password"]}
        )
        tokens.append(auth_resp.json()["access_token"])

    item_resp = await ac.post(
        "/db/inventory/",
        json={
            "name": unique_str("Gold"),
            "quantity": 1,
            "category_id": cat_id,
            "localization_id": room_id,
            "team_id": team_id,
        },
        headers=headers,
    )
    item = item_resp.json()
    item_id = item["id"]

    async def rent_item(token):
        """Helper to send rental request."""
        return await ac.post(
            "/db/rentals/",
            json={
                "item_id": item_id,
                "quantity": 1,
                "start_date": "2026-01-01",
                "end_date": "2026-01-07",
            },
            headers={"Authorization": f"Bearer {token}"},
        )

    results = await asyncio.gather(*[rent_item(t) for t in tokens])

    status_codes = [r.status_code for r in results]

    assert 201 in status_codes, "First rental should succeed!"
    assert 409 in status_codes, "Second rental should fail with 409 Conflict!"

"""
Concurrency Tests.
Verifies locking mechanisms (Redis) and Transaction Isolation.
"""

import asyncio
import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app


def unique_str(prefix: str):
    return f"{prefix}_{uuid.uuid4().hex[:6]}"


pytestmark = [
    pytest.mark.smoke,
    pytest.mark.database,
    pytest.mark.api,
    pytest.mark.asyncio,
]


async def test_rental_race_condition():
    """
    Test Race Condition:
    Two users try to rent the SAME item at the EXACT SAME time.

    Expected behavior with Redis Lock:
    - User A gets 201 Created (Success)
    - User B gets 409 Conflict (Item already rented)

    If Lock fails:
    - Both get 201 (Double Booking - CRITICAL BUG)
    """

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:

        cat = await ac.post("/db/categories/", json={"name": unique_str("RaceCat")})
        cat_id = cat.json()["id"]

        room = await ac.post(
            "/db/rooms/", json={"name": unique_str("RaceRoom"), "room_type": "srv"}
        )
        room_id = room.json()["id"]

        u1 = await ac.post(
            "/db/users/",
            json={
                "name": "Racer",
                "surname": "One",
                "login": unique_str("r1"),
                "email": f"{unique_str('r1')}@labbyn.service",
                "user_type": "user",
            },
        )
        user1_id = u1.json()["id"]

        u2 = await ac.post(
            "/db/users/",
            json={
                "name": "Racer",
                "surname": "Two",
                "login": unique_str("r2"),
                "email": f"{unique_str('r2')}@labbyn.service",
                "user_type": "user",
            },
        )
        user2_id = u2.json()["id"]

        item = await ac.post(
            "/db/inventory/",
            json={
                "name": unique_str("GoldBar"),
                "quantity": 1,
                "category_id": cat_id,
                "localization_id": room_id,
                "team_id": None,
            },
        )
        item_id = item.json()["id"]

        payload_user_1 = {
            "item_id": item_id,
            "user_id": user1_id,
            "start_date": "2024-01-01",
            "end_date": "2024-01-07",
        }

        payload_user_2 = {
            "item_id": item_id,
            "user_id": user2_id,
            "start_date": "2024-01-01",
            "end_date": "2024-01-07",
        }

        response1, response2 = await asyncio.gather(
            ac.post("/db/rentals/", json=payload_user_1),
            ac.post("/db/rentals/", json=payload_user_2),
        )

        status_codes = [response1.status_code, response2.status_code]

        assert 201 in status_codes, "At least one rental should succeed"
        assert (
            409 in status_codes
        ), "One rental should fail with Conflict (Double Booking prevented!)"

        item_check = await ac.get(f"/db/inventory/{item_id}")
        assert item_check.json()["rental_status"] is True

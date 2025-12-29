"""
API Smoke Tests.
Verifies that HTTP endpoints are reachable, accept valid JSON,
handle errors correctly (4xx), and persist data via the router layer.
"""

import uuid
import pytest
from app.main import app

pytestmark = [pytest.mark.smoke, pytest.mark.api, pytest.mark.database]


def unique_str(prefix: str):
    """
    Generate random name to avoid unique fields.
    :param prefix: Starting prefix
    :return: Prefix along with random name
    """
    return f"{prefix}_{uuid.uuid4().hex[:6]}"


def test_health_check(test_client):
    """Basic check to ensure the app is handling requests."""
    response = test_client.get("/")
    assert response.status_code in [200, 404]


def test_create_user_flow(test_client):
    """
    Test 1: Create User via API (201 Created)
    Test 2: Try to Create Duplicate (409 Conflict)
    """
    login = unique_str("api_user")
    payload = {
        "name": "API",
        "surname": "Tester",
        "login": login,
        "email": f"{login}@example.com",
        "user_type": "user",
    }

    response = test_client.post("/db/users/", json=payload)
    assert response.status_code == 201, f"Failed to create user: {response.text}"
    data = response.json()
    assert data["login"] == login
    assert "id" in data
    user_id = data["id"]

    response_dup = test_client.post("/db/users/", json=payload)
    assert response_dup.status_code == 409

    get_res = test_client.get(f"/db/users/{user_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "API"


def test_validation_error_handler(test_client):
    """
    Ensure Pydantic validation is working.
    """
    bad_payload = {"name": "Incomplete", "surname": "User"}
    response = test_client.post("/db/users/", json=bad_payload)
    assert response.status_code == 422
    assert "detail" in response.json()


def test_resource_chain_creation(test_client):
    """
    Tests dependencies: Room -> Metadata -> Team -> User -> Machine
    """
    room_res = test_client.post(
        "/db/rooms/", json={"name": unique_str("API_Room"), "room_type": "Server Room"}
    )
    assert room_res.status_code == 201
    room_id = room_res.json()["id"]

    meta_res = test_client.post(
        "/db/metadata/", json={"agent_prometheus": True, "ansible_access": False}
    )
    assert meta_res.status_code == 201
    meta_id = meta_res.json()["id"]

    user_res = test_client.post(
        "/db/users/",
        json={
            "name": "Admin",
            "surname": "Team",
            "login": unique_str("adm"),
            "email": f"{unique_str('adm')}@example.com",
            "user_type": "admin",
        },
    )
    assert user_res.status_code == 201, f"User creation failed: {user_res.text}"
    admin_id = user_res.json()["id"]

    team_res = test_client.post(
        "/db/teams/", json={"name": unique_str("API_Team"), "team_admin_id": admin_id}
    )
    assert team_res.status_code == 201
    team_id = team_res.json()["id"]

    machine_payload = {
        "name": unique_str("srv-api"),
        "localization_id": room_id,
        "metadata_id": meta_id,
        "team_id": team_id,
        "os": "Debian",
        "cpu": "vCPU",
        "ram": "4GB",
        "disk": "50GB",
    }
    machine_res = test_client.post("/db/machines/", json=machine_payload)
    assert machine_res.status_code == 201
    assert machine_res.json()["localization_id"] == room_id

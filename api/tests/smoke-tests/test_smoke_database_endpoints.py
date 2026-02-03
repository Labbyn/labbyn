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

@pytest.mark.asyncio
@pytest.mark.rbac
async def test_create_user_flow(test_client, service_header):
    """
    Test 1: Create Team via API (201 Created)
    Test 2: Create User via API (201 Created)
    Test 3: Try to Create Duplicate (409 Conflict)
    """

    team_name = unique_str("TestTeam")
    team_res = await test_client.post(
        "/db/teams/", json={"name": team_name, "team_admin_id": 1}, headers=service_header)

    assert team_res.status_code == 201, f"Failed to create team: {team_res.text}"
    team_id = team_res.json()["id"]

    login = unique_str("api_user")
    payload = {
        "name": "API",
        "surname": "Tester",
        "login": login,
        "email": f"{login}@labbyn.service",
        "user_type": "user",
        "team_id": team_id,
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

@pytest.mark.asyncio
@pytest.mark.rbac
async def test_validation_error_handler(test_client, service_header):
    """
    Ensure Pydantic validation is working.
    """
    bad_payload = {"name": "Incomplete", "surname": "User"}
    response = test_client.post("/db/users/", json=bad_payload, headers=service_header)
    assert response.status_code == 422
    assert "detail" in response.json()

@pytest.mark.asyncio
@pytest.mark.rbac
async def test_resource_chain_creation(test_client, service_header):
    """
    Tests dependencies: Room -> Metadata -> Team -> User -> Machine
    """

    room_res = test_client.post(
        "/db/rooms/", json={"name": unique_str("API_Room"), "room_type": "Server Room"}, headers=service_header
    )

    assert room_res.status_code == 201
    room_id = room_res.json()["id"]

    meta_res = test_client.post(
        "/db/metadata/", json={"agent_prometheus": True, "ansible_access": False}, headers=service_header
    )
    assert meta_res.status_code == 201
    meta_id = meta_res.json()["id"]

    user_res = test_client.post(
        "/db/users/",
        json={
            "name": "Admin",
            "surname": "Team",
            "login": unique_str("adm"),
            "email": f"{unique_str('adm')}@labbyn.service",
            "user_type": "group_admin",
        }, headers=service_header
    )
    assert user_res.status_code == 201, f"User creation failed: {user_res.text}"
    user_data = user_res.json()
    admin_id = user_res.json()["id"]

    team_res = test_client.post(
        "/db/teams/", json={"name": unique_str("API_Team"), "team_admin_id": admin_id}, headers=service_header
    )
    assert team_res.status_code == 201
    team_id = team_res.json()["id"]

    login_res = await test_client.post("/auth/login", data={"username": user_data["username"], "password": user_data["generated_password"]})
    new_admin_token = login_res.json()["access_token"]
    new_admin_header = {"Authorization": f"Bearer {new_admin_token}"}

    machine_payload = {
        "name": unique_str("srv-api"),
        "localization_id": room_id,
        "metadata_id": meta_id,
        "team_id": team_id,
        "os": "Debian",
        "cpu": "CPU",
        "ram": "4GB",
        "disk": "50GB",
    }
    machine_res = test_client.post("/db/machines/", json=machine_payload, headers=new_admin_header)
    assert machine_res.status_code == 201
    assert machine_res.json()["localization_id"] == room_id

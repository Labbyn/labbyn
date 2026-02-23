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


@pytest.mark.rbac
def test_create_user_flow(test_client, service_header_sync):
    """
    Test 1: Create Team via API (201 Created)
    Test 2: Create User via API (201 Created)
    Test 3: Try to Create Duplicate (409 Conflict)
    """

    ac = test_client
    headers = service_header_sync

    team_name = unique_str("TestTeam")
    team_res = ac.post("/db/teams/", json={"name": team_name}, headers=headers)

    assert team_res.status_code == 201
    team_id = team_res.json()["id"]

    login = unique_str("api_user")
    payload = {
        "name": "API",
        "surname": "Tester",
        "login": login,
        "email": f"{login}@labbyn.service",
        "user_type": "user",
        "team_id": [team_id],
    }

    response = ac.post("/db/users/", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    user_id = data["id"]

    response_dup = ac.post("/db/users/", json=payload, headers=headers)
    assert response_dup.status_code == 409

    get_res = ac.get(f"/db/users/{user_id}", headers=headers)
    assert get_res.status_code == 200


@pytest.mark.rbac
def test_validation_error_handler(test_client, service_header_sync):
    """
    Ensure Pydantic validation is working.
    """
    bad_payload = {"name": "Incomplete", "surname": "User"}
    response = test_client.post(
        "/db/users/", json=bad_payload, headers=service_header_sync
    )
    assert response.status_code == 422


@pytest.mark.rbac
def test_resource_chain_creation(test_client, service_header_sync, db_session):
    """
    Tests dependencies: Room -> Metadata -> Team -> Tag -> Rack -> Shelf -> Machine
    """

    ac = test_client
    headers = service_header_sync

    team_res = ac.post(
        "/db/teams/",
        json={"name": unique_str("API_Team")},
        headers=headers,
    )
    assert team_res.status_code == 201
    team_id = team_res.json()["id"]

    room_res = ac.post(
        "/db/rooms/",
        json={
            "name": unique_str("API_Room"),
            "room_type": "Server Room",
            "team_id": team_id,
        },
        headers=headers,
    )
    assert room_res.status_code == 201
    room_id = room_res.json()["id"]

    meta_res = ac.post(
        "/db/metadata/",
        json={"agent_prometheus": True, "ansible_access": False},
        headers=headers,
    )
    assert meta_res.status_code == 201
    meta_id = meta_res.json()["id"]

    user_login = unique_str("adm")
    user_res = ac.post(
        "/db/users/",
        json={
            "name": "Admin",
            "surname": "Team",
            "login": user_login,
            "email": f"{user_login}@labbyn.service",
            "user_type": "group_admin",
            "team_ids": [team_id],
        },
        headers=headers,
    )
    assert user_res.status_code == 201
    user_data = user_res.json()

    db_session.commit()
    db_session.expire_all()

    login_res = ac.post(
        "/auth/login",
        data={
            "username": user_data["login"],
            "password": user_data["generated_password"],
        },
    )
    new_admin_token = login_res.json()["access_token"]
    new_admin_header = {"Authorization": f"Bearer {new_admin_token}"}

    tag_res = ac.post(
        "/db/tags/", json={"name": unique_str("PROD"), "color": "red"}, headers=headers
    )
    tag_id = tag_res.json()["id"]

    rack_payload = {
        "name": unique_str("RACK-API"),
        "room_id": room_id,
        "team_id": team_id,
        "tag_ids": [tag_id],
    }

    rack_res = ac.post("/db/racks", json=rack_payload, headers=new_admin_header)
    assert rack_res.status_code == 201
    rack_id = rack_res.json()["id"]

    shelf_res = ac.post(
        f"/db/shelf/{rack_id}",
        json={"name": "Półka 1", "order": 1},
        headers=new_admin_header,
    )
    assert shelf_res.status_code == 201
    shelf_id = shelf_res.json()["id"]

    machine_payload = {
        "name": unique_str("srv-api"),
        "localization_id": room_id,
        "metadata_id": meta_id,
        "team_id": team_id,
        "shelf_id": shelf_id,
        "os": "Debian",
        "cpu": "CPU",
        "ram": "4GB",
        "disk": "50GB",
    }
    machine_res = ac.post(
        "/db/machines/", json=machine_payload, headers=new_admin_header
    )
    assert machine_res.status_code == 201

"""
API Smoke Tests.
Verifies that HTTP endpoints are reachable, accept valid JSON,
handle errors correctly (4xx), and persist data via the router layer.
"""

import uuid
import pytest
from app.db import models
from app.main import app
from sqlalchemy import select

pytestmark = [
    pytest.mark.smoke,
    pytest.mark.api,
    pytest.mark.database,
    pytest.mark.asyncio,
]


def unique_str(prefix: str):
    """
    Generate random name to avoid unique fields.
    :param prefix: Starting prefix
    :return: Prefix along with random name
    """
    return f"{prefix}_{uuid.uuid4().hex[:6]}"


async def test_health_check(test_client):
    """Basic check to ensure the app is handling requests."""
    response = await test_client.get("/")
    assert response.status_code in [200, 404]


@pytest.mark.rbac
async def test_create_user_flow(test_client, service_header):
    """
    Test 1: Create Team via API (201 Created)
    Test 2: Create User via API (201 Created)
    Test 3: Try to Create Duplicate (409 Conflict)
    """

    ac = test_client
    headers = service_header

    team_name = unique_str("TestTeam")
    team_res = await ac.post("/db/teams/", json={"name": team_name}, headers=headers)

    assert team_res.status_code == 201
    team_id = team_res.json()["id"]

    login = unique_str("api_user")
    payload = {
        "name": "API",
        "surname": "Tester",
        "login": login,
        "email": f"{login}@labbyn.service",
        "user_type": "user",
        "team_ids": [team_id],
    }

    response = await ac.post("/db/users/", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    user_id = data["id"]

    response_dup = await ac.post("/db/users/", json=payload, headers=headers)
    assert response_dup.status_code == 409

    get_res = await ac.get(f"/db/users/{user_id}", headers=headers)
    assert get_res.status_code == 200


@pytest.mark.rbac
async def test_validation_error_handler(test_client, service_header):
    """
    Ensure Pydantic validation is working.
    """
    bad_payload = {"name": "Incomplete", "surname": "User"}
    response = await test_client.post(
        "/db/users/", json=bad_payload, headers=service_header
    )
    assert response.status_code == 422


@pytest.mark.rbac
async def test_resource_chain_creation(test_client, service_header, db_session):
    """
    Tests dependencies: Room -> Metadata -> Team -> Tag -> Rack -> Shelf -> Machine
    """

    ac = test_client
    headers = service_header

    team_res = await ac.post(
        "/db/teams/",
        json={"name": unique_str("API_Team")},
        headers=headers,
    )
    assert team_res.status_code == 201
    team_id = team_res.json()["id"]

    room_res = await ac.post(
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

    meta_res = await ac.post(
        "/db/metadata/",
        json={"agent_prometheus": True, "ansible_access": False},
        headers=headers,
    )
    assert meta_res.status_code == 201
    meta_id = meta_res.json()["id"]

    user_login = unique_str("adm")
    user_res = await ac.post(
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

    login_res = await ac.post(
        "/auth/login",
        data={
            "username": user_data["login"],
            "password": user_data["generated_password"],
        },
    )
    new_admin_token = login_res.json()["access_token"]
    new_admin_header = {"Authorization": f"Bearer {new_admin_token}"}

    tag_res = await ac.post(
        "/db/tags/", json={"name": unique_str("PROD"), "color": "red"}, headers=headers
    )
    tag_id = tag_res.json()["id"]

    rack_payload = {
        "name": unique_str("RACK-API"),
        "room_id": room_id,
        "team_id": team_id,
        "tag_ids": [tag_id],
    }

    rack_res = await ac.post("/db/racks", json=rack_payload, headers=new_admin_header)
    assert rack_res.status_code == 201
    rack_id = rack_res.json()["id"]

    shelf_res = await ac.post(
        f"/db/shelf/{rack_id}",
        json={"name": unique_str("Shelf"), "order": 1},
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
    machine_res = await ac.post(
        "/db/machines/", json=machine_payload, headers=new_admin_header
    )
    assert machine_res.status_code == 201


async def test_machine_full_lifecycle(db_session):
    """
    Create advanced model object (new Machine).
    Checks relations: Machine -> Room, Machine -> Metadata, Machine -> Shelf.
    Check is listener is registring operations properly
    """

    test_team = models.Teams(name=unique_str("TestTeam"))
    db_session.add(test_team)
    await db_session.commit()
    await db_session.refresh(test_team)

    room = models.Rooms(
        name=unique_str("Room"), room_type="Server", team_id=test_team.id
    )
    db_session.add(room)

    meta = models.Metadata(agent_prometheus=True)
    db_session.add(meta)

    author = models.User(
        name="Test",
        surname="User",
        login=unique_str("User"),
        hashed_password="SecretPassword123!",
        email=f"{unique_str('user')}@labbyn.service",
        user_type=models.UserType.USER,
    )
    db_session.add(author)
    await db_session.flush()
    author_id = author.id

    rack = models.Rack(
        name=unique_str("Rack"),
        room_id=room.id,
        team_id=test_team.id,
    )
    db_session.add(rack)
    await db_session.flush()

    shelf = models.Shelf(name="Shelf-01", rack_id=rack.id, order=1)
    db_session.add(shelf)
    await db_session.flush()

    machine = models.Machines(
        name=unique_str("SmokeMachine"),
        localization_id=room.id,
        metadata_id=meta.id,
        team_id=test_team.id,
        shelf_id=shelf.id,
        ram="128GB",
    )
    db_session.add(machine)
    await db_session.flush()

    new_cpu = models.CPUs(name="Intel Xeon", machine_id=machine.id)
    new_disk = models.Disks(name="SATA SSD", capacity="1TB", machine_id=machine.id)
    db_session.add_all([new_cpu, new_disk])

    await db_session.commit()
    await db_session.refresh(machine, ["shelf", "cpus"])

    assert machine.id is not None
    assert machine.shelf.name == "Shelf-01"
    assert machine.cpus[0].name == "Intel Xeon"

    history = (
        (
            await db_session.execute(
                select(models.History).filter(
                    models.History.entity_id == machine.id,
                    models.History.entity_type == models.EntityType.MACHINES,
                    models.History.action == models.ActionType.CREATE,
                )
            )
        )
        .scalars()
        .first()
    )

    assert history is not None, "History listener did not record CREATE action."
    assert history.user_id is not None

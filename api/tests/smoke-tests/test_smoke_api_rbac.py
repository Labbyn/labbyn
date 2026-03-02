import uuid
import pytest

pytestmark = [
    pytest.mark.smoke,
    pytest.mark.api,
    pytest.mark.rbac
]


def test_rbac_cross_team_visibility_isolation(test_client, service_header_sync, rbac_data_suite):
    """
    Verify strict data isolation between teams.

    Ensures that a user with access to Team A cannot list or discover resources
    (rooms) belonging to Team B, maintaining multi-tenant security boundaries.
    """
    ac = test_client
    room_b_name = f"SecretRoom_B_{uuid.uuid4().hex[:4]}"

    ac.post("/db/rooms/",
            json={"name": room_b_name, "room_type": "Lab", "team_id": rbac_data_suite["team_b_id"]},
            headers=service_header_sync)

    res = ac.get("/db/rooms/", headers=rbac_data_suite["user_a_header"])
    rooms = res.json()

    for room in rooms:
        assert room["team_id"] != rbac_data_suite["team_b_id"]
        assert room["name"] != room_b_name


def test_rbac_multi_team_membership_visibility(test_client, service_header_sync, rbac_data_suite, db_session):
    """
    Validate resource visibility for users with multi-team membership.

    Verifies that updating a user's team assignments correctly expands their
    data access scope, allowing them to view resources across all assigned teams
    via the team_filter mechanism.
    """
    ac = test_client
    u_id = int(rbac_data_suite["user_a_id"])
    team_a = int(rbac_data_suite["team_a_id"])
    team_b = int(rbac_data_suite["team_b_id"])


    ac.post("/db/rooms/",
            json={"name": "Room_In_A", "room_type": "Lab", "team_id": team_a},
            headers=service_header_sync)
    ac.post("/db/rooms/",
            json={"name": "Room_In_B", "room_type": "Lab", "team_id": team_b},
            headers=service_header_sync)

    update_res = ac.patch(f"/db/users/{u_id}",
                          json={"team_ids": [team_a, team_b]},
                          headers=service_header_sync)
    assert update_res.status_code == 200
    db_session.commit()

    login_res = ac.post("/auth/login",
                        data={"username": rbac_data_suite["user_a_login"],
                              "password": rbac_data_suite["user_a_password"]})
    multi_header = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    res = ac.get("/db/rooms/", headers=multi_header)
    rooms = res.json()
    visible_teams = {r["team_id"] for r in rooms}

    assert team_a in visible_teams
    assert team_b in visible_teams


def test_rbac_permission_elevation_flow(test_client, service_header_sync, rbac_data_suite, db_session):
    """
    Verify end-to-end permission elevation from USER to GROUP_ADMIN.

    Validates that promoting a user within a team correctly updates their permissions,
    and that subsequent requests (post-relogin) allow the user to perform
    restricted actions like creating resources within their authorized team.
    """

    ac = test_client
    u_id = int(rbac_data_suite["user_a_id"])
    t_id = int(rbac_data_suite["team_a_id"])

    # Promocja
    ac.patch(f"/db/users/{u_id}/promote",
             json={"team_id": t_id, "is_group_admin": True},
             headers=service_header_sync)

    db_session.commit()
    db_session.expire_all()

    login_res = ac.post("/auth/login",
                        data={"username": rbac_data_suite["user_a_login"],
                              "password": rbac_data_suite["user_a_password"]})
    token = login_res.json()['access_token']
    new_header = {"Authorization": f"Bearer {token}"}

    new_room = {"name": f"AdminRoom_{uuid.uuid4().hex[:4]}", "room_type": "Lab", "team_id": t_id}
    res_after = ac.post("/db/rooms/", json=new_room, headers=new_header)

    assert res_after.status_code == 201


def test_rbac_multi_group_admin_management(test_client, service_header_sync, rbac_data_suite, db_session):
    """
    Test management capabilities across multiple group admin assignments.

    Ensures that the RBAC system correctly handles users who are administrators
    of multiple teams, allowing resource management in any team where the
    user has admin privileges, and that permissions are properly scoped to the relevant team context.
    """

    ac = test_client
    u_id = int(rbac_data_suite["user_a_id"])
    team_a = int(rbac_data_suite["team_a_id"])
    team_b = int(rbac_data_suite["team_b_id"])

    ac.patch(f"/db/users/{u_id}", json={"team_ids": [team_a, team_b]}, headers=service_header_sync)

    ac.patch(f"/db/users/{u_id}/promote",
             json={"team_id": team_b, "is_group_admin": True},
             headers=service_header_sync)

    db_session.commit()

    login_res = ac.post("/auth/login",
                        data={"username": rbac_data_suite["user_a_login"],
                              "password": rbac_data_suite["user_a_password"]})
    admin_header = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    res_b = ac.post("/db/rooms/",
                    json={"name": f"RoomB_{uuid.uuid4().hex[:4]}", "room_type": "Lab", "team_id": team_b},
                    headers=admin_header)
    assert res_b.status_code == 201
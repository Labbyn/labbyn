import pytest
from fastapi.dependencies.utils import get_typed_signature

from tests.conftest import rbac_data_suite

from app.auth.dependencies import RequestContext
from app.main import app

pytestmark = [pytest.mark.security, pytest.mark.api]


def test_security_scanner_all_endpoints_have_auth():
    """
    Test security scanner: Contract Validation.
    Automated check to ensure all API endpoints require authentication via RequestContext.
    """
    from fastapi.routing import APIRoute, APIWebSocketRoute

    missing_auth = []

    for route in app.routes:
        if isinstance(route, (APIRoute, APIWebSocketRoute)):

            if any(
                path in route.path
                for path in ["/auth", "/docs", "/openapi.json", "/static", "/users"]
            ):
                continue

            signature = get_typed_signature(route.endpoint)

            has_ctx = any(
                param.annotation is RequestContext
                or "RequestContext" in str(param.annotation)
                for param in signature.parameters.values()
            )

            if not has_ctx:
                methods = getattr(route, "methods", {"WS"})
                missing_auth.append(f"{methods} {route.path}")

    assert (
        not missing_auth
    ), f"Detected endpoints without RequestContext: {missing_auth}"


def test_security_mass_assignment_user_promotion(test_client, rbac_data_suite):
    """
    Test Mass Assignment Protection.
    Checks if a standard user can self-elevate to 'admin' by injecting
    unauthorized fields into a standard profile update (PATCH).
    """
    ac = test_client
    payload = {"name": "Hacker_User", "user_type": "admin", "is_superuser": True}

    res = ac.patch(
        f"/db/users/{rbac_data_suite['user_a_id']}",
        json=payload,
        headers=rbac_data_suite["user_a_header"],
    )

    if res.status_code == 200:
        data = res.json()
        assert data["user_type"] == "user"


def test_security_input_injection_robustness(test_client, rbac_data_suite):
    """
    Test Input Validation & Injection.
    Tests the API's resilience against common injection patterns in query parameters.
    """
    ac = test_client
    payloads = ["' OR '1'='1", "../etc/passwd", '{"$gt": ""}']

    for pattern in payloads:
        res = ac.get(
            f"/db/users/?name={pattern}", headers=rbac_data_suite["user_a_header"]
        )

        assert res.status_code < 500


def test_security_history_bola_leak(test_client, service_header_sync, rbac_data_suite):
    """
    Test BOLA (Broken Object Level Authorization) on Audit Logs.
    Ensures a user cannot access history logs (audit trails) belonging to other teams
    by guessing/incrementing log IDs.
    """
    ac = test_client

    ac.patch(
        f"/db/users/{rbac_data_suite['admin_b_id']}",
        json={"name": "Audit_B_Team"},
        headers=service_header_sync,
    )

    history = ac.get("/db/history/", headers=service_header_sync).json()
    b_log_id = history[0]["id"]

    res = ac.get(f"/db/history/{b_log_id}", headers=rbac_data_suite["user_a_header"])

    assert res.status_code in [403, 404]


def test_security_unauthorized_rollback_attempt(
    test_client, rbac_data_suite, service_header_sync
):
    """
    Test Broken Function Level Authorization (BFLA).
    Checks if a standard USER can trigger a 'rollback' action, which
    should be restricted to GROUP_ADMIN or ADMIN roles.
    """
    ac = test_client
    u_id = rbac_data_suite["user_a_id"]
    u_header = rbac_data_suite["user_a_header"]

    ac.patch(
        f"/db/users/{u_id}",
        json={"name": "Rollback_Test_Name"},
        headers=service_header_sync,
    )

    history = ac.get("/db/history/", headers=service_header_sync).json()
    log_id = history[0]["id"]

    res = ac.post(f"/db/history/{log_id}/rollback", headers=u_header)

    assert res.status_code == 403


def test_security_token_behavior_after_password_change(
    test_client, rbac_data_suite, service_header_sync
):
    """
    Test Token Persistence & Lifecycle.
    Verifies if the current access token remains valid after a password change and if the new password is required for subsequent logins.
    """
    ac = test_client
    u_id = rbac_data_suite["user_a_id"]
    old_header = rbac_data_suite["user_a_header"]
    new_pw = "NewStrongPass2026!"

    res = ac.patch(
        f"/db/users/{u_id}", json={"password": new_pw}, headers=service_header_sync
    )
    assert res.status_code == 200

    res_old_token = ac.get("/db/rooms/", headers=old_header)
    assert res_old_token.status_code == 200

    login_res = ac.post(
        "/auth/login",
        data={"username": rbac_data_suite["user_a_login"], "password": new_pw},
    )
    assert login_res.status_code == 200

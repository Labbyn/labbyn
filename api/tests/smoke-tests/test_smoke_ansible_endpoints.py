import pytest
import os
import json
from app.utils.ansible_service import REPORTS_DIR
from app.db.models import Machines, Rooms, Metadata


pytestmark = [pytest.mark.smoke, pytest.mark.api, pytest.mark.ansible]


def helper_write_report(
    hostname: str, os_name: str = "Ubuntu 22.04", cpu_name: str = "Intel Test"
):
    """
    Creates a fake JSON report file on the disk to simulate Ansible output.
    :param hostname: The IP or hostname of the machine.
    :param os_name: OS name to put in the report.
    :param cpu_name: CPU name to put in the report.
    """
    os.makedirs(REPORTS_DIR, exist_ok=True)
    report_data = {
        hostname: {
            "distribution": {
                "name": os_name.split()[0],
                "version": os_name.split()[1] if len(os_name.split()) > 1 else "",
            },
            "cpu": {"name": cpu_name, "cores": 4},
            "ram_memory": {"real_gb": 4},
            "drives": [{"mount": "/", "size_gb": 20}],
            "network": {"mac": "00:00:00:00:00:00", "ip": hostname},
            "metadata": {"has_agent": True},
        }
    }
    path = os.path.join(REPORTS_DIR, f"{hostname}-platform-info.json")
    with open(path, "w") as f:
        json.dump(report_data, f)


@pytest.mark.database
def test_discovery_flow(
    test_client, db_session, service_header_sync, mock_ansible_success
):
    """
    Verifies that the API creates machine records in the database based on mock reports
    and confirms their existence directly via DB session.
    """
    test_ip = "127.0.0.1"
    helper_write_report(test_ip)

    payload = {"hosts": [test_ip], "extra_vars": {"ansible_user": "test"}}

    response = test_client.post(
        "/ansible/discovery", json=payload, headers=service_header_sync
    )

    assert response.status_code == 200
    assert "summary" in response.json()
    assert response.json()["summary"][0]["status"] != "error"

    machine = db_session.query(Machines).filter(Machines.name == test_ip).first()

    assert machine is not None, f"Machine {test_ip} not found in DB after discovery."
    assert "Ubuntu" in machine.os
    assert "Intel Test" in machine.cpus[0].name


@pytest.mark.database
def test_refresh_flow(
    test_client, db_session, service_header_sync, mock_ansible_success
):
    """
    Tests the hardware refresh logic by:
    1. Running discovery to create a machine and its metadata automatically.
    2. Manually sabotaging the machine data in the DB (changing OS).
    3. Running refresh to verify the data is restored from the Ansible report.
    """
    test_ip = "192.168.1.100"
    original_os = "Ubuntu 22.04"
    cpu_name = "AMD Ryzen"

    helper_write_report(test_ip, os_name=original_os, cpu_name=cpu_name)
    discovery_payload = {"hosts": [test_ip], "extra_vars": {"ansible_user": "test"}}
    test_client.post(
        "/ansible/discovery", json=discovery_payload, headers=service_header_sync
    )

    machine = db_session.query(Machines).filter(Machines.name == test_ip).first()
    assert machine is not None
    machine_id = machine.id

    machine.os = "OS"
    db_session.commit()

    refresh_payload = {
        "host": test_ip,
        "extra_vars": {"ansible_user": "test", "ansible_password": "v"},
    }
    response = test_client.post(
        f"/ansible/machine/{machine_id}/refresh",
        json=refresh_payload,
        headers=service_header_sync,
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Machine hardware info updated successfully"

    db_session.expire_all()
    updated_machine = db_session.query(Machines).get(machine_id)
    assert updated_machine.os == original_os
    assert updated_machine.cpus[0].name == f"{cpu_name} (4 cores)"


def test_create_user_simple(test_client, mock_ansible_success, service_header_sync):
    """Tests the basic execution of the user creation endpoint."""
    payload = {
        "host": "1.1.1.1",
        "extra_vars": {"ansible_user": "v", "ansible_password": "v"},
    }
    response = test_client.post(
        "/ansible/create_user", json=payload, headers=service_header_sync
    )
    assert response.status_code == 200
    assert response.json()["status"] == "successful"

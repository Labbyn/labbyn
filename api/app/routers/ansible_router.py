"""
Router for Ansible playbooks: creating Ansible user, gathering platform information and deploying Node Exporter.
"""

import ansible_runner
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HostRequest(BaseModel):
    """
    Pydantic model for a host input.
    """

    host: str
    extra_vars: dict


def run_playbook(
    playbook_path: str, host: str, extra_vars: dict
):
    """
    Helper function to run an Ansible playbook on a single host dynamically.
    """
    r = ansible_runner.run(playbook=playbook_path, inventory=host, extravars=extra_vars)
    return {"status": r.status, "rc": r.rc}


@router.post("/ansible/create_user")
async def create_ansible_user(request: HostRequest):
    """
    Create Ansible user on a host.
    :param request: HostRequest containing the host IP or hostname
    :return: Success or error message
    """
    return run_playbook(
        "/code/ansible/create_ansible_user.yaml", request.host, request.extra_vars
    )


@router.post("/ansible/scan_platform")
async def scan_platform(request: HostRequest):
    """
    Gather information about platform.
    :param reqest: HostRequest containing the host IP or hostname
    :return: Success or error message
    """
    return run_playbook(
        "/code/ansible/scan_platform.yaml", request.host, request.extra_vars
    )


@router.post("/ansible/deploy_agent")
async def deploy_agent(request: HostRequest):
    """
    Deploy Node Exporter on a host.
    :param request: HostRequest containing the host IP or hostname
    :return: Success or error message
    """
    return run_playbook(
        "/code/ansible/deploy_agent.yaml", request.host, request.extra_vars
    )


@router.post("/ansible/setup_agent")
async def setup_agent(request: HostRequest):
    """
    Workflow endpoint: first create Ansible user (if needed), then deploy Node Exporter.
    :param request: HostRequest containing the host IP or hostname
    :return: Combined results of both steps
    """

    user_result = run_playbook(
        "/code/ansible/create_ansible_user.yaml", request.host, request.extra_vars
    )
    if user_result["status"] == "error":
        return {"status": "failed_at_user_creation", "details": user_result}

    deploy_result = run_playbook(
        "/code/ansible/deploy_agent.yaml", request.host, request.extra_vars
    )
    if deploy_result["status"] == "error":
        return {"status": "failed_at_deployment", "details": deploy_result}

    return {
        "user_creation": user_result,
        "node_exporter_deployment": deploy_result,
    }

"""
Router for Ansible playbooks: creating Ansible user, gathering platform information and deploying Node Exporter.
"""

import ansible_runner
import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from enum import Enum

router = APIRouter()


class HostRequest(BaseModel):
    """
    Pydantic model for a host input.
    """

    host: str
    extra_vars: dict

class AnsiblePlaybook(str, Enum):
    """
    Pydantic model for Ansible playbook execution request.
    """
    create_user = "create_user"
    scan_platform = "scan_platform"
    deploy_agent = "deploy_agent"

PLAYBOOK_MAP = {
    AnsiblePlaybook.create_user: "/code/ansible/create_ansible_user.yaml",
    AnsiblePlaybook.scan_platform: "/code/ansible/scan_platform.yaml",
    AnsiblePlaybook.deploy_agent: "/code/ansible/deploy_agent.yaml",
}

async def run_playbook(playbook_path: str, host: str, extra_vars: dict):
    """
    Helper function to run an Ansible playbook on a single host dynamically.
    """
    def _run():
        return ansible_runner.run(
            playbook=playbook_path,
            inventory=host,
            extravars=extra_vars,
        )
    try:
        r = await asyncio.to_thread(_run)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to execute Ansible runner: {e}"
        )
    return {"status": r.status, "rc": r.rc}


@router.post("/ansible/create_user")
async def create_ansible_user(request: HostRequest):
    """
    Create Ansible user on a host.
    :param request: HostRequest containing the host IP or hostname
    :return: Success or error message
    """
    return await run_playbook(
        PLAYBOOK_MAP[AnsiblePlaybook.create_user] , request.host, request.extra_vars
    )


@router.post("/ansible/scan_platform")
async def scan_platform(request: HostRequest):
    """
    Gather information about platform.
    :param reqest: HostRequest containing the host IP or hostname
    :return: Success or error message
    """
    return await run_playbook(
        PLAYBOOK_MAP[AnsiblePlaybook.scan_platform] , request.host, request.extra_vars
    )


@router.post("/ansible/deploy_agent")
async def deploy_agent(request: HostRequest):
    """
    Deploy Node Exporter on a host.
    :param request: HostRequest containing the host IP or hostname
    :return: Success or error message
    """
    return await run_playbook(
        PLAYBOOK_MAP[AnsiblePlaybook.deploy_agent] , request.host, request.extra_vars
    )


@router.post("/ansible/setup_agent")
async def setup_agent(request: HostRequest):
    """
    Workflow endpoint: first create Ansible user (if needed), then deploy Node Exporter.
    :param request: HostRequest containing the host IP or hostname
    :return: Combined results of both steps
    """
    try:
        user_result = await run_playbook(
            PLAYBOOK_MAP[AnsiblePlaybook.create_user], request.host, request.extra_vars
        )

        deploy_result = await run_playbook(
            PLAYBOOK_MAP[AnsiblePlaybook.deploy_agent], request.host, request.extra_vars
        )
    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error during setup_agent workflow: {e}"
        )

    return {
        "user_creation": user_result,
        "node_exporter_deployment": deploy_result,
    }

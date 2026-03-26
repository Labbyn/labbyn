"""Router for Ansible playbooks.

Creating Ansible user, gathering platform information and deploying Node Exporter.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.core import exceptions
from app.database import get_async_db
from app.schemas import service_schemas

from .service import AnsibleService

router = APIRouter(prefix="/ansible", tags=["Ansible"])


@router.post("/create_user")
async def create_ansible_user(
    request: service_schemas.HostRequest,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Deploy Node Exporter on a host.

    :param request: HostRequest containing the host IP or hostname
    :param ctx: Request context for user and team info
    :return: Success or error message.
    """
    try:
        service = AnsibleService(db, ctx)
        return await service.executor.run_playbook_task(
            service_schemas.AnsiblePlaybook.create_user,
            request.host,
            request.extra_vars,
        )
    except Exception as e:
        raise exceptions.ExternalServiceError(
            f"Ansible (User Creation: {request.host}) failed", str(e)
        )


@router.post("/discovery")
async def discover_hosts(
    request: service_schemas.DiscoveryRequest,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Discover hosts not connected to database.

    :param request: DiscoveryRequest containing the host IP or hostname
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Success or error message.
    """
    return await AnsibleService(db, ctx).discover_hosts_workflow(request)


@router.post("/machine/{machine_id}/refresh")
async def refresh_machine_hardware(
    machine_id: int,
    request: service_schemas.HostRequest,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Refresh information about machine hardware.

    :param request: DiscoveryRequest containing the host IP or hostname
    :param machine_id: Machine ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Success or error message.
    """
    return await AnsibleService(db, ctx).refresh_machine(machine_id, request)


@router.post("/machine/{machine_id}/cleanup")
async def cleanup_machine(
    machine_id: int,
    request: service_schemas.HostRequest,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete Ansible/Node exporters from machine.

    :param machine_id: Machine ID
    :param request: DiscoveryRequest containing the host IP or hostname
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Success or error message.
    """
    return await AnsibleService(db, ctx).cleanup_machine(machine_id, request)

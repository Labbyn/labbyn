"""Ansible Discovery Service."""

from datetime import datetime

from app.core import exceptions
from app.db import models
from app.schemas import service_schemas
from app.utils import redis_service

from .executor import AnsibleExecutor
from .repository import AnsibleRepository


class AnsibleService:
    """Ansible Discovery Service class.

    This service orchestrates the process of discovering new hosts,
    refreshing hardware information, and performing cleanup operations
    using Ansible playbooks and database repositories.
    """

    def __init__(self, db, ctx):
        """Init Ansible Discovery Service.

        Args:
            db (AsyncSession): The active database session.
            ctx (RequestContext): The request context containing user and team information.
        """
        self.db = db
        self.ctx = ctx
        self.repo = AnsibleRepository()
        self.executor = AnsibleExecutor()

    async def discover_hosts_workflow(self, request: service_schemas.DiscoveryRequest):
        """Execute the workflow to discover and register multiple hosts.

        This method triggers an Ansible scan, parses reports, and creates or updates
        machines, metadata, and hardware entries in the database.

        :param request: DiscoveryRequest containing host list and extra variables.
        :return: Summary of created/updated/error status for each host.
        """
        self.ctx.require_user()
        if not request.hosts:
            raise exceptions.ValidationError("Host list cannot be empty.")

        target_team_id = request.target_team_id
        if not target_team_id:
            if len(self.ctx.team_ids) == 1:
                target_team_id = self.ctx.team_ids[0]
            else:
                raise exceptions.ValidationError("Target team ID required.")

        await self.ctx.validate_team_access(target_team_id)

        try:
            await self.executor.run_playbook_task(
                service_schemas.AnsiblePlaybook.scan_platform,
                request.hosts,
                request.extra_vars,
            )
        except Exception as e:
            hosts_str = ", ".join(request.hosts)
            raise exceptions.ExternalServiceError(
                f"Ansible Discovery Scan for hosts [{hosts_str}] failed", str(e)
            ) from e

        results = []
        default_room = await self.repo.get_room_by_name_and_team(
            self.db, "virtual", target_team_id
        )

        if not default_room:
            default_room = models.Rooms(
                name="virtual", room_type="virtual", team_id=target_team_id
            )
            self.db.add(default_room)
            await self.db.commit()
            await self.db.refresh(default_room)

        for host in request.hosts:
            try:
                specs = self.executor.parse_platform_report(host)
                machine = await self.repo.get_machine_by_name(self.db, host, self.ctx)

                if machine:
                    for field in ["os", "ram", "mac_address", "ip_address"]:
                        setattr(machine, field, specs.get(field))

                    await self.repo.sync_hardware(self.db, machine.id, specs)

                    meta = await self.repo.get_metadata_by_id(
                        self.db, machine.metadata_id
                    )
                    if meta:
                        meta.ansible_access = True
                        meta.agent_prometheus = specs["agent_prometheus"]
                        meta.last_update = datetime.now()
                    results.append({"host": host, "status": "updated"})
                else:
                    new_meta = models.Metadata(
                        last_update=datetime.now(),
                        agent_prometheus=specs["agent_prometheus"],
                        ansible_access=True,
                        ansible_root_access=True,
                    )
                    self.db.add(new_meta)
                    await self.db.flush()

                    new_machine = models.Machines(
                        name=host,
                        team_id=target_team_id,
                        metadata_id=new_meta.id,
                        localization_id=default_room.id,
                        os=specs["os"],
                        ram=specs["ram"],
                        mac_address=specs["mac_address"],
                        ip_address=host,
                        added_on=datetime.now(),
                    )
                    self.db.add(new_machine)
                    await self.db.flush()

                    await self.repo.sync_hardware(self.db, new_machine.id, specs)
                    results.append({"host": host, "status": "created"})

            except Exception as e:
                results.append({"host": host, "status": "error", "detail": str(e)})

        await self.db.commit()
        return {"summary": results}

    async def refresh_machine(
        self, machine_id: int, request: service_schemas.HostRequest
    ):
        """Refresh hardware information for a specific machine.

        Triggers an Ansible scan for a single host and updates its hardware specs in DB.

        :param machine_id: ID of the machine to refresh.
        :param request: HostRequest containing extra variables for Ansible.
        :return: Success message and refreshed data.
        """
        machine = await self.repo.get_machine_by_id(self.db, machine_id, self.ctx)
        if not machine:
            raise exceptions.ObjectNotFoundError("Machine")

        try:
            await self.executor.run_playbook_task(
                service_schemas.AnsiblePlaybook.scan_platform,
                [machine.name],
                request.extra_vars,
            )
            specs = self.executor.parse_platform_report(machine.name)
            for field in ["os", "ram", "mac_address", "ip_address", "name"]:
                setattr(machine, field, specs.get(field))

            await self.repo.sync_hardware(self.db, machine.id, specs)

            meta = await self.repo.get_metadata_by_id(self.db, machine.metadata_id)
            if meta:
                meta.ansible_access = True
                meta.agent_prometheus = specs["agent_prometheus"]
                meta.last_update = datetime.now()

            await self.db.commit()
            return {
                "message": f"Hardware for {machine.name} refreshed successfully",
                "data": specs,
            }
        except Exception as e:
            await self.db.rollback()
            raise exceptions.ExternalServiceError(
                f"Hardware Refresh for {machine.name} failed", str(e)
            )

    async def cleanup_machine(
        self, machine_id: int, request: service_schemas.HostRequest
    ):
        """Remove Ansible user and Prometheus agent from a machine.

        Uses Redis lock to prevent concurrent cleanup operations on the same host.

        :param machine_id: ID of the machine to clean up.
        :param request: HostRequest containing extra variables.
        :return: Combined results of agent and ansible removal tasks.
        """
        async with redis_service.acquire_lock(f"machine_lock:{machine_id}"):
            machine = await self.repo.get_machine_by_id(self.db, machine_id, self.ctx)
            if not machine:
                raise exceptions.ObjectNotFoundError("Machine")
            try:
                agent_res = await self.executor.run_playbook_task(
                    service_schemas.AnsiblePlaybook.delete_agent,
                    machine.name,
                    request.extra_vars,
                )
                ansible_res = await self.executor.run_playbook_task(
                    service_schemas.AnsiblePlaybook.delete_ansible,
                    machine.name,
                    request.extra_vars,
                )

                meta = await self.repo.get_metadata_by_id(self.db, machine.metadata_id)
                if meta:
                    meta.ansible_access = False
                    meta.ansible_root_access = False
                    meta.agent_prometheus = False
                    meta.last_update = datetime.now()

                await self.db.commit()
                return {
                    "message": f"Cleanup for {machine.name} completed",
                    "agent": agent_res,
                    "ansible": ansible_res,
                }
            except Exception as e:
                await self.db.rollback()
                raise exceptions.ExternalServiceError(
                    f"Ansible Cleanup for {machine.name} failed", str(e)
                )

    async def setup_agent_workflow(self, request: service_schemas.HostRequest):
        """Create Ansible User -> Deploy Node Exporter."

        :param request: HostRequest containing extra variables for Ansible.
        """
        self.ctx.require_user()

        try:
            user_result = await self.executor.run_playbook_task(
                service_schemas.AnsiblePlaybook.create_user,
                request.host,
                request.extra_vars,
            )

            deploy_result = await self.executor.run_playbook_task(
                service_schemas.AnsiblePlaybook.deploy_agent,
                request.host,
                request.extra_vars,
            )

            return {
                "message": f"Agent setup completed for {request.host}",
                "user_creation": user_result,
                "node_exporter_deployment": deploy_result,
            }
        except Exception as e:
            raise exceptions.ExternalServiceError(
                f"Full Agent Setup for host {request.host} failed", str(e)
            )
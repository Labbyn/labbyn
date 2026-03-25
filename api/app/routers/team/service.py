from typing import Dict, Any
from sqlalchemy import sql
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth import dependencies
from app.core import exceptions
from app.db import models
from app.utils import redis_service
from .repository import TeamRepository


class TeamService:
    """Service for managing teams, memberships, and complex detailed views."""

    def __init__(self, db: AsyncSession, ctx: dependencies.RequestContext):
        """Init Team Service.

        :param db: Active database session.
        :param ctx: Request context for user and team info.
        """
        self.db = db
        self.ctx = ctx
        self.repo = TeamRepository()

    def format_team_output(self, team: models.Teams) -> Dict[str, Any]:
        """Format basic team data with members and admins info.

        :param team: Team model instance with users relationship loaded.
        :return: Formatted dictionary with admin and member details.
        """
        group_admins = [m.user for m in team.users if m.is_group_admin]
        return {
            "id": team.id,
            "name": team.name,
            "admins": [
                {
                    "id": a.id,
                    "full_name": f"{a.name} {a.surname}",
                    "login": a.login,
                    "user_type": str(a.user_type),
                    "email": a.email,
                    "is_group_admin": True,
                    "user_link": f"/users/{a.id}",
                }
                for a in group_admins
            ],
            "member_count": len(team.users),
            "members": [
                {
                    "id": m.user.id,
                    "full_name": f"{m.user.name} {m.user.surname}",
                    "login": m.user.login,
                    "user_type": str(m.user.user_type),
                    "email": m.user.email,
                    "is_group_admin": m.is_group_admin,
                    "user_link": f"/users/{m.user.id}",
                }
                for m in team.users
            ],
        }

    def format_team_full_detail(self, team: models.Teams) -> Dict[str, Any]:
        """Deep format of team including racks, machines and inventory mapping.

        This method aggregates nested data from multiple relationships to provide
        a comprehensive overview of team assets.

        :param team: Team model instance with all asset relationships loaded.
        :return: Detailed dictionary containing users, racks, machines, and inventory.
        """
        sorted_machines = []
        for rack in team.racks:
            for shelf in sorted(rack.shelves, key=lambda s: s.order or 0):
                for machine in shelf.machines:
                    sorted_machines.append(
                        {
                            "id": machine.id,
                            "name": machine.name,
                            "ip_address": machine.ip_address,
                            "mac_address": machine.mac_address,
                            "team_name": team.name,
                            "rack_name": rack.name,
                            "shelf_order": shelf.order,
                            "tags": [
                                {"name": t.name, "color": t.color}
                                for t in (machine.tags or [])
                            ],
                        }
                    )

        placed_names = {m["name"] for m in sorted_machines}
        for machine in team.machines:
            if machine.name not in placed_names:
                sorted_machines.append(
                    {
                        "id": machine.id,
                        "name": machine.name,
                        "ip_address": machine.ip_address,
                        "mac_address": machine.mac_address,
                        "team_name": team.name,
                        "rack_name": "Unplaced",
                        "shelf_order": 0,
                        "tags": [
                            {"name": t.name, "color": t.color}
                            for t in (machine.tags or [])
                        ],
                    }
                )

        return {
            "id": team.id,
            "name": team.name,
            "members": self.format_team_output(team)["members"],
            "racks": [
                {
                    "id": r.id,
                    "name": r.name,
                    "team_name": team.name,
                    "map_link": f"/map/room/{r.room_id}",
                    "tags": [
                        {"name": t.name, "color": t.color} for t in (r.tags or [])
                    ],
                    "machines_count": sum(len(s.machines) for s in r.shelves),
                }
                for r in team.racks
            ],
            "machines": sorted_machines,
            "inventory": [
                {
                    "id": i.id,
                    "name": i.name,
                    "quantity": i.quantity,
                    "team_name": team.name,
                    "room_name": i.room.name if i.room else "Unknown",
                    "machine_info": i.machine.name if i.machine else "N/A",
                    "category_name": i.category.name if i.category else "General",
                    "rental_status": i.rental_status,
                    "rental_id": i.rental_id,
                    "location_link": f"/rooms/{i.localization_id}",
                }
                for i in team.inventory
            ],
        }

    async def create_team(self, team_data):
        """Create new team and its mandatory virtual lab room.

        :param team_data: Pydantic schema containing new team details.
        :return: Created Team model instance.
        """
        self.ctx.require_admin()
        try:
            obj = models.Teams(**team_data.model_dump())
            self.db.add(obj)
            await self.db.flush()

            virtual_lab = models.Rooms(
                name="virtual", room_type="virtual", team_id=obj.id
            )
            self.db.add(virtual_lab)

            await self.db.commit()
            return obj
        except Exception as e:
            await self.db.rollback()
            raise exceptions.ValidationError(
                f"Failed to create team '{team_data.name}'"
            ) from e

    async def get_detailed_team(self, team_id: int):
        """Fetch and format full team details by ID.

        :param team_id: ID of the team to retrieve.
        :return: Formatted dictionary with all team assets and members.
        """
        self.ctx.require_user()
        team = await self.repo.get_by_id(self.db, team_id, detailed=True)
        if not team:
            raise exceptions.ObjectNotFoundError("Team")
        return self.format_team_full_detail(team)

    async def update_team(self, team_id: int, team_data):
        """Update team attributes with specialized admin validation.

        Allows updates by Superadmins or Group Admins belonging to the specific team.

        :param team_id: ID of the team to update.
        :param team_data: Pydantic schema with updated fields.
        :return: Updated Team model instance.
        """
        self.ctx.require_user()
        async with redis_service.acquire_lock(f"team_lock:{team_id}"):
            team = await self.repo.get_by_id(self.db, team_id)
            if not team:
                raise exceptions.ObjectNotFoundError("Team", str(team_id))

            if not self.ctx.is_admin:
                self.ctx.require_group_admin()
                stmt_check = sql.select(models.UsersTeams).filter(
                    models.UsersTeams.user_id == self.ctx.current_user.id,
                    models.UsersTeams.team_id == team_id,
                    models.UsersTeams.is_group_admin.is_(True),
                )
                if not (await self.db.execute(stmt_check)).scalar_one_or_none():
                    raise exceptions.AccessDeniedError(
                        f"You are not an admin of team '{team.name}'"
                    )

            try:
                for k, v in team_data.model_dump(exclude_unset=True).items():
                    setattr(team, k, v)
                await self.db.commit()
                return team
            except Exception:
                await self.db.rollback()
                raise exceptions.ValidationError(f"Failed to update team '{team.name}'")

    async def delete_team(self, team_id: int):
        """Delete team (Superadmin only).

        :param team_id: ID of the team to delete.
        """
        self.ctx.require_admin()
        async with redis_service.acquire_lock(f"team_lock:{team_id}"):
            team = await self.repo.get_by_id(self.db, team_id)
            if not team:
                raise exceptions.ObjectNotFoundError("Team")
            try:
                team_name = team.name
                await self.db.delete(team)
                await self.db.commit()
            except Exception:
                await self.db.rollback()
                raise exceptions.ValidationError(f"Could not delete team '{team_name}'")

from sqlalchemy import sql

from app.db import models


class SearchRepository:
    """Repository for generating search statements across multiple entities."""

    @staticmethod
    def get_search_statements(ctx):
        """Build all select statements for global search.

        :param ctx: Request context for team filtering.
        :return: Dictionary of statements for each entity.
        """
        return {
            "users": sql.select(models.User),
            "teams": sql.select(models.Teams),
            "docs": sql.select(models.Documentation),
            "machines": ctx.team_filter(sql.select(models.Machines), models.Machines),
            "racks": ctx.team_filter(sql.select(models.Rack), models.Rack),
            "items": ctx.team_filter(sql.select(models.InventoryModel), models.InventoryModel),
            "rooms": ctx.team_filter(sql.select(models.Rooms), models.Rooms),
        }

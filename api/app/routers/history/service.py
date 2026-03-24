from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import sql
from app.auth import dependencies
from app.core import exceptions
from app.db import models
from .repository import HistoryRepository


class HistoryService:
    """Service for managing history logs and performing state rollbacks."""

    def __init__(self, db: AsyncSession, ctx: dependencies.RequestContext):
        """Init History Service.

        :param db: Active database session.
        :param ctx: Request context for user authorization.
        """
        self.db = db
        self.ctx = ctx
        self.repo = HistoryRepository()

    async def _resolve_entity_name(self, log: models.History) -> str:
        """Fetch a human-readable name for the entity in the log.

        :param log: History log entry.
        :return: String representing the entity name.
        """
        state = log.after_state or log.before_state
        if state:
            if "name" in state: return state["name"]
            if "login" in state: return state["login"]

        model_class = self.repo.get_model_class(log.entity_type)
        if model_class:
            stmt = sql.select(model_class).filter(model_class.id == log.entity_id)
            result = await self.db.execute(stmt)
            entity = result.scalar_one_or_none()
            if entity:
                return getattr(entity, "name", getattr(entity, "login", f"ID: {log.entity_id}"))

        return f"{log.entity_type.value} (ID: {log.entity_id})"

    async def get_log_or_404(self, log_id: int) -> models.History:
        """Internal helper to fetch a document or raise ObjectNotFoundError.
        :param log_id: ID of the log to fetch.

        :return: The fetched log.
        """
        log = await self.repo.get_by_id(self.db, log_id, self.ctx)
        if not log:
            raise exceptions.ObjectNotFoundError("Log")
        return log

    async def get_enhanced_logs(self, limit: int):
        """Fetch logs and enrich them with entity names.

        :param limit: Number of logs to fetch.
        :return: List of enriched log dictionaries.
        """
        self.ctx.require_user()
        logs = await self.repo.get_all_logs(self.db, self.ctx, limit)

        results = []
        for log in logs:
            readable_name = await self._resolve_entity_name(log)
            results.append({
                **log.__dict__,
                "entity_name": readable_name,
                "action": log.action.value if hasattr(log.action, "value") else str(log.action),
                "entity_type": log.entity_type.value if hasattr(log.entity_type, "value") else str(log.entity_type),
            })
        return results

    async def rollback_entry(self, history_id: int):
        """Perform a rollback of a specific action.

        :param history_id: ID of the history entry to revert.
        :return: Success message.
        :raises ValidationError: If rollback is impossible or fails.
        """
        self.ctx.require_group_admin()
        log = await self.repo.get_by_id(self.db, history_id, self.ctx)

        if not log or not log.can_rollback:
            raise exceptions.ValidationError("This action cannot be rolled back.")

        model_class = self.repo.get_model_class(log.entity_type)
        if not model_class:
            raise exceptions.ObjectNotFoundError("Entity model")

        try:
            msg = ""
            if log.action == models.ActionType.CREATE:
                msg = await self._rollback_create(model_class, log)
            elif log.action == models.ActionType.DELETE:
                msg = await self._rollback_delete(model_class, log)
            elif log.action == models.ActionType.UPDATE:
                msg = await self._rollback_update(model_class, log)

            await self.db.commit()
            return {"message": msg, "success": True}
        except IntegrityError:
            await self.db.rollback()
            raise exceptions.ValidationError("Rollback failed: Data conflict.")
        except Exception:
            await self.db.rollback()
            raise exceptions.ValidationError("Rollback operation failed.")

    async def _rollback_create(self, model_class, log):
        """Delete the entity created in this log."""
        stmt = sql.select(model_class).filter(model_class.id == log.entity_id)
        result = await self.db.execute(stmt)
        obj = result.scalar_one_or_none()
        if obj:
            await self.db.delete(obj)
            return f"Rollback: {log.entity_type.value} ID {log.entity_id} deleted."
        return "No action: Entity already gone."

    async def _rollback_delete(self, model_class, log):
        """Restore the entity deleted in this log."""
        if not log.before_state:
            raise exceptions.ValidationError("No state to restore.")
        obj = model_class(**log.before_state)
        self.db.add(obj)
        return f"Rollback: {log.entity_type.value} restored."

    async def _rollback_update(self, model_class, log):
        """Revert fields from update action."""
        stmt = sql.select(model_class).filter(model_class.id == log.entity_id)
        result = await self.db.execute(stmt)
        obj = result.scalar_one_or_none()
        if not obj:
            raise exceptions.ObjectNotFoundError("Entity not found")

        if log.extra_data:
            for field, val in log.extra_data.items():
                if hasattr(obj, field):
                    setattr(obj, field, val.get("old"))
        return f"Rollback: Fields reverted for {log.entity_type.value}."
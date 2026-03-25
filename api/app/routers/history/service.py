from typing import Any, Dict, List, Tuple, Optional
from sqlalchemy import sql
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.auth import dependencies
from app.core import exceptions
from app.db import models
from .repository import HistoryRepository


class HistoryService:
    """Service for managing history logs, formatting diffs, and performing rollbacks.

    This service coordinates the lifecycle of audit logs. It provides "blackboxed"
    views of data changes (filtering out internal sensitive fields), resolves
    human-readable entity names, and implements the logic required to revert
    database states (Rollback) for supported entities.
    """

    # Keys that should not be exposed in the history view (technical or sensitive data)
    INTERNAL_KEYS = {
        "id",
        "version_id",
        "user_id",
        "team_id",
        "hashed_password",
        "is_active",
        "is_verified",
        "is_superuser",
        "force_password_change",
        "timestamp",
        "metadata_id",
        "item_id",
        "map_id",
        "localization_id",
        "room_id",
        "rental_id",
        "category_id",
        "machine_id",
        "entity_id",
    }

    def __init__(self, db: AsyncSession, ctx: dependencies.RequestContext):
        """Initialize the HistoryService.

        :param db: Active asynchronous database session.
        :param ctx: RequestContext containing user identity and team access filters.
        """
        self.db = db
        self.ctx = ctx
        self.repo = HistoryRepository()

    def _get_state_diff(
        self, before: Optional[Dict], after: Optional[Dict]
    ) -> Tuple[Dict, Dict]:
        """Compare before and after states to extract only the modified values.

        Filters out any keys defined in INTERNAL_KEYS to ensure only relevant
        business data changes are presented.

        :param before: Dictionary representing the entity state before the action.
        :param after: Dictionary representing the entity state after the action.
        :return: A tuple of (filtered_before, filtered_after) containing only changed fields.
        """
        before = before or {}
        after = after or {}

        b_clean = {k: v for k, v in before.items() if k not in self.INTERNAL_KEYS}
        a_clean = {k: v for k, v in after.items() if k not in self.INTERNAL_KEYS}

        if not b_clean or not a_clean:
            return b_clean, a_clean

        diff_before, diff_after = {}, {}
        all_keys = set(b_clean.keys()) | set(a_clean.keys())

        for key in all_keys:
            val_b, val_a = b_clean.get(key), a_clean.get(key)
            if val_b != val_a:
                diff_before[key], diff_after[key] = val_b, val_a

        return diff_before, diff_after

    async def _resolve_entity_name(self, log: models.History) -> str:
        """Resolve a human-readable identifier for the entity referenced in the log.

        Attempts to find 'name' or 'login' in the stored states first. If not
        present, it performs a targeted database lookup for the current object.

        :param log: The history log entry.
        :return: A string identifier (e.g., entity name, user login, or type + ID).
        """
        state = log.after_state or log.before_state
        if state:
            if "name" in state:
                return state["name"]
            if "login" in state:
                return state["login"]

        model_class = self.repo.get_model_class(log.entity_type)
        if model_class:
            stmt = sql.select(model_class).filter(model_class.id == log.entity_id)
            result = await self.db.execute(stmt)
            entity = result.scalar_one_or_none()
            if entity:
                return getattr(
                    entity, "name", getattr(entity, "login", f"ID: {log.entity_id}")
                )

        return f"{log.entity_type.value} (ID: {log.entity_id})"

    async def get_enhanced_logs(self, limit: int) -> List[Dict[str, Any]]:
        """Fetch a list of history logs enriched with entity names and state diffs.

        :param limit: Maximum number of entries to retrieve.
        :return: A list of dictionaries formatted for the enhanced history response.
        """
        self.ctx.require_user()
        logs = await self.repo.get_all_logs(self.db, self.ctx, limit)

        results = []
        for log in logs:
            readable_name = await self._resolve_entity_name(log)
            clean_before, clean_after = self._get_state_diff(
                log.before_state, log.after_state
            )

            results.append(
                {
                    "id": log.id,
                    "timestamp": log.timestamp,
                    "action": (
                        log.action.value
                        if hasattr(log.action, "value")
                        else str(log.action)
                    ),
                    "entity_type": (
                        log.entity_type.value
                        if hasattr(log.entity_type, "value")
                        else str(log.entity_type)
                    ),
                    "entity_id": log.entity_id,
                    "entity_name": readable_name,
                    "user_id": log.user_id,
                    "user": log.user,
                    "before_state": clean_before or None,
                    "after_state": clean_after or None,
                    "can_rollback": log.can_rollback,
                }
            )
        return results

    async def get_enhanced_log_by_id(self, history_id: int) -> Dict[str, Any]:
        """Fetch and enrich a specific history entry by its unique ID.

        :param history_id: The ID of the log entry.
        :return: Dictionary containing detailed and enriched log information.
        :raises exceptions.ObjectNotFoundError: If the log entry is not found or user lacks access.
        """
        self.ctx.require_user()
        log = await self.repo.get_by_id(self.db, history_id, self.ctx)
        if not log:
            raise exceptions.ObjectNotFoundError("History log")

        readable_name = await self._resolve_entity_name(log)
        clean_before, clean_after = self._get_state_diff(
            log.before_state, log.after_state
        )

        return {
            "id": log.id,
            "timestamp": log.timestamp,
            "action": (
                log.action.value if hasattr(log.action, "value") else str(log.action)
            ),
            "entity_type": (
                log.entity_type.value
                if hasattr(log.entity_type, "value")
                else str(log.entity_type)
            ),
            "entity_id": log.entity_id,
            "entity_name": readable_name,
            "user_id": log.user_id,
            "user": log.user,
            "before_state": clean_before or None,
            "after_state": clean_after or None,
            "can_rollback": log.can_rollback,
        }

    async def get_blackboxed_logs(self, limit: int = 200) -> List[Dict[str, Any]]:
        """Prepare blackboxed log entries.

        :param limit: Maximum number of entries to retrieve.
        :return: A list of dictionaries formatted for the blackboxed log response.

        """
        self.ctx.require_user()
        logs = await self.repo.get_all_logs(self.db, self.ctx, limit)

        results = []
        for log in logs:
            readable_name = await self._resolve_entity_name(log)
            clean_before, clean_after = self._get_state_diff(
                log.before_state, log.after_state
            )

            results.append(
                {
                    "id": log.id,
                    "timestamp": log.timestamp,
                    "action": (
                        log.action.value
                        if hasattr(log.action, "value")
                        else str(log.action)
                    ),
                    "entity_type": (
                        log.entity_type.value
                        if hasattr(log.entity_type, "value")
                        else str(log.entity_type)
                    ),
                    "entity_id": log.entity_id,
                    "entity_name": readable_name,
                    "user_id": log.user_id,
                    "user": log.user,
                    "before_state": clean_before if clean_before else None,
                    "after_state": clean_after if clean_after else None,
                    "can_rollback": log.can_rollback,
                }
            )
        return results

    async def get_blackboxed_item(self, history_id: int) -> Dict[str, Any]:
        """Prepare a blackboxed log entry.

        :param history_id: The ID of the log entry to revert.
        :return: A dictionary containing blackboxed log entry information.
        """
        self.ctx.require_user()
        log = await self.repo.get_by_id(self.db, history_id, self.ctx)

        if not log:
            raise exceptions.ObjectNotFoundError("History log")

        readable_name = await self._resolve_entity_name(log)
        clean_before, clean_after = self._get_state_diff(
            log.before_state, log.after_state
        )

        return {
            "id": log.id,
            "timestamp": log.timestamp,
            "action": (
                log.action.value if hasattr(log.action, "value") else str(log.action)
            ),
            "entity_type": (
                log.entity_type.value
                if hasattr(log.entity_type, "value")
                else str(log.entity_type)
            ),
            "entity_id": log.entity_id,
            "entity_name": readable_name,
            "user_id": log.user_id,
            "user": log.user,
            "before_state": clean_before if clean_before else None,
            "after_state": clean_after if clean_after else None,
            "can_rollback": log.can_rollback,
        }

    async def rollback_entry(self, history_id: int) -> Dict[str, Any]:
        """Revert the database changes described in a specific history entry.

        Performs a 'reverse' action based on the log type:
        - CREATE -> DELETE the new entity.
        - DELETE -> RE-INSERT the entity from before_state.
        - UPDATE -> REVERT fields using extra_data/before_state.

        :param history_id: The ID of the log entry to revert.
        :return: A success message and status.
        """
        self.ctx.require_group_admin()
        log = await self.repo.get_by_id(self.db, history_id, self.ctx)

        if not log or not log.can_rollback:
            raise exceptions.ValidationError("This action cannot be rolled back.")

        model_class = self.repo.get_model_class(log.entity_type)
        if not model_class:
            raise exceptions.ObjectNotFoundError("Entity model mapping for rollback")

        try:
            if log.action == models.ActionType.CREATE:
                msg = await self._rollback_create(model_class, log)
            elif log.action == models.ActionType.DELETE:
                msg = await self._rollback_delete(model_class, log)
            elif log.action == models.ActionType.UPDATE:
                msg = await self._rollback_update(model_class, log)
            else:
                raise exceptions.ValidationError(
                    "Unsupported action type for rollback."
                )

            await self.db.commit()
            return {"message": msg, "success": True}
        except IntegrityError:
            await self.db.rollback()
            raise exceptions.ValidationError(
                "Rollback failed: Data integrity conflict (e.g., duplicate unique key)."
            )
        except Exception as e:
            await self.db.rollback()
            raise exceptions.ValidationError(f"Rollback operation failed: {str(e)}")

    async def _rollback_create(self, model_class, log: models.History) -> str:
        """Delete an entity that was originally created.

        :param model_class: SQLAlchemy model class to which entity should be deleted.
        :param log: SQLAlchemy database session object.
        :return: Rollback success message.
        """
        stmt = sql.select(model_class).filter(model_class.id == log.entity_id)
        result = await self.db.execute(stmt)
        obj = result.scalar_one_or_none()
        if obj:
            await self.db.delete(obj)
            return f"Rollback success: {log.entity_type.value} ID {log.entity_id} has been deleted."
        return "Rollback skipped: The entity was already removed."

    async def _rollback_delete(self, model_class, log: models.History) -> str:
        """Restore an entity that was originally deleted.

        :param model_class: SQLAlchemy model class to which entity should be restored.
        :param log: SQLAlchemy database session object.
        :return: Rollback success message.
        """
        if not log.before_state:
            raise exceptions.ValidationError(
                "Cannot restore entity: missing 'before_state' data."
            )
        obj = model_class(**log.before_state)
        self.db.add(obj)
        return f"Rollback success: {log.entity_type.value} has been restored."

    async def _rollback_update(self, model_class, log: models.History) -> str:
        """Revert specific field changes from an update action.

        :param model_class: SQLAlchemy model class to which entity should be reverted.
        :param log: SQLAlchemy database session object.
        :return: Rollback success message.
        """
        stmt = sql.select(model_class).filter(model_class.id == log.entity_id)
        result = await self.db.execute(stmt)
        obj = result.scalar_one_or_none()
        if not obj:
            raise exceptions.ObjectNotFoundError(
                "Target entity not found for update reversal."
            )

        if log.extra_data:
            for field, val in log.extra_data.items():
                if hasattr(obj, field):
                    setattr(obj, field, val.get("old"))

        return f"Rollback success: Fields reverted for {log.entity_type.value} ID {log.entity_id}."

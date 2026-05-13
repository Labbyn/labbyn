"""Exception handling classes."""

from typing import Optional


class AppBaseException(Exception):
    """Base class for exceptions."""

    def __init__(self, message: str, code: str = "INTERNAL_ERROR"):
        """Create base expection.

        :param message: exception message
        :param code: code of error
        """
        self.message = message
        self.code = code


class ObjectNotFoundError(AppBaseException):
    """Exception for 404."""

    def __init__(self, obj_type: str, name: Optional[str] = None):
        """Create ObjectNotFound expection.

        :param obj_type: Entity type
        :param name: Name of entity
        """
        message = f"{obj_type} '{name}' not found" if name else f"{obj_type} not found"
        super().__init__(message, "NOT_FOUND")


class AccessDeniedError(AppBaseException):
    """Exception for 403."""

    def __init__(self, detail: str = "Access denied"):
        """Create AccessDeniedError expection.

        :param detail: exception message
        """
        super().__init__(detail, "FORBIDDEN")


class ExternalServiceError(AppBaseException):
    """Exception for 503."""

    def __init__(self, service: str, detail: str):
        """Create ExternalServiceError expection.

        :param service: Service name
        :param detail: Detail of error
        """
        super().__init__(f"Service {service} error: {detail}", "SERVICE_ERROR")


class InsufficientAmountError(AppBaseException):
    """Custom exception for rental logics."""

    def __init__(self, requested: int, available: int):
        """Create InsufficientAmountError expection.

        :param requested: Requested amount of inventory item
        :param available: Available amount of inventory item
        """
        super().__init__(
            f"Insufficient quantity. Requested: {requested}, Available: {available}",
            "INSUFFICIENT_AMOUNT",
        )


class ValidationError(AppBaseException):
    """Common exception for mismatches created by user."""

    def __init__(self, message: str):
        """Create ValidationError expection.

        :param message: exception message
        """
        super().__init__(message, "VALIDATION_ERROR")


class ConflictError(AppBaseException):
    """Exception for 409, when violating unique constraints."""

    def __init__(self, message: str):
        """Create ConflictError expection.

        :param message: exception message
        """
        super().__init__(message, "CONFLICT")


class TargetSaveError(AppBaseException):
    """Custom exception for Prometheus target saving errors."""

    def __init__(self, message: str):
        """Create TargetSaveError expection.

        :param message: exception message
        """
        super().__init__(f"Prometheus target error: {message}", "TARGET_SAVE_ERROR")

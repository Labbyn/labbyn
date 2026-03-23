"""Exception handler setup file."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.core import exceptions


def setup_exception_handlers(app: FastAPI):
    """Setup exception handler.

    :param app: FastApi session
    """

    @app.exception_handler(exceptions.AppBaseException)
    async def app_exception_handler(request: Request, exc: exceptions.AppBaseException):
        """Create mapping to preapared exceptions.

        :param request: Request body
        :param exc: AppBaseException class
        :return: Prepared json with status and message based on exception type
        """
        status_code = 400

        if isinstance(exc, exceptions.ObjectNotFoundError):
            status_code = 404
        elif isinstance(exc, exceptions.AccessDeniedError):
            status_code = 403
        elif isinstance(exc, exceptions.ValidationError):
            status_code = 400
        elif isinstance(
            exc, (exceptions.ConflictError, exceptions.InsufficientAmountError)
        ):
            status_code = 409
        elif isinstance(exc, exceptions.ExternalServiceError):
            status_code = 502

        return JSONResponse(
            status_code=status_code, content={"detail": exc.message, "code": exc.code}
        )

    @app.exception_handler(IntegrityError)
    async def integrity_handler(request: Request, exc: IntegrityError):
        """Handler for 409 request.

        409 status code indicates integrity error in database
        (foreign keys, not unique constraints).
        Currently we handle the unique constraints, but in very specific cases
        this error will occur.
        Instead of just returning raw code from SQLAlchemy which user doesn't understand
        we will return simple message about constraints violation.

        :param request: Request body
        :exc Exception: IntegrityError

        """
        return JSONResponse(
            status_code=409,
            content={
                "detail": "This item might already exists or is linked to another item.",
                "code": "DB_INTEGRITY_ERROR",
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        """Handler for 500 request.

        500 status code indicates every error that was not caught intentionally.
        Instead of just returning Network issue - which is misleading, we
        will return message
        about internal serval error.

        :param request: Request body
        :exc Exception: Not registered exception

        """
        return JSONResponse(
            status_code=500,
            content={
                "detail": "An unexpected internal server error occurred. "
                "Please contact the administrator.",
                "code": "INTERNAL_SERVER_ERROR",
            },
        )

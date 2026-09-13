import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import get_current_user
from app.models.schemas import CopilotChatRequest, CopilotChatResponse, UserResponse
from app.services.groq_service import copilot_service
from app.services.copilot_tools import execute_tool, ALLOWED_TOOLS
from app.core.config import settings

logger = logging.getLogger("naviops.copilot.api")

router = APIRouter(prefix="/api/copilot", tags=["Bob Copilot"])


@router.post("/chat", response_model=CopilotChatResponse)
def copilot_chat(
    payload: CopilotChatRequest,
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Send a message to Bob Copilot and receive an AI-generated operational response.

    Phase 2: Groq tool-calling is enabled. The LLM may request approved
    read-only NaviOps data tools; the backend validates, authorizes, and
    executes them before returning the grounded final answer.

    - Requires valid JWT authentication.
    - Accessible to all authenticated roles (admin, operations, viewer).
    - Read-only: no database writes, no schedule changes, no action execution.
    - Conversation history is session-scoped and managed by the client.
    """
    if not payload.message.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message must not be empty.",
        )

    history = (
        [{"role": m.role, "content": m.content} for m in payload.history]
        if payload.history
        else None
    )

    # Build a closure that binds the authenticated user to every tool call.
    # This ensures RBAC is enforced at the backend — the LLM cannot bypass it.
    def _tool_executor(tool_name: str, arguments: dict) -> dict:
        return execute_tool(tool_name, arguments, current_user)

    try:
        reply = copilot_service.chat(
            user_message=payload.message.strip(),
            history=history,
            user_role=current_user.role,
            tool_executor=_tool_executor,
        )
    except RuntimeError as exc:
        # Surface config errors as 503; transient Groq errors as 503 too
        error_msg = str(exc)
        if "GROQ_API_KEY" in error_msg or "not installed" in error_msg:
            logger.error("Copilot configuration error: %s", error_msg)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Bob Copilot is not configured. Please contact your NaviOps administrator.",
            )
        logger.warning("Copilot inference error for user %s: %s", current_user.email, error_msg)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=error_msg,
        )

    return CopilotChatResponse(
        reply=reply,
        session_id=payload.session_id,
        model=settings.GROQ_MODEL,
        role_context=current_user.role,
    )


@router.get("/status")
def copilot_status(current_user: UserResponse = Depends(get_current_user)):
    """Health check for Copilot configuration — does NOT call Groq API."""
    configured = bool(settings.GROQ_API_KEY)
    return {
        "copilot": "Bob Copilot",
        "phase": "2",
        "configured": configured,
        "model": settings.GROQ_MODEL if configured else None,
        "status": "ready" if configured else "unconfigured",
        "tools_available": sorted(ALLOWED_TOOLS) if configured else [],
    }

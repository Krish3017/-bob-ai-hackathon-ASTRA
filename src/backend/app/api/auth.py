from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from app.core.database import port_repo
from app.models.schemas import LoginRequest, AuthResponse, UserResponse
from app.core.auth import get_current_user, require_role

router = APIRouter(prefix="/api/auth", tags=["Authentication & RBAC"])


@router.get("/users", response_model=List[UserResponse])
def list_users(current_user: UserResponse = Depends(require_role(["admin"]))):
    """List all port personnel (Admin only)"""
    return [UserResponse(**u) for u in port_repo.users.values()]


@router.get("/me", response_model=UserResponse)
def get_me(current_user: UserResponse = Depends(get_current_user)):
    """Retrieve current authenticated user context"""
    return current_user


@router.post("/login", response_model=AuthResponse)
def demo_login(req: LoginRequest):
    """
    Demo login endpoint:
    Accepts user email or role to switch active session context instantly.
    """
    email_clean = req.email.strip().lower()
    user_match = None
    for u in port_repo.users.values():
        if u["email"].lower() == email_clean or (req.role and u["role"].lower() == req.role.lower()):
            user_match = u
            break

    if not user_match:
        # Default to first admin user if matching fails
        user_match = list(port_repo.users.values())[0]

    return AuthResponse(
        token=user_match["email"],
        user=UserResponse(**user_match)
    )

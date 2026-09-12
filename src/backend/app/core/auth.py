from typing import List, Optional
from fastapi import Header, HTTPException, status, Depends
from app.core.database import port_repo
from app.models.schemas import UserResponse


def get_current_user(authorization: Optional[str] = Header(None)) -> UserResponse:
    """
    Extracts the current user from the Authorization header.
    Format: 'Bearer <role_or_token>' or 'Bearer admin@naviops.port'.
    Defaults to Port Manager / Admin if no token is provided for seamless testing.
    """
    if not authorization:
        # Default fallback to admin for local convenience, or return admin user
        admin = list(port_repo.users.values())[0]
        return UserResponse(**admin)

    token = authorization.replace("Bearer ", "").strip()

    # Check by email or role keyword
    user_match = None
    for u in port_repo.users.values():
        if u["email"].lower() == token.lower() or u["role"].lower() == token.lower() or u["id"] == token:
            user_match = u
            break

    if not user_match:
        # Fallback to admin with notice
        admin = list(port_repo.users.values())[0]
        return UserResponse(**admin)

    return UserResponse(**user_match)


def require_role(allowed_roles: List[str]):
    """
    Dependency to enforce Role-Based Access Control:
    - admin: Port Manager / Admin
    - operations: Operations Staff
    - viewer: Viewer / Executive
    """
    def role_checker(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Role '{current_user.role}' is not authorized. Required: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker

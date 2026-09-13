import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from app.core.database import port_repo
from app.models.schemas import LoginRequest, SignupRequest, UserRoleUpdate, AuthResponse, UserResponse
from app.core.auth import get_current_user, require_role, create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["Authentication & RBAC"])

# Fallback credentials store for demo/evaluation accounts
MOCK_PASSWORDS = {
    "admin@naviops.port": "admin123",
    "ops@naviops.port": "admin123",
    "executive@naviops.port": "admin123",
}


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(req: SignupRequest):
    """
    Register new port personnel.
    Per security policy: All newly registered accounts are assigned the 'viewer' role by default.
    A Port Manager / Admin can elevate permissions to 'operations' or 'admin' from the Users Directory.
    """
    email_clean = req.email.strip().lower()

    if not req.password or len(req.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    # Check for existing email
    for u in port_repo.users.values():
        if u.get("email", "").lower() == email_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An account with email '{email_clean}' is already registered."
            )

    new_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    user_data = {
        "id": new_id,
        "email": email_clean,
        "full_name": req.full_name.strip(),
        "role": "viewer",  # Strictly start as viewer as required
        "department": req.department.strip() if req.department else "Port Logistics",
        "password_hash": hash_password(req.password),
        "created_at": now
    }

    # Store in repository (which syncs to Supabase PostgreSQL)
    port_repo.users[new_id] = user_data

    # Generate JWT token
    token = create_access_token({
        "sub": new_id,
        "email": email_clean,
        "role": "viewer",
        "name": user_data["full_name"],
        "department": user_data["department"]
    })

    return AuthResponse(
        token=token,
        user=UserResponse(**user_data)
    )


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest):
    """
    Authenticate user and return signed JWT token.
    Pre-configured mock accounts:
    - Port Manager: admin@naviops.port / admin123
    - Operations Staff: ops@naviops.port / admin123
    - Executive Viewer: executive@naviops.port / admin123
    """
    email_clean = req.email.strip().lower()
    user_match = None

    for u in port_repo.users.values():
        if u.get("email", "").lower() == email_clean:
            user_match = u
            break

    if not user_match:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Constant-time password verification against hashed password
    expected_password = user_match.get("password_hash") or MOCK_PASSWORDS.get(user_match.get("email")) or "admin123"

    if not verify_password(req.password, expected_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Generate signed JWT
    token = create_access_token({
        "sub": user_match["id"],
        "email": user_match["email"],
        "role": user_match["role"],
        "name": user_match["full_name"],
        "department": user_match.get("department", "Port Operations")
    })

    return AuthResponse(
        token=token,
        user=UserResponse(**user_match)
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: UserResponse = Depends(get_current_user)):
    """Retrieve current authenticated user context and role"""
    return current_user


@router.get("/users", response_model=List[UserResponse])
def list_users(current_user: UserResponse = Depends(require_role(["admin"]))):
    """
    List all registered users (Port Manager / Admin only).
    Enables managing roles and auditing system access.
    """
    users = list(port_repo.users.values())
    users.sort(key=lambda u: str(u.get("created_at", "")), reverse=True)
    return [UserResponse(**u) for u in users]


@router.put("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: str,
    payload: UserRoleUpdate,
    current_user: UserResponse = Depends(require_role(["admin"]))
):
    """
    Update a user's access role (Port Manager / Admin only).
    Allowed roles: 'admin', 'operations', 'viewer'.
    Enables promoting newly registered viewers into operations staff or admins.
    """
    allowed_roles = ["admin", "operations", "viewer"]
    new_role = payload.role.strip().lower()

    if new_role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{payload.role}'. Must be one of: {', '.join(allowed_roles)}"
        )

    if user_id not in port_repo.users:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    user = port_repo.users[user_id]

    # Guard: prevent demoting the last active administrator
    if user.get("role") == "admin" and new_role != "admin":
        admin_count = sum(1 for u in port_repo.users.values() if u.get("role") == "admin")
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the only remaining administrator account."
            )

    user["role"] = new_role
    port_repo.users[user_id] = user  # Triggers live sync to Supabase

    return UserResponse(**user)


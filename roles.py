# ----------------------------
# 🛡 Role Helpers
# ----------------------------
def get_user_role(user):
    return user.get("role", "user") if user else "guest"

def is_admin(user):
    return get_user_role(user) == "admin"

def is_manager(user):
    return get_user_role(user) in ["admin", "manager"]

def require_role(user, required):
    role_hierarchy = ["guest", "user", "manager", "admin"]
    user_role = get_user_role(user)
    return role_hierarchy.index(user_role) >= role_hierarchy.index(required)

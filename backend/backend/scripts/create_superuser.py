"""Create or synchronize the single local SIMKO super user."""
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.user import User
import app.models

USERNAME = "superadmin"
PASSWORD = "SuperAdmin@12345"

Base.metadata.create_all(bind=engine)
db = SessionLocal()
try:
    user = db.query(User).filter(User.username == USERNAME).first()
    if user is None:
        user = User(
            username=USERNAME,
            email="superadmin@simko.local",
            full_name="Super User SIMKO",
            nip="SUPER-USER-001",
            service_unit="Mabes AU",
            role="Administrator",
            permissions=["dashboard", "aircraft", "airbase", "scenarios", "ai", "reports", "users"],
            is_approved=True,
            hashed_password=hash_password(PASSWORD),
        )
        db.add(user)
        message = "Super user created"
    else:
        user.role = "Administrator"
        user.permissions = ["dashboard", "aircraft", "airbase", "scenarios", "ai", "reports", "users"]
        user.is_approved = True
        user.hashed_password = hash_password(PASSWORD)
        message = "Super user synchronized"
    db.commit()
    print(message)
    print(f"username: {USERNAME}")
    print(f"role: {user.role}")
    print(f"approved: {user.is_approved}")
finally:
    db.close()

import secrets
from cryptography.fernet import Fernet
import os

env_content = f"""# Backend Environment Configuration
DATABASE_URL=sqlite:///./sug.db
# Production Supabase URL (to be replaced in Render/Railway dashboard):
# DATABASE_URL=postgresql+psycopg2://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres

SECRET_KEY={secrets.token_urlsafe(32)}
ACCESS_TOKEN_EXPIRE_MINUTES=30
BIOMETRIC_ENCRYPTION_KEY={Fernet.generate_key().decode()}
"""

with open('/home/ezekdo/mikey/backend/.env', 'w') as f:
    f.write(env_content)

print("Generated backend/.env securely.")

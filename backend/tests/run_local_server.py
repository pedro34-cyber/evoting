"""Disposable local backend for browser tests; never uses the application database."""
import os, sys, tempfile
sys.dont_write_bytecode = True
from cryptography.fernet import Fernet
test_directory = tempfile.TemporaryDirectory(prefix='sug-browser-')
os.environ['DATABASE_URL'] = 'sqlite:///' + test_directory.name + '/test.db'
os.environ['SECRET_KEY'] = Fernet.generate_key().decode()
os.environ['BIOMETRIC_ENCRYPTION_KEY'] = Fernet.generate_key().decode()
os.environ['ADMIN_EMAIL'] = 'admin@example.org'
os.environ['ADMIN_REGISTRATION_NUMBER'] = 'LOCALADMIN'
os.environ['ADMIN_PASSWORD'] = 'LocalTestingPassword'
os.environ['PYTHONDONTWRITEBYTECODE'] = '1'
sys.path.insert(0, os.getcwd())
import uvicorn
uvicorn.run('app.main:app', host='127.0.0.1', port=8000)

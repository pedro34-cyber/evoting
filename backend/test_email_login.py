import os
from fastapi.testclient import TestClient

os.environ['DATABASE_URL'] = 'sqlite:///./test_email_login.db'

from app.main import app

client = TestClient(app)


def test_student_register_and_login_by_email():
    unique = 'student-email-login-test'
    payload = {
        'full_name': 'Email Login Student',
        'email': f'{unique}@example.com',
        'registration_number': f'R{unique}',
        'password': 'StrongPass123',
        'confirm_password': 'StrongPass123',
    }
    register = client.post('/api/auth/register', json=payload)
    assert register.status_code == 200, register.text

    login = client.post('/api/auth/login', json={'email': payload['email'], 'password': payload['password']})
    assert login.status_code == 200, login.text
    body = login.json()
    assert body['access_token']
    assert body['has_enrolled'] is False

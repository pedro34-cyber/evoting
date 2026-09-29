import requests
import time
import os
import sys

# Setup paths to import models directly to seed an election
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.db import get_db, engine
from app.models import Election, Base
from datetime import datetime, timedelta

# Ensure DB is created
Base.metadata.create_all(bind=engine)
session = next(get_db())
election = Election(name="Test Election", start_time=datetime.utcnow() - timedelta(hours=1), end_time=datetime.utcnow() + timedelta(hours=1))
session.add(election)
session.commit()
session.refresh(election)
election_id = election.id

BASE_URL = "http://localhost:8003/api"

def run_voting_test():
    student_id = f"voter_{int(time.time())}"
    
    # 1. Register and Login
    reg_data = {
        "full_name": "Voting Test User",
        "registration_number": student_id,
        "password": "password123",
        "confirm_password": "password123"
    }
    requests.post(f"{BASE_URL}/auth/register", json=reg_data)
    
    r = requests.post(f"{BASE_URL}/auth/login", json={"registration_number": student_id, "password": "password123"})
    token = r.json()["access_token"]
    
    # 2. Enroll face
    face1_path = os.path.join(os.path.dirname(__file__), "test_faces", "face1.jpg")
    with open(face1_path, 'rb') as f:
        r = requests.post(f"{BASE_URL}/biometric/enroll", files={'file': f}, headers={'Authorization': f'Bearer {token}'})
        assert r.status_code == 200, "Enrollment failed"
        
    # 3. Authorize Ballot
    with open(face1_path, 'rb') as f:
        r = requests.post(f"{BASE_URL}/elections/{election_id}/ballot/authorize", files={'file': f}, headers={'Authorization': f'Bearer {token}'})
        assert r.status_code == 200, f"Authorization failed: {r.status_code}, {r.text}"
        auth_data = r.json()
        assert "voting_token" in auth_data, "No voting token returned"
        voting_token = auth_data["voting_token"]
        print("Ballot authorization successful, got token.")

    # 4. Cast Ballot
    cast_payload = {
        "voting_token": voting_token,
        "encrypted_ballot": "encrypted_dummy_data"
    }
    r = requests.post(f"{BASE_URL}/elections/{election_id}/ballot/cast", json=cast_payload)
    assert r.status_code == 200, f"Cast failed: {r.status_code}, {r.text}"
    print("Ballot cast successfully.")
    
    # 5. Prevent double voting
    r = requests.post(f"{BASE_URL}/elections/{election_id}/ballot/cast", json=cast_payload)
    assert r.status_code == 403, f"Double voting should be blocked, got {r.status_code}"
    print("Double voting correctly blocked.")
    
    print("ALL VOTING FLOW TESTS PASSED")

if __name__ == "__main__":
    run_voting_test()

import requests
import time
import os
import sys
import threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.db import get_db, engine
from app.models import Election, Base
from datetime import datetime, timedelta

# Ensure DB is created
Base.metadata.create_all(bind=engine)
session = next(get_db())
election = Election(name="Concurrent Election", start_time=datetime.now() - timedelta(hours=1), end_time=datetime.now() + timedelta(hours=1))
session.add(election)
session.commit()
session.refresh(election)
election_id = election.id

BASE_URL = "http://localhost:8003/api"
votes = []

def cast_vote(voting_token):
    cast_payload = {
        "voting_token": voting_token,
        "encrypted_ballot": "encrypted_dummy_data"
    }
    r = requests.post(f"{BASE_URL}/elections/{election_id}/ballot/cast", json=cast_payload)
    votes.append(r.status_code)

def run_concurrent_test():
    student_id = f"concurrent_voter_{int(time.time())}"
    
    # 1. Register and Login
    reg_data = {
        "full_name": "Concurrent Voting Test User",
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
        requests.post(f"{BASE_URL}/biometric/enroll", files={'file': f}, headers={'Authorization': f'Bearer {token}'})
        
    # 3. Authorize
    with open(face1_path, 'rb') as f:
        r = requests.post(f"{BASE_URL}/elections/{election_id}/ballot/authorize", files={'file': f}, headers={'Authorization': f'Bearer {token}'})
        voting_token = r.json()["voting_token"]
        
    # 4. Concurrent Cast
    t1 = threading.Thread(target=cast_vote, args=(voting_token,))
    t2 = threading.Thread(target=cast_vote, args=(voting_token,))
    t1.start()
    t2.start()
    t1.join()
    t2.join()
    
    print(f"Votes results: {votes}")
    if votes.count(200) == 1 and votes.count(403) == 1:
        print("PASS: Exactly one vote succeeded, the other was rejected.")
    else:
        print("FAIL: Concurrent voting protection failed.")
        sys.exit(1)

if __name__ == "__main__":
    run_concurrent_test()

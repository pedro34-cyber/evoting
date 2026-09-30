import requests
import json
import time
import os

__test__ = False

BASE_URL = "http://localhost:8001/api"

def get_db_token(student_id="123456"):
    reg_data = {
        "full_name": "Test User",
        "registration_number": student_id,
        "password": "password123",
        "confirm_password": "password123"
    }
    requests.post(f"{BASE_URL}/auth/register", json=reg_data)
    
    login_data = {
        "registration_number": student_id,
        "password": "password123"
    }
    r = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if r.status_code == 200:
        return r.json()["access_token"]
    return None

def test_enrollment(token, img_path):
    with open(img_path, 'rb') as f:
        files = {'file': (os.path.basename(img_path), f, 'image/jpeg')}
        headers = {'Authorization': f'Bearer {token}'}
        r = requests.post(f"{BASE_URL}/biometric/enroll", files=files, headers=headers)
        return r.status_code, r.json()

def test_verification(token, img_path):
    with open(img_path, 'rb') as f:
        files = {'file': (os.path.basename(img_path), f, 'image/jpeg')}
        headers = {'Authorization': f'Bearer {token}'}
        r = requests.post(f"{BASE_URL}/biometric/verify", files=files, headers=headers)
        return r.status_code, r.json()

def run_tests():
    print("Testing biometrics flow...")
    
    face1_path = os.path.join(os.path.dirname(__file__), "test_faces", "face1.jpg")
    face2_path = os.path.join(os.path.dirname(__file__), "test_faces", "face2.jpg")
    no_face_path = os.path.join(os.path.dirname(__file__), "test_faces", "no_face.jpg")
    
    # 1. Register and Login
    student_id = f"test_{int(time.time())}"
    token = get_db_token(student_id)
    assert token, "Login failed"
    print("1. Login successful")
    
    # 2. Test No Face Enrollment
    status, data = test_enrollment(token, no_face_path)
    assert status == 400, f"Expected 400 for no face, got {status}"
    print("2. No Face Enrollment correctly rejected")
    
    # 3. Test Valid Face Enrollment
    status, data = test_enrollment(token, face1_path)
    assert status == 200, f"Enrollment failed: {status}, {data}"
    print("3. Valid Face Enrollment successful")
    
    # 4. Test Duplicate Enrollment
    # Since old logic overwrote it, we should just ensure it doesn't 500 error
    status, data = test_enrollment(token, face1_path)
    assert status == 200, f"Duplicate enrollment should be a success, got {status}"
    print("4. Duplicate Enrollment successfully overwritten")
    
    # 5. Test Verification with Same Face
    status, data = test_verification(token, face1_path)
    assert status == 200, f"Verification with valid face failed HTTP status: {status}, {data}"
    assert data.get("matched") is True, f"Verification match failed: {data}"
    print("5. Valid Face Verification successful")
    
    # 6. Test Verification with Different Face
    status, data = test_verification(token, face2_path)
    # The API returns 200 OK but with matched = False according to the verify endpoint
    assert status == 200, f"Expected 200 for different face with matched=False, got {status}, {data}"
    assert data.get("matched") is False, f"Different face incorrectly matched: {data}"
    print("6. Different Face Verification correctly rejected")
    
    print("ALL BIOMETRIC TESTS PASSED")

if __name__ == "__main__":
    run_tests()

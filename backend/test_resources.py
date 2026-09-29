import requests
import time
import os
import psutil

BASE_URL = "http://localhost:8001/api"
process = None
for p in psutil.process_iter(['pid', 'name', 'cmdline']):
    if p.info['cmdline'] and 'uvicorn' in ' '.join(p.info['cmdline']):
        process = p
        break

if not process:
    print("Could not find backend process to monitor RAM")
    exit(1)

def get_ram_mb():
    return process.memory_info().rss / (1024 * 1024)

print(f"Idle RAM: {get_ram_mb():.2f} MB")

student_id = f"voter_{int(time.time())}"

# 1. Register and Login
reg_data = {
    "full_name": "Resource Test User",
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

# 3. Verification loop
latencies = []
peak_ram = 0

for i in range(10):
    start = time.time()
    with open(face1_path, 'rb') as f:
        r = requests.post(f"{BASE_URL}/biometric/verify", files={'file': f}, headers={'Authorization': f'Bearer {token}'})
    lat = time.time() - start
    latencies.append(lat)
    
    current_ram = get_ram_mb()
    if current_ram > peak_ram:
        peak_ram = current_ram

print(f"Peak RAM during verification: {peak_ram:.2f} MB")
print(f"Average latency: {sum(latencies)/len(latencies):.3f}s")
print(f"End RAM: {get_ram_mb():.2f} MB")

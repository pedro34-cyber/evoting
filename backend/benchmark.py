import os
import psutil
import time

def get_ram():
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / (1024 * 1024)

print(f"RAM before import: {get_ram():.2f} MB")

start_time = time.time()
from deepface import DeepFace
import cv2
import numpy as np

print(f"RAM after import: {get_ram():.2f} MB")
print(f"Startup time (import): {time.time() - start_time:.2f} seconds")

# Create a dummy image (black square) to simulate a face image
img = np.zeros((400, 400, 3), dtype=np.uint8)
cv2.rectangle(img, (100, 100), (300, 300), (255, 255, 255), -1)

print("Running first dummy extraction...")
start_time = time.time()
try:
    faces = DeepFace.extract_faces(img_path=img, enforce_detection=False)
except Exception as e:
    print("Extraction error:", e)

print(f"RAM after first extraction/verification: {get_ram():.2f} MB")
print(f"Time for first extraction: {time.time() - start_time:.2f} seconds")

print("Running 5 sequential verifications...")
for i in range(5):
    try:
        DeepFace.verify(img1_path=img, img2_path=img, model_name="VGG-Face", distance_metric="cosine", enforce_detection=False)
    except Exception as e:
        print("Verify error:", e)

print(f"RAM after 5 sequential verifications: {get_ram():.2f} MB")

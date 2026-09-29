import os
import psutil
import time
import urllib.request
import cv2
import numpy as np

def get_ram():
    return psutil.Process(os.getpid()).memory_info().rss / (1024 * 1024)

print(f"RAM before OpenCV: {get_ram():.2f} MB")

# Download models if needed
yunet_url = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
sface_url = "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"

if not os.path.exists("yunet.onnx"):
    print("Downloading YuNet...")
    urllib.request.urlretrieve(yunet_url, "yunet.onnx")
if not os.path.exists("sface.onnx"):
    print("Downloading SFace...")
    urllib.request.urlretrieve(sface_url, "sface.onnx")

start = time.time()
detector = cv2.FaceDetectorYN.create("yunet.onnx", "", (320, 320), score_threshold=0.9, nms_threshold=0.3, top_k=5000)
recognizer = cv2.FaceRecognizerSF.create("sface.onnx", "")
print(f"RAM after loading models: {get_ram():.2f} MB")
print(f"Time to load models: {time.time()-start:.2f} s")

# Dummy image
img = np.zeros((400, 400, 3), dtype=np.uint8)
cv2.rectangle(img, (100, 100), (300, 300), (255, 255, 255), -1)

# Detection
start = time.time()
detector.setInputSize((img.shape[1], img.shape[0]))
_, faces = detector.detect(img)
print(f"Time for detection: {time.time()-start:.2f} s")
print(f"RAM after detection: {get_ram():.2f} MB")

# Alignment and Extraction
if faces is not None:
    start = time.time()
    aligned = recognizer.alignCrop(img, faces[0])
    feature = recognizer.feature(aligned)
    print(f"Time for feature extraction: {time.time()-start:.2f} s")
else:
    print("No faces detected in dummy image (expected for black square). Let's force an empty feature for RAM measurement.")
    feature = np.zeros((1, 128), dtype=np.float32)

print(f"RAM after extraction: {get_ram():.2f} MB")

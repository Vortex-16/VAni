import requests
import base64
import json
import os

# Path to the base64 file
file_path = r"c:\Users\SRINJOYEE\Desktop\s-buddy3\D-Buddy\artifacts\api-server\test_image_b64.txt"

with open(file_path, "r") as f:
    imageBase64 = f.read().strip()

# Create the JSON body
payload = {"image": imageBase64}

# Send the POST request
try:
    response = requests.post("http://localhost:8100/analyze", json=payload)
    print(f"Status Code: {response.status_code}")
    print("Response JSON:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")

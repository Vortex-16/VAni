import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv(r"c:\Users\SRINJOYEE\Desktop\s-buddy3\D-Buddy\.env")
api_key = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=api_key)

print("Available models:")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print(f"Error listing models: {e}")

# 🏥 Discharge Buddy

**Discharge Buddy** is a premium AI-powered recovery assistant designed to bridge the gap between hospital discharge and full recovery. It helps patients manage complex prescriptions, track symptoms, and stay on top of follow-up appointments with ease.

## 🚀 Key Features

- **📸 Smart Prescription Scanner:** Instantly convert handwritten or printed prescriptions into digital schedules using cutting-edge OCR and Vision models.
- **💊 Automated Medication Management:** Automatically generates reminders, dosages, and timing instructions based on scanned prescriptions.
- **📊 Symptom & Vital Tracking:** Log daily recovery progress, pain levels, and symptoms to share with healthcare providers.
- **📅 Follow-up Management:** Keep track of post-discharge appointments and medical tests.
- **🧠 Intelligent Insights:** AI-driven explanations of prescriptions in plain, simple language for patients and caregivers.

## 🛠️ Technology Stack

### AI Pipeline (State-of-the-Art)
- **OCR Engine:** NVIDIA Nemotron-Parse (`nvidia/nemotron-parse`) for high-accuracy handwriting recognition.
- **Structuring & Reasoning:** Groq Cloud (`llama-3.3-70b-versatile`) for instant medical data extraction and summarization.

### Frontend
- **React Native (Expo):** Cross-platform mobile experience.
- **Expo Router:** File-based routing for mobile.
- **Reanimated & Moti:** Premium, smooth animations and UI transitions.

### Backend & Infrastructure
- **Node.js (Express):** High-performance REST API.
- **Drizzle ORM:** Type-safe database interactions.
- **PostgreSQL (Neon):** Serverless database for medical records.
- **JWT Authentication:** Secure patient data management.

## ⚙️ Setup & Installation

### 1. Environment Variables
Create a `.env` file in the root directory and add the following:

```env
# Backend Configuration
PORT=3000
JWT_SECRET=your_jwt_secret

# Database
DATABASE_URL=your_neon_postgresql_url

# AI API Keys
NVIDIA_API_KEY=your_nvidia_api_key
GROQ_API_KEY=your_groq_api_key

# Frontend Configuration
EXPO_PUBLIC_API_URL=http://<your-local-ip>:3000
```

### 2. Backend Setup
```bash
cd artifacts/api-server
pnpm install
pnpm run dev
```

### 3. Mobile App Setup
```bash
cd artifacts/discharge-buddy
pnpm install
npx expo start
```

## 📝 Presentation Assets
Relevant project assets, including integration plans and pitch materials, can be found in the `PPT Assests` folder.

---
*Built for the Google Solution Challenge & GDG Community.*

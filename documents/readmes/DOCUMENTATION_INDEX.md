# 📚 VAni - Complete Documentation Index

**Last Updated**: June 15, 2026  
**Status**: ✅ Voice Assistant, Real-time Messaging, Safety (SOS) Suite, and Caregiver Ecosystem Fully Implemented & Documented

---

## 🎯 What VAni Is

**VAni** is a voice-first, AI-powered care companion designed to bridge the gap between hospital discharge and full recovery. It connects **patients**, **caregivers**, and **families** through structured checklists, real-time messaging, safety panels, and natural language voice interactions.

### Core Subsystems:
1. **🎙️ Voice Assistant ("Buddy")**: Hands-free neural voice engine powered by Groq Whisper and Microsoft Edge TTS supporting 14 Indian & international languages with persistent memory and screen-context aware query resolution.
2. **🚨 Emergency (SOS) Suite**: Global phone-shake and 5×-tap panic triggers, deterministic offline emergency word interception, SMS location sharing, and a voice-guided **CPR & Choking Coach** with a 110 BPM metronome.
3. **💬 Real-Time Messaging**: Scoped patient-caregiver-family threads running over Server-Sent Events (SSE) with push-notification fallback, auto-synced context resolution, and keyboard-adaptive UI.
4. **🩺 Health & Medical Utilities**: Location-based community **Emergency Blood Network** (compatible matching + distance sorting) and a Groq-powered **Drug Interaction Checker**.
5. **📸 Smart OCR Scanner**: Multi-stage Vision-Language ensemble parser for handwritten and printed prescriptions.

---

## 📖 Complete Documentation Map

Below is a map of all **14 documentation files** located in this directory (`documents/readmes/`), categorized by concern.

### 🚀 Getting Started & Environment Setup
*   **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** ⭐
    *   *Purpose*: The 5-minute setup guide. Contains startup commands, verify scripts, and a quick troubleshooting lookup table.
*   **[ENV_SETUP.md](./ENV_SETUP.md)**
    *   *Purpose*: Detailed guide on all local and production environment variables required by the frontend, backend API server, and database layers.
*   **[replit.md](./replit.md)**
    *   *Purpose*: Setup instructions specifically customized for running and testing the backend/database in Replit sandboxes.

### 🔐 Authentication & Google OAuth
*   **[GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)**
    *   *Purpose*: Comprehensive console configuration walkthrough for Google Cloud, explaining how to register Web, Android, and iOS client IDs.
*   **[MOBILE_GOOGLE_OAUTH_SETUP.md](./MOBILE_GOOGLE_OAUTH_SETUP.md)**
    *   *Purpose*: Native configuration guidelines for Google OAuth on standalone native mobile builds (EAS/Android APKs).
*   **[AUTH_FLOW_AND_RBAC.md](./AUTH_FLOW_AND_RBAC.md)**
    *   *Purpose*: In-depth explanation of Google OAuth and Email/Password registration pipelines, role assignments, and token management.
*   **[OAUTH_FIXES_SUMMARY.md](./OAUTH_FIXES_SUMMARY.md)**
    *   *Purpose*: Developer summary detailing the Android Google OAuth crash fixes, Expo Go web fallbacks, and verification procedures.

### 🏗️ Architecture & Core Features
*   **[doc.md](./doc.md)** ⭐
    *   *Purpose*: The master implementation journal. Documents all 15 core iteration phases (Voice Provider, intent routing, Microsoft Edge TTS migration, SSE chat streams, blood network schemas, CPR metronome, and Cloud Run deployments).
*   **[ROLE_AND_PATIENT_LINKING_ARCHITECTURE.md](./ROLE_AND_PATIENT_LINKING_ARCHITECTURE.md)**
    *   *Purpose*: Technical architecture document explaining the database schema, role-based access control, and the `care_links` relationships between patients, caregivers, and family members.
*   **[COMPLETE_SUMMARY.md](./COMPLETE_SUMMARY.md)**
    *   *Purpose*: Overview of the debug sprint covering Google OAuth resolution, email verification, and push notifications compatibility.
*   **[IMPLEMENTATION.md](./IMPLEMENTATION.md)**
    *   *Purpose*: Technical specifications, module structure, and file mappings of the VAni React Native frontend and Node.js backend.

### 🔌 API Guides
*   **[API.md](./API.md)**
    *   *Purpose*: Summary list of core endpoints, payloads, and response headers for authentication, patient profiles, and medical schedules.
*   **[BACKEND_GUIDE.md](./BACKEND_GUIDE.md)**
    *   *Purpose*: Backend architectural guide outlining router setup, ORM queries, environment handling, and service integrations.

---

## 🗂️ Quick Navigation

### By Developer Task
*   **"I want to run the app right now."** → Refer to [QUICK_REFERENCE.md](./QUICK_REFERENCE.md).
*   **"I need to configure Google Logins."** → Refer to [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md).
*   **"I want to understand how voice commands are routed."** → Refer to [doc.md](./doc.md#section-6--demo-narrative).
*   **"I want to test real-time messaging."** → Refer to [doc.md](./doc.md#section-13--edge-tts-switch-multilingual-stt-fixes--messaging-smoke-test).
*   **"I want to deploy the backend to Google Cloud Run."** → Refer to [doc.md](./doc.md#section-15--cloud-run-deploy-fix-container-failed-to-start-on-port-8080).

### By User Role
*   **👨‍💻 Developer**:
    1. Check prerequisites and run verification: `./verify-setup.ps1` (Windows) or `bash verify-setup.sh` (macOS/Linux).
    2. Read [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) to boot the servers.
    3. Study [doc.md](./doc.md) to understand current voice/chat hooks.
*   **🧪 QA / Tester**:
    1. Verify core setup: Run the verification scripts.
    2. Test voice triggers offline (e.g., say "Help" or "Emergency" while offline) to verify the client-side deterministic safety guard.
    3. Run the messaging integration suite: `node artifacts/api-server/smoke-test-messaging.mjs`.
*   **🔐 DevOps / Security**:
    1. Review [ENV_SETUP.md](./ENV_SETUP.md) for production secrets.
    2. Configure production database access and set up environment YAML files using `scripts/cloudrun.env.example.yaml`.

---

## 🔄 Codebase File Map (Actual Paths)

| Feature / System | Key Frontend Files | Key Backend Files |
| :--- | :--- | :--- |
| **Voice Overlay & FAB** | `AssistantOverlay.tsx`, `VoiceOrb.tsx` | — |
| **Voice State Machine** | `AssistantProvider.tsx`, `useVoiceSession.ts` | `ai.ts` (`/stt`, `/intent`) |
| **Edge TTS Engine** | `AppContext.tsx` (`speakNeural`) | `ai.ts` (`/tts` via `@andresaya/edge-tts`) |
| **Real-time Chat** | `caregiver-chat.tsx` | `chat.ts` (SSE `/stream` + `/send`) |
| **Emergency (SOS)** | `smart-sos.tsx`, `SmartSOSProvider.tsx` | `emergencyService.ts` |
| **CPR Coach** | `cpr.tsx` (pulsing Reanimated orb) | — |
| **Blood Network** | `blood-network.tsx` | `bloodNetwork.ts`, `bloodCompat.ts` |
| **Drug Checker** | `drug-checker.tsx` | `ai.ts` (`/drug-check`) |
| **Database Schemas** | — | `lib/db/src/schema/index.ts` |

---

## 🛠️ Verification & Run Status

The codebase compiles and verifies cleanly across both native and server workspaces:
*   **Backend Server**: ✅ Clean typecheck (`pnpm run typecheck`) and bundles successfully (`pnpm run build`).
*   **Frontend Mobile**: ✅ Clean typecheck (`pnpm run typecheck`) and bundles cleanly into Expo production output.
*   **Database Migrations**: ✅ Complete. Blood network and messaging tables are live (schemas detailed in `lib/db/src/schema/index.ts`).

---

## 🚨 Essential Environment Requirements

Before running the server, make sure the following variables are configured in your local `.env` or production environment:
1.  `DATABASE_URL`: Connection string to the Postgres server (Neon/SSL).
2.  `GROQ_API_KEY`: Required for Whisper-large STT, Llama-3.3 intent detection, and conversational AI.
3.  `JWT_SECRET`: For role-based token creation.
4.  `EXPO_PUBLIC_API_URL`: Backend server address reachable by your mobile/web client.

*No API key is required for Voice Synthesis (TTS) since VAni uses a direct wrapper for Microsoft Edge TTS.*

---

## 🤝 Getting Help & Troubleshooting

| Error / Issue | Probable Cause | Recommended Document |
| :--- | :--- | :--- |
| **Google Sign-In hangs or cancels** | Missing redirect URI in Google Cloud Console or missing client ID. | [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) |
| **App crashes on notification fetch** | Expo Go SDK 53+ does not support native push registration. | [QUICK_REFERENCE.md](./QUICK_REFERENCE.md#-common-issues--fixes) |
| **"DATABASE_URL must be set" on deploy** | Cloud Run did not load env vars. | [doc.md](./doc.md#section-15--cloud-run-deploy-fix-container-failed-to-start-on-port-8080) |
| **Chat fails to deliver/connect** | DB chat table needs to be created or server lacks CORS settings. | [doc.md](./doc.md#section-13--edge-tts-switch-multilingual-stt-fixes--messaging-smoke-test) |

---
**VAni Documentation Suite** • Built with ❤️ for the Google Solution Challenge 2026.

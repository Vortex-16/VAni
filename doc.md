# Discharge Buddy Documentation

## SECTION 1 — Repository Analysis

### Architecture Summary
Discharge Buddy follows a modern React Native (Expo) frontend with an Express/Node.js backend, and a Python-based OCR service. The application uses context-based state management with separate providers for Authentication, Localization, and Voice functionalities. The architecture is designed to support patient-caregiver linked roles, enabling seamless information sharing.

### Dependency Map
- **Frontend**: React Native (Expo), React Navigation (for routing), Context API (State Management)
- **Backend APIs**: Node.js/Express (API Server)
- **OCR Service**: Python-based document scanning microservice
- **Voice Assistant (Buddy)**: Web Speech API / Native STT modules for speech recognition, integrated into the global overlay.

### Risk Areas
- **State Coupling**: Potential tight coupling between chatbot logic and voice overlay.
- **Performance**: Simultaneous running of OCR, voice listening, and rendering complex UI could lead to memory leaks or stuttering, especially on low-end devices.
- **Android Lifecycle**: Voice background processes might be killed by aggressive Android battery optimization.

### Extension Points
- **Provider Layer**: `VoiceProvider` and `LocaleProvider` are well isolated, allowing insertion of advanced NLP routing and translation APIs.
- **Action Handlers**: Intent routing engine can be plugged into the existing Voice Assistant state machine.

---

## SECTION 2 — Current Voice System Analysis

### Current Implementation Status

**Phase 1 (Completed):**
- Speech-to-text integration
- Microphone permissions handling
- Transcript generation pipeline
- Auto-send logic based on silence detection
- Basic chatbot text integration
- Voice lifecycle (start, stop, error states)

**Phase 2 (Completed):**
- Base assistant provider architecture
- Global overlay architecture (Orb/Blob UI)
- Assistant state management (idle, listening, processing, speaking)
- Session manager for conversational continuity
- Global infrastructure for cross-screen activation
- Foundational context injection

### Implementation Matrix

| Feature | Status | Files | Working? | Missing Pieces | Risks |
|---------|--------|-------|----------|----------------|-------|
| STT Engine | Phase 1 | `context/VoiceProvider.tsx` | Yes | Multilingual STT robustness | Background termination |
| Voice Permissions | Phase 1 | `utils/permissions.ts` | Yes | Granular error recovery | OS updates breaking flows |
| Chatbot Integration | Phase 1 | `components/Chatbot.tsx` | Yes | Separation of text vs voice logic | Tight UI coupling |
| Overlay Architecture | Phase 2 | `components/VoiceOverlay.tsx` | Yes | Z-index conflicts on modals | Performance overhead |
| Assistant States | Phase 2 | `hooks/useVoiceState.ts` | Yes | Interruptions handling | Race conditions in state transitions |
| Session Manager | Phase 2 | `lib/SessionManager.ts` | Yes | Long-term context persistence | Memory leaks on unmount |

---

## SECTION 3 — Final Product Vision

### Buddy - The Voice-First Assistant

**Goal:**
Users should operate the app primarily using voice, reducing the need for screen navigation, especially for elderly patients or users with accessibility needs.

**Examples:**
- *"Buddy turn on"*
- *"Open medicine page"*
- *"Write journal"*
- *"Scan this prescription"*
- *"Log me out"*
- *"Change language to Bengali"*
- *"Tell my daughter I took medicine"*
- *"Show activity"*

The assistant should feel like:
*"I am talking to my app."*
not:
*"I am navigating screens."*

**Architecture Required:**
To achieve this, the architecture will pivot from a Screen-First MVC to an **Intent-First Routing Architecture**. The global Voice Provider will intercept speech, process intent, and dispatch actions that either manipulate the screen UI visually or perform operations silently in the background (like logging medicine) while providing auditory feedback.

---

## SECTION 4 — Features to be implemented Matrix

| Feature | Description | Why Needed | Dependencies | Priority | Complexity | Suggested Phase |
|---------|-------------|------------|--------------|----------|------------|-----------------|
| Text-to-Speech | Voice playback of app responses | Core "Buddy" experience | VoiceProvider | High | Medium | Phase 3 |
| Speaking States | Visual orb feedback while talking | User engagement | Overlay UI | High | Low | Phase 3 |
| Continuous Loop | Keep mic active after response | Hands-free flow | Session Manager | High | High | Phase 3 |
| Wake Word | "Hey Buddy" activation | Hands-free init | Native Audio | High | High | Phase 9 |
| Voice Interruption | Stop speaking when user talks | Natural conversation | TTS Engine | Medium | High | Phase 9 |
| Bengali Support | Full UI/Voice Bengali translation | Target demographic | LocaleProvider | High | Medium | Phase 4 |
| Multilingual STT/TTS | Process native languages | Accessibility | Cloud APIs | High | High | Phase 4 |
| Context Persistence | Remember past conversation turns | Natural dialogue | DB/Storage | Medium | Medium | Phase 5 |
| Intent Routing | Map voice to app actions | Core voice control | Router | High | High | Phase 6 |
| Medicine Voice Log | "I took my pill" -> Logs it | Ease of use | Medicine Module | High | Medium | Phase 8 |
| Family Voice Notes | Voice messages to caregivers | Connectivity | Auth/Roles | Low | Medium | Phase 8 |
| Simplified Mode | Large text, high contrast | Accessibility | Settings Context | Medium | Low | Phase 10 |
| Emergency Triggers | Voice-activated SOS | Safety | OS APIs | High | Medium | Phase 8 |
| Offline Mode | Basic STT without internet | Reliability | Local ML Models | Low | High | Phase 10 |

---

## SECTION 5 — Phased Roadmap

### Phase 1: Completed (Foundations)
*Speech-to-text, Permissions, basic chatbot integration.*

### Phase 2: Completed (Overlay & State)
*Global UI overlay, Orb visualizer, session management.*

### Phase 3: TTS & Speaking Loop
- **Goals:** Give Buddy a voice and allow continuous back-and-forth dialogue without pressing buttons repeatedly.
- **Dependencies:** Text-to-Speech native modules/APIs.
- **Files Affected:** `VoiceProvider.tsx`, `VoiceOverlay.tsx`, `Chatbot.tsx`.
- **Risks:** Audio ducking issues, loop getting stuck in listening state.
- **Testing Checklist:** Ensure TTS triggers properly, verify UI reflects speaking state, test continuous conversation.

### Phase 4: Multilingual Pipeline
- **Goals:** Support Bengali and other regional languages for both TTS and STT.
- **Dependencies:** Cloud Translation / localized STT models.
- **Files Affected:** `LocaleProvider.tsx`, `translate.ts`, `VoiceProvider.tsx`.
- **Risks:** Latency in translation layer.
- **Testing Checklist:** Speak Bengali, verify text translation, verify response TTS is in Bengali.

### Phase 5: Memory & Persistence
- **Goals:** Enable Buddy to remember context across sessions.
- **Dependencies:** Local SQLite or SecureStore.
- **Files Affected:** `SessionManager.ts`, `api-server/models`.
- **Risks:** Privacy and data security of voice transcripts.
- **Testing Checklist:** Recall previous turns, verify journal linking.

### Phase 6: Intent Routing & Actions
- **Goals:** Convert "Open Medicine" to navigation events.
- **Dependencies:** React Navigation ref access.
- **Files Affected:** New `IntentRouter.ts`, `App.tsx`.
- **Risks:** Breaking existing navigation tree.
- **Testing Checklist:** Test 10 core navigation intents via voice.

### Phase 7: Context Engine
- **Goals:** Buddy knows what screen the user is looking at to resolve ambiguous queries ("What is this?").
- **Dependencies:** Navigation state listener.
- **Files Affected:** `ContextEngine.ts`.
- **Risks:** Stale state leading to wrong context.
- **Testing Checklist:** Ask contextual questions on 3 different screens.

### Phase 8: Medicine & Caregiver Ecosystem
- **Goals:** Full voice operation for medicine logging and alerting caregivers.
- **Dependencies:** Medicine API, Push Notifications.
- **Files Affected:** `MedicineModule`, `NotificationHelper.ts`.
- **Risks:** Missing critical dose logging.
- **Testing Checklist:** Voice log a medicine, verify caregiver receives push notification.

### Phase 9: Wake Word System
- **Goals:** Hands-free activation.
- **Dependencies:** Native wake-word SDKs (e.g., Porcupine).
- **Files Affected:** Native Android/iOS modules.
- **Risks:** High battery drain, false positives.
- **Testing Checklist:** Say wake word from sleep mode, check battery impact.

### Phase 10: Optimization
- **Goals:** Offline mode, battery profiling, animation cleanup.

---

## SECTION 6 — Demo Narrative

**Flow:**
1. **Patient wakes up.**
2. **Buddy greets user:** *"Good morning, you have two medicines to take."* (Proactive TTS)
3. **User speaks Bengali:** *"Ami aamar osudh kheyechi."* (STT + Multilingual)
4. **Assistant responds correctly:** Logs medicine in background, responds *"Noted, I have updated your chart."*
5. **OCR scans prescription:** User asks Buddy to scan a new bottle. Buddy opens camera, scans, and parses instructions.
6. **Journal updated by voice:** *"Write in my journal that I am feeling energetic today."*
7. **Caregiver receives updates:** Daughter's app receives a silent push notification: *Mom took her morning meds and is feeling energetic.*
8. **Patient never touches keyboard:** The entire 5-minute interaction was completely hands-free.

**Why this demo is compelling:**
It demonstrates a complete paradigm shift. The application stops being a digital form the patient has to fill out, and becomes an invisible companion that naturally integrates into their daily life. It solves the core problem of digital literacy and physical limitations for elderly patients, while providing immense peace of mind to the caregiver network.

---

## SECTION 7 — Risks + Missing Pieces

| Risk | Severity | Impact | Suggested Fix |
|------|----------|--------|---------------|
| **Battery Drain (Wake Word)** | High | App gets uninstalled | Use hardware-accelerated DSP wake-word engines and sleep aggressively. |
| **Android Lifecycle Kills** | High | Silent failures | Implement robust Foreground Services with persistent notification for Voice Provider. |
| **Voice Overlap / Barge-in** | Medium | Frustrating UX | Implement local echo cancellation and interrupt flags in `VoiceProvider`. |
| **Multilingual Latency** | Medium | Unnatural pauses | Edge-based language detection and optimistic UI updates. |
| **Permissions Revocation** | Low | STT breaks silently | Add app-state listener to re-prompt gracefully if permissions are revoked in settings. |
| **Performance Overhead** | Medium | UI stutters | Offload OCR and heavy processing to Web Workers or Native Threads via Reanimated. |

---

## SECTION 8 — Output Format Notes

*Note to contributors:*
This document acts as the definitive roadmap for Discharge Buddy. When adding new features, always ask: **"How does this work with voice?"**
Do not build features that can only be accessed via deep, nested UI menus. Ensure all core actions are exposed via the Intent Router.

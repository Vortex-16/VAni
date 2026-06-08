import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useVoiceSession } from '@/hooks/assistant/useVoiceSession';
import { useAssistantContext } from '@/hooks/assistant/useAssistantContext';
import { useAssistantEvents } from '@/hooks/assistant/useAssistantEvents';
import { useApp } from '@/context/AppContext';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import type { Language } from '@/constants/translations';

export type AssistantState =
  | 'idle'
  | 'initializing'
  | 'listening'
  | 'speech_detected'
  | 'transcribing'
  | 'sending'
  | 'processing'
  | 'speaking'
  | 'sleeping'
  | 'error'
  | 'permission_denied'
  | 'interrupted';

interface AssistantContextValue {
  state: AssistantState;
  isVisible: boolean;
  meteringSharedValue: any;
  lastTranscript: string | null;
  lastReply: string | null;
  error: string | null;
  startAssistant: () => Promise<void>;
  stopAssistant: () => Promise<void>;
  cancelAssistant: () => Promise<void>;
  dismissOverlay: () => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant must be used within an AssistantProvider');
  }
  return context;
}

// ── Voice → screen map. Every target the backend intent router can return for a
//    NAVIGATE intent has a destination + a human label spoken back to the user. ──
const NAV_ROUTES: Record<string, { path: string; label: string }> = {
  medicines: { path: '/(tabs)/medicines', label: 'your medicines' },
  symptoms: { path: '/(tabs)/symptoms', label: 'your symptoms' },
  progress: { path: '/(tabs)/progress', label: 'your progress' },
  schedule: { path: '/(tabs)/schedule', label: 'your schedule' },
  followups: { path: '/(tabs)/followups', label: 'your follow ups' },
  home: { path: '/(tabs)', label: 'home' },
  journal: { path: '/journal', label: 'your journal' },
  scan: { path: '/scan', label: 'the prescription scanner' },
  chat: { path: '/chat', label: 'the chat' },
  profile: { path: '/profile', label: 'your profile' },
  settings: { path: '/settings', label: 'settings' },
  notifications: { path: '/notifications', label: 'your notifications' },
  emergency: { path: '/emergency', label: 'the emergency screen' },
};

const LOCALE_BY_LANG: Record<string, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  es: 'es-ES',
  ur: 'ur-PK',
};

const LANG_SWITCH_REPLY: Record<string, string> = {
  en: 'Okay, switching to English.',
  hi: 'ठीक है, अब मैं हिंदी में बात करूँगा।',
  es: 'De acuerdo, ahora hablaré en español.',
  ur: 'ٹھیک ہے، اب میں اردو میں بات کروں گا۔',
};

// Strip emojis / pictographs so the TTS engine doesn't read them aloud.
function stripForSpeech(text: string): string {
  return text
    .replace(
      /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA9F}\u{1FAA0}-\u{1FAFF}\u{200D}\u{20E3}\u{FE0F}]/gu,
      '',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AssistantState>('idle');
  const [isVisible, setIsVisible] = useState(false);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [lastReply, setLastReply] = useState<string | null>(null);

  const { activeModule } = useAssistantContext();
  const events = useAssistantEvents();
  const {
    api,
    language,
    setLanguage,
    logout,
    triggerEmergency,
    todayDoses,
    updateDoseStatus,
    stopSpeaking,
  } = useApp();

  // When true, the assistant keeps the mic open after answering a conversational
  // (CHAT) turn so the user can keep talking hands-free. Any explicit stop,
  // navigation or action clears it so we never loop forever.
  const continueConversationRef = useRef(false);
  const startAssistantRef = useRef<() => Promise<void>>(async () => {});

  // ── Speak a phrase and resolve when playback finishes. ──
  const speak = useCallback(
    (text: string, localeOverride?: string) =>
      new Promise<void>((resolve) => {
        const clean = stripForSpeech(text);
        if (!clean) {
          resolve();
          return;
        }
        try {
          Speech.stop();
          Speech.speak(clean, {
            language: localeOverride || LOCALE_BY_LANG[language] || 'en-US',
            pitch: 1.0,
            rate: 0.95,
            onDone: () => resolve(),
            onStopped: () => resolve(),
            onError: () => resolve(),
          });
        } catch {
          resolve();
        }
      }),
    [language],
  );

  const finish = useCallback(() => {
    setState('idle');
    setIsVisible(false);
  }, []);

  // ── Handlers for ACTION-type intents (things that DO something). ──
  const handleAction = useCallback(
    async (target: string, currentTranscript: string): Promise<void> => {
      let reply = '';

      switch (target) {
        case 'TAKE_MEDICINE': {
          const lowerTranscript = currentTranscript.toLowerCase();
          const isAll = lowerTranscript.includes('all');
          let pendingDoses = todayDoses.filter((d) => d.status === 'pending');
          
          if (pendingDoses.length === 0) {
            reply = `I don't see any pending doses right now — you're all caught up!`;
          } else {
            const mentionedMed = pendingDoses.find(d => lowerTranscript.includes(d.medicineName.toLowerCase()));
            
            let dosesToMark = [];
            if (mentionedMed && isAll) {
              dosesToMark = pendingDoses.filter(d => d.medicineName.toLowerCase() === mentionedMed.medicineName.toLowerCase());
            } else if (mentionedMed) {
              dosesToMark = [mentionedMed];
            } else if (isAll) {
              dosesToMark = pendingDoses;
            } else {
              dosesToMark = [pendingDoses[0]];
            }

            try {
              await Promise.all(dosesToMark.map(d => updateDoseStatus(d.id, 'taken')));
              const names = Array.from(new Set(dosesToMark.map(d => d.medicineName))).join(' and ');
              reply = `Done. I've marked ${names} as taken. Great job staying on track!`;
            } catch {
              reply = `I couldn't update those doses just now. Please try from the medicines screen.`;
            }
          }
          setLastReply(reply);
          setState('speaking');
          await speak(reply);
          finish();
          return;
        }
        case 'NAVIGATE_TO_MEDICINES': {
          reply = `I cannot update schedules directly, but I am taking you to the medicines page where you can change the timings.`;
          setLastReply(reply);
          setState('speaking');
          await speak(reply);
          router.push('/(tabs)/medicines');
          finish();
          return;
        }
        case 'LOG_SYMPTOM': {
          reply = "Let's note down how you're feeling.";
          setLastReply(reply);
          setState('speaking');
          router.push('/(tabs)/symptoms' as any);
          await speak(reply);
          finish();
          return;
        }
        case 'ADD_MEDICINE': {
          reply = 'Opening your medicines so you can add a new one.';
          setLastReply(reply);
          setState('speaking');
          router.push('/(tabs)/medicines' as any);
          await speak(reply);
          finish();
          return;
        }
        case 'TRIGGER_EMERGENCY': {
          reply = "Hang on — I'm getting help for you right now.";
          setLastReply(reply);
          setState('speaking');
          try {
            await triggerEmergency();
          } catch {
            // Even if the alert call fails, still take the user to the SOS screen.
          }
          router.push('/emergency' as any);
          await speak(reply);
          finish();
          return;
        }
        case 'LOGOUT': {
          reply = 'Okay, logging you out. Take care!';
          setLastReply(reply);
          setState('speaking');
          continueConversationRef.current = false;
          await speak(reply);
          finish();
          logout();
          return;
        }
        case 'LANG_EN':
        case 'LANG_HI':
        case 'LANG_ES':
        case 'LANG_UR': {
          const code = target.replace('LANG_', '').toLowerCase() as Language;
          setLanguage(code);
          reply = LANG_SWITCH_REPLY[code] || 'Okay.';
          setLastReply(reply);
          setState('speaking');
          await speak(reply, LOCALE_BY_LANG[code]);
          finish();
          return;
        }
        default: {
          // Unrecognised action → treat as a conversation so the user still gets a reply.
          await handleChatRef.current(currentTranscript || '');
          return;
        }
      }
    },
    [todayDoses, updateDoseStatus, triggerEmergency, logout, setLanguage, speak, finish],
  );

  // ── Conversational fallback: ask Mr. Meddy and speak the answer. ──
  const handleChatRef = useRef<(text: string) => Promise<void>>(async () => {});
  const handleChat = useCallback(
    async (text: string): Promise<void> => {
      setState('processing');
      let message = "I'm right here with you.";
      try {
        const res = await api.getChatResponse(text);
        if (res?.message) message = res.message;
      } catch {
        message = "I'm having a little trouble connecting right now. Please try again in a moment.";
      }

      setLastReply(message);
      setState('speaking');
      await speak(message);

      // Keep the conversation going hands-free if the user hasn't cancelled.
      if (continueConversationRef.current) {
        startAssistantRef.current();
      } else {
        finish();
      }
    },
    [api, speak, finish],
  );
  useEffect(() => {
    handleChatRef.current = handleChat;
  }, [handleChat]);

  // ── The heart of the assistant: transcript → intent → action / answer. ──
  const handleTranscript = useCallback(
    async (text: string | null): Promise<void> => {
      if (!text || !text.trim()) {
        events.publish('TRANSCRIPTION_FAILED');
        setLastReply(null);
        setState('speaking');
        await speak("Sorry, I didn't catch that. Please try again.");
        finish();
        return;
      }

      const transcript = text.trim();
      setLastTranscript(transcript);
      events.publish('TRANSCRIPTION_SUCCESS', { text: transcript, context: activeModule });
      setState('processing');

      let result: { intent: string; target: string; confidence: number };
      try {
        result = await api.getIntent(transcript, activeModule || 'unknown');
      } catch (err) {
        console.warn('[Assistant] Intent parse failed, falling back to chat', err);
        result = { intent: 'CHAT', target: '', confidence: 0 };
      }

      const intent = (result?.intent || '').toUpperCase();
      const target = result?.target || '';

      if (intent === 'NAVIGATE' && NAV_ROUTES[target]) {
        const route = NAV_ROUTES[target];
        const reply = `Opening ${route.label}.`;
        setLastReply(reply);
        setState('speaking');
        router.push(route.path as any);
        await speak(reply);
        finish();
        return;
      }

      if (intent === 'ACTION' && target) {
        await handleAction(target, transcript);
        return;
      }

      // CHAT, UNKNOWN, or an unmapped target → conversational answer.
      await handleChat(transcript);
    },
    [api, activeModule, events, speak, finish, handleAction, handleChat],
  );
  const handleTranscriptRef = useRef(handleTranscript);
  useEffect(() => {
    handleTranscriptRef.current = handleTranscript;
  }, [handleTranscript]);

  const {
    isListening,
    isTranscribing,
    meteringSharedValue,
    error: sessionError,
    startSession,
    stopSession,
    cancelSession,
  } = useVoiceSession({
    onTranscript: (t) => handleTranscriptRef.current(t),
  });

  // Reflect the mic lifecycle into the visible state. This effect only ever
  // *raises* listening/transcribing/error — it never forces 'idle', so it can't
  // stomp the processing/speaking phases the pipeline drives explicitly.
  useEffect(() => {
    if (sessionError) {
      setState((s) => (s === 'speaking' ? s : 'error'));
    } else if (isTranscribing) {
      setState('transcribing');
    } else if (isListening) {
      setState('listening');
    }
  }, [isListening, isTranscribing, sessionError]);

  const startAssistant = useCallback(async () => {
    continueConversationRef.current = true;
    setState('initializing');
    setIsVisible(true);
    setLastTranscript(null);
    setLastReply(null);
    events.publish('SPEECH_STARTED');

    try {
      await stopSpeaking().catch(() => {});
      Speech.stop();
      await startSession();
    } catch {
      setState('error');
    }
  }, [startSession, stopSpeaking, events]);
  useEffect(() => {
    startAssistantRef.current = startAssistant;
  }, [startAssistant]);

  // Manual "Send Now": just stop the recording. The transcript is delivered to
  // handleTranscript through the onTranscript callback, so the pipeline runs once.
  const stopAssistant = useCallback(async () => {
    setState('transcribing');
    await stopSession();
  }, [stopSession]);

  const cancelAssistant = useCallback(async () => {
    continueConversationRef.current = false;
    Speech.stop();
    await stopSpeaking().catch(() => {});
    await cancelSession();
    setState('idle');
    setIsVisible(false);
    setLastReply(null);
  }, [cancelSession, stopSpeaking]);

  const dismissOverlay = useCallback(() => {
    if (state === 'idle' || state === 'error') {
      setIsVisible(false);
    } else {
      cancelAssistant();
    }
  }, [state, cancelAssistant]);

  const value = useMemo(
    () => ({
      state,
      isVisible,
      meteringSharedValue,
      lastTranscript,
      lastReply,
      error: sessionError,
      startAssistant,
      stopAssistant,
      cancelAssistant,
      dismissOverlay,
    }),
    [
      state,
      isVisible,
      meteringSharedValue,
      lastTranscript,
      lastReply,
      sessionError,
      startAssistant,
      stopAssistant,
      cancelAssistant,
      dismissOverlay,
    ],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

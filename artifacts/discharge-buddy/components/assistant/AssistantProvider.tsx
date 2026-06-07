import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useVoiceSession } from '@/hooks/assistant/useVoiceSession';
import { useAssistantContext } from '@/hooks/assistant/useAssistantContext';
import { useAssistantEvents } from '@/hooks/assistant/useAssistantEvents';
import { useApp } from '@/context/AppContext';
import { router } from 'expo-router';

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

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AssistantState>('idle');
  const [isVisible, setIsVisible] = useState(false);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  
  const { activeModule } = useAssistantContext();
  const events = useAssistantEvents();
  const { api } = useApp();
  
  const { 
    isListening, 
    isTranscribing, 
    meteringSharedValue, 
    error: sessionError,
    startSession, 
    stopSession, 
    cancelSession 
  } = useVoiceSession();

  // Sync internal state with hook state
  useEffect(() => {
    if (sessionError) {
      setState('error');
    } else if (isTranscribing) {
      setState('transcribing');
    } else if (isListening) {
      setState('listening');
    } else if (state === 'listening' || state === 'transcribing') {
      // If we were listening/transcribing and now we aren't, but no new state was set, 
      // fallback to processing or idle
      if (!lastTranscript) setState('idle');
    }
  }, [isListening, isTranscribing, sessionError, lastTranscript, state]);

  const startAssistant = useCallback(async () => {
    setState('initializing');
    setIsVisible(true);
    setLastTranscript(null);
    events.publish('SPEECH_STARTED');
    
    try {
      await startSession();
      // State is updated via useEffect
    } catch (err) {
      setState('error');
    }
  }, [startSession, events]);

  const stopAssistant = useCallback(async () => {
    setState('transcribing');
    const text = await stopSession();
    
    if (text) {
      setLastTranscript(text);
      events.publish('TRANSCRIPTION_SUCCESS', { text, context: activeModule });
      
      // Map speech to action instantly (No artificial delays)
      setState('processing');
      
      try {
        const { intent, target } = await api.getIntent(text, activeModule || "unknown");
        
        if (intent === "NAVIGATE") {
          // Special cases for tabs vs modals
          if (target === "scan") {
            router.push("/scan");
          } else if (target === "home") {
            router.push("/(tabs)/");
          } else {
            router.push(`/(tabs)/${target}` as any);
          }
        } else if (intent === "ACTION") {
          if (target === "LOG_SYMPTOM") {
            router.push("/(tabs)/symptoms");
          } else if (target === "ADD_MEDICINE") {
            router.push("/(tabs)/medicines");
          }
        }
      } catch (err) {
        console.warn("Failed to parse intent", err);
      }

      setState('idle');
      setIsVisible(false);
    } else {
      events.publish('TRANSCRIPTION_FAILED');
      setState('error');
      setTimeout(() => {
        setState('idle');
        setIsVisible(false);
      }, 2000);
    }
  }, [stopSession, events, activeModule]);

  const cancelAssistant = useCallback(async () => {
    await cancelSession();
    setState('idle');
    setIsVisible(false);
  }, [cancelSession]);

  const dismissOverlay = useCallback(() => {
    if (state === 'idle' || state === 'error') {
      setIsVisible(false);
    } else {
      cancelAssistant();
    }
  }, [state, cancelAssistant]);

  const value = useMemo(() => ({
    state,
    isVisible,
    meteringSharedValue,
    lastTranscript,
    error: sessionError,
    startAssistant,
    stopAssistant,
    cancelAssistant,
    dismissOverlay
  }), [state, isVisible, meteringSharedValue, lastTranscript, sessionError, startAssistant, stopAssistant, cancelAssistant, dismissOverlay]);

  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  );
}

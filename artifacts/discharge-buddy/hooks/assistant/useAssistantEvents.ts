import { useRef, useCallback } from 'react';

export type AssistantEventType = 
  | 'WAKE_WORD_DETECTED'
  | 'COMMAND_DETECTED'
  | 'SPEECH_STARTED'
  | 'SPEECH_ENDED'
  | 'TRANSCRIPTION_SUCCESS'
  | 'TRANSCRIPTION_FAILED'
  | 'ACTION_COMPLETED';

type EventHandler = (payload?: any) => void;

/**
 * A lightweight pub/sub event system specifically for the Voice Assistant
 * to allow cross-module communication without tightly coupling components.
 */
export function useAssistantEvents() {
  const listeners = useRef<Map<AssistantEventType, Set<EventHandler>>>(new Map());

  const subscribe = useCallback((event: AssistantEventType, handler: EventHandler) => {
    if (!listeners.current.has(event)) {
      listeners.current.set(event, new Set());
    }
    listeners.current.get(event)!.add(handler);

    return () => {
      const eventListeners = listeners.current.get(event);
      if (eventListeners) {
        eventListeners.delete(handler);
      }
    };
  }, []);

  const publish = useCallback((event: AssistantEventType, payload?: any) => {
    const eventListeners = listeners.current.get(event);
    if (eventListeners) {
      eventListeners.forEach((handler) => {
        try {
          handler(payload);
        } catch (err) {
          console.error(`[AssistantEvents] Error in handler for ${event}:`, err);
        }
      });
    }
  }, []);

  return { subscribe, publish };
}

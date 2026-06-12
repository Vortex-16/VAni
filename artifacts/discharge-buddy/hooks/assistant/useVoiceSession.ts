import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import * as FileSystem from 'expo-file-system/legacy';
import { useApp } from '@/context/AppContext';

export interface VoiceSessionHook {
  isListening: boolean;
  isTranscribing: boolean;
  meteringSharedValue: any; // Reanimated SharedValue
  error: string | null;
  startSession: () => Promise<void>;
  stopSession: () => Promise<string | null>;
  cancelSession: () => Promise<void>;
}

export interface VoiceSessionOptions {
  /**
   * Fired exactly once whenever a recording completes — whether it was stopped
   * automatically by the silence detector (VAD) or manually by the user.
   * The argument is the transcript, or null if transcription failed / was empty.
   * This is what lets auto-send actually drive the assistant pipeline.
   */
  onTranscript?: (text: string | null) => void;
}

/**
 * Manages the microphone lifecycle globally without triggering
 * re-renders for every decibel change.
 * Uses Reanimated SharedValue for high-performance audio reactivity.
 */
export function useVoiceSession(options?: VoiceSessionOptions): VoiceSessionHook {
  const { api, language } = useApp();
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest callback in a ref so the metering closure always calls fresh code.
  const onTranscriptRef = useRef<VoiceSessionOptions["onTranscript"]>(options?.onTranscript);
  useEffect(() => {
    onTranscriptRef.current = options?.onTranscript;
  });

  // Audio reactive layer - DOES NOT trigger React re-renders
  const meteringSharedValue = useSharedValue(-160);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const isListeningRef = useRef(false);
  const isTranscribingRef = useRef(false);
  
  // VAD tracking
  const hasSpokenRef = useRef(false);
  const silenceStartRef = useRef<number | null>(null);
  const sessionStartRef = useRef<number | null>(null);
  const speechThresholdDb = -30;
  const silenceThresholdDb = -45;
  const silenceTimeoutMs = 2500; // Increased for elderly users — 2.5s of silence after speech
  const maxDurationMs = 60000;

  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const stopAndTranscribeRef = useRef<() => Promise<string | null>>(async () => null);

  const stopAndTranscribe = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current || isTranscribingRef.current) return null;

    isTranscribingRef.current = true;
    setIsListening(false);
    isListeningRef.current = false;
    setIsTranscribing(true);
    meteringSharedValue.value = withSpring(-160);

    let transcriptionResult: string | null = null;
    let localUri: string | null = null;

    try {
      const status = await recordingRef.current.getStatusAsync();
      const duration = status.durationMillis || 0;
      
      await recordingRef.current.stopAndUnloadAsync();
      localUri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (duration < 500) {
        throw new Error("Audio too short");
      }

      if (!localUri) {
        throw new Error("No audio file found");
      }

      // Read the recording as base64. `expo-file-system`'s getInfoAsync /
      // readAsStringAsync are NOT implemented on web, so we use the blob URL the
      // MediaRecorder produced there; on native we use the file APIs.
      let base64Audio: string;
      if (Platform.OS === "web") {
        const resp = await fetch(localUri);
        const blob = await resp.blob();
        if (blob.size < 1000) {
          throw new Error("Recording empty");
        }
        base64Audio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = String(reader.result || "");
            // Strip the "data:audio/...;base64," prefix.
            resolve(result.includes(",") ? result.split(",").pop()! : result);
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
      } else {
        const fileInfo = await FileSystem.getInfoAsync(localUri);
        const fileSizeBytes = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;
        if (fileSizeBytes < 1000) {
          throw new Error("Recording empty");
        }
        base64Audio = await FileSystem.readAsStringAsync(localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      // Web records WebM; native records M4A. Tell the server which it is so
      // Whisper decodes the container correctly.
      const fileExtension = Platform.OS === "web" ? "webm" : "m4a";

      // Language hint policy:
      //  • If the user has EXPLICITLY chosen a non-English app language, force
      //    that language so Whisper transcribes in the correct script. (A user
      //    who set the app to Bengali speaks Bengali — auto-detect would
      //    sometimes mis-detect short Bengali clips as Hindi.)
      //  • If the app is on the default English, AUTO-DETECT instead, so a user
      //    who hasn't changed the language but speaks Hindi/Bengali still gets a
      //    correct transcript (forcing "en" would romanize/translate it).
      const sttLanguage = language && language !== "en" ? language : undefined;

      transcriptionResult = await api.transcribeAudio(base64Audio, fileExtension, sttLanguage);
    } catch (err: any) {
      console.warn("[VoiceSession] Transcription error:", err);
      setError(err?.message || "Transcription failed");
    } finally {
      setIsTranscribing(false);
      isTranscribingRef.current = false;
      if (localUri) {
        FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
      }
    }

    // Notify the provider once, regardless of whether this stop was triggered
    // by the silence detector or a manual "Send Now" tap.
    onTranscriptRef.current?.(transcriptionResult);

    return transcriptionResult;
  }, [api, language, meteringSharedValue]);

  useEffect(() => {
    stopAndTranscribeRef.current = stopAndTranscribe;
  }, [stopAndTranscribe]);

  const startSession = async () => {
    try {
      setError(null);
      isTranscribingRef.current = false;
      hasSpokenRef.current = false;
      silenceStartRef.current = null;
      sessionStartRef.current = Date.now();
      meteringSharedValue.value = -160;

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Microphone permission denied");
      }

      // Ensure global audio config doesn't duck background completely unless recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        {
          android: {
            extension: ".m4a",
            outputFormat: Audio.AndroidOutputFormat.MPEG_4,
            audioEncoder: Audio.AndroidAudioEncoder.AAC,
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 128000,
          },
          ios: {
            extension: ".m4a",
            outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: "audio/webm",
            bitsPerSecond: 128000,
          },
          isMeteringEnabled: true,
        },
        (status) => {
          if (!status.isRecording || !isListeningRef.current) return;
          const db = status.metering ?? -160;
          
          // Smooth reactive animation update
          meteringSharedValue.value = withSpring(db, { damping: 15, stiffness: 200 });

          const now = Date.now();
          if (!hasSpokenRef.current) {
            if (db > speechThresholdDb) {
              hasSpokenRef.current = true;
            } else if (sessionStartRef.current && (now - sessionStartRef.current >= 7000)) {
              console.log("[VoiceSession] No speech detected for 7 seconds. Stopping.");
              stopAndTranscribeRef.current();
            }
          } else {
            if (db < silenceThresholdDb) {
              if (silenceStartRef.current === null) {
                silenceStartRef.current = now;
              } else if (now - silenceStartRef.current >= silenceTimeoutMs) {
                stopAndTranscribeRef.current();
              }
            } else {
              silenceStartRef.current = null;
            }
          }

          if ((status.durationMillis ?? 0) >= maxDurationMs) {
            stopAndTranscribeRef.current();
          }
        },
        100 // Poll more frequently for smoother animation
      );

      recordingRef.current = recording;
      setIsListening(true);
      isListeningRef.current = true;

    } catch (err: any) {
      setError(err?.message || "Failed to start session");
      setIsListening(false);
      isListeningRef.current = false;
    }
  };

  const stopSession = async () => stopAndTranscribeRef.current();

  const cancelSession = async () => {
    if (!recordingRef.current) return;
    setIsListening(false);
    isListeningRef.current = false;
    meteringSharedValue.value = withSpring(-160);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const localUri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (localUri) {
        FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
      }
    } catch (err) {
      console.warn("[VoiceSession] Cancel error:", err);
    } finally {
      setError(null);
      isTranscribingRef.current = false;
    }
  };

  return {
    isListening,
    isTranscribing,
    meteringSharedValue,
    error,
    startSession,
    stopSession,
    cancelSession
  };
}

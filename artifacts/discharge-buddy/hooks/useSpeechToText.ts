import { useState, useEffect, useRef, useCallback } from "react";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { useApp } from "../context/AppContext";

export interface SpeechToTextHook {
  isListening: boolean;
  isTranscribing: boolean;
  error: string | null;
  metering: number;
  startListening: () => Promise<void>;
  stopListening: () => Promise<string | null>;
  cancelListening: () => Promise<void>;
}

interface SpeechToTextOptions {
  maxDurationMs?: number;
  minDurationMs?: number;
}

export function useSpeechToText(
  onTranscriptionComplete?: (text: string) => void,
  options: SpeechToTextOptions = {}
): SpeechToTextHook {
  const { api } = useApp();
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metering, setMetering] = useState(-160);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const isListeningRef = useRef(false);
  const isTranscribingRef = useRef(false);

  // VAD Refs
  const hasSpokenRef = useRef(false);
  const silenceStartRef = useRef<number | null>(null);
  const consecutiveSpeechCountRef = useRef(0); // Ensures we don't trigger on noise spikes

  const silenceThresholdDb = -55; // Below this is silence (more forgiving for Android)
  const speechThresholdDb = -35;  // Above this is speech (more sensitive)
  const speechConfirmCount = 3;   // Number of consecutive speaking frames to confirm speech
  const silenceTimeoutMs = 1500;  // 1.5s of silence to auto-stop

  const maxDurationMs = options.maxDurationMs ?? 60000; // 60s max
  const minDurationMs = options.minDurationMs ?? 500;   // 0.5s min

  // Auto-stop after maxDuration
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
      }
    };
  }, []);

  const stopAndTranscribeRef = useRef<() => Promise<string | null>>(async () => null);

  const stopAndTranscribe = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current || isTranscribingRef.current) return null;

    // Clear auto-stop timer
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }

    isTranscribingRef.current = true;
    setIsListening(false);
    isListeningRef.current = false;
    setIsTranscribing(true);

    let transcriptionResult: string | null = null;
    let localUri: string | null = null;

    try {
      const status = await recordingRef.current.getStatusAsync();
      const duration = status.durationMillis || 0;
      console.log("[STT] Recording duration:", duration, "ms");

      await recordingRef.current.stopAndUnloadAsync();
      localUri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (duration < minDurationMs) {
        console.warn("[STT] Audio too short:", duration, "ms");
        setError("Too short — please hold the mic button and speak, then release.");
        return null;
      }

      if (!localUri) {
        setError("Recording failed — no audio file found.");
        return null;
      }

      // Check file size to catch empty recordings
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      const fileSizeBytes = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;
      console.log("[STT] Audio file size:", fileSizeBytes, "bytes, URI:", localUri);

      if (fileSizeBytes < 1000) {
        setError("Recording was empty. Check microphone permissions.");
        return null;
      }

      console.log("[STT] Reading file as base64...");
      const base64Audio = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log("[STT] Base64 length:", base64Audio.length, "chars (~", Math.round(fileSizeBytes / 1024), "KB)");

      transcriptionResult = await api.transcribeAudio(base64Audio, "m4a");
      console.log("[STT] Transcription:", transcriptionResult);

      if (transcriptionResult && transcriptionResult.trim()) {
        if (onTranscriptionComplete) {
          onTranscriptionComplete(transcriptionResult.trim());
        }
      } else {
        setError("Could not understand — please speak clearly and try again.");
      }
    } catch (err: any) {
      const msg = err?.message || err?.toString() || "Unknown error";
      console.error("[STT Full Error]", msg, err);
      setError(`Transcription failed: ${msg}`);
    } finally {
      setIsTranscribing(false);
      isTranscribingRef.current = false;
      setMetering(-160);
      if (localUri) {
        FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
      }
    }

    return transcriptionResult;
  }, [api, minDurationMs, onTranscriptionComplete]);

  useEffect(() => {
    stopAndTranscribeRef.current = stopAndTranscribe;
  }, [stopAndTranscribe]);

  const startListening = async () => {
    try {
      setError(null);
      setMetering(-160);
      isTranscribingRef.current = false;
      hasSpokenRef.current = false;
      silenceStartRef.current = null;
      consecutiveSpeechCountRef.current = 0;

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        setError("Microphone permission denied. Please allow it in Settings.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Use HIGH quality settings — gives Whisper/Gemini the best signal
      const recordingOptions = {
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
      };

      const { recording } = await Audio.Recording.createAsync(
        recordingOptions,
        (status) => {
          if (!status.isRecording || !isListeningRef.current) return;
          const db = status.metering ?? -160;
          setMetering(db);

          const now = Date.now();

          // VAD Logic
          if (!hasSpokenRef.current) {
            if (db > speechThresholdDb) {
              consecutiveSpeechCountRef.current += 1;
              if (consecutiveSpeechCountRef.current >= speechConfirmCount) {
                hasSpokenRef.current = true;
                silenceStartRef.current = null; // Start fresh
                console.log("[STT] Speech confirmed! Auto-send is armed.");
              }
            } else {
              consecutiveSpeechCountRef.current = 0; // Reset on noise
            }
          } else {
            if (db < silenceThresholdDb) {
              if (silenceStartRef.current === null) {
                silenceStartRef.current = now;
                console.log("[STT] Silence started, countdown to auto-send...");
              } else if (now - silenceStartRef.current >= silenceTimeoutMs) {
                console.log("[STT] Silence timeout hit, auto-stopping.");
                stopAndTranscribeRef.current();
              }
            } else {
              // Reset silence timer when audio spikes back up (still talking)
              if (silenceStartRef.current !== null) {
                console.log("[STT] Speech resumed, silence timer reset.");
              }
              silenceStartRef.current = null;
            }
          }

          // Auto-stop at max duration
          if ((status.durationMillis ?? 0) >= maxDurationMs) {
            console.log("[STT] Max duration hit, auto-stopping.");
            stopAndTranscribeRef.current();
          }
        },
        100  // Poll every 100ms for tighter VAD accuracy
      );

      recordingRef.current = recording;
      setIsListening(true);
      isListeningRef.current = true;
      console.log("[STT] Recording started. Speak now.");
    } catch (err: any) {
      const msg = err?.message || "Unknown error";
      console.error("[STT] Failed to start recording:", msg, err);
      setError(`Microphone error: ${msg}`);
      setIsListening(false);
      isListeningRef.current = false;
    }
  };

  const stopListening = async (): Promise<string | null> => {
    return stopAndTranscribeRef.current();
  };

  const cancelListening = async () => {
    if (!recordingRef.current) return;

    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }

    setIsListening(false);
    isListeningRef.current = false;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const localUri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (localUri) {
        FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
      }
    } catch (err) {
      console.error("[STT] Cancel error:", err);
    } finally {
      setMetering(-160);
      setError(null);
      isTranscribingRef.current = false;
    }
  };

  return {
    isListening,
    isTranscribing,
    error,
    metering,
    startListening,
    stopListening,
    cancelListening,
  };
}

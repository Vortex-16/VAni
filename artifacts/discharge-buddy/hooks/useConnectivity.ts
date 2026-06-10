import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { getApiUrl } from "@/utils/apiUrl";

/**
 * Lightweight online/offline detection without adding native dependencies.
 * Includes debouncing and stability thresholds.
 */
export function useConnectivity(pingIntervalMs = 20000): boolean {
  // Raw instantaneous connectivity state
  const [rawIsOnline, setRawIsOnline] = useState<boolean>(() => {
    if (Platform.OS === "web" && typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
      return navigator.onLine;
    }
    return true; // optimistic
  });

  // Debounced stable state that we actually return
  const [isOnline, setIsOnline] = useState<boolean>(rawIsOnline);

  const mounted = useRef(true);

  // Debounce logic: wait for state to be stable for 3 seconds before reporting
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mounted.current) {
        setIsOnline(rawIsOnline);
      }
    }, 3000); // 3 seconds stability threshold

    return () => clearTimeout(timer);
  }, [rawIsOnline]);

  useEffect(() => {
    mounted.current = true;

    const ping = async () => {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.onLine === false) {
        if (mounted.current) setRawIsOnline(false);
        return;
      }
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${getApiUrl()}/api/healthz`, {
          method: "GET",
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (mounted.current) setRawIsOnline(res.ok);
      } catch {
        if (mounted.current) setRawIsOnline(false);
      }
    };

    ping();
    const interval = setInterval(ping, pingIntervalMs);

    let onUp: (() => void) | undefined;
    let onDown: (() => void) | undefined;
    if (Platform.OS === "web" && typeof window !== "undefined" && window.addEventListener) {
      onUp = () => { setRawIsOnline(true); ping(); };
      onDown = () => setRawIsOnline(false);
      window.addEventListener("online", onUp);
      window.addEventListener("offline", onDown);
    }

    return () => {
      mounted.current = false;
      clearInterval(interval);
      if (Platform.OS === "web" && typeof window !== "undefined" && window.removeEventListener) {
        if (onUp) window.removeEventListener("online", onUp);
        if (onDown) window.removeEventListener("offline", onDown);
      }
    };
  }, [pingIntervalMs]);

  return isOnline;
}

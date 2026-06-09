import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { SHAKE_THRESHOLD_G, type ShakeSensitivity } from "@/utils/sosSettings";

/**
 * Detects a deliberate phone shake and fires `onShake`.
 *
 * Native: expo-sensors Accelerometer (values are in g already).
 * Web: the standard `devicemotion` event (accelerationIncludingGravity, m/s²
 *      → converted to g by /9.81).
 *
 * The algorithm: compute the total acceleration magnitude each sample; if it
 * exceeds the sensitivity threshold a configurable number of times within a
 * short window, treat it as a shake. A cooldown prevents repeat fires.
 */
export function useShakeDetection(
  enabled: boolean,
  sensitivity: ShakeSensitivity,
  onShake: () => void,
) {
  // keep the latest callback without re-subscribing the sensor each render
  const onShakeRef = useRef(onShake);
  onShakeRef.current = onShake;

  useEffect(() => {
    if (!enabled) return;

    const threshold = SHAKE_THRESHOLD_G[sensitivity];
    const REQUIRED_HITS = 3; // distinct jerks
    const WINDOW_MS = 1000; // within this window
    const COOLDOWN_MS = 3000; // ignore further shakes right after a trigger

    let hits: number[] = [];
    let lastFire = 0;
    let lastHit = 0;

    const register = (magnitudeG: number) => {
      const now = Date.now();
      if (magnitudeG < threshold) return;
      // debounce individual samples so one jerk isn't counted many times
      if (now - lastHit < 120) return;
      lastHit = now;

      hits = hits.filter((t) => now - t < WINDOW_MS);
      hits.push(now);

      if (hits.length >= REQUIRED_HITS && now - lastFire > COOLDOWN_MS) {
        lastFire = now;
        hits = [];
        onShakeRef.current();
      }
    };

    // --- Web path ---
    if (Platform.OS === "web") {
      if (
        typeof window === "undefined" ||
        typeof (window as any).DeviceMotionEvent === "undefined"
      ) {
        return;
      }
      const handler = (e: any) => {
        const a = e.accelerationIncludingGravity;
        if (!a) return;
        const g = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2) / 9.81;
        register(g);
      };
      window.addEventListener("devicemotion", handler);
      return () => window.removeEventListener("devicemotion", handler);
    }

    // --- Native path (expo-sensors) ---
    let subscription: { remove: () => void } | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { Accelerometer } = await import("expo-sensors");
        if (cancelled) return;
        Accelerometer.setUpdateInterval(100); // 10 Hz is plenty for shake
        subscription = Accelerometer.addListener(({ x, y, z }) => {
          const g = Math.sqrt(x * x + y * y + z * z); // already in g
          register(g);
        });
      } catch {
        // sensor unavailable (e.g. emulator without motion) — silently no-op
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled, sensitivity]);
}

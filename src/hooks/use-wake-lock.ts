"use client";

import { useEffect, useRef, useState } from "react";

type WakeLockSentinel = {
  release: () => Promise<void>;
  released: boolean;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

export function useWakeLock(enable: boolean) {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(false);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    setIsSupported(typeof (navigator as any).wakeLock !== "undefined");
  }, []);

  // Acquire/release based on `enable`
  useEffect(() => {
    if (!isSupported) return;

    const requestWakeLock = async () => {
      try {
        const sentinel: WakeLockSentinel = await (navigator as any).wakeLock.request("screen");
        sentinelRef.current = sentinel;
        setIsActive(true);

        const onRelease = () => {
          setIsActive(false);
          sentinelRef.current = null;
        };

        sentinel.addEventListener("release", onRelease);
      } catch {
        // silently fail; caller can notify user if needed
        setIsActive(false);
        sentinelRef.current = null;
      }
    };

    const releaseWakeLock = async () => {
      try {
        if (sentinelRef.current) {
          await sentinelRef.current.release();
        }
      } finally {
        sentinelRef.current = null;
        setIsActive(false);
      }
    };

    if (enable) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    return () => {
      // Clean up on unmount
      if (sentinelRef.current) {
        sentinelRef.current.release().catch(() => {});
        sentinelRef.current = null;
        setIsActive(false);
      }
    };
  }, [enable, isSupported]);

  // Reacquire after returning to visible if still enabled
  useEffect(() => {
    if (!isSupported) return;

    const onVisibilityChange = async () => {
      if (document.visibilityState === "visible" && enable && !sentinelRef.current) {
        try {
          const sentinel: WakeLockSentinel = await (navigator as any).wakeLock.request("screen");
          sentinelRef.current = sentinel;
          setIsActive(true);

          const onRelease = () => {
            setIsActive(false);
            sentinelRef.current = null;
          };
          sentinel.addEventListener("release", onRelease);
        } catch {
          setIsActive(false);
          sentinelRef.current = null;
        }
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enable, isSupported]);

  return { isSupported, isActive };
}
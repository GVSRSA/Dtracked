"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useWakeLock } from '@/hooks/use-wake-lock';
import { showError, showSuccess, showConfirmTrackingPrompt } from '@/utils/toast';

interface PathTrackerProps {
  children: (path: [number, number][], isTracking: boolean) => React.ReactNode;
  isTracking: boolean;
  pathCoordinates: [number, number][];
  onStartTracking: () => void;
  onStopTracking: () => void;
}

const PathTracker: React.FC<PathTrackerProps> = ({
  children,
  isTracking,
  pathCoordinates,
  onStartTracking,
  onStopTracking,
}) => {
  const [keepAwake, setKeepAwake] = useState(true);
  const { isSupported, isActive } = useWakeLock(keepAwake && isTracking);

  // Prompt scheduling refs
  const promptTimeoutRef = useRef<number | null>(null);
  const promptIntervalRef = useRef<number | null>(null);
  const nextPromptTimeRef = useRef<number | null>(null);
  const promptCountRef = useRef<number>(0);

  const clearPromptScheduling = () => {
    if (promptTimeoutRef.current) {
      clearTimeout(promptTimeoutRef.current);
      promptTimeoutRef.current = null;
    }
    if (promptIntervalRef.current) {
      clearInterval(promptIntervalRef.current);
      promptIntervalRef.current = null;
    }
    promptCountRef.current = 0;
  };

  const showOnePrompt = () => {
    showConfirmTrackingPrompt(
      "You're still tracking this route. Continue?",
      () => {
        // User confirmed to continue
        clearPromptScheduling();
        nextPromptTimeRef.current = Date.now() + 60 * 60 * 1000; // next hour
        scheduleHourlyCheck();
        showSuccess("Continuing route tracking.");
      },
      () => {
        // User chose to stop
        clearPromptScheduling();
        onStopTracking();
      }
    );
  };

  const scheduleHourlyCheck = () => {
    // Clear any existing timeout before scheduling
    if (promptTimeoutRef.current) {
      clearTimeout(promptTimeoutRef.current);
      promptTimeoutRef.current = null;
    }

    const now = Date.now();
    const msUntilHour =
      nextPromptTimeRef.current && nextPromptTimeRef.current > now
        ? nextPromptTimeRef.current - now
        : 60 * 60 * 1000;

    promptTimeoutRef.current = window.setTimeout(() => {
      // Start 5-minute prompt cycle: one notification per minute
      promptCountRef.current = 0;
      showOnePrompt();
      promptCountRef.current++;

      // Clear any prior interval
      if (promptIntervalRef.current) {
        clearInterval(promptIntervalRef.current);
        promptIntervalRef.current = null;
      }

      promptIntervalRef.current = window.setInterval(() => {
        if (!isTracking) {
          clearPromptScheduling();
          return;
        }
        if (promptCountRef.current >= 5) {
          // No response in 5 minutes: stop and save
          clearPromptScheduling();
          onStopTracking();
          return;
        }
        showOnePrompt();
        promptCountRef.current++;
      }, 60 * 1000);
    }, msUntilHour);
  };

  useEffect(() => {
    if (isTracking) {
      // start scheduling if not set
      if (!nextPromptTimeRef.current) {
        nextPromptTimeRef.current = Date.now() + 60 * 60 * 1000;
      }
      scheduleHourlyCheck();
    } else {
      clearPromptScheduling();
      nextPromptTimeRef.current = null;
    }

    return () => {
      clearPromptScheduling();
    };
  }, [isTracking]);

  const handleStart = () => {
    if (keepAwake) {
      if (isSupported) {
        showSuccess('Keeping screen awake while tracking to improve accuracy.');
      } else {
        showError('Your device/browser does not support keeping the screen awake. Tracking may pause when the phone is locked.');
      }
    }
    onStartTracking();
  };

  const handleStop = () => {
    onStopTracking();
    if (isActive) {
      showSuccess('Stopped tracking. Screen wake lock released.');
    }
  };

  const handleToggleKeepAwake = (enabled: boolean) => {
    setKeepAwake(enabled);
    if (enabled) {
      if (isSupported) {
        showSuccess('Screen wake lock enabled. Your screen will stay on during tracking.');
      } else {
        showError('Wake lock not supported on this device/browser.');
      }
    } else {
      showSuccess('Screen wake lock disabled. Your phone may lock and pause tracking.');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Button onClick={handleStart} disabled={isTracking}>
          Start Tracking Route
        </Button>
        <Button onClick={handleStop} disabled={!isTracking} variant="outline">
          Stop Tracking Route
        </Button>
        <div className="flex items-center gap-2 ml-auto">
          <Switch
            id="keepAwake"
            checked={keepAwake}
            onCheckedChange={handleToggleKeepAwake}
          />
          <Label htmlFor="keepAwake" className="text-sm">
            Keep screen awake while tracking
          </Label>
        </div>
      </div>
      <div className="flex-grow">
        {children(pathCoordinates, isTracking)}
      </div>
    </div>
  );
};

export default PathTracker;
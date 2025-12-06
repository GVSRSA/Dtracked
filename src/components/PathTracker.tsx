"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useWakeLock } from '@/hooks/use-wake-lock';
import { showError, showSuccess } from '@/utils/toast';

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
      // Hook will release automatically when enable becomes false (isTracking false),
      // but we inform the user for clarity.
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
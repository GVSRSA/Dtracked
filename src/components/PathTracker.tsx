"use client";

import React from 'react';
import { Button } from '@/components/ui/button';

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
  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 mb-4">
        <Button onClick={onStartTracking} disabled={isTracking}>
          Start Tracking Path
        </Button>
        <Button onClick={onStopTracking} disabled={!isTracking} variant="outline">
          Stop Tracking Path
        </Button>
      </div>
      <div className="flex-grow">
        {children(pathCoordinates, isTracking)}
      </div>
    </div>
  );
};

export default PathTracker;
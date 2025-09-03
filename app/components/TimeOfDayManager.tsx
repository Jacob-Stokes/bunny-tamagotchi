'use client';

import { useState, useEffect } from 'react';

interface TimeOfDayManagerProps {
  children: (hour: number, setHour: (hour: number) => void) => React.ReactNode;
  autoAdvance?: boolean;
  intervalMinutes?: number;
}

export default function TimeOfDayManager({ 
  children, 
  autoAdvance = false, 
  intervalMinutes = 2 
}: TimeOfDayManagerProps) {
  
  // Get current hour (0-23)
  const getCurrentHour = (): number => {
    return new Date().getHours();
  };

  const [currentHour, setCurrentHour] = useState<number>(getCurrentHour());

  useEffect(() => {
    if (!autoAdvance) return;

    const interval = setInterval(() => {
      setCurrentHour(prev => (prev + 1) % 24);
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoAdvance, intervalMinutes]);

  return <>{children(currentHour, setCurrentHour)}</>;
}
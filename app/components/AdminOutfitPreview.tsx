'use client';

import React, { useState, useEffect } from 'react';

interface AdminOutfitPreviewProps {
  normalUrl: string;
  blinkUrl?: string | null;
  sceneNormalUrl?: string | null;
  sceneBlinkUrl?: string | null;
  hasBlinkFrame: boolean;
  hasSceneComposition: boolean;
  className?: string;
  alt?: string;
}

export default function AdminOutfitPreview({ 
  normalUrl, 
  blinkUrl, 
  sceneNormalUrl, 
  sceneBlinkUrl,
  hasBlinkFrame,
  hasSceneComposition,
  className, 
  alt = "Outfit Preview" 
}: AdminOutfitPreviewProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [showScene, setShowScene] = useState(false);

  // Blinking animation
  useEffect(() => {
    if (!hasBlinkFrame) return;

    const scheduleNextBlink = () => {
      // Faster blinking for admin preview (2-4 seconds)
      const nextBlinkDelay = Math.random() * 2000 + 2000;
      
      const timeoutId = setTimeout(() => {
        setIsBlinking(true);
        
        // Blink duration: 300ms (slightly longer for visibility)
        setTimeout(() => {
          setIsBlinking(false);
        }, 300);
      }, nextBlinkDelay);

      return timeoutId;
    };

    const timeoutId = scheduleNextBlink();

    // Set up recurring blinks
    const intervalId = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
      }, 300);
    }, 4000); // Blink every 4 seconds

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [hasBlinkFrame]);

  const getCurrentImageUrl = () => {
    // Use scene versions if toggled and available
    if (showScene && hasSceneComposition) {
      if (isBlinking && sceneBlinkUrl) {
        return sceneBlinkUrl;
      }
      return sceneNormalUrl || normalUrl;
    }
    
    // Use regular versions
    if (isBlinking && hasBlinkFrame && blinkUrl) {
      return blinkUrl;
    }
    
    return normalUrl;
  };

  return (
    <div className="relative">
      <img 
        src={getCurrentImageUrl()} 
        alt={alt}
        className={className}
        style={{ 
          transition: 'none' // No transition for instant frame switching
        }}
      />
      
      {/* Toggle button for scene/regular view */}
      {hasSceneComposition && (
        <button
          onClick={() => setShowScene(!showScene)}
          className={`absolute bottom-2 right-2 px-2 py-1 rounded text-xs font-medium transition-colors ${
            showScene 
              ? 'bg-blue-500 text-white' 
              : 'bg-white/80 text-gray-700 hover:bg-white'
          }`}
        >
          {showScene ? 'Scene' : 'Clean'}
        </button>
      )}
      
      {/* Animation indicator */}
      {hasBlinkFrame && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full transition-colors ${
            isBlinking ? 'bg-red-500' : 'bg-green-500'
          }`} />
        </div>
      )}
    </div>
  );
}
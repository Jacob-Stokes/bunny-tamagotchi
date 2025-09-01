'use client';

import React, { useState, useEffect } from 'react';
import { Outfit } from '../lib/outfitService';

interface OutfitPreviewProps {
  outfit: Outfit;
  className?: string;
  onClick?: () => void;
}

export default function OutfitPreview({ outfit, className = '', onClick }: OutfitPreviewProps) {
  const [currentFrame, setCurrentFrame] = useState<'normal' | 'blink' | 'smile' | 'wave'>('normal');

  // Available animation frames for this outfit
  const availableFrames = Object.keys(outfit.image_urls).filter(
    (frame) => outfit.image_urls[frame as keyof typeof outfit.image_urls]
  ) as Array<'normal' | 'blink' | 'smile' | 'wave'>;

  const frameOrder: Array<'normal' | 'blink' | 'smile' | 'wave'> = ['normal', 'blink', 'smile', 'wave'];
  
  // Filter to only available frames, maintaining order
  const cycleOrder = frameOrder.filter(frame => availableFrames.includes(frame));

  useEffect(() => {
    if (cycleOrder.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentFrame(prevFrame => {
        const currentIndex = cycleOrder.indexOf(prevFrame);
        const nextIndex = (currentIndex + 1) % cycleOrder.length;
        return cycleOrder[nextIndex];
      });
    }, 1000); // Change frame every 1 second

    return () => clearInterval(interval);
  }, [cycleOrder]);

  const getCurrentImageUrl = () => {
    return outfit.image_urls[currentFrame] || outfit.image_urls.normal || '';
  };

  const handleImageError = () => {
    // If current frame fails to load, fallback to normal
    if (currentFrame !== 'normal' && outfit.image_urls.normal) {
      setCurrentFrame('normal');
    }
  };

  return (
    <div 
      className={`relative overflow-hidden ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <img 
        src={getCurrentImageUrl()}
        alt={outfit.name}
        className="w-full h-full object-cover transition-opacity duration-200"
        onError={handleImageError}
      />
      
      {/* Animation indicators */}
      {cycleOrder.length > 1 && (
        <div className="absolute bottom-2 right-2 flex gap-1">
          {cycleOrder.map((frame) => (
            <div
              key={frame}
              className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                currentFrame === frame 
                  ? 'bg-white' 
                  : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
      
      {/* Outfit name overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
        <div className="text-white text-sm font-medium truncate">
          {outfit.name}
        </div>
        <div className="text-white/80 text-xs">
          {outfit.equipped_items.length} item{outfit.equipped_items.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Active indicator */}
      {outfit.is_active && (
        <div className="absolute top-2 left-2">
          <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
            Wearing
          </span>
        </div>
      )}
    </div>
  );
}
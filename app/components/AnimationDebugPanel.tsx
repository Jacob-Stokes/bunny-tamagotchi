'use client';

import { useState } from 'react';

interface AnimationDebugPanelProps {
  onTriggerAnimation: (animationType: string) => void;
}

export default function AnimationDebugPanel({ onTriggerAnimation }: AnimationDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const animations = [
    { id: 'sway', label: '↔️ Sway', description: 'Horizontal movement' },
    { id: 'tilt', label: '🔄 Tilt', description: 'Rotation movement' },
    { id: 'breathe', label: '💨 Breathe', description: 'Scale change' },
    { id: 'jump', label: '⬆️ Jump', description: 'Vertical hop' },
    { id: 'shift', label: '🎭 Shift', description: 'Combined movements' },
    { id: 'run', label: '🏃 Run', description: 'Cross-screen animation' },
    { id: 'zoom', label: '📷 Zoom Up', description: 'Super close to camera' },
    { id: 'blink', label: '👀 Blink', description: 'Eye blink (if available)' },
  ];

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-purple-700 font-medium"
      >
        <span>🎮 Animation Debug</span>
        <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
      </button>
      
      {isExpanded && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-purple-600 mb-3">
            Test individual animations on your bunny
          </p>
          
          <div className="grid grid-cols-2 gap-2">
            {animations.map((animation) => (
              <button
                key={animation.id}
                onClick={() => onTriggerAnimation(animation.id)}
                className="bg-purple-100/80 hover:bg-purple-200/80 rounded-lg py-2 px-3 text-purple-800 text-sm font-medium transition-colors"
                title={animation.description}
              >
                {animation.label}
              </button>
            ))}
          </div>
          
          <div className="mt-3 text-xs text-purple-600">
            <p>• Animations reset to neutral position first</p>
            <p>• Run animation randomly chooses direction</p>
            <p>• Blink only works if bunny has blink frame</p>
          </div>
        </div>
      )}
    </div>
  );
}
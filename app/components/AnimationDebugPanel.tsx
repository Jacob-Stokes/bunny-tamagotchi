'use client';

import { useState } from 'react';

interface AnimationDebugPanelProps {
  onTriggerAnimation: (animationType: string) => void;
  debugMode: boolean;
  onToggleDebugMode: () => void;
}

export default function AnimationDebugPanel({ onTriggerAnimation, debugMode, onToggleDebugMode }: AnimationDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const animations = [
    { id: 'sway', label: '↔️ Sway', description: 'Horizontal movement' },
    { id: 'tilt', label: '🔄 Tilt', description: 'Rotation movement' },
    { id: 'breathe', label: '💨 Breathe', description: 'Scale change' },
    { id: 'jump', label: '⬆️ Jump', description: 'Vertical hop' },
    { id: 'shift', label: '🎭 Shift', description: 'Combined movements' },
    { id: 'run', label: '🏃 Run', description: 'Cross-screen animation' },
    { id: 'zoom', label: '📷 Zoom Up', description: 'Super close to camera' },
    { id: 'distance', label: '🎯 Distance', description: 'Far away then hop back' },
    { id: 'spin', label: '🌪️ Spin', description: '360 degree rotation' },
    { id: 'dizzy', label: '🫨 Dizzy', description: 'Fast spin then wobble' },
    { id: 'wiggle', label: '🪩 Wiggle', description: 'Rapid shaking motion' },
    { id: 'float', label: '☁️ Float', description: 'Gentle up-down floating' },
    { id: 'bounce_ball', label: '🏀 Bounce', description: 'Repeated bouncing ball' },
    { id: 'scared', label: '😱 Scared', description: 'Jump back and tremble' },
    { id: 'sneeze', label: '🤧 Sneeze', description: 'Forward jerk then settle' },
    { id: 'peek', label: '🎭 Peek', description: 'Exit left, appear right' },
    { id: 'cartwheel', label: '🎪 Cartwheel', description: 'Roll while rotating' },
    { id: 'sleepy', label: '😴 Sleepy', description: 'Slow tilts like nodding off' },
    { id: 'blink', label: '👀 Blink', description: 'Eye blink (if available)' },
    { id: 'smile', label: '😊 Smile', description: 'Happy smile expression (if available)' },
    { id: 'wave', label: '👋 Wave', description: 'Friendly wave gesture (if available)' },
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
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-purple-600">
              Test individual animations on your bunny
            </p>
            <button
              onClick={onToggleDebugMode}
              className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                debugMode 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {debugMode ? '🔴 Debug ON' : '🟢 Natural ON'}
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
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
            <p>• {debugMode ? 'Natural animations disabled' : 'Natural animations enabled'}</p>
            <p>• Run animation randomly chooses direction</p>
            <p>• Blink only works if bunny has blink frame</p>
            <p>• Toggle debug mode to {debugMode ? 'enable' : 'disable'} automatic animations</p>
          </div>
        </div>
      )}
    </div>
  );
}
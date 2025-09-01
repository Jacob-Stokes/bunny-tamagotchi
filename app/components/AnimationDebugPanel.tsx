'use client';

import { useState } from 'react';
import { BunnyPersonalityTraits, BunnyPersonalityService } from '../lib/bunnyPersonality';

interface AnimationDebugPanelProps {
  onTriggerAnimation: (animationType: string) => void;
  debugMode: boolean;
  onToggleDebugMode: () => void;
  personality?: BunnyPersonalityTraits;
  onPersonalityChange?: (personality: BunnyPersonalityTraits) => void;
}

export default function AnimationDebugPanel({ onTriggerAnimation, debugMode, onToggleDebugMode, personality, onPersonalityChange }: AnimationDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'animations' | 'personality'>('animations');
  
  const currentPersonality = personality || BunnyPersonalityService.getDefaultPersonality();

  const handlePersonalityChange = (trait: keyof BunnyPersonalityTraits, value: number) => {
    if (onPersonalityChange) {
      const newPersonality = { ...currentPersonality, [trait]: value };
      onPersonalityChange(newPersonality);
    }
  };

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
          
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setActiveTab('animations')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'animations'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
              }`}
            >
              🎮 Animations
            </button>
            <button
              onClick={() => setActiveTab('personality')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'personality'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
              }`}
            >
              🧠 Personality
            </button>
          </div>

          {activeTab === 'animations' && (
            <>
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
            </>
          )}

          {activeTab === 'personality' && (
            <div className="space-y-3">
              <div className="text-xs text-purple-600 mb-2">
                Adjust your bunny's personality traits for chat interactions
              </div>
              
              {Object.entries(currentPersonality).map(([trait, value]) => (
                <div key={trait} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-700 capitalize font-medium">
                      {trait.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </span>
                    <span className="text-purple-600">{value}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => handlePersonalityChange(trait as keyof BunnyPersonalityTraits, parseInt(e.target.value))}
                    className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #9333ea 0%, #9333ea ${value}%, #e9d5ff ${value}%, #e9d5ff 100%)`
                    }}
                  />
                </div>
              ))}
              
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    const defaultPersonality = BunnyPersonalityService.getDefaultPersonality();
                    if (onPersonalityChange) {
                      onPersonalityChange(defaultPersonality);
                    }
                  }}
                  className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-lg hover:bg-purple-200"
                >
                  Reset to Default
                </button>
                <button
                  onClick={() => {
                    const randomPersonality = Object.fromEntries(
                      Object.keys(currentPersonality).map(trait => [
                        trait,
                        Math.floor(Math.random() * 101)
                      ])
                    ) as BunnyPersonalityTraits;
                    if (onPersonalityChange) {
                      onPersonalityChange(randomPersonality);
                    }
                  }}
                  className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-lg hover:bg-purple-200"
                >
                  🎲 Randomize
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';

interface OutfitFrame {
  name: string;
  type: 'normal' | 'blink' | 'smile' | 'wave';
  url: string | null;
  exists: boolean;
  hasBackgroundIssue?: boolean;
}

interface OutfitDetailModalProps {
  outfit: any;
  isOpen: boolean;
  onClose: () => void;
  onSelectiveRegen: (actions: SelectiveRegenActions) => void;
  onFullRegen: () => void;
  isRegenerating: boolean;
}

export interface SelectiveRegenActions {
  outfitKey: string;
  regenerateBase: boolean;
  regenerateAnimations: string[];
  removeBackground: string[];
  forceAll: boolean;
}

export default function OutfitDetailModal({ 
  outfit, 
  isOpen, 
  onClose, 
  onSelectiveRegen,
  onFullRegen,
  isRegenerating 
}: OutfitDetailModalProps) {
  const [selectedActions, setSelectedActions] = useState<{
    regenerateBase: boolean;
    regenerateAnimations: Set<string>;
    removeBackground: Set<string>;
  }>({
    regenerateBase: false,
    regenerateAnimations: new Set(),
    removeBackground: new Set()
  });

  const [backgroundAnalysis, setBackgroundAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Analyze backgrounds when modal opens
  useEffect(() => {
    if (isOpen && outfit) {
      analyzeBackgrounds();
    }
  }, [isOpen, outfit]);

  const analyzeBackgrounds = async () => {
    if (!outfit) return;
    
    setAnalyzing(true);
    try {
      const response = await fetch('/api/analyze-outfit-backgrounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outfitKey: outfit.key })
      });

      if (response.ok) {
        const analysis = await response.json();
        setBackgroundAnalysis(analysis);
        
        // Auto-select recommended actions
        if (analysis.recommendations) {
          setSelectedActions(prev => ({
            ...prev,
            removeBackground: new Set(analysis.recommendations.needsBackgroundRemoval || [])
          }));
        }
      }
    } catch (error) {
      console.error('Failed to analyze backgrounds:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  // Helper to check if frame has background issues
  const getFrameBackgroundStatus = (frameType: string) => {
    if (!backgroundAnalysis?.frameAnalysis) return null;
    const analysis = backgroundAnalysis.frameAnalysis[frameType];
    if (!analysis) return null;
    
    if (analysis.hasBackgroundIssue) {
      const severity = analysis.confidence > 0.8 ? 'high' : analysis.confidence > 0.5 ? 'medium' : 'low';
      return {
        hasIssue: true,
        type: analysis.backgroundType,
        severity,
        confidence: analysis.confidence
      };
    }
    return { hasIssue: false };
  };

  if (!isOpen || !outfit) return null;

  // Build frames list from outfit data
  const frames: OutfitFrame[] = [
    {
      name: 'Normal',
      type: 'normal',
      url: outfit.normalUrl,
      exists: true
    },
    {
      name: 'Blink',
      type: 'blink', 
      url: outfit.blinkUrl,
      exists: outfit.hasBlinkFrame
    },
    {
      name: 'Smile',
      type: 'smile',
      url: outfit.metadata?.hasAnimation?.includes('smile') ? `/generated-bunnies/${outfit.key}/smile.png` : null,
      exists: outfit.metadata?.hasAnimation?.includes('smile') || false
    },
    {
      name: 'Wave',
      type: 'wave',
      url: outfit.metadata?.hasAnimation?.includes('wave') ? `/generated-bunnies/${outfit.key}/wave.png` : null,
      exists: outfit.metadata?.hasAnimation?.includes('wave') || false
    }
  ];

  const toggleRegenAnimation = (frameType: string) => {
    const newSet = new Set(selectedActions.regenerateAnimations);
    if (newSet.has(frameType)) {
      newSet.delete(frameType);
    } else {
      newSet.add(frameType);
    }
    setSelectedActions(prev => ({ ...prev, regenerateAnimations: newSet }));
  };

  const toggleRemoveBackground = (frameType: string) => {
    const newSet = new Set(selectedActions.removeBackground);
    if (newSet.has(frameType)) {
      newSet.delete(frameType);
    } else {
      newSet.add(frameType);
    }
    setSelectedActions(prev => ({ ...prev, removeBackground: newSet }));
  };

  const handleSelectiveRegen = () => {
    const actions: SelectiveRegenActions = {
      outfitKey: outfit.key,
      regenerateBase: selectedActions.regenerateBase,
      regenerateAnimations: Array.from(selectedActions.regenerateAnimations),
      removeBackground: Array.from(selectedActions.removeBackground),
      forceAll: false
    };
    onSelectiveRegen(actions);
  };

  const hasAnyActions = selectedActions.regenerateBase || 
                      selectedActions.regenerateAnimations.size > 0 || 
                      selectedActions.removeBackground.size > 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Outfit Details</h2>
            <div className="text-sm text-gray-600">
              <p><strong>Base:</strong> {outfit.baseBunny}</p>
              <p><strong>Scene:</strong> {outfit.scene}</p>
              <p><strong>Items:</strong> {outfit.equippedItems?.join(', ') || 'None'}</p>
              <p><strong>Generated:</strong> {new Date(outfit.generatedAt).toLocaleString()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Analysis Summary */}
        {backgroundAnalysis && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Background Analysis</h3>
              {analyzing && <span className="text-sm text-blue-600">🔍 Analyzing...</span>}
            </div>
            {backgroundAnalysis.summary && (
              <div className="text-sm text-gray-700 space-y-1">
                <p>• {backgroundAnalysis.summary.issuesFound} frame(s) need attention</p>
                <p>• {backgroundAnalysis.summary.cleanFrames} frame(s) look good</p>
                {backgroundAnalysis.recommendations.needsBackgroundRemoval.length > 0 && (
                  <p className="text-orange-600">
                    • Recommended: Fix background on {backgroundAnalysis.recommendations.needsBackgroundRemoval.join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Frames Grid */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Animation Frames</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {frames.map((frame) => {
              const backgroundStatus = getFrameBackgroundStatus(frame.type);
              
              return (
                <div key={frame.type} className="border rounded-lg p-3 relative">
                  {/* Background issue indicator */}
                  {backgroundStatus?.hasIssue && (
                    <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white ${
                      backgroundStatus.severity === 'high' ? 'bg-red-500' :
                      backgroundStatus.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'
                    }`}>
                      !
                    </div>
                  )}
                  
                  <div className="aspect-square mb-3 bg-gray-100 rounded border flex items-center justify-center">
                    {frame.exists && frame.url ? (
                      <img 
                        src={frame.url} 
                        alt={frame.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="text-gray-400 text-sm text-center">
                        {frame.name}<br />Not Generated
                      </div>
                    )}
                  </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-center">{frame.name}</h4>
                  
                  {/* Base regeneration (only for normal frame) */}
                  {frame.type === 'normal' && (
                    <label className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedActions.regenerateBase}
                        onChange={(e) => setSelectedActions(prev => ({ 
                          ...prev, 
                          regenerateBase: e.target.checked 
                        }))}
                        className="mr-2"
                        disabled={isRegenerating}
                      />
                      <span className="text-xs">Regen Base</span>
                    </label>
                  )}

                  {/* Animation regeneration (for animation frames only) */}
                  {frame.type !== 'normal' && (
                    <label className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedActions.regenerateAnimations.has(frame.type)}
                        onChange={() => toggleRegenAnimation(frame.type)}
                        className="mr-2"
                        disabled={isRegenerating}
                      />
                      <span className="text-xs">Regen Frame</span>
                    </label>
                  )}

                  {/* Background removal (for all existing frames) */}
                  {frame.exists && (
                    <label className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedActions.removeBackground.has(frame.type)}
                        onChange={() => toggleRemoveBackground(frame.type)}
                        className="mr-2"
                        disabled={isRegenerating}
                      />
                      <span className="text-xs">Fix Background</span>
                    </label>
                  )}
                  
                  {/* Background issue details */}
                  {backgroundStatus?.hasIssue && (
                    <div className="text-xs text-center mb-2 text-orange-600">
                      {backgroundStatus.type} background detected
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>

        {/* Action Summary */}
        {hasAnyActions && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Selected Actions:</h4>
            <ul className="text-xs text-gray-700 space-y-1">
              {selectedActions.regenerateBase && <li>• Regenerate base bunny with all items</li>}
              {selectedActions.regenerateAnimations.size > 0 && (
                <li>• Regenerate animations: {Array.from(selectedActions.regenerateAnimations).join(', ')}</li>
              )}
              {selectedActions.removeBackground.size > 0 && (
                <li>• Fix background on: {Array.from(selectedActions.removeBackground).join(', ')}</li>
              )}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleSelectiveRegen}
              disabled={!hasAnyActions || isRegenerating}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isRegenerating ? '⏳ Processing...' : '🎯 Apply Selected'}
            </button>
            <button
              onClick={onFullRegen}
              disabled={isRegenerating}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isRegenerating ? '⏳ Processing...' : '🔥 Full Regen'}
            </button>
          </div>
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
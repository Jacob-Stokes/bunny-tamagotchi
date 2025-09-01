'use client';

import { useState } from 'react';
import { ActionType } from '../types/bunny';
import Wardrobe from './Wardrobe';

interface ActionsTabsProps {
  performAction: (action: ActionType) => Promise<void>;
  bunnyImageUrl: string;
  onTabChange?: (tab: 'actions' | 'wardrobe' | 'chat' | 'adventure') => void;
}

export default function ActionsTabs({ performAction, bunnyImageUrl, onTabChange }: ActionsTabsProps) {
  const [activeTab, setActiveTab] = useState<'actions' | 'wardrobe' | 'chat' | 'adventure'>('actions');

  const handleTabChange = (tab: 'actions' | 'wardrobe' | 'chat' | 'adventure') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const tabs = [
    { id: 'actions', label: 'Actions', icon: '🐰' },
    { id: 'wardrobe', label: 'Wardrobe', icon: '👕' },
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'adventure', label: 'Adventure', icon: '⚔️' },
  ] as const;

  return (
    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
      {/* Tab Navigation */}
      <div className="flex gap-1 mb-4 bg-white/30 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-purple-800 shadow-sm'
                : 'text-purple-700 hover:text-purple-900 hover:bg-white/20'
            }`}
          >
            <span className="text-2xl">{tab.icon}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {activeTab === 'actions' && (
          <div>
            <h2 className="text-lg font-semibold text-purple-700 mb-3 text-center">
              Care for your Bunny
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => performAction('feed')}
                className="touch-safe bg-bunny-cream/80 hover:bg-bunny-cream rounded-xl py-3 px-4 text-purple-800 font-medium transition-colors"
              >
                🥕 Feed
              </button>
              <button 
                onClick={() => performAction('play')}
                className="touch-safe bg-bunny-cream/80 hover:bg-bunny-cream rounded-xl py-3 px-4 text-purple-800 font-medium transition-colors"
              >
                🎮 Play
              </button>
              <button 
                onClick={() => performAction('sleep')}
                className="touch-safe bg-bunny-cream/80 hover:bg-bunny-cream rounded-xl py-3 px-4 text-purple-800 font-medium transition-colors"
              >
                💤 Sleep
              </button>
              <button 
                onClick={() => performAction('clean')}
                className="touch-safe bg-bunny-cream/80 hover:bg-bunny-cream rounded-xl py-3 px-4 text-purple-800 font-medium transition-colors"
              >
                🧼 Clean
              </button>
            </div>
          </div>
        )}

        {activeTab === 'wardrobe' && (
          <Wardrobe bunnyImageUrl={bunnyImageUrl} />
        )}

        {activeTab === 'chat' && (
          <div>
            <h2 className="text-lg font-semibold text-purple-700 mb-3 text-center">
              Chat with your Bunny
            </h2>
            <div className="text-center py-8">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-purple-600 text-sm">
                Chat system coming soon!
                <br />
                Have conversations with your bunny friend
              </p>
            </div>
          </div>
        )}

        {activeTab === 'adventure' && (
          <div>
            <h2 className="text-lg font-semibold text-purple-700 mb-3 text-center">
              Explore Adventures
            </h2>
            <div className="text-center py-8">
              <div className="text-4xl mb-3">⚔️</div>
              <p className="text-purple-600 text-sm">
                Adventure system coming soon!
                <br />
                Go on quests and discover new places
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { useBunny } from './context/BunnyContext';
import { useAuth } from './context/AuthContext';
import AuthModal from './components/AuthModal';
import InventoryDebug from './components/InventoryDebug';
import AdminPanel from './components/AdminPanel';
import AnimatedBunny from './components/BlinkingBunny';
import AnimationDebugPanel from './components/AnimationDebugPanel';

export default function Home() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [debugTrigger, setDebugTrigger] = useState<string | null>(null);
  const { state, loading, performAction, getStatPercentage, getStatEmoji, bunnyImageUrl, regenerateBunnyImage, imageGenerating } = useBunny();
  const { user, signOut, signInAsGuest } = useAuth();

  const handleTriggerAnimation = (animationType: string) => {
    console.log('🎮 Page: Triggering animation:', animationType);
    const uniqueTrigger = `${animationType}-${Date.now()}`;
    console.log('🎮 Page: Setting debugTrigger to:', uniqueTrigger);
    setDebugTrigger(uniqueTrigger);
  };
  return (
    <main className="max-w-sm mx-auto p-4 safe-area min-h-screen flex flex-col">
      <div className="flex justify-between items-center py-2">
        <h1 className="text-2xl font-bold text-purple-800">
          Bunny App 🐰
        </h1>
        {user ? (
          <button
            onClick={() => signOut()}
            className="text-sm text-purple-600 hover:text-purple-800"
          >
            Sign Out
          </button>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="text-sm bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700"
          >
            Sign In
          </button>
        )}
      </div>

      {!user ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-purple-700 mb-4">
              Welcome to Bunny Tamagotchi! 🐰
            </h2>
            <p className="text-purple-600 mb-6">
              Sign in to save your bunny progress across devices, or continue as a guest.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors"
              >
                Sign In / Sign Up
              </button>
              <p className="text-xs text-purple-500 text-center">
                Note: Authentication requires Supabase setup
              </p>
              <button
                onClick={() => signInAsGuest()}
                className="w-full bg-bunny-cream text-purple-800 py-3 rounded-xl font-medium hover:bg-bunny-cream/80 transition-colors"
              >
                Continue as Guest
              </button>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">🐰</div>
            <p className="text-purple-700">Loading your bunny...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-start space-y-6">
          <div className="w-full flex flex-col items-center">
            <div className="w-full aspect-square max-w-sm relative overflow-hidden rounded-3xl">
              <AnimatedBunny 
                bunnyImageUrl={bunnyImageUrl}
                alt="Bunny" 
                className="w-full h-full object-contain"
                debugTrigger={debugTrigger}
              />
              
              {/* Stats overlay in corners */}
              <div className="absolute top-3 left-3 pixel-font text-sm text-white bg-black/70 rounded-lg px-2 py-1">
                {getStatEmoji('connection')} {getStatPercentage('connection')}
              </div>
              <div className="absolute top-3 right-3 pixel-font text-sm text-white bg-black/70 rounded-lg px-2 py-1">
                {getStatEmoji('stimulation')} {getStatPercentage('stimulation')}
              </div>
              <div className="absolute bottom-3 left-3 pixel-font text-sm text-white bg-black/70 rounded-lg px-2 py-1">
                {getStatEmoji('comfort')} {getStatPercentage('comfort')}
              </div>
              <div className="absolute bottom-3 right-3 pixel-font text-sm text-white bg-black/70 rounded-lg px-2 py-1">
                {getStatEmoji('energy')} {getStatPercentage('energy')}
              </div>

              {imageGenerating && (
                <div className="absolute inset-0 bg-black/50 rounded-3xl flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-4xl mb-2 animate-bounce">🎨</div>
                    <p className="text-sm font-medium">Generating...</p>
                  </div>
                </div>
              )}
            </div>
            <button 
              onClick={() => regenerateBunnyImage()}
              disabled={imageGenerating}
              className={`mt-4 px-4 py-2 rounded-lg transition-colors text-sm ${
                imageGenerating 
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {imageGenerating ? '⏳ Generating...' : '🔄 Refresh Bunny'}
            </button>
          </div>


          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
            <h2 className="text-lg font-semibold text-purple-700 mb-3 text-center">
              Actions
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
            
            <AnimationDebugPanel onTriggerAnimation={handleTriggerAnimation} />
          </div>
        </div>
      )}

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

      <InventoryDebug />
      <AdminPanel />
    </main>
  )
}
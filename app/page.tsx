'use client';

import { useState, useEffect } from 'react';
import { useBunny } from './context/BunnyContext';
import { useAuth } from './context/AuthContext';
import AuthModal from './components/AuthModal';
import InventoryDebug from './components/InventoryDebug';
import AdminPanel from './components/AdminPanel';
import AnimatedBunny from './components/BlinkingBunny';
import AnimationDebugPanel from './components/AnimationDebugPanel';
import ActionsTabs from './components/ActionsTabs';

export default function Home() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [debugTrigger, setDebugTrigger] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [showAdminDebug, setShowAdminDebug] = useState(false);
  const [activeTab, setActiveTab] = useState<'actions' | 'wardrobe' | 'chat' | 'adventure' | 'settings'>('actions');
  const { state, loading, performAction, getStatPercentage, getStatEmoji, bunnyImageUrl, regenerateBunnyImage, imageGenerating, setBunnyImageUrl } = useBunny();
  const { user, signOut, signInAsGuest } = useAuth();

  // Listen for admin debug toggle events
  useEffect(() => {
    const handleToggleAdminDebug = () => {
      setShowAdminDebug(prev => !prev);
    };

    window.addEventListener('toggle-admin-debug', handleToggleAdminDebug);
    return () => window.removeEventListener('toggle-admin-debug', handleToggleAdminDebug);
  }, []);

  const handleTriggerAnimation = (animationType: string) => {
    console.log('🎮 Page: Triggering animation:', animationType);
    const uniqueTrigger = `${animationType}-${Date.now()}`;
    console.log('🎮 Page: Setting debugTrigger to:', uniqueTrigger);
    setDebugTrigger(uniqueTrigger);
  };

  const handleToggleDebugMode = () => {
    const newDebugMode = !debugMode;
    setDebugMode(newDebugMode);
    console.log('🎮 Debug mode:', newDebugMode ? 'ON (natural animations disabled)' : 'OFF (natural animations enabled)');
  };
  return (
    <main className="max-w-sm mx-auto p-4 safe-area min-h-screen flex flex-col">

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
          {/* Bunny - Always visible on ALL tabs */}
          <div className="w-full flex flex-col items-center">
            <div className="w-full aspect-square max-w-sm relative overflow-hidden rounded-3xl" style={{ backgroundImage: 'url(/scenes/meadow.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
              <AnimatedBunny 
                bunnyImageUrl={bunnyImageUrl}
                alt="Bunny" 
                className="w-full h-full object-contain"
                debugTrigger={debugTrigger}
                debugMode={debugMode}
              />
              
              {/* Stats overlay in corners */}
              <div className="absolute top-3 left-3 pixel-font text-sm text-white bg-black/70 rounded-lg px-2 py-1">
                {getStatEmoji('connection')} {getStatPercentage('connection')}
              </div>
              <div className="absolute top-3 right-3 pixel-font text-sm text-white bg-black/70 rounded-lg px-2 py-1">
                {getStatEmoji('stimulation')} {getStatPercentage('stimulation')}
              </div>
              
              {/* Bunny Name - centered between stats */}
              <div className="absolute top-3 left-1/2 transform -translate-x-1/2 pixel-font text-lg text-white bg-black/70 rounded-lg px-3 py-1">
                Bunny
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
          </div>

          {/* ActionsTabs - always in same position */}
          <ActionsTabs 
            performAction={performAction} 
            bunnyImageUrl={bunnyImageUrl} 
            onTabChange={setActiveTab}
          />
        </div>
      )}

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

      <InventoryDebug />
      
      {/* Admin Refresh Button */}
      <div className="fixed bottom-20 right-4 z-40">
        <button 
          onClick={() => regenerateBunnyImage()}
          disabled={imageGenerating}
          className={`px-3 py-2 rounded-lg transition-colors text-xs font-medium shadow-lg ${
            imageGenerating 
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {imageGenerating ? '⏳' : '🔄'}
        </button>
      </div>
      
      <AdminPanel />
      
      {/* Admin Debug Panel Overlay */}
      {showAdminDebug && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-orange-800">🎮 Animation Debug Panel</h2>
              <button
                onClick={() => setShowAdminDebug(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <AnimationDebugPanel 
              onTriggerAnimation={handleTriggerAnimation}
              debugMode={debugMode}
              onToggleDebugMode={handleToggleDebugMode}
            />
          </div>
        </div>
      )}
    </main>
  )
}
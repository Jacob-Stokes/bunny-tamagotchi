'use client';

import { useState, useEffect } from 'react';
import { useBunny } from './context/BunnyContext';
import { useAuth } from './context/AuthContext';
import { BunnyPersonalityTraits, BunnyPersonalityService } from './lib/bunnyPersonality';
import AuthModal from './components/AuthModal';
import AnimatedBunny from './components/BlinkingBunny';
import ActionsTabs from './components/ActionsTabs';

export default function Home() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [debugTrigger, setDebugTrigger] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'actions' | 'wardrobe' | 'chat' | 'adventure' | 'settings'>('actions');
  const [personality, setPersonality] = useState<BunnyPersonalityTraits | undefined>();
  const { state, loading, performAction, getStatPercentage, getStatEmoji, bunnyImageUrl, regenerateBunnyImage, imageGenerating, imageLoading, setBunnyImageUrl } = useBunny();
  const { user, signOut, signInAsGuest } = useAuth();

  // Initialize personality based on bunny stats when bunny loads
  useEffect(() => {
    if (state && !personality) {
      const generatedPersonality = BunnyPersonalityService.generatePersonalityFromStats(state.stats);
      setPersonality(generatedPersonality);
    }
  }, [state, personality]);


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
    <main className="max-w-sm mx-auto px-2 flex flex-col" style={{ 
      height: '80vh' /* Stop before URL bar area on mobile */
    }}>

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
        <div className="flex-1 flex flex-col">
          {/* Bunny - Ultra compact for mobile */}
          <div className="w-full flex flex-col items-center flex-shrink-0 pt-4 pb-1">
            <div className="w-full h-64 relative overflow-hidden rounded-2xl" style={{ backgroundImage: 'url(/scenes/meadow-wide2.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
              {imageLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-4xl mb-2 animate-bounce">🐰</div>
                    <p className="text-sm font-medium">Loading bunny...</p>
                  </div>
                </div>
              ) : (
                <AnimatedBunny 
                  bunnyImageUrl={bunnyImageUrl}
                  alt="Bunny" 
                  className="w-full h-full object-contain"
                  debugTrigger={debugTrigger}
                  debugMode={debugMode}
                />
              )}
              
              {/* Stats overlay stacked on sides */}
              <div className="absolute bottom-3 left-3 flex flex-col gap-1">
                <div className="pixel-font text-xxs text-white bg-black/50 rounded px-1 py-0.5">
                  {getStatEmoji('stimulation')} {getStatPercentage('stimulation')}
                </div>
                <div className="pixel-font text-xxs text-white bg-black/50 rounded px-1 py-0.5">
                  {getStatEmoji('connection')} {getStatPercentage('connection')}
                </div>
              </div>
              <div className="absolute bottom-3 right-3 flex flex-col gap-1">
                <div className="pixel-font text-xxs text-white bg-black/50 rounded px-1 py-0.5">
                  {getStatEmoji('comfort')} {getStatPercentage('comfort')}
                </div>
                <div className="pixel-font text-xxs text-white bg-black/50 rounded px-1 py-0.5">
                  {getStatEmoji('energy')} {getStatPercentage('energy')}
                </div>
              </div>
              
              {/* Money and Level in top corners */}
              <div className="absolute top-3 left-3 pixel-font text-xxs text-white bg-black/50 rounded px-1 py-0.5">
                💰 {state?.coins || 0}
              </div>
              <div className="absolute top-3 right-3 pixel-font text-xxs text-white bg-black/50 rounded px-1 py-0.5">
                ⭐ {Math.floor((state?.experience || 0) / 100) + 1}
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

          {/* ActionsTabs - Takes remaining space */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ActionsTabs 
              performAction={performAction} 
              bunnyImageUrl={bunnyImageUrl} 
              onTabChange={setActiveTab}
              personality={personality}
              onPersonalityChange={setPersonality}
              onTriggerAnimation={handleTriggerAnimation}
              debugMode={debugMode}
              onToggleDebugMode={handleToggleDebugMode}
            />
          </div>
        </div>
      )}

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

    </main>
  )
}
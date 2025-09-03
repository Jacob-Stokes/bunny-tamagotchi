'use client';

import { useState, useEffect } from 'react';
import { useBunny } from './context/BunnyContext';
import { useAuth } from './context/AuthContext';
import { useNotifications } from './context/NotificationContext';
import { BunnyPersonalityTraits, BunnyPersonalityService } from './lib/bunnyPersonality';
import AuthModal from './components/AuthModal';
import AnimatedBunny from './components/BlinkingBunny';
import ActionsTabs from './components/ActionsTabs';
import BunnyHopGame from './components/BunnyHopGame';
import AnimatedMeadowScene from './components/AnimatedMeadowScene';
import TimeOfDayManager from './components/TimeOfDayManager';

export default function Home() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [debugTrigger, setDebugTrigger] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'actions' | 'wardrobe' | 'chat' | 'adventure' | 'settings'>('actions');
  const [mounted, setMounted] = useState(false);
  const [showBunnyHopGame, setShowBunnyHopGame] = useState(false);
  
  const tabs = [
    { id: 'actions', label: 'Bunny', icon: '🐰' },
    { id: 'wardrobe', label: 'Wardrobe', icon: '🗄️' },
    { id: 'chat', label: 'Mailbox', icon: '📬' },
    { id: 'adventure', label: 'Adventure', icon: '⚔️' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ] as const;

  const handleTabChange = (tab: 'actions' | 'wardrobe' | 'chat' | 'adventure' | 'settings') => {
    setActiveTab(tab);
    // Close game when switching away from adventure tab
    if (tab !== 'adventure' && showBunnyHopGame) {
      setShowBunnyHopGame(false);
    }
  };
  const [personality, setPersonality] = useState<BunnyPersonalityTraits | undefined>();
  const { state, loading, performAction, getStatPercentage, getStatEmoji, bunnyImageUrl, regenerateBunnyImage, imageGenerating, imageLoading, setBunnyImageUrl } = useBunny();
  const { user, signOut, signInAsGuest } = useAuth();
  const { unreadCount } = useNotifications();

  // Client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize personality based on bunny stats when bunny loads
  useEffect(() => {
    if (state && !personality) {
      const generatedPersonality = BunnyPersonalityService.generatePersonalityFromStats(state.stats);
      setPersonality(generatedPersonality);
    }
  }, [state, personality]);


  const handleTriggerAnimation = (animationType: string) => {
    console.log('🎮 Page: Triggering animation:', animationType);
    
    if (animationType === 'start-bunny-hop-game') {
      setShowBunnyHopGame(true);
      return;
    }
    
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
    <main className="max-w-sm mx-auto px-2 flex flex-col pb-20" style={{ 
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
          {showBunnyHopGame ? (
            /* Game takes full screen */
            <div className="flex-1 w-full relative pt-2">
              <BunnyHopGame 
                bunnyImageUrl={bunnyImageUrl}
                onGameOver={(score) => {
                  console.log('🎮 Bunny Hop Game Over! Score:', score);
                  // Could award coins/XP based on score here
                }}
                onClose={() => setShowBunnyHopGame(false)}
              />
            </div>
          ) : (
            <>
              {/* Bunny - Ultra compact for mobile */}
              <div className="w-full flex flex-col items-center flex-shrink-0 pt-4 pb-1">
                <TimeOfDayManager autoAdvance={true} intervalMinutes={0.05}>
                  {(hour, setHour) => (
                    <AnimatedMeadowScene hour={hour} wardrobeMode={activeTab === 'wardrobe'}>
                  {imageLoading ? (
                    <div className="text-center text-white">
                      <div className="text-4xl mb-2 animate-bounce">🐰</div>
                      <p className="text-sm font-medium">Loading bunny...</p>
                    </div>
                  ) : (
                    <AnimatedBunny 
                      bunnyImageUrl={bunnyImageUrl}
                      alt="Bunny" 
                      className="w-[95%] h-[95%] object-contain mx-auto"
                      debugTrigger={debugTrigger}
                      debugMode={debugMode}
                    />
                  )}
                  
                  {/* Stats overlay stacked on sides */}
                  {mounted && (
                    <>
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
                    </>
                  )}
                  
                  {/* Money and Level in top corners */}
                  <div className="absolute top-3 left-3 pixel-font text-xxs text-white bg-black/50 rounded px-1 py-0.5">
                    💰 {mounted ? (state?.coins || 0) : 0}
                  </div>
                  <div className="absolute top-3 right-3 pixel-font text-xxs text-white bg-black/50 rounded px-1 py-0.5">
                    ⭐ {mounted ? Math.floor((state?.experience || 0) / 100) + 1 : 1}
                  </div>

                  {imageGenerating && (
                    <div className="absolute inset-0 bg-black/50 rounded-3xl flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="text-4xl mb-2 animate-bounce">🎨</div>
                        <p className="text-sm font-medium">Generating...</p>
                      </div>
                    </div>
                  )}
                </AnimatedMeadowScene>
                  )}
                </TimeOfDayManager>
              </div>

              {/* ActionsTabs - Takes remaining space */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <ActionsTabs 
                  performAction={performAction} 
                  bunnyImageUrl={bunnyImageUrl} 
                  activeTab={activeTab}
                  personality={personality}
                  onPersonalityChange={setPersonality}
                  onTriggerAnimation={handleTriggerAnimation}
                  debugMode={debugMode}
                  onToggleDebugMode={handleToggleDebugMode}
                />
              </div>
            </>
          )}
        </div>
      )}

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/30 backdrop-blur-sm border-t border-white/20 px-2 py-1 flex gap-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-colors relative flex flex-col items-center gap-1 ${
              activeTab === tab.id
                ? 'bg-white text-purple-800 shadow-sm'
                : 'text-purple-700 hover:text-purple-900 hover:bg-white/20'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-xs">{tab.label}</span>
            {mounted && tab.id === 'chat' && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

    </main>
  )
}
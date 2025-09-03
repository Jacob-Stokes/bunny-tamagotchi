'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBunny } from './context/BunnyContext';
import { useAuth } from './context/AuthContext';
import { useNotifications } from './context/NotificationContext';
import { BunnyPersonalityTraits, BunnyPersonalityService } from './lib/bunnyPersonality';
import { SlotType } from './types/inventory';
import { InventoryService } from './lib/inventoryService';
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
  const [wardrobeSelectedItems, setWardrobeSelectedItems] = useState<{[slot: string]: string}>({});
  const [bunnyInventory, setBunnyInventory] = useState<any>(null);
  
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

  // Load inventory when bunny state changes or image changes (after outfit generation)
  useEffect(() => {
    const loadInventory = async () => {
      if (state?.id) {
        try {
          const inventory = await InventoryService.getBunnyFullInventory(state.id);
          setBunnyInventory(inventory);
        } catch (error) {
          console.error('Failed to load inventory:', error);
        }
      }
    };
    
    loadInventory();
  }, [state?.id, bunnyImageUrl]);


  const handleTriggerAnimation = (animationType: string) => {
    
    if (animationType === 'start-bunny-hop-game') {
      setShowBunnyHopGame(true);
      return;
    }
    
    const uniqueTrigger = `${animationType}-${Date.now()}`;
    setDebugTrigger(uniqueTrigger);
  };

  const handleToggleDebugMode = () => {
    const newDebugMode = !debugMode;
    setDebugMode(newDebugMode);
  };

  // Stable callback functions to prevent infinite loops
  const handleWardrobeSelectedItemsChange = useCallback((items: {[slot: string]: string}) => {
    setWardrobeSelectedItems(items);
  }, []);

  const handleClearWardrobeChanges = useCallback(() => {
    setWardrobeSelectedItems({});
  }, []);
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
                  // Could award coins/XP based on score here
                }}
                onClose={() => setShowBunnyHopGame(false)}
              />
            </div>
          ) : (
            <>
              {/* Bunny Box - Modified layout for Items mode */}
              <div className="w-full flex flex-col items-center flex-shrink-0 pt-4 pb-1">
                <TimeOfDayManager autoAdvance={true} intervalMinutes={0.05}>
                  {(hour, setHour) => (
                    <AnimatedMeadowScene hour={hour} wardrobeMode={activeTab === 'wardrobe'}>
                      {/* Flexible content based on active tab */}
                      {activeTab === 'wardrobe' ? (
                        /* Wardrobe Items Mode: Split layout - Bunny left, Items right */
                        <div className="flex w-full h-full">
                          {/* White overlay behind bunny and outfit items for better visibility */}
                          <div className="absolute inset-0 bg-white/85 rounded-2xl"></div>
                          
                          {/* Left: Bunny (takes 45% of space) */}
                          <div style={{width: '45%'}} className="relative flex items-center justify-start pl-4 z-10">
                            {imageLoading ? (
                              <div className="text-center text-white">
                                <div className="text-3xl mb-2 animate-bounce">🐰</div>
                                <p className="text-xs font-medium">Loading...</p>
                              </div>
                            ) : (
                              <div style={{ transform: 'scale(1.5)', transformOrigin: 'center' }}>
                                <AnimatedBunny 
                                  bunnyImageUrl={bunnyImageUrl}
                                  alt="Bunny" 
                                  className="w-full h-full object-contain"
                                  debugTrigger={debugTrigger}
                                  debugMode={true} // Always static in wardrobe
                                />
                              </div>
                            )}
                          </div>
                          
                          {/* Right: Selected Items Panel (takes 55% of space) */}
                          <div style={{width: '55%'}} className="relative p-2">
                            <div 
                              className="bg-white/90 backdrop-blur-sm border border-white/30 rounded-xl p-3 h-full overflow-y-auto"
                              style={{ minHeight: '180px', maxHeight: '280px' }}
                            >
                              <h4 className="text-purple-800 font-medium text-xs mb-2">📝 Outfit Items</h4>
                              <div className="space-y-1">
                                {/* Show currently equipped items first, then any modifications */}
                                {(() => {
                                  const currentEquipment = bunnyInventory?.equipment || {};
                                  
                                  // Equipment data loaded from database
                                  
                                  const allSlots = new Set([
                                    ...Object.keys(currentEquipment),
                                    ...Object.keys(wardrobeSelectedItems)
                                  ]);
                                  
                                  if (allSlots.size === 0) {
                                    return (
                                      <div className="text-center text-purple-600 text-xxs py-2">
                                        <div className="text-lg mb-1">👔</div>
                                        <p>No items equipped</p>
                                      </div>
                                    );
                                  }
                                  
                                  // Define body order from top to bottom
                                  const bodyOrder = ['head', 'face', 'upper_body', 'lower_body', 'feet', 'accessory'];
                                  const sortedSlots = Array.from(allSlots).sort((a, b) => {
                                    const aIndex = bodyOrder.indexOf(a);
                                    const bIndex = bodyOrder.indexOf(b);
                                    // If slot not in bodyOrder, put it at the end
                                    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
                                    if (aIndex === -1) return 1;
                                    if (bIndex === -1) return -1;
                                    return aIndex - bIndex;
                                  });
                                  
                                  return sortedSlots.map(slot => {
                                    // Check if user has made changes to this slot
                                    const selectedItemId = wardrobeSelectedItems[slot];
                                    
                                    if (selectedItemId === 'EMPTY_SLOT') {
                                      // User wants to remove this slot
                                      return (
                                        <div key={slot} className="flex items-center gap-2 bg-orange-100 rounded p-1.5">
                                          <div className="w-6 h-6 bg-orange-200 rounded flex items-center justify-center">
                                            <span className="text-orange-600 text-xxs">∅</span>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-xxs font-medium text-orange-700 truncate">
                                              Empty {slot}
                                            </div>
                                            <div className="text-xxs text-orange-600">Will be removed</div>
                                          </div>
                                          <button
                                            onClick={() => {
                                              setWardrobeSelectedItems(prev => {
                                                const newItems = { ...prev };
                                                delete newItems[slot];
                                                return newItems;
                                              });
                                            }}
                                            className="text-red-600 hover:text-red-800 text-xs px-1"
                                          >
                                            ↶
                                          </button>
                                        </div>
                                      );
                                    } else if (selectedItemId && selectedItemId !== 'EMPTY_SLOT') {
                                      // User has selected a replacement item
                                      const allItems = bunnyInventory?.inventory || [];
                                      const inventoryItem = allItems.find((i: any) => i.item?.id === selectedItemId);
                                      const item = inventoryItem?.item;
                                      
                                      return (
                                        <div key={slot} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded p-1.5">
                                          <div className="w-6 h-6 bg-white border border-blue-300 rounded overflow-hidden">
                                            {item?.image_url ? (
                                              <img 
                                                src={item.image_url}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                              />
                                            ) : (
                                              <div className="w-full h-full flex items-center justify-center">
                                                <span className="text-xxs">📦</span>
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-xxs font-medium text-blue-800 truncate">
                                              {item?.name || 'Unknown Item'}
                                            </div>
                                            <div className="text-xxs text-blue-600">New selection</div>
                                          </div>
                                          <button
                                            onClick={() => {
                                              setWardrobeSelectedItems(prev => {
                                                const newItems = { ...prev };
                                                delete newItems[slot];
                                                return newItems;
                                              });
                                            }}
                                            className="text-red-600 hover:text-red-800 text-xs px-1"
                                          >
                                            ↶
                                          </button>
                                        </div>
                                      );
                                    } else {
                                      // Show currently equipped item (default state)
                                      const currentItem = currentEquipment[slot];
                                      if (!currentItem) return null;
                                      
                                      // Debug log to see what data we have
                                      
                                      return (
                                        <div key={slot} className="flex items-center gap-2 bg-green-50 rounded p-1.5">
                                          <div className="w-6 h-6 bg-white border border-green-200 rounded overflow-hidden">
                                            {(currentItem.image_url || currentItem.item?.image_url) ? (
                                              <img 
                                                src={currentItem.image_url || currentItem.item?.image_url}
                                                alt={currentItem.name || currentItem.item?.name || 'Item'}
                                                className="w-full h-full object-cover"
                                              />
                                            ) : (
                                              <div className="w-full h-full flex items-center justify-center">
                                                <span className="text-xxs">📦</span>
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-xxs font-medium text-green-800 truncate">
                                              {currentItem.name || currentItem.item?.name || 'Unknown Item'}
                                            </div>
                                            <div className="text-xxs text-green-600">Currently worn</div>
                                          </div>
                                          <button
                                            onClick={() => {
                                              setWardrobeSelectedItems(prev => ({
                                                ...prev,
                                                [slot]: 'EMPTY_SLOT'
                                              }));
                                            }}
                                            className="text-orange-600 hover:text-orange-800 text-xs px-1"
                                          >
                                            ×
                                          </button>
                                        </div>
                                      );
                                    }
                                  });
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Normal Mode: Centered bunny */
                        <>
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
                        </>
                      )}
                  
                      {/* Stats overlay - only show when NOT in wardrobe items mode */}
                      {mounted && activeTab !== 'wardrobe' && (
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
                  onWardrobeSelectedItemsChange={handleWardrobeSelectedItemsChange}
                  wardrobeSelectedItems={wardrobeSelectedItems}
                  onClearWardrobeChanges={handleClearWardrobeChanges}
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
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
  const [animatingItems, setAnimatingItems] = useState(false);
  const [isSad, setIsSad] = useState(false);
  
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
  console.log('📷 Page bunnyImageUrl:', bunnyImageUrl);
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

  // Load inventory and active outfit when bunny state changes or image changes (after outfit generation)
  useEffect(() => {
    const loadInventoryAndActiveOutfit = async () => {
      if (state?.id) {
        try {
          const inventory = await InventoryService.getBunnyFullInventory(state.id);
          setBunnyInventory(inventory);
          
          // Also load and apply the active outfit image (if any) 
          // NOTE: Don't manipulate equipment here as it breaks the UI
          const { OutfitService } = await import('./lib/outfitService');
          const activeOutfit = await OutfitService.getActiveOutfit(state.id);
          
          if (activeOutfit && activeOutfit.image_urls?.normal) {
            console.log('🖼️ Loading active outfit image:', activeOutfit.name);
            setBunnyImageUrl(activeOutfit.image_urls.normal);
          }
        } catch (error) {
          console.error('Failed to load inventory or active outfit:', error);
        }
      }
    };
    
    loadInventoryAndActiveOutfit();
  }, [state?.id]); // Remove bunnyImageUrl dependency to prevent loops


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

  const handleToggleSadness = () => {
    setIsSad(!isSad);
  };

  // Stable callback functions to prevent infinite loops
  const handleWardrobeSelectedItemsChange = useCallback((items: {[slot: string]: string}) => {
    setWardrobeSelectedItems(items);
  }, []);

  const handleClearWardrobeChanges = useCallback(() => {
    setWardrobeSelectedItems({});
  }, []);

  // Callback to reload inventory when outfit changes
  const handleInventoryUpdate = useCallback(async () => {
    if (state?.id) {
      try {
        // Trigger animation before loading new data
        setAnimatingItems(true);
        
        const inventory = await InventoryService.getBunnyFullInventory(state.id);
        setBunnyInventory(inventory);
        console.log('🔄 Page-level inventory updated after outfit switch');
        
        // Reset animation after a short delay to allow for staggered animations
        setTimeout(() => {
          setAnimatingItems(false);
        }, 100);
      } catch (error) {
        console.error('Failed to reload inventory after outfit switch:', error);
        setAnimatingItems(false);
      }
    }
  }, [state?.id]);
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
                      {/* Single layout with transitions */}
                      <div className="relative w-full h-full">
                        {/* White overlay slides in from top */}
                        <div 
                          className={`absolute inset-0 bg-white/85 rounded-2xl transition-all duration-500 ease-out ${
                            activeTab === 'wardrobe' 
                              ? 'transform translate-y-0 opacity-100' 
                              : 'transform -translate-y-full opacity-0'
                          }`}
                        ></div>
                        
                        {/* Bunny - transitions between center and left position */}
                        <div className={`absolute inset-0 flex items-center transition-all duration-500 ease-out z-10 ${
                          activeTab === 'wardrobe'
                            ? 'justify-start pl-4 w-[45%]' // Left side in wardrobe
                            : 'justify-center w-full' // Center in normal mode
                        }`}>
                          {imageLoading ? (
                            <div className="text-center text-white">
                              <div className={`mb-2 animate-bounce ${
                                activeTab === 'wardrobe' ? 'text-3xl' : 'text-4xl'
                              }`}>🐰</div>
                              <p className={`font-medium ${
                                activeTab === 'wardrobe' ? 'text-xs' : 'text-sm'
                              }`}>Loading{activeTab === 'wardrobe' ? '...' : ' bunny...'}</p>
                            </div>
                          ) : (
                            <div className={`transition-all duration-500 ease-out ${
                              activeTab === 'wardrobe'
                                ? 'scale-150' // Scaled up for wardrobe
                                : 'scale-100 w-[95%] h-[95%]' // Normal size
                            }`}>
                              <AnimatedBunny 
                                bunnyImageUrl={bunnyImageUrl}
                                alt="Bunny" 
                                className="w-full h-full object-contain"
                                debugTrigger={debugTrigger}
                                debugMode={activeTab === 'wardrobe'}
                                isSad={isSad}
                              />
                            </div>
                          )}
                        </div>
                        
                        {/* Outfit Items Panel - slides in from right */}
                        <div 
                          className={`absolute right-0 top-0 w-[55%] h-full p-2 transition-all duration-500 ease-out delay-150 z-20 ${
                            activeTab === 'wardrobe'
                              ? 'transform translate-x-0 opacity-100 pointer-events-auto'
                              : 'transform translate-x-full opacity-0 pointer-events-none'
                          }`}
                        >
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
                                  
                                  return sortedSlots.map((slot, index) => {
                                    // Check if user has made changes to this slot
                                    const selectedItemId = wardrobeSelectedItems[slot];
                                    
                                    // Animation classes for slide-in effect
                                    const getAnimationClass = (index: number) => {
                                      const delay = index * 100; // Stagger by 100ms each
                                      return animatingItems 
                                        ? `transform translate-x-full opacity-0 transition-all duration-300 ease-out`
                                        : `transform translate-x-0 opacity-100 transition-all duration-300 ease-out delay-[${delay}ms]`;
                                    };
                                    
                                    if (selectedItemId === 'EMPTY_SLOT') {
                                      // User wants to remove this slot
                                      return (
                                        <div key={slot} className={`flex items-center gap-2 bg-orange-100 rounded p-1.5 ${getAnimationClass(index)}`}>
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
                                        <div key={slot} className={`flex items-center gap-2 bg-blue-50 border border-blue-200 rounded p-1.5 ${getAnimationClass(index)}`}>
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
                                        <div key={slot} className={`flex items-center gap-2 bg-green-50 rounded p-1.5 ${getAnimationClass(index)}`}>
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
                  
                      {/* Stats overlay - with dissolve transitions */}
                      {mounted && (
                        <>
                          <div className={`absolute bottom-3 left-3 flex flex-col gap-1 transition-all duration-500 ease-out ${
                            activeTab !== 'wardrobe' 
                              ? 'opacity-100 scale-100' 
                              : 'opacity-0 scale-95 pointer-events-none'
                          }`}>
                            <div className="pixel-font text-xxs text-white bg-black/50 rounded px-1 py-0.5">
                              {getStatEmoji('stimulation')} {getStatPercentage('stimulation')}
                            </div>
                            <div className="pixel-font text-xxs text-white bg-black/50 rounded px-1 py-0.5">
                              {getStatEmoji('connection')} {getStatPercentage('connection')}
                            </div>
                          </div>
                          <div className={`absolute bottom-3 right-3 flex flex-col gap-1 transition-all duration-500 ease-out ${
                            activeTab !== 'wardrobe' 
                              ? 'opacity-100 scale-100' 
                              : 'opacity-0 scale-95 pointer-events-none'
                          }`}>
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
                  onInventoryUpdate={handleInventoryUpdate}
                  isSad={isSad}
                  onToggleSadness={handleToggleSadness}
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
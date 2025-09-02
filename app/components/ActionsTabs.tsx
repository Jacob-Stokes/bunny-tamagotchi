'use client';

import { useState, useEffect } from 'react';
import { ActionType } from '../types/bunny';
import { useAuth } from '../context/AuthContext';
import { useBunny } from '../context/BunnyContext';
import { useNotifications } from '../context/NotificationContext';
import { BunnyPersonalityTraits, BunnyPersonalityService, BunnyContext } from '../lib/bunnyPersonality';
import { SceneService, Scene } from '../lib/sceneService';
import { InventoryService } from '../lib/inventoryService';
import { Item } from '../types/inventory';
import Wardrobe from './Wardrobe';
import BunnyChat from './BunnyChat';
import AnimationDebugPanel from './AnimationDebugPanel';
import InventoryDebug from './InventoryDebug';
import AdminPanel from './AdminPanel';
import AdminOutfitPreview from './AdminOutfitPreview';

interface ActionsTabsProps {
  performAction: (action: ActionType) => Promise<void>;
  bunnyImageUrl: string;
  onTabChange?: (tab: 'actions' | 'wardrobe' | 'chat' | 'adventure' | 'settings') => void;
  personality?: BunnyPersonalityTraits;
  onPersonalityChange?: (personality: BunnyPersonalityTraits) => void;
  onTriggerAnimation?: (animationType: string) => void;
  debugMode?: boolean;
  onToggleDebugMode?: () => void;
}

export default function ActionsTabs({ 
  performAction, 
  bunnyImageUrl, 
  onTabChange, 
  personality, 
  onPersonalityChange,
  onTriggerAnimation,
  debugMode = false,
  onToggleDebugMode = () => {}
}: ActionsTabsProps) {
  const [activeTab, setActiveTab] = useState<'actions' | 'wardrobe' | 'chat' | 'adventure' | 'settings'>('actions');
  const [equippedItems, setEquippedItems] = useState<Array<{ item_id: string; slot: string; image_url: string; name: string }>>([]);
  const [showItemsManagement, setShowItemsManagement] = useState(false);
  const [showBaseBunnySelection, setShowBaseBunnySelection] = useState(false);
  const [showSceneManagement, setShowSceneManagement] = useState(false);
  const [showGeneratedOutfits, setShowGeneratedOutfits] = useState(false);
  
  // Admin functionality state (copied from AdminPanel)
  const [availableBaseBunnies, setAvailableBaseBunnies] = useState<string[]>([]);
  const [currentBaseBunny, setCurrentBaseBunny] = useState<string>('base-bunny-transparent.png');
  const [currentScene, setCurrentScene] = useState<string>('meadow');
  const [allScenes, setAllScenes] = useState<Scene[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedOutfits, setGeneratedOutfits] = useState<any[]>([]);
  const [loadingOutfits, setLoadingOutfits] = useState(false);
  
  const { signOut } = useAuth();
  const { state } = useBunny();
  const { unreadCount, notifications, acknowledgeOutfitCompletion } = useNotifications();

  // Load equipped items when bunny state changes
  useEffect(() => {
    const loadEquippedItems = async () => {
      if (!state.id) return;
      
      try {
        const { InventoryService } = await import('../lib/inventoryService');
        const inventoryData = await InventoryService.getBunnyFullInventory(state.id);
        const equipped = Object.values(inventoryData.equipment)
          .map(item => ({
            item_id: item.item_id,
            slot: item.slot,
            image_url: item.item?.image_url || '',
            name: item.item?.name || 'Unknown Item'
          }))
          .filter(item => item.image_url);
        
        setEquippedItems(equipped);
      } catch (error) {
        console.error('Error loading equipped items:', error);
        setEquippedItems([]);
      }
    };

    loadEquippedItems();
  }, [state.id]);

  // Admin functions (copied from AdminPanel)
  const loadBaseBunnies = async () => {
    try {
      const response = await fetch('/api/base-bunnies');
      if (response.ok) {
        const data = await response.json();
        setAvailableBaseBunnies(data.baseBunnies);
      }
    } catch (err) {
      console.error('Error loading base bunnies:', err);
    }
  };

  const loadCurrentBaseBunny = () => {
    const saved = localStorage.getItem('selected-base-bunny');
    if (saved) {
      setCurrentBaseBunny(saved);
    }
  };

  const selectBaseBunny = (bunnyFileName: string) => {
    setCurrentBaseBunny(bunnyFileName);
    localStorage.setItem('selected-base-bunny', bunnyFileName);
    console.log('Selected base bunny:', bunnyFileName);
  };

  const loadCurrentScene = () => {
    const saved = localStorage.getItem('selected-scene');
    if (saved) {
      setCurrentScene(saved);
    }
  };

  const selectScene = (sceneId: string) => {
    setCurrentScene(sceneId);
    localStorage.setItem('selected-scene', sceneId);
    console.log('Selected scene:', sceneId);
  };

  const loadScenes = async () => {
    try {
      const scenes = await SceneService.getAllScenes();
      setAllScenes(scenes);
    } catch (err) {
      console.error('Error loading scenes:', err);
    }
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const items = await InventoryService.getItems();
      setAllItems(items);
    } catch (err: any) {
      console.error('Error loading items:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGeneratedOutfits = async () => {
    setLoadingOutfits(true);
    try {
      const response = await fetch('/api/generated-outfits');
      if (response.ok) {
        const data = await response.json();
        setGeneratedOutfits(data.outfits || []);
      }
    } catch (error) {
      console.error('Error loading generated outfits:', error);
    } finally {
      setLoadingOutfits(false);
    }
  };

  // Load admin data when needed
  useEffect(() => {
    if (showBaseBunnySelection) {
      loadBaseBunnies();
      loadCurrentBaseBunny();
    }
  }, [showBaseBunnySelection]);

  useEffect(() => {
    if (showSceneManagement) {
      loadCurrentScene();
      loadScenes();
    }
  }, [showSceneManagement]);

  useEffect(() => {
    if (showItemsManagement) {
      loadItems();
    }
  }, [showItemsManagement]);

  useEffect(() => {
    if (showGeneratedOutfits) {
      loadGeneratedOutfits();
    }
  }, [showGeneratedOutfits]);

  const handleTabChange = (tab: 'actions' | 'wardrobe' | 'chat' | 'adventure' | 'settings') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const handleAcceptOutfit = async (jobId: string) => {
    try {
      // Acknowledge the completion (this will assign the outfit and trigger regeneration)
      await acknowledgeOutfitCompletion(jobId);
      console.log('✅ Outfit accepted and assigned');
      
    } catch (error) {
      console.error('Error accepting outfit:', error);
    }
  };

  // Create bunny context for chat from current state
  const createBunnyContext = (): BunnyContext => {
    const currentPersonality = personality || BunnyPersonalityService.getDefaultPersonality();
    const currentMood = BunnyPersonalityService.determineMood(state.stats, BunnyPersonalityService.getCurrentTimeOfDay());
    
    return {
      name: state.name || 'Bunny',
      stats: state.stats,
      personality: currentPersonality,
      currentOutfit: equippedItems,
      currentScene: localStorage.getItem('selected-scene') || 'meadow',
      timeOfDay: BunnyPersonalityService.getCurrentTimeOfDay(),
      mood: currentMood
    };
  };

  const tabs = [
    { id: 'actions', label: 'Bunny', icon: '🐰' },
    { id: 'wardrobe', label: 'Wardrobe', icon: '🗄️' },
    { id: 'chat', label: 'Mailbox', icon: '📬' },
    { id: 'adventure', label: 'Adventure', icon: '⚔️' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ] as const;

  return (
    <div>
      <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-2 h-full flex flex-col overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex gap-0.5 mb-2 bg-white/30 rounded-xl p-0.5 flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-1 py-1 px-2 rounded-lg text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'bg-white text-purple-800 shadow-sm'
                : 'text-purple-700 hover:text-purple-900 hover:bg-white/20'
            }`}
          >
            <span className="text-2xl">{tab.icon}</span>
            {tab.id === 'chat' && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'actions' && (
          <div className="h-full flex flex-col overflow-hidden">
            {/* Chat Interface with integrated care actions - Fixed height like WhatsApp */}
            <div style={{ height: '400px' }} className="overflow-hidden">
              <BunnyChat 
                personality={personality} 
                onPersonalityChange={onPersonalityChange}
                bunnyContext={createBunnyContext()}
                performAction={performAction}
                showActionButtons={true}
              />
            </div>
          </div>
        )}

        {activeTab === 'wardrobe' && (
          <Wardrobe bunnyImageUrl={bunnyImageUrl} />
        )}

        {activeTab === 'chat' && (
          <div className="space-y-4 overflow-y-auto max-h-full">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📬</span>
              <h2 className="text-lg font-semibold text-purple-700">Mailbox</h2>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            
            {notifications.length > 0 ? (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-xl text-sm shadow-sm ${
                      notification.type === 'outfit_complete'
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-purple-800 mb-1">{notification.title}</p>
                        <p className="text-purple-600 text-xs leading-relaxed">{notification.message}</p>
                        <p className="text-purple-400 text-xs mt-2">
                          {notification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {notification.type === 'outfit_complete' && (
                        <button
                          onClick={() => handleAcceptOutfit(notification.data?.jobId)}
                          className="ml-3 bg-green-500 text-white text-sm px-3 py-2 rounded-lg font-medium hover:bg-green-600 transition-colors flex-shrink-0"
                        >
                          Accept
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-purple-600 text-sm">Your mailbox is empty</p>
                <p className="text-purple-400 text-xs mt-1">Notifications will appear here</p>
              </div>
            )}
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

        {activeTab === 'settings' && (
          <div>
            <h2 className="text-lg font-semibold text-purple-700 mb-3 text-center">
              Settings
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => signOut()}
                className="w-full touch-safe bg-red-100 hover:bg-red-200 rounded-xl py-3 px-4 text-red-700 font-medium transition-colors flex items-center justify-center gap-2"
              >
                🚪 Sign Out
              </button>
              
              {/* Admin Debug Section */}
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                <h3 className="text-lg font-semibold text-purple-700 mb-3">
                  🎮 Admin Debug
                </h3>
                <AnimationDebugPanel 
                  onTriggerAnimation={onTriggerAnimation}
                  debugMode={debugMode}
                  onToggleDebugMode={onToggleDebugMode}
                  personality={personality}
                  onPersonalityChange={onPersonalityChange}
                />
              </div>

              {/* Admin Controls Section - Simple buttons that open full-screen modals */}
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                <h3 className="text-lg font-semibold text-purple-700 mb-3">
                  ⚙️ Admin Controls
                </h3>
                <div className="space-y-3">
                  {/* Items Management Button */}
                  <button
                    onClick={() => setShowItemsManagement(true)}
                    className="w-full bg-red-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    📦 Items Management
                  </button>
                  
                  {/* Base Bunny Selection Button */}
                  <button
                    onClick={() => setShowBaseBunnySelection(true)}
                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    🐰 Base Bunny Selection
                  </button>
                  
                  {/* Scene Management Button */}
                  <button
                    onClick={() => setShowSceneManagement(true)}
                    className="w-full bg-green-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    🌸 Scene Management
                  </button>
                  
                  {/* Generated Outfits Button */}
                  <button
                    onClick={() => setShowGeneratedOutfits(true)}
                    className="w-full bg-purple-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                  >
                    🎨 Generated Outfits
                  </button>
                  
                  <InventoryDebug />
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
      
      {/* Full-Screen Modals - OUTSIDE the main container */}
      {showItemsManagement && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-red-800">📦 Items Management</h2>
              <button
                onClick={() => setShowItemsManagement(false)}
                className="text-gray-500 hover:text-gray-700 text-xl bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>
            
            {loading ? (
              <div className="text-center py-8">Loading items...</div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold mb-4">All Items ({allItems.length})</h3>
                {allItems.map(item => (
                  <div key={item.id} className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      {item.image_url && (
                        <img 
                          src={item.image_url} 
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded border"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            item.rarity === 'common' ? 'bg-gray-200' :
                            item.rarity === 'uncommon' ? 'bg-green-200' :
                            item.rarity === 'rare' ? 'bg-blue-200' :
                            item.rarity === 'epic' ? 'bg-purple-200' : 'bg-yellow-200'
                          }`}>
                            {item.rarity}
                          </span>
                          <span className="font-medium">{item.name}</span>
                          <span className="text-gray-600 text-sm">({item.slot})</span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {item.category} • {item.item_type} • ${item.cost}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showBaseBunnySelection && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-blue-800">🐰 Base Bunny Selection</h2>
              <button
                onClick={() => setShowBaseBunnySelection(false)}
                className="text-gray-500 hover:text-gray-700 text-xl bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Choose the default bunny image that will be used as the base for all bunny generations.
                Current selection: <strong>{currentBaseBunny}</strong>
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {availableBaseBunnies.map((bunnyFile) => (
                  <div 
                    key={bunnyFile}
                    className={`border-2 rounded-lg p-4 cursor-pointer hover:bg-gray-50 ${
                      currentBaseBunny === bunnyFile 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200'
                    }`}
                    onClick={() => selectBaseBunny(bunnyFile)}
                  >
                    <img 
                      src={`/base-bunnies/${bunnyFile}`}
                      alt={bunnyFile}
                      className="w-full h-32 object-cover rounded mb-2"
                    />
                    <p className="text-sm text-center font-medium">
                      {bunnyFile.replace('.png', '').replace(/-/g, ' ')}
                    </p>
                    {currentBaseBunny === bunnyFile && (
                      <div className="text-center mt-2">
                        <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs">
                          Selected
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showSceneManagement && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-green-800">🌸 Scene Management</h2>
              <button
                onClick={() => setShowSceneManagement(false)}
                className="text-gray-500 hover:text-gray-700 text-xl bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Choose the background scene that will be used when generating bunny images with Gemini.
                Current selection: <strong>{allScenes.find(s => s.id === currentScene)?.name || 'Sunny Meadow'}</strong>
              </p>
              
              <div className="space-y-4">
                {allScenes.map((scene) => (
                  <div 
                    key={scene.id}
                    className={`border-2 rounded-lg p-4 ${
                      currentScene === scene.id 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {scene.background_image_url && (
                        <img 
                          src={scene.background_image_url}
                          alt={scene.name}
                          className="w-24 h-24 object-cover rounded border"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-lg">{scene.name}</h4>
                          <button
                            onClick={() => selectScene(scene.id)}
                            className={`px-3 py-1 rounded text-sm ${
                              currentScene === scene.id 
                                ? 'bg-green-500 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {currentScene === scene.id ? 'Selected' : 'Select'}
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed mb-2">
                          {scene.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          ID: {scene.id} • Created: {new Date(scene.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showGeneratedOutfits && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-purple-800">🎨 Generated Outfits ({generatedOutfits.length})</h2>
              <div className="flex gap-2">
                <button
                  onClick={loadGeneratedOutfits}
                  disabled={loadingOutfits}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loadingOutfits ? 'Loading...' : '🔄 Refresh'}
                </button>
                <button
                  onClick={() => setShowGeneratedOutfits(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            </div>
            
            {loadingOutfits ? (
              <div className="text-center py-8">Loading generated outfits...</div>
            ) : generatedOutfits.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No generated outfits found</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {generatedOutfits.map((outfit) => (
                  <div key={outfit.key} className="border rounded-lg p-4 bg-gray-50">
                    <div className="mb-3">
                      <AdminOutfitPreview
                        normalUrl={outfit.normalUrl}
                        blinkUrl={outfit.blinkUrl}
                        sceneNormalUrl={outfit.sceneNormalUrl}
                        sceneBlinkUrl={outfit.sceneBlinkUrl}
                        hasBlinkFrame={outfit.hasBlinkFrame}
                        hasSceneComposition={outfit.hasSceneComposition}
                        className="w-full h-48 object-cover rounded border"
                        alt={`Outfit ${outfit.key}`}
                      />
                    </div>
                    
                    <div className="mb-3">
                      <h4 className="font-medium text-sm mb-1">{outfit.baseBunny}</h4>
                      <p className="text-xs text-gray-600 mb-2">
                        {outfit.equippedItems?.length || 0} items • Scene: {outfit.scene}
                      </p>
                      {outfit.equippedItems && outfit.equippedItems.length > 0 && (
                        <div className="text-xs text-gray-500">
                          Items: {outfit.equippedItems.join(', ')}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Generated: Unknown
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
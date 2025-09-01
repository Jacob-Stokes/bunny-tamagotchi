'use client';

import React, { useState, useEffect } from 'react';
import { InventoryService } from '../lib/inventoryService';
import { OutfitService, Outfit } from '../lib/outfitService';
import { useBunny } from '../context/BunnyContext';
import { useAuth } from '../context/AuthContext';
import { Item, BunnyFullInventory, SlotType } from '../types/inventory';
import OutfitPreview from './OutfitPreview';
import AnimatedBunny from './BlinkingBunny';

interface WardrobeProps {
  className?: string;
  bunnyImageUrl: string;
}

export default function Wardrobe({ className = '', bunnyImageUrl }: WardrobeProps) {
  const [bunnyInventory, setBunnyInventory] = useState<BunnyFullInventory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotType>('head');
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'customize' | 'saved'>('customize');
  const [savedOutfits, setSavedOutfits] = useState<Outfit[]>([]);
  const [generatedOutfits, setGeneratedOutfits] = useState<any[]>([]);
  const [loadingOutfits, setLoadingOutfits] = useState(false);
  const [dailyUsage, setDailyUsage] = useState<{ used: number; limit: number }>({ used: 0, limit: 10 });

  const { state: bunnyState, regenerateBunnyImage, setBunnyImageUrl } = useBunny();
  const { user } = useAuth();

  // Slot information with user-friendly names and icons
  const slotInfo = {
    head: { name: 'Head', icon: '🎩', description: 'Hats, helmets, and headwear' },
    face: { name: 'Face', icon: '👓', description: 'Glasses, masks, and facial accessories' },
    upper_body: { name: 'Top', icon: '👕', description: 'Shirts, jackets, and upper body clothing' },
    lower_body: { name: 'Bottom', icon: '👖', description: 'Pants, skirts, and lower body clothing' },
    feet: { name: 'Feet', icon: '👟', description: 'Shoes, boots, and footwear' },
    accessory: { name: 'Accessory', icon: '✨', description: 'Jewelry, bags, and other accessories' },
  } as const;

  const loadInventory = async () => {
    if (!user || user.id === 'guest-user' || !bunnyState.id) {
      setError('Sign in to access your wardrobe');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const inventory = await InventoryService.getBunnyFullInventory(bunnyState.id);
      setBunnyInventory(inventory);
    } catch (err: any) {
      setError('Unable to load wardrobe');
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
    if (user && user.id !== 'guest-user') {
      loadSavedOutfits();
      loadDailyUsage();
    }
  }, [user, bunnyState.id]);

  const loadSavedOutfits = async () => {
    if (!bunnyState.id) return;
    
    setLoadingOutfits(true);
    try {
      const outfits = await OutfitService.getUserOutfits(bunnyState.id);
      setSavedOutfits(outfits);
    } catch (err: any) {
      console.error('Error loading saved outfits:', err);
    } finally {
      setLoadingOutfits(false);
    }
  };

  const loadGeneratedOutfits = async () => {
    setLoadingOutfits(true);
    try {
      const response = await fetch('/api/generated-outfits');
      const data = await response.json();
      
      if (data.outfits) {
        setGeneratedOutfits(data.outfits);
      }
    } catch (error) {
      console.error('Failed to load generated outfits:', error);
      setError('Failed to load outfit gallery');
    } finally {
      setLoadingOutfits(false);
    }
  };

  const switchToOutfit = (outfit: any) => {
    try {
      // Instantly switch to this outfit by setting the image URL directly
      console.log(`👗 Switching to outfit: ${outfit.key}`);
      setBunnyImageUrl(outfit.normalUrl);
      console.log(`✅ Switched to outfit: ${outfit.key}`);
    } catch (error) {
      console.error('Failed to switch to outfit:', error);
      setError('Failed to switch to outfit');
    }
  };

  // Load generated outfits when switching to saved tab
  useEffect(() => {
    if (activeSubTab === 'saved') {
      loadGeneratedOutfits();
    }
  }, [activeSubTab]);

  const loadDailyUsage = async () => {
    if (!user || user.id === 'guest-user') return;
    
    try {
      const usage = await OutfitService.getDailyUsage(user.id);
      setDailyUsage(usage);
    } catch (err: any) {
      console.error('Error loading daily usage:', err);
    }
  };

  const equipItem = async (itemId: string) => {
    if (!bunnyState.id) return;
    
    try {
      setLoading(true);
      await InventoryService.equipItem(bunnyState.id, itemId);
      await loadInventory();
      setHasUnsavedChanges(true);
      
      console.log('Equipped item:', itemId, '- outfit needs to be saved to generate bunny image');
    } catch (err: any) {
      setError('Unable to equip item');
      console.error('Error equipping item:', err);
    } finally {
      setLoading(false);
    }
  };

  const unequipSlot = async (slot: SlotType) => {
    if (!bunnyState.id) return;
    
    try {
      setLoading(true);
      await InventoryService.unequipSlot(bunnyState.id, slot);
      await loadInventory();
      setHasUnsavedChanges(true);
      
      console.log('Unequipped slot:', slot, '- outfit needs to be saved to generate bunny image');
    } catch (err: any) {
      setError('Unable to unequip item');
      console.error('Error unequipping item:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveOutfit = async () => {
    if (!bunnyState.id) return;
    
    try {
      setSaving(true);
      
      // Get current equipped items
      const equippedItems = Object.values(bunnyInventory?.equipment || {})
        .map(item => ({
          item_id: item.item_id,
          slot: item.slot,
          image_url: item.item?.image_url || '',
          name: item.item?.name || 'Unknown Item'
        }))
        .filter(item => item.image_url);

      console.log('🎨 Saving outfit with', equippedItems.length, 'items');

      // Call API to save outfit and generate images
      const response = await fetch('/api/save-outfit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          bunnyId: bunnyState.id,
          equippedItems: equippedItems
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save outfit: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('✅ Outfit saved successfully:', result.outfitName);
      setHasUnsavedChanges(false);
      
      // Reload saved outfits and daily usage
      await loadSavedOutfits();
      await loadDailyUsage();
      
      // Dispatch event to force bunny regeneration with the saved outfit
      window.dispatchEvent(new CustomEvent('bunny-equipment-changed'));
      
    } catch (err: any) {
      setError('Unable to save outfit');
      console.error('Error saving outfit:', err);
    } finally {
      setSaving(false);
    }
  };

  const activateOutfit = async (outfitId: string) => {
    if (!bunnyState.id) return;
    
    try {
      setLoading(true);
      await OutfitService.setActiveOutfit(outfitId, bunnyState.id);
      await loadSavedOutfits();
      
      // Dispatch event to regenerate bunny with this outfit
      window.dispatchEvent(new CustomEvent('bunny-equipment-changed'));
      
      console.log('Activated outfit:', outfitId);
    } catch (err: any) {
      setError('Unable to activate outfit');
      console.error('Error activating outfit:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteOutfit = async (outfitId: string) => {
    if (!confirm('Are you sure you want to delete this outfit? This cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      await OutfitService.deleteOutfit(outfitId);
      await loadSavedOutfits();
      
      console.log('Deleted outfit:', outfitId);
    } catch (err: any) {
      setError('Unable to delete outfit');
      console.error('Error deleting outfit:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-300 bg-gray-50';
      case 'uncommon': return 'border-green-400 bg-green-50';
      case 'rare': return 'border-blue-400 bg-blue-50';
      case 'epic': return 'border-purple-400 bg-purple-50';
      case 'legendary': return 'border-yellow-400 bg-yellow-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getRarityTextColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-700';
      case 'uncommon': return 'text-green-700';
      case 'rare': return 'text-blue-700';
      case 'epic': return 'text-purple-700';
      case 'legendary': return 'text-yellow-700';
      default: return 'text-gray-700';
    }
  };

  const getSlotItems = () => {
    if (!bunnyInventory) return [];
    return bunnyInventory.inventory.filter(inv => inv.item?.slot === selectedSlot);
  };

  const isEquipped = (itemId: string) => {
    return Object.values(bunnyInventory?.equipment || {}).some(eq => eq.item_id === itemId);
  };

  if (!user || user.id === 'guest-user') {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-4xl mb-3">🔐</div>
        <p className="text-purple-600 text-sm">
          Sign in to access your wardrobe
          <br />
          and dress up your bunny!
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-4xl mb-3">😔</div>
        <p className="text-red-600 text-sm mb-3">{error}</p>
        <button
          onClick={loadInventory}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-4xl mb-3 animate-bounce">👗</div>
        <p className="text-purple-600 text-sm">Loading wardrobe...</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Subtab Navigation */}
      <div className="flex gap-1 bg-white/30 rounded-xl p-1">
        <button
          onClick={() => setActiveSubTab('customize')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === 'customize'
              ? 'bg-white text-purple-800 shadow-sm'
              : 'text-purple-700 hover:text-purple-900 hover:bg-white/20'
          }`}
        >
          Customize
        </button>
        <button
          onClick={() => setActiveSubTab('saved')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === 'saved'
              ? 'bg-white text-purple-800 shadow-sm'
              : 'text-purple-700 hover:text-purple-900 hover:bg-white/20'
          }`}
        >
          Gallery ({generatedOutfits.length})
        </button>
      </div>

      {/* Daily Usage Indicator */}
      {user && user.id !== 'guest-user' && (
        <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-xs text-blue-700">
            ⚡ Daily Outfits: {dailyUsage.used}/{dailyUsage.limit} used
          </div>
          <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1">
            <div 
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(dailyUsage.used / dailyUsage.limit) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Customize Tab Content */}
      {activeSubTab === 'customize' && (
        <div>
          <div>
            {/* Emoji Item Type Tabs */}
            <div className="flex justify-center gap-1 bg-white/30 rounded-xl p-1 mb-4">
              {Object.entries(slotInfo).map(([slot, info]) => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot as SlotType)}
                  className={`px-3 py-2 rounded-lg text-lg transition-colors ${
                    selectedSlot === slot
                      ? 'bg-white shadow-sm'
                      : 'hover:bg-white/20'
                  }`}
                >
                  {info.icon}
                </button>
              ))}
            </div>
            
            {bunnyInventory && bunnyInventory.inventory.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">📦</div>
                <p className="text-purple-600 text-sm">No items yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {getSlotItems().slice(0, 6).map(inv => {
                  const item = inv.item;
                  if (!item) return null;
                  
                  const equipped = isEquipped(item.id);
                  
                  return (
                    <div key={inv.id} className={`border-2 rounded-lg p-2 text-center ${getRarityColor(item.rarity)}`}>
                      {item.image_url && (
                        <img 
                          src={item.image_url} 
                          alt={item.name}
                          className="w-10 h-10 object-cover rounded mx-auto mb-1"
                        />
                      )}
                      
                      <div className={`font-medium text-xs ${getRarityTextColor(item.rarity)} mb-1 leading-tight`}>
                        {item.name}
                      </div>
                      
                      {equipped ? (
                        <div className="space-y-1">
                          <div className="text-xs text-green-600 font-medium">✓</div>
                          <button
                            onClick={() => unequipSlot(item.slot)}
                            disabled={loading}
                            className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded w-full"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => equipItem(item.id)}
                          disabled={loading}
                          className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-purple-700 w-full"
                        >
                          Wear
                        </button>
                      )}
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            )}
            
            {getSlotItems().length > 6 && (
              <div className="text-center mt-3">
                <p className="text-xs text-purple-600">
                  Showing 6 of {getSlotItems().length} {slotInfo[selectedSlot].name.toLowerCase()} items
                </p>
              </div>
            )}
          </div>
          
          {/* Save Outfit Section */}
      {hasUnsavedChanges && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-yellow-800 mb-1">
                👔 Outfit Ready to Save
              </div>
              <div className="text-xs text-yellow-700">
                Save your outfit to generate the bunny image and preserve this look
              </div>
            </div>
            <button
              onClick={saveOutfit}
              disabled={saving}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {saving ? '💫 Saving...' : '💾 Save Outfit'}
            </button>
          </div>
        </div>
      )}

          {bunnyInventory && bunnyInventory.inventory.length === 0 && (
            <div className="text-center py-6 mt-4">
              <div className="text-3xl mb-2">📦</div>
              <p className="text-sm text-gray-600">
                Your wardrobe is empty
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Complete adventures and earn coins to buy new clothes!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Saved Outfits Tab Content */}
      {activeSubTab === 'saved' && (
          <div>
            {loadingOutfits ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3 animate-bounce">👗</div>
                <p className="text-purple-600 text-sm">Loading outfit gallery...</p>
              </div>
            ) : generatedOutfits.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">📦</div>
                <p className="text-purple-600 text-sm">
                  No generated outfits found
                </p>
                <p className="text-xs text-purple-500 mt-2">
                  Create and save your first outfit in the Customize tab!
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-purple-700 mb-4">
                  🎨 Outfit Gallery ({generatedOutfits.length})
                </h3>
                <div className="grid grid-cols-2 gap-4 max-h-80 overflow-y-auto">
                  {generatedOutfits.map((outfit) => (
                    <div key={outfit.key} className="relative group">
                      <div 
                        className="aspect-square rounded-xl border-2 border-gray-200 hover:border-purple-400 transition-all duration-200 cursor-pointer overflow-hidden bg-white shadow-sm hover:shadow-md"
                        onClick={() => switchToOutfit(outfit)}
                      >
                        <img 
                          src={outfit.normalUrl}
                          alt={`Outfit with ${outfit.equippedItems.join(', ')}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/base-bunnies/bunny-base.png';
                          }}
                        />
                        
                        {/* Outfit info overlay - always visible on mobile */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                          <div className="text-white text-sm font-medium truncate mb-1">
                            {outfit.equippedItems.length > 0 ? outfit.equippedItems.join(' + ') : 'Base Bunny'}
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="text-white/80 text-xs">
                              {outfit.equippedItems.length} item{outfit.equippedItems.length !== 1 ? 's' : ''}
                              {outfit.hasBlinkFrame && ' • Animated'}
                            </div>
                            
                            {/* Mobile-friendly wear button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                switchToOutfit(outfit);
                              }}
                              className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-purple-700 shadow-md"
                            >
                              Wear
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Gallery details */}
                <div className="mt-4 text-xs text-gray-600">
                  <p>• Click any outfit to switch to it instantly</p>
                  <p>• Gallery shows all your previously generated outfits</p>
                  <p>• Animated outfits will cycle through their frames automatically</p>
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
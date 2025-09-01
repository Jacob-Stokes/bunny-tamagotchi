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
  const [showMode, setShowMode] = useState<'items' | 'outfits' | 'favourites'>('items');
  const [savedOutfits, setSavedOutfits] = useState<Outfit[]>([]);
  const [generatedOutfits, setGeneratedOutfits] = useState<any[]>([]);
  const [loadingOutfits, setLoadingOutfits] = useState(false);
  const [dailyUsage, setDailyUsage] = useState<{ used: number; limit: number }>({ used: 0, limit: 10 });
  const [favouriteOutfits, setFavouriteOutfits] = useState<string[]>([]);
  const [currentFavouriteIndex, setCurrentFavouriteIndex] = useState(0);

  const { state: bunnyState, regenerateBunnyImage, setBunnyImageUrl } = useBunny();
  const { user } = useAuth();

  // Load favourites from database
  const loadFavourites = async () => {
    if (!user || user.id === 'guest-user') {
      setFavouriteOutfits([]);
      return;
    }

    try {
      const favourites = await OutfitService.getFavouriteOutfits(user.id);
      setFavouriteOutfits(favourites);
    } catch (error) {
      console.error('Failed to load favourites:', error);
    }
  };

  useEffect(() => {
    loadFavourites();
  }, [user]);

  // Reset carousel index when favourites change
  useEffect(() => {
    setCurrentFavouriteIndex(0);
  }, [favouriteOutfits.length]);

  // Toggle favourite status
  const toggleFavourite = async (outfitKey: string) => {
    if (!user || user.id === 'guest-user') {
      console.warn('Cannot save favourites for guest user');
      return;
    }

    const isCurrentlyFavourite = favouriteOutfits.includes(outfitKey);
    
    try {
      let success = false;
      if (isCurrentlyFavourite) {
        success = await OutfitService.removeFromFavourites(user.id, outfitKey);
      } else {
        success = await OutfitService.addToFavourites(user.id, outfitKey);
      }

      if (success) {
        // Update local state
        const newFavourites = isCurrentlyFavourite
          ? favouriteOutfits.filter(key => key !== outfitKey)
          : [...favouriteOutfits, outfitKey];
        setFavouriteOutfits(newFavourites);
      } else {
        console.error('Failed to update favourite status');
      }
    } catch (error) {
      console.error('Error toggling favourite:', error);
    }
  };

  const isFavourite = (outfitKey: string) => {
    return favouriteOutfits.includes(outfitKey);
  };

  // Touch handlers for swipe gestures
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    const favouriteOutfitsList = generatedOutfits.filter(outfit => isFavourite(outfit.key));
    
    if (isLeftSwipe && favouriteOutfitsList.length > 1) {
      // Swipe left - next outfit
      setCurrentFavouriteIndex(prev => 
        prev === favouriteOutfitsList.length - 1 ? 0 : prev + 1
      );
    }
    
    if (isRightSwipe && favouriteOutfitsList.length > 1) {
      // Swipe right - previous outfit
      setCurrentFavouriteIndex(prev => 
        prev === 0 ? favouriteOutfitsList.length - 1 : prev - 1
      );
    }
  };

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

  // Load generated outfits when switching to outfits or favourites mode
  useEffect(() => {
    if (showMode === 'outfits' || showMode === 'favourites') {
      loadGeneratedOutfits();
    }
  }, [showMode]);

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
    return bunnyInventory.inventory
      .filter(inv => inv.item?.slot === selectedSlot)
      .sort((a, b) => {
        // Put equipped item first
        const aEquipped = isEquipped(a.item?.id || '');
        const bEquipped = isEquipped(b.item?.id || '');
        
        if (aEquipped && !bEquipped) return -1;
        if (!aEquipped && bEquipped) return 1;
        
        // If both equipped or both not equipped, sort by name
        return (a.item?.name || '').localeCompare(b.item?.name || '');
      });
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
      {/* Quick Mode Toggle */}
      <div className="flex gap-1 bg-white/30 rounded-lg p-0.5 mb-2">
        <button
          onClick={() => setShowMode('items')}
          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
            showMode === 'items'
              ? 'bg-white text-purple-800 shadow-sm'
              : 'text-purple-700 hover:bg-white/20'
          }`}
        >
          Items
        </button>
        <button
          onClick={() => setShowMode('outfits')}
          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
            showMode === 'outfits'
              ? 'bg-white text-purple-800 shadow-sm'
              : 'text-purple-700 hover:bg-white/20'
          }`}
        >
          Outfits
        </button>
        <button
          onClick={() => setShowMode('favourites')}
          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
            showMode === 'favourites'
              ? 'bg-white text-purple-800 shadow-sm'
              : 'text-purple-700 hover:bg-white/20'
          }`}
        >
          ❤️
        </button>
      </div>

      {/* Compact Daily Usage */}
      {user && user.id !== 'guest-user' && (
        <div className="mb-2 p-1.5 bg-blue-50/50 rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-700">⚡ {dailyUsage.used}/{dailyUsage.limit}</span>
            <div className="w-16 bg-blue-200 rounded-full h-1">
              <div 
                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${(dailyUsage.used / dailyUsage.limit) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Items Mode Content */}
      {showMode === 'items' && (
        <div>
          <div>
            {/* Compact Item Type Selector */}
            <div className="flex justify-center gap-0.5 bg-white/30 rounded-lg p-0.5 mb-2">
              {Object.entries(slotInfo).map(([slot, info]) => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot as SlotType)}
                  className={`px-2 py-1 rounded-md text-base transition-colors ${
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
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {getSlotItems().map(inv => {
                  const item = inv.item;
                  if (!item) return null;
                  
                  const equipped = isEquipped(item.id);
                  
                  return (
                    <div key={inv.id} className={`border-2 rounded-md p-1.5 text-center min-w-[80px] flex-shrink-0 ${getRarityColor(item.rarity)}`}>
                      {item.image_url && (
                        <img 
                          src={item.image_url} 
                          alt={item.name}
                          className="w-8 h-8 object-cover rounded mx-auto mb-1"
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
            
            {getSlotItems().length > 0 && (
              <div className="text-center mt-3">
                <p className="text-xs text-purple-600">
                  {getSlotItems().length} {slotInfo[selectedSlot].name.toLowerCase()} item{getSlotItems().length !== 1 ? 's' : ''} • Swipe to browse →
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

      {/* Outfits Mode Content */}
      {showMode === 'outfits' && (
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
                        
                        {/* Favourite heart button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavourite(outfit.key);
                          }}
                          className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                        >
                          <span className={`text-lg ${
                            isFavourite(outfit.key) ? 'text-red-500' : 'text-white/70'
                          }`}>
                            {isFavourite(outfit.key) ? '❤️' : '🤍'}
                          </span>
                        </button>
                        
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

      {/* Favourites Mode Content */}
      {showMode === 'favourites' && (
        <div>
          {loadingOutfits ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3 animate-bounce">❤️</div>
              <p className="text-purple-600 text-sm">Loading favourites...</p>
            </div>
          ) : (() => {
            const favouriteOutfitsList = generatedOutfits.filter(outfit => isFavourite(outfit.key));
            return favouriteOutfitsList.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">💝</div>
                <p className="text-purple-600 text-sm">
                  No favourite outfits yet
                </p>
                <p className="text-xs text-purple-500 mt-2">
                  Tap the heart button on outfits in the Outfits tab to add them here!
                </p>
              </div>
            ) : (
              <div className="relative">
                <h3 className="text-lg font-semibold text-purple-700 mb-4 text-center">
                  💖 Favourite Outfits
                </h3>
                
                {/* Carousel Container */}
                <div 
                  className="relative bg-white/20 rounded-2xl p-6"
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  {/* Current outfit display */}
                  <div className="flex flex-col items-center">
                    <div 
                      className="aspect-square w-48 rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-all duration-200 cursor-pointer overflow-hidden bg-white shadow-lg hover:shadow-xl mb-4"
                      onClick={() => switchToOutfit(favouriteOutfitsList[currentFavouriteIndex])}
                    >
                      <img 
                        src={favouriteOutfitsList[currentFavouriteIndex].normalUrl}
                        alt={`Outfit with ${favouriteOutfitsList[currentFavouriteIndex].equippedItems.join(', ')}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/base-bunnies/bunny-base.png';
                        }}
                      />
                    </div>
                    
                    {/* Outfit name and details */}
                    <div className="text-center mb-4">
                      <h4 className="text-purple-800 font-semibold text-lg mb-1">
                        {favouriteOutfitsList[currentFavouriteIndex].equippedItems.length > 0 
                          ? favouriteOutfitsList[currentFavouriteIndex].equippedItems.join(' + ')
                          : 'Base Bunny'
                        }
                      </h4>
                      <p className="text-purple-600 text-sm">
                        {favouriteOutfitsList[currentFavouriteIndex].equippedItems.length} item{favouriteOutfitsList[currentFavouriteIndex].equippedItems.length !== 1 ? 's' : ''}
                        {favouriteOutfitsList[currentFavouriteIndex].hasBlinkFrame && ' • Animated'}
                      </p>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex gap-3 mb-4">
                      <button
                        onClick={() => switchToOutfit(favouriteOutfitsList[currentFavouriteIndex])}
                        className="bg-purple-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-purple-700 transition-colors shadow-md"
                      >
                        👗 Wear This Outfit
                      </button>
                      
                      <button
                        onClick={() => toggleFavourite(favouriteOutfitsList[currentFavouriteIndex].key)}
                        className="bg-red-100 text-red-600 px-4 py-2.5 rounded-xl font-medium hover:bg-red-200 transition-colors"
                      >
                        💔 Remove
                      </button>
                    </div>
                  </div>
                  
                  {/* Navigation arrows */}
                  {favouriteOutfitsList.length > 1 && (
                    <>
                      <button
                        onClick={() => {
                          setCurrentFavouriteIndex(prev => 
                            prev === 0 ? favouriteOutfitsList.length - 1 : prev - 1
                          );
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-md transition-all"
                      >
                        <span className="text-purple-600 text-lg">‹</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setCurrentFavouriteIndex(prev => 
                            prev === favouriteOutfitsList.length - 1 ? 0 : prev + 1
                          );
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-md transition-all"
                      >
                        <span className="text-purple-600 text-lg">›</span>
                      </button>
                    </>
                  )}
                </div>
                
                {/* Pagination dots */}
                {favouriteOutfitsList.length > 1 && (
                  <div className="flex justify-center mt-4 gap-2">
                    {favouriteOutfitsList.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentFavouriteIndex(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentFavouriteIndex 
                            ? 'bg-purple-600' 
                            : 'bg-purple-300 hover:bg-purple-400'
                        }`}
                      />
                    ))}
                  </div>
                )}
                
                {/* Counter */}
                <div className="text-center mt-4">
                  <p className="text-purple-600 text-sm font-medium">
                    {currentFavouriteIndex + 1} of {favouriteOutfitsList.length}
                  </p>
                </div>
                
                {/* Help text */}
                <div className="mt-4 text-xs text-gray-600 text-center">
                  <p>• Swipe or use arrows to browse your favourite outfits</p>
                  <p>• Your favourites are synced to your account</p>
                </div>
              </div>
            );
          })()
          }
        </div>
      )}
    </div>
  );
}
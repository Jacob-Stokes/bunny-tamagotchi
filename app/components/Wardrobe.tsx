'use client';

import React, { useState, useEffect } from 'react';
import { InventoryService } from '../lib/inventoryService';
import { OutfitService, Outfit } from '../lib/outfitService';
import { useBunny } from '../context/BunnyContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
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
  const [selectedItemsForOutfit, setSelectedItemsForOutfit] = useState<{[slot: string]: string}>({});
  const [showMode, setShowMode] = useState<'outfits' | 'favourites' | 'items' | 'shop'>('outfits');
  const [selectedItemType, setSelectedItemType] = useState<'head' | 'face' | 'upper_body' | 'lower_body' | 'feet' | 'accessory'>('head');
  const [savedOutfits, setSavedOutfits] = useState<Outfit[]>([]);
  const [generatedOutfits, setGeneratedOutfits] = useState<any[]>([]);
  const [loadingOutfits, setLoadingOutfits] = useState(false);
  const [favouriteOutfits, setFavouriteOutfits] = useState<string[]>([]);
  const [currentFavouriteIndex, setCurrentFavouriteIndex] = useState(0);

  const { state: bunnyState, regenerateBunnyImage, setBunnyImageUrl } = useBunny();
  const { user } = useAuth();
  const { queueOutfitGeneration } = useNotifications();

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

  const switchToOutfit = async (outfit: any) => {
    if (!bunnyState.id) return;
    
    // Trigger bunny zoom out animation immediately
    window.dispatchEvent(new CustomEvent('outfit-generation-start'));
    
    try {
      setLoading(true);
      const items = outfit.metadata?.equippedItems || [];
      console.log(`👗 Switching to outfit: ${outfit.key}`, items);
      
      // Set the image URL while bunny is off screen (600ms delay - before bunny returns)
      setTimeout(() => {
        setBunnyImageUrl(outfit.normalUrl);
      }, 600);
      
      // First, unequip all current items
      const currentSlots = Object.keys(bunnyInventory?.equipment || {});
      for (const slot of currentSlots) {
        await InventoryService.unequipSlot(bunnyState.id, slot as SlotType);
      }
      
      // Then equip all items from this outfit
      for (const item of items) {
        console.log(`🎽 Equipping item: ${item.item_id} in slot ${item.slot}`);
        await InventoryService.equipItem(bunnyState.id, item.item_id);
      }
      
      // Reload inventory to reflect changes
      await loadInventory();
      
      console.log(`✅ Switched to outfit: ${outfit.key} - equipped ${items.length} items`);
    } catch (error) {
      console.error('Failed to switch to outfit:', error);
      setError('Failed to switch to outfit');
    } finally {
      setLoading(false);
    }
  };

  // DEBUG: Regenerate outfit images (Admin only)
  const regenerateOutfitImages = async (outfit: any) => {
    if (!bunnyState.id) return;
    
    try {
      setLoading(true);
      const items = outfit.metadata?.equippedItems || [];
      console.log(`🔧 DEBUG: Regenerating images for outfit: ${outfit.key}`, items);
      
      // Call the save-outfit API to regenerate images
      const response = await fetch('/api/save-outfit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-base-bunny': 'bunny-base.png', // Use default base bunny
          'x-scene': 'meadow' // Use default scene
        },
        body: JSON.stringify({
          bunny_id: bunnyState.id,
          outfit_name: `Debug Regen - ${outfit.key}`,
          selected_items: items
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ DEBUG: Outfit images regenerated successfully');
        // Reload outfits to show new images
        await loadGeneratedOutfits();
      } else {
        console.error('❌ DEBUG: Failed to regenerate outfit images:', result.error);
        setError(`Failed to regenerate: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ DEBUG: Error regenerating outfit images:', error);
      setError('Failed to regenerate outfit images');
    } finally {
      setLoading(false);
    }
  };

  // Load generated outfits when switching to outfits or favourites mode
  useEffect(() => {
    if (showMode === 'outfits' || showMode === 'favourites') {
      loadGeneratedOutfits();
    }
    // Update selectedSlot when switching to item categories
    if (['head', 'face', 'upper_body', 'lower_body', 'feet', 'accessory'].includes(showMode)) {
      setSelectedSlot(showMode as SlotType);
    }
  }, [showMode]);


  const selectItemForOutfit = (itemId: string, slot: string) => {
    console.log('🔧 selectItemForOutfit called with:', { itemId, slot });
    setSelectedItemsForOutfit(prev => {
      const newSelected = {
        ...prev,
        [slot]: itemId
      };
      console.log('🔧 Updated selectedItemsForOutfit:', newSelected);
      return newSelected;
    });
    setHasUnsavedChanges(true);
    
    console.log('Selected item for outfit:', itemId, 'in slot:', slot);
  };

  const removeItemFromOutfit = (slot: string) => {
    setSelectedItemsForOutfit(prev => {
      const newSelected = { ...prev };
      delete newSelected[slot];
      setHasUnsavedChanges(Object.keys(newSelected).length > 0);
      return newSelected;
    });
    
    console.log('Removed item from outfit slot:', slot);
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
    
    // Check if any items are selected
    if (Object.keys(selectedItemsForOutfit).length === 0) {
      setError('Please select at least one item for your outfit');
      return;
    }
    
    try {
      setSaving(true);
      
      // Get ALL items for outfit: currently equipped + newly selected
      const allOutfitItems: Array<{ item_id: string; slot: string; image_url: string; name: string }> = [];
      
      // First, add all currently equipped items (get proper image URLs from inventory)
      const currentEquipment = Object.values(bunnyInventory?.equipment || {});
      currentEquipment.forEach(equipped => {
        // Find the full item data from inventory to get proper image URL
        const allItems = bunnyInventory?.inventory || [];
        const inventoryItem = allItems.find(i => i.item?.id === equipped.item_id);
        const item = inventoryItem?.item;
        
        allOutfitItems.push({
          item_id: equipped.item_id,
          slot: equipped.slot,
          image_url: item?.image_url || equipped.image_url || '',
          name: item?.name || equipped.name || 'Unknown Item'
        });
      });
      
      // Then, add or replace with newly selected items
      Object.entries(selectedItemsForOutfit).forEach(([slot, itemId]) => {
        const allItems = bunnyInventory?.inventory || [];
        const inventoryItem = allItems.find(i => i.item?.id === itemId);
        const item = inventoryItem?.item;
        
        if (item) {
          // Remove any existing item in this slot
          const existingIndex = allOutfitItems.findIndex(outfitItem => outfitItem.slot === slot);
          if (existingIndex >= 0) {
            allOutfitItems[existingIndex] = {
              item_id: item.id,
              slot: slot,
              image_url: item.image_url || '',
              name: item.name || 'Unknown Item'
            };
          } else {
            allOutfitItems.push({
              item_id: item.id,
              slot: slot,
              image_url: item.image_url || '',
              name: item.name || 'Unknown Item'
            });
          }
        }
      });
      
      const selectedItems = allOutfitItems;

      console.log('🎨 Selected items for outfit:', selectedItemsForOutfit);
      console.log('🎨 Built selected items array:', selectedItems);
      console.log('🎨 Queueing outfit generation with', selectedItems.length, 'selected items:', selectedItems.map(i => i.name));

      // Generate user-friendly look name
      const itemTypes = selectedItems.map(i => i.name).join(' + ');
      const timestamp = new Date().toLocaleString('en-US', { 
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true 
      });
      const outfitName = `${itemTypes} Look (${timestamp})`;
      
      // Use queue system for proper notifications
      const jobId = queueOutfitGeneration(outfitName, selectedItems);
      console.log('🎨 Outfit queued for generation, job ID:', jobId);
      
      // Clear selection immediately - outfit is now queued
      setHasUnsavedChanges(false);
      setSelectedItemsForOutfit({});
      
      // Refresh saved outfits list
      await loadSavedOutfits();
      
      // DON'T trigger bunny update yet - user will apply outfit when they accept notification
      
      
    } catch (err: any) {
      setError(err.message || 'Unable to apply look. Please try again.');
      console.error('Error applying look:', err);
    } finally {
      setSaving(false);
    }
  };

  // Apply items directly to bunny equipment
  const applyItemsToBunny = async (items: any[]) => {
    const { InventoryService } = await import('../lib/inventoryService');
    
    console.log('🔧 Applying items to bunny equipment...');
    
    // First unequip conflicting slots
    for (const item of items) {
      const currentEquipped = bunnyInventory?.equipment[item.slot];
      if (currentEquipped) {
        await InventoryService.unequipSlot(bunnyState.id, item.slot as any);
      }
    }
    
    // Then equip new items
    for (const item of items) {
      await InventoryService.equipItem(bunnyState.id, item.item_id);
    }
    
    // Refresh inventory
    await loadInventory();
    
    console.log('✅ Items applied to bunny');
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
      .filter(inv => inv.item?.slot === (selectedItemType as SlotType))
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

  // Check if an outfit is currently worn by comparing equipped items
  const isOutfitCurrentlyWorn = (outfit: any) => {
    if (!bunnyInventory?.equipment) return false;
    
    // Try different possible locations for equipped items data
    const outfitItems = outfit.metadata?.equippedItems || outfit.equippedItems;
    if (!outfitItems) return false;
    
    const currentEquippedIds = Object.values(bunnyInventory.equipment).map(eq => eq.item_id).sort();
    
    // Debug logging
    console.log('🔍 Checking outfit:', {
      outfitKey: outfit.key,
      currentEquipped: currentEquippedIds,
      outfitItems: outfitItems,
      outfitItemsType: typeof outfitItems
    });
    
    // Handle different data formats
    let outfitItemIds;
    if (Array.isArray(outfitItems)) {
      // If it's an array of item IDs (strings)
      if (typeof outfitItems[0] === 'string') {
        outfitItemIds = outfitItems.sort();
      } 
      // If it's an array of item objects
      else if (outfitItems[0]?.item_id) {
        outfitItemIds = outfitItems.map(item => item.item_id).sort();
      }
      else {
        return false;
      }
    } else {
      return false;
    }
    
    console.log('🔍 Comparison:', { currentEquippedIds, outfitItemIds });
    
    // Compare arrays - outfit is worn if all items match exactly
    return currentEquippedIds.length === outfitItemIds.length && 
           currentEquippedIds.every((id, index) => id === outfitItemIds[index]);
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
      {/* Main Tab Navigation */}
      <div className="flex gap-1 mb-2 bg-white/30 rounded-xl p-1">
        <button
          onClick={() => setShowMode('outfits')}
          className={`flex-1 flex flex-col items-center justify-center h-8 rounded-lg text-xs font-medium transition-colors gap-0 ${
            showMode === 'outfits'
              ? 'bg-white text-purple-800 shadow-sm'
              : 'text-purple-700 hover:bg-white/20'
          }`}
        >
          <span className="text-sm">🎨</span>
          <span className="text-xs leading-tight">Outfits</span>
        </button>
        <button
          onClick={() => setShowMode('favourites')}
          className={`flex-1 flex flex-col items-center justify-center h-8 rounded-lg text-xs font-medium transition-colors gap-0 ${
            showMode === 'favourites'
              ? 'bg-white text-purple-800 shadow-sm'
              : 'text-purple-700 hover:bg-white/20'
          }`}
        >
          <span className="text-sm">❤️</span>
          <span className="text-xs leading-tight">Faves</span>
        </button>
        <button
          onClick={() => setShowMode('items')}
          className={`flex-1 flex flex-col items-center justify-center h-8 rounded-lg text-xs font-medium transition-colors gap-0 ${
            showMode === 'items'
              ? 'bg-white text-purple-800 shadow-sm'
              : 'text-purple-700 hover:bg-white/20'
          }`}
        >
          <span className="text-sm">🗄️</span>
          <span className="text-xs leading-tight">Items</span>
        </button>
        <button
          onClick={() => setShowMode('shop')}
          className={`flex-1 flex flex-col items-center justify-center h-8 rounded-lg text-xs font-medium transition-colors gap-0 ${
            showMode === 'shop'
              ? 'bg-white text-purple-800 shadow-sm'
              : 'text-purple-700 hover:bg-white/20'
          }`}
        >
          <span className="text-sm">🛒</span>
          <span className="text-xs leading-tight">Shop</span>
        </button>
      </div>

      {/* Item Type Sub-tabs (only shown when Items tab is active) */}
      {showMode === 'items' && (
        <div className="flex justify-between mb-2 bg-white/20 rounded-xl p-1">
          {Object.entries(slotInfo).map(([slot, info]) => (
            <button
              key={slot}
              onClick={() => setSelectedItemType(slot as any)}
              className={`flex-shrink-0 flex items-center justify-center w-12 h-8 rounded-lg text-lg transition-colors ${
                selectedItemType === slot
                  ? 'bg-white text-purple-800 shadow-sm'
                  : 'text-purple-700 hover:bg-white/10'
              }`}
            >
              <span>{info.icon}</span>
            </button>
          ))}
        </div>
      )}

      {/* Apply Look Section - Always Visible When Ready */}
      {hasUnsavedChanges && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-purple-800 mb-1">
                ✨ New Look Ready
              </div>
              <div className="text-xs text-purple-700">
                Apply your selected items to update your bunny's appearance
              </div>
            </div>
            <button
              onClick={saveOutfit}
              disabled={saving}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {saving ? '🎨 Generating...' : '✨ Apply Look'}
            </button>
          </div>
        </div>
      )}

      {/* Items Mode Content */}
      {showMode === 'items' && (
        <div>
          <div>
            {bunnyInventory && bunnyInventory.inventory.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">📦</div>
                <p className="text-purple-600 text-sm">No items yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                {getSlotItems().map(inv => {
                  const item = inv.item;
                  if (!item) return null;
                  
                  const isSelectedForOutfit = selectedItemsForOutfit[item.slot] === item.id;
                  const equipped = isEquipped(item.id);
                  
                  return (
                    <div key={inv.id} className={`border-2 rounded-xl p-3 text-center ${getRarityColor(item.rarity)} hover:shadow-md transition-all duration-200`}>
                      {item.image_url && (
                        <img 
                          src={item.image_url} 
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg mx-auto mb-2"
                        />
                      )}
                      
                      <div className={`font-medium text-sm ${getRarityTextColor(item.rarity)} mb-2 leading-tight`}>
                        {item.name}
                      </div>
                      
                      {equipped && (
                        <div className="text-xs text-green-600 font-medium mb-1">✓ Currently Worn</div>
                      )}
                      
                      {isSelectedForOutfit ? (
                        <div className="space-y-2">
                          <div className="text-sm text-purple-600 font-medium">✨ Added to Look</div>
                          <button
                            onClick={() => removeItemFromOutfit(item.slot)}
                            disabled={loading}
                            className="text-sm bg-red-100 text-red-600 px-3 py-1.5 rounded-lg w-full hover:bg-red-200 transition-colors"
                          >
                            Remove from Look
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => selectItemForOutfit(item.id, item.slot)}
                          disabled={loading}
                          className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-purple-700 w-full transition-colors"
                        >
                          Add to Look
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
                  {getSlotItems().length} {slotInfo[selectedItemType as SlotType].name.toLowerCase()} item{getSlotItems().length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
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
                <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {generatedOutfits
                    .sort((a, b) => {
                      // Sort currently worn outfit to the top
                      const aWorn = isOutfitCurrentlyWorn(a);
                      const bWorn = isOutfitCurrentlyWorn(b);
                      if (aWorn && !bWorn) return -1;
                      if (!aWorn && bWorn) return 1;
                      return 0;
                    })
                    .map((outfit) => {
                      const isCurrentlyWorn = isOutfitCurrentlyWorn(outfit);
                      return (
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
                        
                        {/* Wear button - top left */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            switchToOutfit(outfit);
                          }}
                          className="absolute top-2 left-2 z-10 bg-purple-600 text-white px-2 py-1 rounded-lg text-xs font-medium hover:bg-purple-700 shadow-md"
                        >
                          Wear
                        </button>

                        {/* Favourite heart button - top right */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavourite(outfit.key);
                          }}
                          className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                        >
                          <span className={`text-sm ${
                            isFavourite(outfit.key) ? 'text-red-500' : 'text-white/70'
                          }`}>
                            {isFavourite(outfit.key) ? '❤️' : '🤍'}
                          </span>
                        </button>
                        
                        {/* DEBUG button - bottom right (Admin only) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            regenerateOutfitImages(outfit);
                          }}
                          className="absolute bottom-2 right-2 z-10 p-1.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white text-xs shadow-md"
                          title="DEBUG: Regenerate outfit images"
                        >
                          🔧
                        </button>
                        
                        {/* Currently worn indicator */}
                        {isCurrentlyWorn && (
                          <div className="absolute bottom-8 left-2 right-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium text-center">
                            ✓ Currently Worn
                          </div>
                        )}
                        
                        {/* Just outfit name at bottom */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <div className="text-white text-xs font-medium truncate text-center">
                            {outfit.equippedItems.length > 0 ? outfit.equippedItems.join(' + ') : 'Base Bunny'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                    })}
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
                      
                      {/* DEBUG button for favorites */}
                      <button
                        onClick={() => regenerateOutfitImages(favouriteOutfitsList[currentFavouriteIndex])}
                        className="bg-orange-100 text-orange-600 px-4 py-2.5 rounded-xl font-medium hover:bg-orange-200 transition-colors"
                        title="DEBUG: Regenerate outfit images"
                      >
                        🔧 Debug
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
          })()}
        </div>
      )}

      {/* Shop Mode Content */}
      {showMode === 'shop' && (
        <div>
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🛒</div>
            <p className="text-purple-600 text-lg font-semibold mb-2">
              Bunny Shop
            </p>
            <p className="text-purple-500 text-sm mb-4">
              Purchase new items and outfits for your bunny
            </p>
            <div className="bg-purple-100 rounded-lg p-4 mt-4">
              <p className="text-purple-700 text-sm">
                🚧 Coming Soon! 🚧
              </p>
              <p className="text-purple-600 text-xs mt-1">
                The shop is under construction. Soon you'll be able to buy new clothes, accessories, and special items for your bunny!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
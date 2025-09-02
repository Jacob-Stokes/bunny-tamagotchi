'use client';

import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { BunnyState, BunnyStats, ActionType, StatModification } from '../types/bunny';
import { BunnyService, DatabaseBunny } from '../lib/bunnyService';
import { CacheUtils } from '../lib/cacheUtils';
import { useAuth } from './AuthContext';

interface BunnyContextType {
  state: BunnyState;
  loading: boolean;
  bunnyImageUrl: string;
  imageGenerating: boolean;
  imageLoading: boolean;
  performAction: (action: ActionType) => Promise<void>;
  getStatPercentage: (stat: keyof BunnyStats) => number;
  getStatEmoji: (stat: keyof BunnyStats) => string;
  regenerateBunnyImage: () => Promise<void>;
  setBunnyImageUrl: (url: string) => void;
}

const defaultStats: BunnyStats = {
  // Visible stats start at moderate levels
  connection: 50,
  stimulation: 60,
  comfort: 70,
  energy: 80,
  
  // Hidden stats start at base levels
  curiosity: 40,
  whimsy: 50,
  melancholy: 30,
  wisdom: 20,
};

const defaultState: BunnyState = {
  stats: defaultStats,
  lastUpdated: Date.now(),
  name: 'Bunny',
};

const BunnyContext = createContext<BunnyContextType | undefined>(undefined);

type BunnyAction = 
  | { type: 'LOAD_STATE'; payload: BunnyState }
  | { type: 'UPDATE_STATS'; payload: StatModification }
  | { type: 'SET_LOADING'; payload: boolean };

function bunnyReducer(state: BunnyState, action: BunnyAction): BunnyState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload;
      
    case 'UPDATE_STATS':
      const newStats = { ...state.stats };
      Object.entries(action.payload).forEach(([key, value]) => {
        if (value !== undefined) {
          const currentValue = newStats[key as keyof BunnyStats];
          newStats[key as keyof BunnyStats] = Math.max(0, Math.min(100, currentValue + value));
        }
      });
      
      return {
        ...state,
        stats: newStats,
        lastUpdated: Date.now(),
      };
      
    default:
      return state;
  }
}

function getActionEffects(action: ActionType): StatModification {
  switch (action) {
    case 'feed':
      return {
        comfort: 15,
        energy: 10,
        connection: 8,
        curiosity: 3,
        stimulation: -5, // Eating is relaxing, reduces need for mental stimulation
      };
      
    case 'play':
      return {
        stimulation: 20,
        connection: 12,
        whimsy: 8,
        curiosity: 5,
        energy: -8,
        comfort: -3,
      };
      
    case 'sleep':
      return {
        energy: 25,
        comfort: 12,
        melancholy: -5, // Rest reduces sadness
        wisdom: 2, // Dreams bring wisdom
        stimulation: -10,
        connection: -5,
      };
      
    case 'clean':
      return {
        comfort: 18,
        connection: 6,
        curiosity: -2, // Routine activity
        melancholy: -3,
        energy: -5,
      };
      
    default:
      return {};
  }
}

export function BunnyProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(bunnyReducer, defaultState);
  const [loading, setLoading] = useState(true);
  const [bunnyImageUrl, setBunnyImageUrl] = useState('');
  const [imageGenerating, setImageGenerating] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Get selected base bunny path
  const getBaseBunnyPath = () => {
    const selected = localStorage.getItem('selected-base-bunny') || 'bunny-base.png';
    return `/base-bunnies/${selected}`;
  };
  const { user } = useAuth();

  // Load bunny data when user changes
  useEffect(() => {
    if (!user) {
      // If no user, try to load from localStorage anyway (for returning guests)
      const saved = localStorage.getItem('bunny-state');
      if (saved) {
        try {
          const parsedState = JSON.parse(saved);
          dispatch({ type: 'LOAD_STATE', payload: parsedState });
          console.log('Loaded saved bunny state from localStorage:', parsedState);
        } catch (error) {
          console.error('Error parsing localStorage data:', error);
        }
      }
      setLoading(false);
      setCurrentEquipment(''); // Reset equipment signature on user change
      return;
    }

    loadBunnyData();
  }, [user]);

  const loadBunnyData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (user.id === 'guest-user') {
        // Guest mode - use localStorage
        const saved = localStorage.getItem('bunny-state');
        if (saved) {
          const parsedState = JSON.parse(saved);
          dispatch({ type: 'LOAD_STATE', payload: parsedState });
        }
      } else {
        // Authenticated user - use database
        const dbBunny = await BunnyService.getUserBunny(user.id);
        const bunnyState = BunnyService.toBunnyState(dbBunny);
        dispatch({ type: 'LOAD_STATE', payload: bunnyState });
      }
    } catch (error) {
      console.error('Error loading bunny data:', error);
      // Fallback to localStorage
      const saved = localStorage.getItem('bunny-state');
      if (saved) {
        try {
          const parsedState = JSON.parse(saved);
          dispatch({ type: 'LOAD_STATE', payload: parsedState });
        } catch (parseError) {
          console.error('Error parsing localStorage data:', parseError);
        }
      }
    } finally {
      setLoading(false);
      setCurrentEquipment(''); // Reset equipment signature after loading bunny data
    }
  };

  // Save to localStorage for guest users and when no user (persistent saving)
  useEffect(() => {
    if (user?.id === 'guest-user' || !user) {
      localStorage.setItem('bunny-state', JSON.stringify(state));
      console.log('Saved bunny state to localStorage:', state);
    }
  }, [state, user]);

  // Track current equipment for change detection
  const [currentEquipment, setCurrentEquipment] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Check if outfit exists and load it, but don't auto-generate
  useEffect(() => {
    if (loading || !state.id || isGenerating) return;

    const checkExistingOutfit = async () => {
      console.log('🔍 Checking for existing saved outfit');
      try {
        // Get current equipped items
        const { InventoryService } = await import('../lib/inventoryService');
        const inventoryData = await InventoryService.getBunnyFullInventory(state.id);
        const equippedItems = Object.values(inventoryData.equipment)
          .map(item => ({
            item_id: item.item_id,
            slot: item.slot,
            image_url: item.item?.image_url || '',
            name: item.item?.name || 'Unknown Item'
          }))
          .filter(item => item.image_url);

        // Create equipment signature for existing outfit detection
        const equipmentSignature = equippedItems
          .sort((a, b) => a.item_id.localeCompare(b.item_id))
          .map(item => item.item_id)
          .join(',');

        // Get current settings
        const selectedBaseBunny = localStorage.getItem('selected-base-bunny') || 'bunny-base.png';
        const selectedScene = localStorage.getItem('selected-scene') || 'meadow';
        const fullSignature = `${selectedBaseBunny}|${selectedScene}|${equipmentSignature}`;

        // If equipment hasn't changed, don't do anything
        if (currentEquipment === fullSignature && bunnyImageUrl) {
          console.log('🚫 No equipment changes detected, keeping current image');
          return;
        }

        console.log('🔄 Equipment signature changed, checking for saved outfit');
        console.log('Previous:', currentEquipment);
        console.log('Current:', fullSignature);

        setCurrentEquipment(fullSignature);

        // If no items equipped, use base bunny
        if (equippedItems.length === 0) {
          console.log('📷 No items equipped, using base bunny');
          setBunnyImageUrl(getBaseBunnyPath());
          setImageLoading(false);
          return;
        }

        // Check if an outfit image exists for this combination using equipment-based cache key
        const cacheKey = CacheUtils.getBunnyItemsCacheKey(
          equippedItems.map(item => ({
            item_id: item.item_id,
            slot: item.slot, 
            image_url: item.image_url,
            name: item.name
          })),
          selectedBaseBunny
        );
        const outfitImageUrl = `/generated-bunnies/${cacheKey}/normal.png`;
        
        console.log('🔍 Looking for existing outfit with cache key:', cacheKey);
        
        try {
          const response = await fetch(outfitImageUrl, { method: 'HEAD' });
          if (response.ok) {
            console.log('✅ Found existing outfit image:', outfitImageUrl);
            setBunnyImageUrl(outfitImageUrl);
          } else {
            console.log('📷 No existing outfit found, showing base bunny until outfit is generated');
            setBunnyImageUrl(getBaseBunnyPath());
          }
          setImageLoading(false);
        } catch {
          console.log('📷 Error checking outfit, showing base bunny until outfit is generated');
          setBunnyImageUrl(getBaseBunnyPath());
          setImageLoading(false);
        }

      } catch (error) {
        console.error('Error checking existing outfit:', error);
        setBunnyImageUrl(getBaseBunnyPath());
        setImageLoading(false);
      }
    };

    checkExistingOutfit();
  }, [state.id, loading, currentEquipment, isGenerating]);

  // Listen for force regeneration events (now only triggered by outfit saves)
  useEffect(() => {
    const handleForceRegenerate = async (event: any) => {
      console.log('🔄 Received force regenerate event - outfit was saved', event.detail);
      if (!loading && state.id && !isGenerating) {
        // Add delay to ensure database changes have been committed
        const delay = event.detail?.fromOutfitAcceptance ? 1000 : 100;
        
        setTimeout(async () => {
          try {
            const { InventoryService } = await import('../lib/inventoryService');
            const inventoryData = await InventoryService.getBunnyFullInventory(state.id);
            const updatedEquipment = Object.values(inventoryData.equipment || {}).map(item => item.item_id);
            setCurrentEquipment(updatedEquipment);
            console.log('🔄 Updated equipment state after outfit acceptance:', updatedEquipment);
            
            // Wait a bit more then regenerate
            setTimeout(async () => {
              console.log('🔄 Starting bunny regeneration with new equipment...');
              await generateBunnyWithCurrentItems();
            }, 200);
          } catch (error) {
            console.error('Failed to refresh equipment:', error);
            // Still try to regenerate even if equipment refresh fails
            setTimeout(async () => {
              await generateBunnyWithCurrentItems();
            }, 200);
          }
        }, delay);
      }
    };

    // Handle pre-generated outfit application (no regeneration needed)
    const handleOutfitApplied = (event: any) => {
      const { imageUrl } = event.detail;
      if (imageUrl) {
        console.log('🎨 Applying pre-generated outfit image:', imageUrl);
        setBunnyImageUrl(imageUrl);
        setImageGenerating(false); // Clear any generating state
      }
    };

    window.addEventListener('bunny-equipment-changed', handleForceRegenerate);
    window.addEventListener('bunny-outfit-applied', handleOutfitApplied);
    
    return () => {
      window.removeEventListener('bunny-equipment-changed', handleForceRegenerate);
      window.removeEventListener('bunny-outfit-applied', handleOutfitApplied);
    };
  }, [state.id, loading, isGenerating]);

  const performAction = async (action: ActionType) => {
    const modifications = getActionEffects(action);

    try {
      if (!user || user.id === 'guest-user') {
        // Guest mode or no user - update locally
        dispatch({ type: 'UPDATE_STATS', payload: modifications });
        console.log('Updated stats locally:', modifications);
      } else {
        // Authenticated user - update database
        if (state.id) {
          const updatedBunny = await BunnyService.updateBunnyStats(state.id, modifications);
          const bunnyState = BunnyService.toBunnyState(updatedBunny);
          dispatch({ type: 'LOAD_STATE', payload: bunnyState });
          console.log('Updated stats in database');
        } else {
          // No bunny ID yet - get or create bunny first
          console.log('No bunny ID, creating/getting bunny for authenticated user');
          const dbBunny = await BunnyService.getUserBunny(user.id);
          const bunnyState = BunnyService.toBunnyState(dbBunny);
          dispatch({ type: 'LOAD_STATE', payload: bunnyState });
          
          // Now update with the modifications
          const updatedBunny = await BunnyService.updateBunnyStats(dbBunny.id, modifications);
          const updatedBunnyState = BunnyService.toBunnyState(updatedBunny);
          dispatch({ type: 'LOAD_STATE', payload: updatedBunnyState });
          console.log('Created bunny and updated stats in database');
        }
      }
    } catch (error) {
      console.error('Error performing action:', error);
      // Fallback to local update
      dispatch({ type: 'UPDATE_STATS', payload: modifications });
    }
  };

  // Generate bunny with current equipment
  const generateBunnyWithCurrentItems = async () => {
    if (isGenerating) {
      console.log('🔄 Already generating, skipping');
      return;
    }

    setIsGenerating(true);
    setImageGenerating(true);

    try {
      // Get current equipped items
      const { InventoryService } = await import('../lib/inventoryService');
      const inventoryData = await InventoryService.getBunnyFullInventory(state.id);
      const equippedItems = Object.values(inventoryData.equipment)
        .map(item => ({
          item_id: item.item_id,
          slot: item.slot,
          image_url: item.item?.image_url || '',
          name: item.item?.name || 'Unknown Item'
        }))
        .filter(item => item.image_url);

      const selectedBaseBunny = localStorage.getItem('selected-base-bunny') || 'base-bunny-transparent.png';
      const selectedScene = localStorage.getItem('selected-scene') || 'meadow';
      
      console.log('🎨 Calling generation API with', equippedItems.length, 'items');

      const response = await fetch('/api/generate-bunny-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-base-bunny': selectedBaseBunny,
          'x-scene': selectedScene,
        },
        body: JSON.stringify({ 
          bunnyId: state.id,
          equippedItems: equippedItems,
          generateAnimation: true
        }),
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('✅ Generation complete:', result.imageUrl);
      setBunnyImageUrl(result.imageUrl);
      
      if (result.transparent?.applied) {
        console.log('🎭 Background removed, bunny is now transparent');
      }

    } catch (error) {
      console.error('🔥 Generation failed:', error);
      setBunnyImageUrl(getBaseBunnyPath());
    } finally {
      setIsGenerating(false);
      setImageGenerating(false);
    }
  };

  // Force regenerate current bunny (for refresh button)
  const regenerateBunnyImage = async () => {
    console.log('🔄 Force regenerating bunny image and missing animation frames');
    
    if (!state.id) {
      setBunnyImageUrl(getBaseBunnyPath());
      return;
    }

    setIsGenerating(true);
    setImageGenerating(true);

    try {
      // Get current equipped items
      const { InventoryService } = await import('../lib/inventoryService');
      const inventoryData = await InventoryService.getBunnyFullInventory(state.id);
      const equippedItems = Object.values(inventoryData.equipment)
        .map(item => ({
          item_id: item.item_id,
          slot: item.slot,
          image_url: item.item?.image_url || '',
          name: item.item?.name || 'Unknown Item'
        }))
        .filter(item => item.image_url);

      const selectedBaseBunny = localStorage.getItem('selected-base-bunny') || 'base-bunny-transparent.png';
      const selectedScene = localStorage.getItem('selected-scene') || 'meadow';
      
      console.log('🔄 Force regenerating with', equippedItems.length, 'items and missing animation frames');

      const response = await fetch('/api/generate-bunny-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-base-bunny': selectedBaseBunny,
          'x-scene': selectedScene,
        },
        body: JSON.stringify({ 
          bunnyId: state.id,
          equippedItems: equippedItems,
          generateAnimation: true,
          forceRegenerate: true // This will regenerate the bunny and missing frames
        }),
      });

      if (!response.ok) {
        throw new Error(`Force regeneration failed: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('✅ Force regeneration complete:', result.imageUrl);
      setBunnyImageUrl(result.imageUrl);
      
      // Clear equipment signature to ensure fresh state
      setCurrentEquipment('');
      
    } catch (error) {
      console.error('🔥 Force regeneration failed:', error);
      setBunnyImageUrl(getBaseBunnyPath());
    } finally {
      setIsGenerating(false);
      setImageGenerating(false);
    }
  };

  const getStatPercentage = (stat: keyof BunnyStats): number => {
    return Math.round(state.stats[stat]);
  };

  const getStatEmoji = (stat: keyof BunnyStats): string => {
    const value = state.stats[stat];
    
    switch (stat) {
      case 'connection':
        if (value < 25) return '💔';
        if (value < 50) return '💕';
        if (value < 75) return '💖';
        return '💝';
        
      case 'stimulation':
        if (value < 25) return '😴';
        if (value < 50) return '✨';
        if (value < 75) return '🌟';
        return '⭐';
        
      case 'comfort':
        if (value < 25) return '😰';
        if (value < 50) return '🌙';
        if (value < 75) return '😌';
        return '😇';
        
      case 'energy':
        if (value < 25) return '😪';
        if (value < 50) return '⚡';
        if (value < 75) return '⚡';
        return '🔋';
        
      default:
        return '❓';
    }
  };

  const contextValue: BunnyContextType = {
    state,
    bunnyImageUrl,
    loading,
    imageGenerating,
    imageLoading,
    performAction,
    getStatPercentage,
    getStatEmoji,
    regenerateBunnyImage,
    setBunnyImageUrl,
  };

  return (
    <BunnyContext.Provider value={contextValue}>
      {children}
    </BunnyContext.Provider>
  );
}

export function useBunny() {
  const context = useContext(BunnyContext);
  if (context === undefined) {
    throw new Error('useBunny must be used within a BunnyProvider');
  }
  return context;
}
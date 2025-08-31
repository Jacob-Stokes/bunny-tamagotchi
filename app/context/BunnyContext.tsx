'use client';

import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { BunnyState, BunnyStats, ActionType, StatModification } from '../types/bunny';
import { BunnyService, DatabaseBunny } from '../lib/bunnyService';
import { useAuth } from './AuthContext';

interface BunnyContextType {
  state: BunnyState;
  loading: boolean;
  bunnyImageUrl: string;
  performAction: (action: ActionType) => Promise<void>;
  getStatPercentage: (stat: keyof BunnyStats) => number;
  getStatEmoji: (stat: keyof BunnyStats) => string;
  regenerateBunnyImage: () => Promise<void>;
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
  const [bunnyImageUrl, setBunnyImageUrl] = useState('/base-bunny-transparent.png');
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
    }
  };

  // Save to localStorage for guest users and when no user (persistent saving)
  useEffect(() => {
    if (user?.id === 'guest-user' || !user) {
      localStorage.setItem('bunny-state', JSON.stringify(state));
      console.log('Saved bunny state to localStorage:', state);
    }
  }, [state, user]);

  // Regenerate bunny image when bunny loads and has ID (for equipped items)
  useEffect(() => {
    if (state.id && !loading) {
      regenerateBunnyImage();
    }
  }, [state.id, loading]);

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

  const regenerateBunnyImage = async () => {
    console.log('regenerateBunnyImage called, state.id:', state.id, 'loading:', loading);
    
    if (!state.id) {
      console.log('No bunny ID, using base image');
      setBunnyImageUrl('/base-bunny-transparent.png');
      return;
    }

    console.log('Generating bunny image for ID:', state.id);

    try {
      const response = await fetch('/api/generate-bunny-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bunnyId: state.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate bunny image');
      }

      const result = await response.json();
      setBunnyImageUrl(result.imageUrl);
      console.log('Updated bunny image:', result.imageUrl, result.cached ? '(cached)' : '(generated)');
    } catch (error) {
      console.error('Error generating bunny image:', error);
      // Fallback to base bunny image
      setBunnyImageUrl('/base-bunny-transparent.png');
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
    performAction,
    getStatPercentage,
    getStatEmoji,
    regenerateBunnyImage,
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
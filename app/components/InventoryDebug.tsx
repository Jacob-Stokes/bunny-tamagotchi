'use client';

import React, { useState, useEffect } from 'react';
import { InventoryService } from '../lib/inventoryService';
import { useBunny } from '../context/BunnyContext';
import { useAuth } from '../context/AuthContext';
import { Item, BunnyFullInventory, SlotType } from '../types/inventory';

export default function InventoryDebug() {
  const [isOpen, setIsOpen] = useState(false);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [bunnyInventory, setBunnyInventory] = useState<BunnyFullInventory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotType>('head');

  const { state: bunnyState, regenerateBunnyImage } = useBunny();
  const { user } = useAuth();

  const loadData = async () => {
    if (!user || user.id === 'guest-user' || !bunnyState.id) {
      setError('Need to be signed in with database bunny');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const [items, inventory] = await Promise.all([
        InventoryService.getItems(),
        InventoryService.getBunnyFullInventory(bunnyState.id)
      ]);
      
      setAllItems(items);
      setBunnyInventory(inventory);
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, user, bunnyState.id]);

  const addItemToBunny = async (itemId: string) => {
    if (!bunnyState.id) return;
    
    
    try {
      await InventoryService.addItemToInventory(bunnyState.id, itemId, 1);
      await loadData();
    } catch (err: any) {
      console.error('🔴 Error adding item:', err);
      setError(err.message);
    }
  };

  const equipItem = async (itemId: string) => {
    if (!bunnyState.id) return;
    
    try {
      await InventoryService.equipItem(bunnyState.id, itemId);
      await loadData();
      await regenerateBunnyImage();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const unequipSlot = async (slot: SlotType) => {
    if (!bunnyState.id) return;
    
    try {
      await InventoryService.unequipSlot(bunnyState.id, slot);
      await loadData();
      await regenerateBunnyImage();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-600';
      case 'uncommon': return 'text-green-600';
      case 'rare': return 'text-blue-600';
      case 'epic': return 'text-purple-600';
      case 'legendary': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getSlotItems = () => allItems.filter(item => item.slot === selectedSlot);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-purple-700 transition-colors z-50"
      >
        🛠️ Debug Inventory
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-purple-800">🛠️ Inventory Debug Panel</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="text-2xl">⏳</div>
            <p>Loading inventory data...</p>
          </div>
        )}

        {!loading && (
          <div className="space-y-6">
            {/* Current Equipment */}
            <div>
              <h3 className="text-xl font-semibold mb-3">👔 Currently Equipped</h3>
              <div className="grid grid-cols-3 gap-4">
                {(['head', 'face', 'upper_body', 'lower_body', 'feet', 'accessory'] as SlotType[]).map(slot => {
                  const equipped = bunnyInventory?.equipment[slot];
                  return (
                    <div key={slot} className="bg-gray-50 p-3 rounded-lg">
                      <div className="font-medium capitalize mb-2">{slot.replace('_', ' ')}</div>
                      {equipped ? (
                        <div className="text-sm">
                          <div className={`font-medium ${getRarityColor(equipped.item?.rarity || 'common')}`}>
                            {equipped.item?.name}
                          </div>
                          <button
                            onClick={() => unequipSlot(slot)}
                            className="text-red-600 hover:text-red-800 text-xs mt-1"
                          >
                            Unequip
                          </button>
                        </div>
                      ) : (
                        <div className="text-gray-400 text-sm">Nothing equipped</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stat Effects */}
            {bunnyInventory?.totalStatEffects && (
              <div>
                <h3 className="text-xl font-semibold mb-3">📊 Equipment Stat Bonuses</h3>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    {Object.entries(bunnyInventory.totalStatEffects).map(([stat, value]) => (
                      <div key={stat} className="text-center">
                        <div className="font-medium capitalize">{stat}</div>
                        <div className={`text-lg font-bold ${value > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {value > 0 ? '+' : ''}{value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Owned Items */}
            <div>
              <h3 className="text-xl font-semibold mb-3">🎒 Owned Items ({bunnyInventory?.inventory.length || 0})</h3>
              {bunnyInventory?.inventory.length ? (
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {bunnyInventory.inventory.map(inv => (
                    <div key={inv.id} className="bg-gray-50 p-2 rounded flex justify-between items-center">
                      <div className="text-sm">
                        <div className={`font-medium ${getRarityColor(inv.item?.rarity || 'common')}`}>
                          {inv.item?.name} {inv.quantity > 1 && `(${inv.quantity})`}
                        </div>
                      </div>
                      <button
                        onClick={() => equipItem(inv.item_id)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        Equip
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No items owned yet</p>
              )}
            </div>

            {/* Add Items Section */}
            <div>
              <h3 className="text-xl font-semibold mb-3">➕ Add Items to Inventory</h3>
              
              {/* Slot Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Filter by Slot:</label>
                <select
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value as SlotType)}
                  className="border border-gray-300 rounded px-3 py-1"
                >
                  <option value="head">Head</option>
                  <option value="face">Face</option>
                  <option value="upper_body">Upper Body</option>
                  <option value="lower_body">Lower Body</option>
                  <option value="feet">Feet</option>
                  <option value="accessory">Accessory</option>
                </select>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                {getSlotItems().map(item => (
                  <div key={item.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                    <div>
                      <div className={`font-medium ${getRarityColor(item.rarity)}`}>
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-600">
                        {item.category} • {item.item_type} • {item.rarity}
                      </div>
                      {Object.keys(item.stat_effects).length > 0 && (
                        <div className="text-xs text-blue-600 mt-1">
                          Effects: {Object.entries(item.stat_effects).map(([stat, value]) => `${stat} ${value > 0 ? '+' : ''}${value}`).join(', ')}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => addItemToBunny(item.id)}
                      className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={loadData}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              🔄 Refresh Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
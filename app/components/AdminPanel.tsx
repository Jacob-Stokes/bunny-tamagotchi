'use client';

import React, { useState, useEffect } from 'react';
import { InventoryService } from '../lib/inventoryService';
import { useAuth } from '../context/AuthContext';
import { Item, SlotType, RarityType, ItemInsert } from '../types/inventory';
import { supabase } from '../lib/supabase';

export default function AdminPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { user } = useAuth();

  // Form state
  const [formData, setFormData] = useState<Partial<ItemInsert>>({
    id: '',
    name: '',
    slot: 'head',
    category: '',
    item_type: '',
    rarity: 'common',
    description: '',
    image_url: '',
    stat_effects: {},
    cost: 0,
    is_purchaseable: true,
    is_starter_item: false,
  });

  // Check if user is admin (you can customize this logic)
  const checkAdminStatus = () => {
    // For now, let's make admin check based on email
    // You can change this to check a database flag, role, etc.
    const adminEmails = ['admin@example.com', 'jacob@jacobstokes.com']; // Add your actual email here
    const userIsAdmin = user && adminEmails.includes(user.email || '');
    setIsAdmin(!!userIsAdmin);
  };

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const items = await InventoryService.getItems();
      setAllItems(items);
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAdmin) {
      loadItems();
    }
  }, [isOpen, isAdmin]);

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStatEffectChange = (stat: string, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value) || 0;
    setFormData(prev => ({
      ...prev,
      stat_effects: {
        ...prev.stat_effects,
        [stat]: numValue === 0 ? undefined : numValue
      }
    }));
  };

  const createItem = async () => {
    if (!supabase || !formData.id || !formData.name) {
      setError('Missing required fields');
      return;
    }

    try {
      setUploadingImage(true);
      
      // Upload image if file is selected
      let imageUrl = formData.image_url || '';
      if (selectedFile && formData.id) {
        imageUrl = await uploadImage(selectedFile, formData.id);
      }

      const { error } = await supabase
        .from('items')
        .insert([{
          ...formData,
          image_url: imageUrl,
          stat_effects: JSON.stringify(formData.stat_effects || {}),
        }]);

      if (error) throw error;

      await loadItems();
      setShowAddForm(false);
      resetForm();
      console.log('Item created successfully');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const updateItem = async () => {
    if (!supabase || !editingItem || !formData.name) {
      setError('Missing required fields');
      return;
    }

    try {
      setUploadingImage(true);
      
      // Upload new image if file is selected
      let imageUrl = formData.image_url || '';
      if (selectedFile && editingItem.id) {
        imageUrl = await uploadImage(selectedFile, editingItem.id);
      }

      const { error } = await supabase
        .from('items')
        .update({
          ...formData,
          image_url: imageUrl,
          stat_effects: JSON.stringify(formData.stat_effects || {}),
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      await loadItems();
      setEditingItem(null);
      resetForm();
      console.log('Item updated successfully');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!supabase || !confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      await loadItems();
      console.log('Item deleted successfully');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      id: item.id,
      name: item.name,
      slot: item.slot,
      category: item.category,
      item_type: item.item_type,
      rarity: item.rarity,
      description: item.description,
      image_url: item.image_url,
      stat_effects: item.stat_effects,
      cost: item.cost,
      is_purchaseable: item.is_purchaseable,
      is_starter_item: item.is_starter_item,
    });
    setShowAddForm(true);
  };

  const uploadImage = async (file: File, itemId: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('itemId', itemId);

    const response = await fetch('/api/upload-item-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    const result = await response.json();
    return result.imageUrl;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      slot: 'head',
      category: '',
      item_type: '',
      rarity: 'common',
      description: '',
      image_url: '',
      stat_effects: {},
      cost: 0,
      is_purchaseable: true,
      is_starter_item: false,
    });
    setEditingItem(null);
    setShowAddForm(false);
    setSelectedFile(null);
  };

  if (!isAdmin) {
    return (
      <button className="fixed bottom-16 right-4 bg-red-600 text-white px-3 py-2 rounded-lg text-sm opacity-50 cursor-not-allowed">
        🔒 Admin Only
      </button>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-16 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-700 transition-colors z-50"
      >
        ⚙️ Admin Panel
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-red-800">⚙️ Admin Item Management</h2>
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

        {!showAddForm ? (
          <div>
            {/* Add Item Button */}
            <div className="mb-6">
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                ➕ Add New Item
              </button>
            </div>

            {/* Items List */}
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(item)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Add/Edit Form */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold">
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Item ID*</label>
                <input
                  type="text"
                  value={formData.id || ''}
                  onChange={(e) => handleFormChange('id', e.target.value)}
                  disabled={!!editingItem}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="red_beanie"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Name*</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Cozy Red Beanie"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Slot*</label>
                <select
                  value={formData.slot || 'head'}
                  onChange={(e) => handleFormChange('slot', e.target.value as SlotType)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="head">Head</option>
                  <option value="face">Face</option>
                  <option value="upper_body">Upper Body</option>
                  <option value="lower_body">Lower Body</option>
                  <option value="feet">Feet</option>
                  <option value="accessory">Accessory</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Rarity</label>
                <select
                  value={formData.rarity || 'common'}
                  onChange={(e) => handleFormChange('rarity', e.target.value as RarityType)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="common">Common</option>
                  <option value="uncommon">Uncommon</option>
                  <option value="rare">Rare</option>
                  <option value="epic">Epic</option>
                  <option value="legendary">Legendary</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <input
                  type="text"
                  value={formData.category || ''}
                  onChange={(e) => handleFormChange('category', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="hat"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Item Type</label>
                <input
                  type="text"
                  value={formData.item_type || ''}
                  onChange={(e) => handleFormChange('item_type', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="beanie"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Cost</label>
                <input
                  type="number"
                  value={formData.cost || 0}
                  onChange={(e) => handleFormChange('cost', parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_purchaseable || false}
                    onChange={(e) => handleFormChange('is_purchaseable', e.target.checked)}
                    className="mr-2"
                  />
                  Purchaseable
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_starter_item || false}
                    onChange={(e) => handleFormChange('is_starter_item', e.target.checked)}
                    className="mr-2"
                  />
                  Starter Item
                </label>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleFormChange('description', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                rows={3}
              />
            </div>

            {/* Image Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Item Image</label>
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
                {selectedFile && (
                  <p className="text-sm text-green-600">
                    Selected: {selectedFile.name}
                  </p>
                )}
                {formData.image_url && !selectedFile && (
                  <div className="flex items-center gap-3">
                    <img 
                      src={formData.image_url} 
                      alt="Current item" 
                      className="w-16 h-16 object-cover rounded border"
                    />
                    <span className="text-sm text-gray-600">Current image</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stat Effects */}
            <div className="mb-6">
              <h4 className="font-medium mb-3">Stat Effects</h4>
              <div className="grid grid-cols-4 gap-4">
                {['connection', 'stimulation', 'comfort', 'energy', 'curiosity', 'whimsy', 'melancholy', 'wisdom'].map(stat => (
                  <div key={stat}>
                    <label className="block text-xs font-medium mb-1 capitalize">{stat}</label>
                    <input
                      type="number"
                      value={(formData.stat_effects as any)?.[stat] || ''}
                      onChange={(e) => handleStatEffectChange(stat, e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={editingItem ? updateItem : createItem}
                disabled={uploadingImage}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingImage ? 'Uploading...' : (editingItem ? 'Update Item' : 'Create Item')}
              </button>
              <button
                onClick={resetForm}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
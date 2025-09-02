'use client';

import React, { useState, useEffect } from 'react';
import { InventoryService } from '../lib/inventoryService';
import { SceneService, Scene, CreateSceneData, UpdateSceneData } from '../lib/sceneService';
import { useAuth } from '../context/AuthContext';
import { Item, SlotType, RarityType, ItemInsert } from '../types/inventory';
import { supabase } from '../lib/supabase';
import AdminOutfitPreview from './AdminOutfitPreview';
import OutfitDetailModal, { SelectiveRegenActions } from './OutfitDetailModal';

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
  const [showBaseBunnySection, setShowBaseBunnySection] = useState(false);
  const [showSceneSection, setShowSceneSection] = useState(false);
  const [availableBaseBunnies, setAvailableBaseBunnies] = useState<string[]>([]);
  const [currentBaseBunny, setCurrentBaseBunny] = useState<string>('base-bunny-transparent.png');
  const [currentScene, setCurrentScene] = useState<string>('meadow');
  const [allScenes, setAllScenes] = useState<Scene[]>([]);
  const [showSceneForm, setShowSceneForm] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [sceneUploadingImage, setSceneUploadingImage] = useState(false);
  const [selectedSceneFile, setSelectedSceneFile] = useState<File | null>(null);
  const [sceneFormData, setSceneFormData] = useState<Partial<CreateSceneData>>({
    id: '',
    name: '',
    description: '',
    background_image_url: '',
  });
  const [showGeneratedOutfits, setShowGeneratedOutfits] = useState(false);
  const [generatedOutfits, setGeneratedOutfits] = useState<any[]>([]);
  const [loadingOutfits, setLoadingOutfits] = useState(false);
  const [regeneratingOutfit, setRegeneratingOutfit] = useState<string | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<any>(null);
  const [showOutfitDetail, setShowOutfitDetail] = useState(false);

  // Predefined scene options
  const sceneOptions = [
    {
      id: 'meadow',
      name: 'Sunny Meadow',
      description: 'Beautiful sunny meadow scene with soft green grass, blue sky with fluffy white clouds, and colorful flowers scattered around',
      emoji: '🌸'
    },
    {
      id: 'forest',
      name: 'Magical Forest',
      description: 'Enchanted forest with tall trees, dappled sunlight filtering through leaves, mushrooms, and fairy lights',
      emoji: '🌲'
    },
    {
      id: 'beach',
      name: 'Tropical Beach',
      description: 'Sandy beach with palm trees, clear blue ocean waves, seashells, and warm golden sunlight',
      emoji: '🏖️'
    },
    {
      id: 'garden',
      name: 'Flower Garden',
      description: 'Lush flower garden with roses, butterflies, stone pathways, and a gentle fountain in the background',
      emoji: '🌹'
    },
    {
      id: 'snowy',
      name: 'Winter Wonderland',
      description: 'Snowy landscape with evergreen trees, soft falling snowflakes, and a cozy winter atmosphere',
      emoji: '❄️'
    },
    {
      id: 'space',
      name: 'Cosmic Adventure',
      description: 'Dreamy space scene with stars, planets, nebula colors, and floating cosmic elements',
      emoji: '🌌'
    },
    {
      id: 'library',
      name: 'Cozy Library',
      description: 'Warm library interior with tall bookshelves, soft lighting, comfortable reading nooks, and floating books',
      emoji: '📚'
    },
    {
      id: 'cafe',
      name: 'Cute Cafe',
      description: 'Charming cafe setting with pastries, coffee cups, warm lighting, and cozy indoor atmosphere',
      emoji: '☕'
    }
  ];

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
      loadBaseBunnies();
      loadCurrentBaseBunny();
      loadCurrentScene();
      loadScenes();
      loadGeneratedOutfits();
    }
  }, [isOpen, isAdmin]);

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

  const loadCurrentScene = () => {
    const saved = localStorage.getItem('selected-scene');
    if (saved) {
      setCurrentScene(saved);
    }
  };

  const selectBaseBunny = (bunnyFileName: string) => {
    setCurrentBaseBunny(bunnyFileName);
    localStorage.setItem('selected-base-bunny', bunnyFileName);
    console.log('Selected base bunny:', bunnyFileName);
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

  const handleSceneFormChange = (field: string, value: any) => {
    setSceneFormData(prev => ({ ...prev, [field]: value }));
  };

  const createScene = async () => {
    if (!sceneFormData.id || !sceneFormData.name || !sceneFormData.description) {
      setError('Missing required fields');
      return;
    }

    try {
      setSceneUploadingImage(true);
      
      let imageUrl = sceneFormData.background_image_url || '';
      if (selectedSceneFile && sceneFormData.id) {
        imageUrl = await uploadSceneImage(selectedSceneFile, sceneFormData.id);
      }

      const scene = await SceneService.createScene({
        id: sceneFormData.id,
        name: sceneFormData.name,
        description: sceneFormData.description,
        background_image_url: imageUrl,
      });

      await loadScenes();
      setShowSceneForm(false);
      resetSceneForm();
      console.log('Scene created successfully');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSceneUploadingImage(false);
    }
  };

  const updateScene = async () => {
    if (!editingScene || !sceneFormData.name || !sceneFormData.description) {
      setError('Missing required fields');
      return;
    }

    try {
      setSceneUploadingImage(true);
      
      let imageUrl = sceneFormData.background_image_url || '';
      if (selectedSceneFile && editingScene.id) {
        imageUrl = await uploadSceneImage(selectedSceneFile, editingScene.id);
      }

      const scene = await SceneService.updateScene(editingScene.id, {
        name: sceneFormData.name,
        description: sceneFormData.description,
        background_image_url: imageUrl,
      });

      await loadScenes();
      setEditingScene(null);
      resetSceneForm();
      console.log('Scene updated successfully');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSceneUploadingImage(false);
    }
  };

  const deleteScene = async (sceneId: string) => {
    if (!confirm('Are you sure you want to delete this scene?')) {
      return;
    }

    try {
      await SceneService.deleteScene(sceneId);
      await loadScenes();
      console.log('Scene deleted successfully');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startEditScene = (scene: Scene) => {
    setEditingScene(scene);
    setSceneFormData({
      id: scene.id,
      name: scene.name,
      description: scene.description,
      background_image_url: scene.background_image_url,
    });
    setShowSceneForm(true);
  };

  const uploadSceneImage = async (file: File, sceneId: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sceneId', sceneId);

    const response = await fetch('/api/upload-scene-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    const result = await response.json();
    return result.filePath;
  };

  const handleSceneFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedSceneFile(file);
    }
  };

  const resetSceneForm = () => {
    setSceneFormData({
      id: '',
      name: '',
      description: '',
      background_image_url: '',
    });
    setEditingScene(null);
    setShowSceneForm(false);
    setSelectedSceneFile(null);
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

  const forceRegenerateOutfit = async (outfitKey: string) => {
    setRegeneratingOutfit(outfitKey);
    try {
      const response = await fetch('/api/force-regenerate-outfit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ outfitKey }),
      });

      if (response.ok) {
        console.log('Outfit regenerated successfully');
        // Reload the outfits list to get updated data
        await loadGeneratedOutfits();
      } else {
        const error = await response.json();
        console.error('Failed to regenerate outfit:', error);
      }
    } catch (error) {
      console.error('Error regenerating outfit:', error);
    } finally {
      setRegeneratingOutfit(null);
    }
  };

  const handleSelectiveRegeneration = async (actions: SelectiveRegenActions) => {
    setRegeneratingOutfit(actions.outfitKey);
    try {
      const response = await fetch('/api/selective-regenerate-outfit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(actions),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Selective regeneration completed:', result);
        // Reload the outfits list to get updated data
        await loadGeneratedOutfits();
        // Close the modal
        setShowOutfitDetail(false);
      } else {
        const error = await response.json();
        console.error('Failed to perform selective regeneration:', error);
        alert(`Failed to perform selective regeneration: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error during selective regeneration:', error);
      alert('Error during selective regeneration');
    } finally {
      setRegeneratingOutfit(null);
    }
  };

  const openOutfitDetail = (outfit: any) => {
    setSelectedOutfit(outfit);
    setShowOutfitDetail(true);
  };

  const closeOutfitDetail = () => {
    setSelectedOutfit(null);
    setShowOutfitDetail(false);
  };

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center p-2 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl p-4 w-full max-w-lg max-h-[95vh] overflow-y-auto mt-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-red-800">⚙️ Admin</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700 text-xl bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center"
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
            {/* Navigation Tabs */}
            <div className="mb-4 space-y-2">
              <button
                onClick={() => { setShowBaseBunnySection(false); setShowSceneSection(false); setShowGeneratedOutfits(false); }}
                className={`w-full px-3 py-2 rounded-lg font-medium text-sm ${!showBaseBunnySection && !showSceneSection && !showGeneratedOutfits
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                📦 Items Management
              </button>
              <button
                onClick={() => { setShowBaseBunnySection(true); setShowSceneSection(false); setShowGeneratedOutfits(false); }}
                className={`w-full px-3 py-2 rounded-lg font-medium text-sm ${showBaseBunnySection && !showSceneSection && !showGeneratedOutfits
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                🐰 Base Bunny Selection
              </button>
              <button
                onClick={() => { setShowBaseBunnySection(false); setShowSceneSection(true); setShowGeneratedOutfits(false); }}
                className={`w-full px-3 py-2 rounded-lg font-medium text-sm ${showSceneSection && !showGeneratedOutfits
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                🌸 Scene Selection
              </button>
              <button
                onClick={() => { setShowBaseBunnySection(false); setShowSceneSection(false); setShowGeneratedOutfits(true); }}
                className={`w-full px-3 py-2 rounded-lg font-medium text-sm ${showGeneratedOutfits
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                🎨 Generated Outfits
              </button>
            </div>

            {!showBaseBunnySection && !showSceneSection && !showGeneratedOutfits ? (
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
              </div>
            ) : showGeneratedOutfits ? (
              <div>
                {/* Generated Outfits Section */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Generated Outfit Cache ({generatedOutfits.length})</h3>
                    <button
                      onClick={loadGeneratedOutfits}
                      disabled={loadingOutfits}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loadingOutfits ? 'Loading...' : '🔄 Refresh'}
                    </button>
                  </div>
                  
                  {loadingOutfits ? (
                    <div className="text-center py-8">Loading generated outfits...</div>
                  ) : generatedOutfits.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No generated outfits found</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                              Generated: {new Date(outfit.generatedAt).toLocaleString()}
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <button
                              onClick={() => openOutfitDetail(outfit)}
                              disabled={regeneratingOutfit === outfit.key}
                              className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {regeneratingOutfit === outfit.key ? '⏳ Processing...' : '🔍 View Details'}
                            </button>
                            <button
                              onClick={() => forceRegenerateOutfit(outfit.key)}
                              disabled={regeneratingOutfit === outfit.key}
                              className="w-full bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {regeneratingOutfit === outfit.key ? '⏳ Regenerating...' : '🔥 Force Regen'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : showBaseBunnySection ? (
              <div>
                {/* Base Bunny Selection */}
                <h3 className="text-lg font-semibold mb-4">Select Base Bunny</h3>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Choose the default bunny image that will be used as the base for all bunny generations.
                    Current selection: <strong>{currentBaseBunny}</strong>
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {availableBaseBunnies.map((bunnyFile) => (
                      <div 
                        key={bunnyFile}
                        className={`border-2 rounded-lg p-4 cursor-pointer hover:bg-gray-50 ${
                          currentBaseBunny === bunnyFile 
                            ? 'border-red-500 bg-red-50' 
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
                            <span className="bg-red-500 text-white px-2 py-1 rounded text-xs">
                              Selected
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {/* Scene Management */}
                {!showSceneForm ? (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Scene Management</h3>
                      <button
                        onClick={() => setShowSceneForm(true)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                      >
                        ➕ Add New Scene
                      </button>
                    </div>
                    
                    <div className="mb-6">
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
                                ? 'border-red-500 bg-red-50' 
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
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => selectScene(scene.id)}
                                      className={`px-3 py-1 rounded text-sm ${
                                        currentScene === scene.id 
                                          ? 'bg-red-500 text-white' 
                                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                      }`}
                                    >
                                      {currentScene === scene.id ? 'Selected' : 'Select'}
                                    </button>
                                    <button
                                      onClick={() => startEditScene(scene)}
                                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => deleteScene(scene.id)}
                                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                    >
                                      Delete
                                    </button>
                                  </div>
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
                ) : (
                  <div>
                    {/* Scene Add/Edit Form */}
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">
                        {editingScene ? 'Edit Scene' : 'Add New Scene'}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">Scene ID*</label>
                        <input
                          type="text"
                          value={sceneFormData.id || ''}
                          onChange={(e) => handleSceneFormChange('id', e.target.value)}
                          disabled={!!editingScene}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                          placeholder="underwater_cave"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Name*</label>
                        <input
                          type="text"
                          value={sceneFormData.name || ''}
                          onChange={(e) => handleSceneFormChange('name', e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                          placeholder="Underwater Cave"
                        />
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-2">Description*</label>
                      <textarea
                        value={sceneFormData.description || ''}
                        onChange={(e) => handleSceneFormChange('description', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        rows={3}
                        placeholder="Mystical underwater cave with glowing crystals, fish swimming around, and shimmering water reflections"
                      />
                    </div>

                    {/* Scene Image Upload */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-2">Scene Background Image</label>
                      <div className="space-y-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSceneFileSelect}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        />
                        {selectedSceneFile && (
                          <p className="text-sm text-green-600">
                            Selected: {selectedSceneFile.name}
                          </p>
                        )}
                        {sceneFormData.background_image_url && !selectedSceneFile && (
                          <div className="flex items-center gap-3">
                            <img 
                              src={sceneFormData.background_image_url} 
                              alt="Current scene" 
                              className="w-24 h-24 object-cover rounded border"
                            />
                            <span className="text-sm text-gray-600">Current image</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={editingScene ? updateScene : createScene}
                        disabled={sceneUploadingImage}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sceneUploadingImage ? 'Uploading...' : (editingScene ? 'Update Scene' : 'Create Scene')}
                      </button>
                      <button
                        onClick={resetSceneForm}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Items List - only show when in items management section */}
            {!showBaseBunnySection && !showSceneSection && !showGeneratedOutfits && (
              <>
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
              </>
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
        
        {/* Outfit Detail Modal */}
        <OutfitDetailModal
          outfit={selectedOutfit}
          isOpen={showOutfitDetail}
          onClose={closeOutfitDetail}
          onSelectiveRegen={handleSelectiveRegeneration}
          onFullRegen={() => {
            if (selectedOutfit) {
              forceRegenerateOutfit(selectedOutfit.key);
              setShowOutfitDetail(false);
            }
          }}
          isRegenerating={!!regeneratingOutfit}
        />
      </div>
    </div>
  );
}
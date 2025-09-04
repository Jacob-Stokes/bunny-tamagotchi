'use client';
import { useState, useEffect } from 'react';
import { InventoryService } from '../lib/inventoryService';
import { Item, RarityType } from '../types/inventory';

interface ShopProps {
  className?: string;
  bunnyId: string;
}

export default function Shop({ className = '', bunnyId }: ShopProps) {
  const [categories, setCategories] = useState<Array<{ category: string; count: number; icon: string; description: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryItems, setCategoryItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load categories on component mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load items when category selection changes
  useEffect(() => {
    if (selectedCategory) {
      loadCategoryItems(selectedCategory);
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const categoryData = await InventoryService.getShopCategories();
      setCategories(categoryData);
      setError(null);
    } catch (err) {
      setError('Failed to load shop categories');
      console.error('Failed to load shop categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryItems = async (category: string) => {
    try {
      setItemsLoading(true);
      const items = await InventoryService.getShopItems({ category });
      setCategoryItems(items);
    } catch (err) {
      setError('Failed to load category items');
      console.error('Failed to load category items:', err);
    } finally {
      setItemsLoading(false);
    }
  };

  const handlePurchase = async (item: Item) => {
    try {
      setPurchaseLoading(item.id);
      const result = await InventoryService.purchaseItem(bunnyId, item.id, 'guest-user'); // TODO: Pass actual user ID
      
      if (result.success) {
        // Show success message - could integrate with notification system
        alert(result.message);
      } else {
        alert(`Purchase failed: ${result.message}`);
      }
    } catch (err) {
      alert('Purchase failed. Please try again.');
      console.error('Purchase error:', err);
    } finally {
      setPurchaseLoading(null);
    }
  };

  // Utility functions for rarity styling
  const getRarityColor = (rarity: RarityType): string => {
    switch (rarity) {
      case 'common': return 'text-gray-600';
      case 'uncommon': return 'text-green-600';
      case 'rare': return 'text-blue-600';
      case 'epic': return 'text-purple-600';
      case 'legendary': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getRarityBackground = (rarity: RarityType): string => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 border-gray-300';
      case 'uncommon': return 'bg-green-50 border-green-300';
      case 'rare': return 'bg-blue-50 border-blue-300';
      case 'epic': return 'bg-purple-50 border-purple-300';
      case 'legendary': return 'bg-yellow-50 border-yellow-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center">
          <div className="text-lg">🛍️ Loading Shop...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center text-red-600">
          <div className="text-lg">❌ {error}</div>
          <button 
            onClick={loadCatalogues}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 ${className}`}>
      {/* Category Selection View */}
      {!selectedCategory && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Choose a Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map(category => (
              <div
                key={category.category}
                className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-purple-300 cursor-pointer transition-all hover:shadow-lg"
                onClick={() => setSelectedCategory(category.category)}
              >
                <div className="text-center">
                  <div className="text-4xl mb-3">{category.icon}</div>
                  <h4 className="text-xl font-bold mb-2 capitalize">{category.category}</h4>
                  <p className="text-gray-600 text-sm">{category.description}</p>
                  <p className="text-purple-600 text-xs mt-2">{category.count} items available</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Items View */}
      {selectedCategory && (
        <div>
          {/* Back Button & Category Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => {
                setSelectedCategory(null);
                setCategoryItems([]);
              }}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <span>←</span> Back to Categories
            </button>
            
            <div className="text-center">
              {(() => {
                const category = categories.find(c => c.category === selectedCategory);
                return category ? (
                  <div>
                    <div className="text-2xl">{category.icon}</div>
                    <h3 className="text-lg font-bold capitalize">{category.category}</h3>
                  </div>
                ) : null;
              })()}
            </div>
            
            <div></div> {/* Spacer for centering */}
          </div>

          {/* Items Loading */}
          {itemsLoading && (
            <div className="text-center py-8">
              <div className="text-lg">Loading items...</div>
            </div>
          )}

          {/* Items Grid */}
          {!itemsLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryItems.map(item => (
                <div
                  key={item.id}
                  className={`bg-white rounded-lg border-2 p-4 ${getRarityBackground(item.rarity)}`}
                >
                  {/* Item Image */}
                  <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-400">📦</span>
                    )}
                  </div>

                  {/* Item Info */}
                  <div className="text-center mb-3">
                    <h4 className="font-bold text-sm mb-1">{item.name}</h4>
                    <p className="text-xs text-gray-600 mb-2">{item.description || 'No description available'}</p>
                    <div className={`text-xs font-semibold ${getRarityColor(item.rarity)} mb-2`}>
                      {item.rarity.toUpperCase()}
                    </div>
                  </div>

                  {/* Price & Purchase */}
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600 mb-2">
                      🪙 {item.cost}
                    </div>
                    <button
                      onClick={() => handlePurchase(item)}
                      disabled={purchaseLoading === item.id}
                      className="w-full py-2 px-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                    >
                      {purchaseLoading === item.id ? '🛒 Buying...' : '🛒 Buy Now'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!itemsLoading && categoryItems.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-500">No items available in this category yet!</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
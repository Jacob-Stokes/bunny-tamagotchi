'use client';
import { useState, useEffect } from 'react';
import { CatalogueService, Catalogue, CatalogueItem, getRarityColor, getRarityBackground } from '../lib/catalogueService';

interface ShopProps {
  className?: string;
  bunnyId: string;
}

export default function Shop({ className = '', bunnyId }: ShopProps) {
  const [catalogues, setCatalogues] = useState<Catalogue[]>([]);
  const [selectedCatalogue, setSelectedCatalogue] = useState<string | null>(null);
  const [catalogueItems, setCatalogueItems] = useState<CatalogueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load catalogues on component mount
  useEffect(() => {
    loadCatalogues();
  }, []);

  // Load items when catalogue selection changes
  useEffect(() => {
    if (selectedCatalogue) {
      loadCatalogueItems(selectedCatalogue);
    }
  }, [selectedCatalogue]);

  const loadCatalogues = async () => {
    try {
      setLoading(true);
      const catalogueData = await CatalogueService.getCatalogues();
      setCatalogues(catalogueData);
      setError(null);
    } catch (err) {
      setError('Failed to load catalogues');
      console.error('Failed to load catalogues:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogueItems = async (catalogueId: string) => {
    try {
      setItemsLoading(true);
      const items = await CatalogueService.getCatalogueItems(catalogueId);
      setCatalogueItems(items);
    } catch (err) {
      setError('Failed to load catalogue items');
      console.error('Failed to load catalogue items:', err);
    } finally {
      setItemsLoading(false);
    }
  };

  const handlePurchase = async (item: CatalogueItem) => {
    try {
      setPurchaseLoading(item.id);
      const result = await CatalogueService.purchaseItem(item.id, bunnyId);
      
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
      {/* Shop Header */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold mb-2">🛍️ Bunny Boutique</h2>
        <p className="text-gray-600">Find the perfect items for your bunny!</p>
      </div>

      {/* Catalogue Selection View */}
      {!selectedCatalogue && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Choose a Collection</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {catalogues.map(catalogue => (
              <div
                key={catalogue.id}
                className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-purple-300 cursor-pointer transition-all hover:shadow-lg"
                onClick={() => setSelectedCatalogue(catalogue.id)}
              >
                <div className="text-center">
                  <div className="text-4xl mb-3">{catalogue.icon}</div>
                  <h4 className="text-xl font-bold mb-2">{catalogue.name}</h4>
                  <p className="text-gray-600 text-sm">{catalogue.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Catalogue Items View */}
      {selectedCatalogue && (
        <div>
          {/* Back Button & Catalogue Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => {
                setSelectedCatalogue(null);
                setCatalogueItems([]);
              }}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <span>←</span> Back to Collections
            </button>
            
            <div className="text-center">
              {(() => {
                const catalogue = catalogues.find(c => c.id === selectedCatalogue);
                return catalogue ? (
                  <div>
                    <div className="text-2xl">{catalogue.icon}</div>
                    <h3 className="text-lg font-bold">{catalogue.name}</h3>
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
              {catalogueItems.map(item => (
                <div
                  key={item.id}
                  className={`bg-white rounded-lg border-2 p-4 ${getRarityBackground(item.rarity)}`}
                >
                  {/* Item Image Placeholder */}
                  <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                    <span className="text-gray-400">📷</span>
                  </div>

                  {/* Item Info */}
                  <div className="text-center mb-3">
                    <h4 className="font-bold text-sm mb-1">{item.name}</h4>
                    <p className="text-xs text-gray-600 mb-2">{item.description}</p>
                    <div className={`text-xs font-semibold ${getRarityColor(item.rarity)} mb-2`}>
                      {item.rarity.toUpperCase()}
                    </div>
                  </div>

                  {/* Price & Purchase */}
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600 mb-2">
                      🪙 {item.price}
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
          {!itemsLoading && catalogueItems.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-500">No items available in this collection yet!</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
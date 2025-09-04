import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '../../lib/inventoryService';

export async function POST(request: NextRequest) {
  try {
    const { bunnyId } = await request.json();
    
    if (!bunnyId) {
      return NextResponse.json({ error: 'Missing bunnyId' }, { status: 400 });
    }

    console.log('🔧 Debug: Populating inventory with all items...');

    // Get all items from the database (using getShopItems without filter gets all)
    const allItems = await InventoryService.getShopItems();
    console.log(`   Found ${allItems.length} items to add`);

    let addedItems = 0;
    let skippedItems = 0;
    
    for (const item of allItems) {
      try {
        // Add each item to bunny's inventory (quantity 1)
        const result = await InventoryService.addItemToBunnyInventory(bunnyId, item.id, 1);
        if (result) {
          addedItems++;
        } else {
          skippedItems++;
        }
      } catch (error) {
        console.error(`   Error adding item ${item.name}:`, error);
        skippedItems++;
      }
    }

    console.log(`✅ Debug inventory population complete`);
    console.log(`   Added: ${addedItems} items`);
    console.log(`   Skipped: ${skippedItems} items`);

    return NextResponse.json({
      success: true,
      message: 'Debug inventory populated',
      totalItems: allItems.length,
      addedItems,
      skippedItems,
      bunnyId
    });

  } catch (error) {
    console.error('💥 Debug inventory population failed:', error);
    return NextResponse.json({
      error: 'Failed to populate inventory',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '../../lib/inventoryService';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ppzteuipicxvjhqhlqye.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwenRldWlwaWN4dmpocWhscXllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU2MTEzNSwiZXhwIjoyMDcyMTM3MTM1fQ.VSmvGaTuYUJtDLOSAa4A6RT588QJoLbUf2x0PpYJnhE';

// Create admin client with service role key (bypasses RLS)
const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(request: NextRequest) {
  try {
    const { bunnyId } = await request.json();
    
    if (!bunnyId) {
      return NextResponse.json({ error: 'Missing bunnyId' }, { status: 400 });
    }

    console.log('🔧 Debug: Populating inventory with all items (using admin privileges)...');

    // Get all items from the database using admin client
    const { data: allItems, error: itemsError } = await adminSupabase
      .from('items')
      .select('*');
    
    if (itemsError) {
      throw new Error(`Failed to fetch items: ${itemsError.message}`);
    }
    
    console.log(`   Found ${allItems.length} items to add`);

    let addedItems = 0;
    let skippedItems = 0;
    
    // Use upsert to handle duplicates gracefully
    const itemsToInsert = allItems.map(item => ({
      bunny_id: bunnyId,
      item_id: item.id,
      quantity: 1,
      acquired_at: new Date().toISOString()
    }));

    const { data: insertedItems, error: bulkError } = await adminSupabase
      .from('bunny_inventory')
      .upsert(itemsToInsert, { 
        onConflict: 'bunny_id,item_id',
        ignoreDuplicates: false 
      })
      .select();

    if (bulkError) {
      console.error('   Bulk insert error:', bulkError);
      throw bulkError;
    }

    addedItems = insertedItems ? insertedItems.length : 0;
    console.log(`   ✅ Bulk inserted ${addedItems} items to inventory`);

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
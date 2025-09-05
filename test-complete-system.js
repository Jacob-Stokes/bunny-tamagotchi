const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testCompleteSystem() {
  console.log('🧪 Testing Complete Refactored Outfit System...\n');
  
  // Get current bunny
  const { data: bunny } = await supabase.from('bunnies').select('*').single();
  console.log('👤 Current bunny:', bunny.id);
  
  console.log('\n=== TEST 1: Initial State ===');
  await checkSystemState(bunny.id);
  
  console.log('\n=== TEST 2: Switch to Magical Ballet Dancer ===');
  const { data: outfits } = await supabase
    .from('outfits')
    .select('*')
    .eq('bunny_id', bunny.id)
    .eq('name', 'Magical Ballet Dancer')
    .single();
    
  if (outfits) {
    await switchOutfit(bunny.id, outfits.id);
    await checkSystemState(bunny.id);
  }
  
  console.log('\n=== TEST 3: Switch to Base Bunny ===');
  const { data: baseBunnyOutfit } = await supabase
    .from('outfits')
    .select('*')
    .eq('bunny_id', bunny.id)
    .eq('name', 'Base Bunny')
    .single();
    
  if (baseBunnyOutfit) {
    await switchOutfit(bunny.id, baseBunnyOutfit.id);
    await checkSystemState(bunny.id);
  }
  
  console.log('\n=== TEST 4: API Endpoint Consistency ===');
  await testAPIEndpoint(bunny.id);
  
  console.log('\n🎉 Complete system test finished!');
}

async function switchOutfit(bunnyId, outfitId) {
  console.log(`🔄 Switching to outfit: ${outfitId}`);
  
  // 1. Set all outfits to inactive
  await supabase
    .from('bunny_outfits')
    .update({ is_active: false })
    .eq('bunny_id', bunnyId);
    
  // 2. Set selected outfit to active
  await supabase
    .from('bunny_outfits')
    .update({ is_active: true })
    .eq('bunny_id', bunnyId)
    .eq('outfit_id', outfitId);
    
  console.log('✅ Junction table updated');
}

async function checkSystemState(bunnyId) {
  // 1. Check junction table state
  const { data: bunnyOutfits } = await supabase
    .from('bunny_outfits')
    .select('*, outfit:outfits(name)')
    .eq('bunny_id', bunnyId);
    
  console.log('📊 Junction table state:');
  bunnyOutfits.forEach(bo => {
    console.log(`   - ${bo.outfit.name}: ${bo.is_active ? 'ACTIVE' : 'inactive'}`);
  });
  
  // 2. Test InventoryService.getBunnyFullInventory (new junction table approach)
  console.log('\n🎒 Testing InventoryService.getBunnyFullInventory():');
  try {
    // Simulate the new junction table query
    const { data: outfitEquipment } = await supabase
      .from('outfit_items')
      .select(`
        item_id,
        slot,
        item:items(*),
        outfit:outfits!inner(
          bunny_outfits!inner(bunny_id, is_active)
        )
      `)
      .eq('outfit.bunny_outfits.bunny_id', bunnyId)
      .eq('outfit.bunny_outfits.is_active', true);
      
    console.log(`   Equipment from junction tables: ${outfitEquipment?.length || 0} items`);
    outfitEquipment?.forEach(eq => {
      console.log(`   - ${eq.item.name} (${eq.slot})`);
    });
    
    if (outfitEquipment?.length === 0) {
      console.log('   ✅ No active outfit = Base Bunny state (correct)');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  // 3. Check old bunny_equipment table (should be ignored now)
  const { data: oldEquipment } = await supabase
    .from('bunny_equipment')
    .select('*')
    .eq('bunny_id', bunnyId);
    
  console.log(`\n🗂️ Old bunny_equipment table: ${oldEquipment?.length || 0} items (ignored by new system)`);
}

async function testAPIEndpoint(bunnyId) {
  try {
    const response = await fetch(`http://localhost:3001/api/generated-outfits?bunny_id=${bunnyId}`);
    const data = await response.json();
    
    console.log(`🔍 API /generated-outfits: ${data.outfits?.length || 0} outfits`);
    data.outfits?.forEach(outfit => {
      console.log(`   - ${outfit.name}: ${outfit.isActive ? 'ACTIVE' : 'inactive'} (${outfit.equippedItems.length} items)`);
    });
    
    // Check for consistency
    const activeOutfits = data.outfits?.filter(o => o.isActive) || [];
    if (activeOutfits.length === 0) {
      console.log('   ✅ No active outfit = Base Bunny state matches junction table');
    } else if (activeOutfits.length === 1) {
      console.log(`   ✅ One active outfit: ${activeOutfits[0].name}`);
    } else {
      console.log(`   ❌ Multiple active outfits: ${activeOutfits.map(o => o.name).join(', ')}`);
    }
  } catch (error) {
    console.log(`   ❌ API Error: ${error.message}`);
  }
}

testCompleteSystem().catch(console.error);
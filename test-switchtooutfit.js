// Test the exact switchToOutfit logic
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testSwitchToOutfit() {
  console.log('🧪 Testing switchToOutfit logic...\n');
  
  const bunnyId = 'ee630f8d-21c5-46e1-8e4c-fafc796aad7e';
  
  // Get available outfits for this bunny (simulate API call)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  const { data: outfits } = await supabase
    .from('outfits')
    .select(`
      *,
      bunny_outfits!inner(bunny_id, is_active),
      outfit_items(
        item_id,
        slot,
        item:items(name, image_url)
      )
    `)
    .eq('bunny_outfits.bunny_id', bunnyId);
  
  console.log('📋 Available outfits:');
  outfits?.forEach(outfit => {
    console.log(`   - ${outfit.name} (ID: ${outfit.id}) - ${outfit.bunny_outfits[0].is_active ? 'ACTIVE' : 'inactive'}`);
  });
  
  // Find Magical Ballet Dancer outfit
  const magicalOutfit = outfits?.find(o => o.name === 'Magical Ballet Dancer');
  if (!magicalOutfit) {
    console.log('❌ Magical Ballet Dancer outfit not found');
    return;
  }
  
  console.log(`\n🎭 Testing switch to: ${magicalOutfit.name} (ID: ${magicalOutfit.id})`);
  
  // Simulate the exact switchToOutfit logic
  console.log('Step 1: Setting all outfits to inactive...');
  const result1 = await supabase
    .from('bunny_outfits')
    .update({ is_active: false })
    .eq('bunny_id', bunnyId);
  
  console.log('   Result:', result1.error ? `ERROR: ${result1.error.message}` : 'SUCCESS');
  
  console.log('Step 2: Setting selected outfit to active...');
  const result2 = await supabase
    .from('bunny_outfits')
    .update({ is_active: true })
    .eq('bunny_id', bunnyId)
    .eq('outfit_id', magicalOutfit.id);
    
  console.log('   Result:', result2.error ? `ERROR: ${result2.error.message}` : 'SUCCESS');
  
  // Check result
  console.log('\n✅ Checking final state...');
  const { data: finalState } = await supabase
    .from('bunny_outfits')
    .select('*, outfit:outfits(name)')
    .eq('bunny_id', bunnyId);
    
  finalState?.forEach(bo => {
    console.log(`   - ${bo.outfit.name}: ${bo.is_active ? 'ACTIVE' : 'inactive'}`);
  });
  
  // Check equipment
  console.log('\n🎒 Expected equipment:');
  const { data: equipment } = await supabase
    .from('outfit_items')
    .select(`
      item_id,
      slot,
      item:items(name),
      outfit:outfits!inner(
        name,
        bunny_outfits!inner(bunny_id, is_active)
      )
    `)
    .eq('outfit.bunny_outfits.bunny_id', bunnyId)
    .eq('outfit.bunny_outfits.is_active', true);
    
  if (equipment?.length === 0) {
    console.log('   No equipment found');
  } else {
    equipment?.forEach(eq => {
      console.log(`   - ${eq.item.name} (${eq.slot})`);
    });
  }
}

testSwitchToOutfit().catch(console.error);
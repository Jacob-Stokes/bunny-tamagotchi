const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testOutfitSwitch() {
  console.log('🧪 Testing outfit switching functionality...\n');
  
  // Get current bunny
  const { data: bunny } = await supabase.from('bunnies').select('*').single();
  console.log('👤 Current bunny:', bunny.id);
  
  // Show initial state
  console.log('\n📊 Initial state:');
  const { data: initialOutfits } = await supabase
    .from('bunny_outfits')
    .select('*, outfit:outfits(name)')
    .eq('bunny_id', bunny.id);
    
  initialOutfits.forEach(bo => {
    console.log(`   - ${bo.outfit.name}: ${bo.is_active ? 'ACTIVE' : 'inactive'}`);
  });
  
  // Find the base bunny outfit to switch to
  const baseBunnyOutfit = initialOutfits.find(bo => bo.outfit.name === 'Base Bunny');
  if (!baseBunnyOutfit) {
    console.error('❌ Base Bunny outfit not found');
    return;
  }
  
  console.log(`\n🔄 Switching to: ${baseBunnyOutfit.outfit.name}`);
  
  // Simulate outfit switch (same logic as frontend)
  // 1. Set all outfits to inactive
  await supabase
    .from('bunny_outfits')
    .update({ is_active: false })
    .eq('bunny_id', bunny.id);
    
  // 2. Set base bunny to active
  await supabase
    .from('bunny_outfits')
    .update({ is_active: true })
    .eq('bunny_id', bunny.id)
    .eq('outfit_id', baseBunnyOutfit.outfit_id);
  
  console.log('✅ Database updated');
  
  // Show final state
  console.log('\n📊 Final state:');
  const { data: finalOutfits } = await supabase
    .from('bunny_outfits')
    .select('*, outfit:outfits(name)')
    .eq('bunny_id', bunny.id);
    
  finalOutfits.forEach(bo => {
    console.log(`   - ${bo.outfit.name}: ${bo.is_active ? 'ACTIVE' : 'inactive'}`);
  });
  
  // Test API response
  console.log('\n🔍 API response after switch:');
  const response = await fetch(`http://localhost:3001/api/generated-outfits?bunny_id=${bunny.id}`);
  const data = await response.json();
  
  if (data.outfits) {
    data.outfits.forEach(outfit => {
      console.log(`   - ${outfit.name}: ${outfit.isActive ? 'ACTIVE' : 'inactive'} (${outfit.equippedItems.length} items)`);
    });
  }
}

testOutfitSwitch().catch(console.error);
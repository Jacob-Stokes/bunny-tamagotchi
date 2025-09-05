const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugOutfitSwitching() {
  console.log('🔍 DEBUGGING OUTFIT SWITCHING ISSUE\n');
  
  // 1. Get ALL bunnies
  const { data: allBunnies } = await supabase.from('bunnies').select('*');
  console.log(`📊 Total bunnies in database: ${allBunnies?.length || 0}`);
  allBunnies?.forEach(bunny => {
    console.log(`   - ${bunny.id} (user: ${bunny.user_id})`);
  });
  
  // 2. Get the LATEST bunny (most likely the UI one)
  const { data: latestBunny } = await supabase
    .from('bunnies')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  console.log(`\n🐰 Latest bunny: ${latestBunny?.id}`);
  
  // 3. Check their outfit status
  const { data: bunnyOutfits } = await supabase
    .from('bunny_outfits')
    .select('*, outfit:outfits(name)')
    .eq('bunny_id', latestBunny?.id);
    
  console.log(`\n👔 Outfit states for latest bunny:`);
  bunnyOutfits?.forEach(bo => {
    console.log(`   - ${bo.outfit.name}: ${bo.is_active ? 'ACTIVE' : 'inactive'}`);
  });
  
  // 4. Check what equipment they should have
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
    .eq('outfit.bunny_outfits.bunny_id', latestBunny?.id)
    .eq('outfit.bunny_outfits.is_active', true);
    
  console.log(`\n🎒 Equipment from junction table query:`);
  if (equipment?.length === 0) {
    console.log('   No equipment found (Base Bunny state)');
  } else {
    equipment?.forEach(eq => {
      console.log(`   - ${eq.item.name} (${eq.slot})`);
    });
  }
  
  // 5. Check what outfits exist for this bunny
  const { data: availableOutfits } = await supabase
    .from('outfits')
    .select(`
      *,
      bunny_outfits!inner(bunny_id, is_active)
    `)
    .eq('bunny_outfits.bunny_id', latestBunny?.id);
    
  console.log(`\n🎨 Available outfits for latest bunny: ${availableOutfits?.length || 0}`);
  availableOutfits?.forEach(outfit => {
    console.log(`   - ${outfit.name}: ${outfit.bunny_outfits[0]?.is_active ? 'ACTIVE' : 'inactive'}`);
  });
}

debugOutfitSwitching().catch(console.error);
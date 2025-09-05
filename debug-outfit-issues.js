const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugOutfitIssues() {
  console.log('🔍 Debugging outfit display issues...\n');
  
  // Get current bunny
  const { data: bunny } = await supabase.from('bunnies').select('*').single();
  console.log('👤 Current bunny:', bunny.id);
  
  console.log('\n1. Checking bunny_outfits (ownership):');
  const { data: bunnyOutfits } = await supabase
    .from('bunny_outfits')
    .select('*')
    .eq('bunny_id', bunny.id);
    
  console.log(`   Found ${bunnyOutfits?.length || 0} outfit ownership records`);
  bunnyOutfits?.forEach(bo => {
    console.log(`   - Outfit ${bo.outfit_id}: active=${bo.is_active}`);
  });
  
  console.log('\n2. Checking outfits table:');
  const { data: outfits } = await supabase
    .from('outfits')
    .select('*');
    
  console.log(`   Found ${outfits?.length || 0} total outfits`);
  outfits?.forEach(o => {
    console.log(`   - ${o.name}: bunny_id=${o.bunny_id}, user_id=${o.user_id}`);
  });
  
  console.log('\n3. Testing API query (same as frontend):');
  const { data: apiOutfits, error } = await supabase
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
    .eq('bunny_outfits.bunny_id', bunny.id)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('❌ API query error:', error);
  } else {
    console.log(`✅ API query returned ${apiOutfits?.length || 0} outfits`);
    apiOutfits?.forEach(outfit => {
      console.log(`   - ${outfit.name}`);
      console.log(`     Items: ${outfit.outfit_items?.length || 0}`);
      console.log(`     Active: ${outfit.bunny_outfits?.[0]?.is_active}`);
      console.log(`     Image URLs:`, outfit.image_urls ? 'Present' : 'Missing');
    });
  }
  
  console.log('\n4. Checking if there are other outfits not owned by this bunny:');
  const { data: allOutfits } = await supabase
    .from('outfits')
    .select(`
      *,
      bunny_outfits(bunny_id, is_active)
    `);
    
  const unownedOutfits = allOutfits?.filter(o => 
    !o.bunny_outfits?.some(bo => bo.bunny_id === bunny.id)
  );
  
  console.log(`   Found ${unownedOutfits?.length || 0} unowned outfits`);
  unownedOutfits?.forEach(o => {
    console.log(`   - ${o.name} (created for bunny: ${o.bunny_id})`);
  });
}

debugOutfitIssues();
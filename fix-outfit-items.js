const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixOutfitItems() {
  console.log('🔧 Fixing outfit items for imported outfits...\n');
  
  // Get current bunny
  const { data: bunny } = await supabase.from('bunnies').select('*').single();
  console.log('👤 Current bunny:', bunny.id);
  
  // Get all items to map IDs to slots
  const { data: allItems } = await supabase.from('items').select('*');
  const itemMap = {};
  allItems.forEach(item => {
    itemMap[item.id] = item;
  });
  
  // Map folder names to actual item IDs
  const outfitMappings = {
    'bunny-base_ballet_slippers,masquerade_mask,tutu,wizard_hat': {
      items: ['ballet_slippers', 'masquerade_mask', 'tutu', 'wizard_hat'],
      name: 'Magical Ballet Dancer'
    },
    'bunny-base_masquerade_mask,rain_boots,raincoat,tutu,winter_hat': {
      items: ['masquerade_mask', 'rain_boots', 'raincoat', 'tutu', 'winter_hat'],
      name: 'Elegant Masquerade Mask + Yellow Rain Boots + Yellow Raincoat + Ballet Tutu + Warm Winter Hat'
    }
  };
  
  // Get imported outfits
  const { data: outfits } = await supabase
    .from('outfits')
    .select('*')
    .eq('bunny_id', bunny.id)
    .neq('equipment_signature', null);
  
  for (const outfit of outfits) {
    const mapping = outfitMappings[outfit.equipment_signature];
    if (!mapping) {
      console.log(`⚠️ No mapping found for ${outfit.equipment_signature}`);
      continue;
    }
    
    console.log(`\n🔄 Fixing outfit: ${outfit.name}`);
    console.log(`   Equipment signature: ${outfit.equipment_signature}`);
    console.log(`   Items to add: ${mapping.items.join(', ')}`);
    
    // Delete existing outfit_items for this outfit
    await supabase
      .from('outfit_items')
      .delete()
      .eq('outfit_id', outfit.id);
    
    // Add correct items
    for (const itemId of mapping.items) {
      const item = itemMap[itemId];
      if (!item) {
        console.log(`   ❌ Item not found: ${itemId}`);
        continue;
      }
      
      const { error } = await supabase
        .from('outfit_items')
        .insert({
          outfit_id: outfit.id,
          item_id: itemId,
          slot: item.slot
        });
        
      if (error) {
        console.log(`   ❌ Failed to add ${item.name}: ${error.message}`);
      } else {
        console.log(`   ✅ Added ${item.name} (${item.slot})`);
      }
    }
    
    // Update outfit name if needed
    if (mapping.name) {
      await supabase
        .from('outfits')
        .update({ name: mapping.name })
        .eq('id', outfit.id);
      console.log(`   📝 Updated name to: ${mapping.name}`);
    }
  }
  
  console.log('\n🎉 Outfit items fixed! Final check...');
  
  // Final verification
  const { data: finalOutfits } = await supabase
    .from('outfits')
    .select(`
      *,
      outfit_items(
        item_id,
        slot,
        item:items(name)
      )
    `)
    .eq('bunny_id', bunny.id);
    
  finalOutfits.forEach(outfit => {
    console.log(`\n📦 ${outfit.name}:`);
    outfit.outfit_items.forEach(oi => {
      console.log(`   - ${oi.item.name} (${oi.slot})`);
    });
  });
}

fixOutfitItems().catch(console.error);
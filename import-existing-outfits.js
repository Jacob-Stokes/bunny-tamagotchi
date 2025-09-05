const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function importExistingOutfits() {
  console.log('🔍 Importing existing generated outfit images into database...\n');
  
  // Get current bunny
  const { data: bunny } = await supabase.from('bunnies').select('*').single();
  console.log('👤 Current bunny:', bunny.id);
  
  const generatedBunniesDir = 'public/generated-bunnies';
  
  if (!fs.existsSync(generatedBunniesDir)) {
    console.log('❌ No generated-bunnies directory found');
    return;
  }
  
  const outfitDirs = fs.readdirSync(generatedBunniesDir)
    .filter(dir => fs.statSync(path.join(generatedBunniesDir, dir)).isDirectory())
    .filter(dir => dir !== 'base-bunny-clean'); // We'll handle base bunny separately
  
  console.log(`\n📁 Found ${outfitDirs.length} outfit directories to import:`);
  outfitDirs.forEach(dir => console.log(`   - ${dir}`));
  
  // Helper function to get item IDs from item names
  const getItemIds = async (itemNames) => {
    if (!itemNames || itemNames.length === 0) return [];
    
    const { data: items } = await supabase
      .from('items')
      .select('id, name')
      .in('name', itemNames);
    
    // Map item names to item objects with proper format
    return itemNames.map(name => {
      const item = items.find(i => i.name.toLowerCase().replace(/\s+/g, '_') === name);
      return item ? {
        item_id: item.id,
        name: item.name,
        slot: getSlotFromItemName(item.name) // We'll need to determine this
      } : null;
    }).filter(Boolean);
  };
  
  // Helper to determine slot from item name (basic mapping)
  const getSlotFromItemName = (itemName) => {
    const name = itemName.toLowerCase();
    if (name.includes('hat') || name.includes('helmet')) return 'head';
    if (name.includes('mask') || name.includes('glasses')) return 'face';
    if (name.includes('shirt') || name.includes('jacket') || name.includes('coat')) return 'upper_body';
    if (name.includes('pants') || name.includes('skirt') || name.includes('tutu')) return 'lower_body';
    if (name.includes('boots') || name.includes('shoes') || name.includes('slippers')) return 'feet';
    return 'accessory'; // default
  };
  
  for (const outfitDir of outfitDirs) {
    try {
      console.log(`\n🔄 Processing: ${outfitDir}`);
      
      // Parse outfit directory name to get items
      // Format: bunny-base_item1,item2,item3
      const parts = outfitDir.split('_');
      const baseBunny = parts[0]; // 'bunny-base'
      const itemNames = parts.length > 1 ? parts[1].split(',') : [];
      
      console.log(`   Base bunny: ${baseBunny}`);
      console.log(`   Items: ${itemNames.join(', ') || 'none'}`);
      
      // Check if images exist
      const outfitPath = path.join(generatedBunniesDir, outfitDir);
      const normalImage = path.join(outfitPath, 'normal.png');
      const blinkImage = path.join(outfitPath, 'blink.png');
      const smileImage = path.join(outfitPath, 'smile.png');
      const waveImage = path.join(outfitPath, 'wave.png');
      
      if (!fs.existsSync(normalImage)) {
        console.log(`   ❌ Missing normal.png, skipping`);
        continue;
      }
      
      // Create outfit name
      const outfitName = itemNames.length > 0 
        ? itemNames.map(name => name.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')).join(' + ')
        : 'Base Bunny';
      
      // Get item data
      const equippedItems = await getItemIds(itemNames);
      console.log(`   📦 Found ${equippedItems.length} valid items`);
      
      // Check if outfit already exists
      const { data: existingOutfit } = await supabase
        .from('outfits')
        .select('id')
        .eq('name', outfitName)
        .eq('bunny_id', bunny.id)
        .single();
        
      if (existingOutfit) {
        console.log(`   ⚠️ Outfit "${outfitName}" already exists, skipping`);
        continue;
      }
      
      // Create outfit record
      const { data: outfit, error: outfitError } = await supabase
        .from('outfits')
        .insert({
          name: outfitName,
          bunny_id: bunny.id,
          user_id: bunny.user_id,
          base_bunny: 'bunny-base.png',
          scene: 'meadow',
          equipment_signature: outfitDir,
          image_urls: {
            normal: `/generated-bunnies/${outfitDir}/normal.png`,
            blink: fs.existsSync(blinkImage) ? `/generated-bunnies/${outfitDir}/blink.png` : null,
            smile: fs.existsSync(smileImage) ? `/generated-bunnies/${outfitDir}/smile.png` : null,
            wave: fs.existsSync(waveImage) ? `/generated-bunnies/${outfitDir}/wave.png` : null
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (outfitError) {
        console.log(`   ❌ Failed to create outfit: ${outfitError.message}`);
        continue;
      }
      
      console.log(`   ✅ Created outfit: ${outfit.id}`);
      
      // Create outfit_items records
      for (const item of equippedItems) {
        const { error: itemError } = await supabase
          .from('outfit_items')
          .insert({
            outfit_id: outfit.id,
            item_id: item.item_id,
            slot: item.slot
          });
          
        if (itemError) {
          console.log(`   ⚠️ Failed to add item ${item.name}: ${itemError.message}`);
        }
      }
      
      // Create bunny_outfits record (inactive by default)
      const { error: bunnyOutfitError } = await supabase
        .from('bunny_outfits')
        .insert({
          bunny_id: bunny.id,
          outfit_id: outfit.id,
          is_active: false
        });
        
      if (bunnyOutfitError) {
        console.log(`   ⚠️ Failed to link bunny to outfit: ${bunnyOutfitError.message}`);
      } else {
        console.log(`   ✅ Linked bunny to outfit`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${outfitDir}:`, error.message);
    }
  }
  
  console.log('\n🎉 Import complete! Checking final counts...');
  
  const { data: finalOutfits } = await supabase
    .from('outfits')
    .select('*')
    .eq('bunny_id', bunny.id);
    
  const { data: finalBunnyOutfits } = await supabase
    .from('bunny_outfits')
    .select('*')
    .eq('bunny_id', bunny.id);
    
  console.log(`📊 Final counts:`);
  console.log(`   Outfits: ${finalOutfits?.length || 0}`);
  console.log(`   Bunny-Outfit links: ${finalBunnyOutfits?.length || 0}`);
}

importExistingOutfits().catch(console.error);
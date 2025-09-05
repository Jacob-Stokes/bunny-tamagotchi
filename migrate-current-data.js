const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function migrateCurrentData() {
  console.log('🔄 Migrating current data to proper architecture...\n');
  
  // Get current bunny and equipment
  const { data: bunny } = await supabase
    .from('bunnies')
    .select('*')
    .single();
    
  if (!bunny) {
    console.log('❌ No bunny found');
    return;
  }
  
  console.log(`👤 Working with bunny: ${bunny.id}`);
  
  // Get current equipment  
  const { data: equipment } = await supabase
    .from('bunny_equipment')
    .select(`
      *,
      item:items(*)
    `)
    .eq('bunny_id', bunny.id);
    
  if (!equipment || equipment.length === 0) {
    console.log('❌ No equipment found');
    return;
  }
  
  console.log(`🎽 Found ${equipment.length} equipment items`);
  
  // Create an outfit from current equipment
  const outfitName = equipment.map(e => e.item?.name).join(' + ');
  console.log(`👗 Creating outfit: ${outfitName}`);
  
  // 1. Create outfit record
  const { data: outfit, error: outfitError } = await supabase
    .from('outfits')
    .insert({
      user_id: bunny.user_id,
      name: outfitName,
      equipment_signature: equipment.map(e => e.item_id).sort().join('|'),
      base_bunny: 'bunny-base.png',
      scene: 'meadow',
      image_urls: {
        normal: '/generated-outfits/current/normal.png',
        blink: '/generated-outfits/current/blink.png', 
        smile: '/generated-outfits/current/smile.png',
        wave: '/generated-outfits/current/wave.png'
      },
      equipped_items: equipment.map(e => ({
        item_id: e.item_id,
        name: e.item?.name,
        slot: e.slot,
        image_url: e.item?.image_url
      }))
    })
    .select()
    .single();
    
  if (outfitError) {
    console.error('❌ Failed to create outfit:', outfitError);
    return;
  }
  
  console.log(`✅ Created outfit: ${outfit.id}`);
  
  // 2. Create outfit_items records
  const outfitItems = equipment.map(e => ({
    outfit_id: outfit.id,
    item_id: e.item_id,
    slot: e.slot
  }));
  
  const { error: itemsError } = await supabase
    .from('outfit_items')
    .insert(outfitItems);
    
  if (itemsError) {
    console.error('❌ Failed to create outfit items:', itemsError);
    return;
  }
  
  console.log(`✅ Created ${outfitItems.length} outfit_items records`);
  
  // 3. Create bunny_outfits record (ownership)
  const { error: ownershipError } = await supabase
    .from('bunny_outfits')
    .insert({
      bunny_id: bunny.id,
      outfit_id: outfit.id,
      is_active: true // This is their current outfit
    });
    
  if (ownershipError) {
    console.error('❌ Failed to create bunny outfit ownership:', ownershipError);
    return;
  }
  
  console.log(`✅ Created bunny_outfits ownership record`);
  
  console.log('\n🎉 Migration completed!');
  console.log(`📊 Summary:`);
  console.log(`   - Created 1 outfit`);
  console.log(`   - Created ${outfitItems.length} outfit_items`);
  console.log(`   - Created 1 bunny_outfits ownership`);
  console.log(`   - Outfit is marked as active for bunny`);
}

migrateCurrentData().catch(console.error);
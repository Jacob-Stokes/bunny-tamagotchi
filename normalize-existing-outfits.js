const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function normalizeExistingOutfits() {
  console.log('🔧 Normalizing existing outfit naming...\n');
  
  try {
    // 1. Get all outfits
    const { data: outfits, error } = await supabase
      .from('outfits')
      .select(`
        *,
        outfit_items(
          item_id,
          slot,
          item:items(name)
        )
      `)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    console.log(`📊 Found ${outfits.length} outfits to normalize`);
    
    // 2. Assign folder numbers and display names
    for (let i = 0; i < outfits.length; i++) {
      const outfit = outfits[i];
      const folderNumber = i + 1; // Start from 1
      
      // Generate display name from items
      const itemNames = outfit.outfit_items?.map((oi) => oi.item?.name) || [];
      const displayName = itemNames.length > 0 ? itemNames.join(' + ') : 'Base Bunny';
      
      console.log(`${folderNumber.toString().padStart(2, '0')}. ${outfit.name} → Folder: ${String(folderNumber).padStart(8, '0')}, Display: "${displayName}"`);
      
      // Update the outfit
      const { error: updateError } = await supabase
        .from('outfits')
        .update({
          folder_number: folderNumber,
          display_name: displayName
        })
        .eq('id', outfit.id);
      
      if (updateError) {
        console.error(`❌ Error updating outfit ${outfit.id}:`, updateError);
      }
    }
    
    console.log('\n✅ All outfits normalized!');
    console.log('\n📁 New folder structure will be:');
    console.log('   /generated-bunnies/00000001/00000001-normal.png');
    console.log('   /generated-bunnies/00000001/00000001-blink.png');
    console.log('   /generated-bunnies/00000002/00000002-normal.png');
    console.log('   etc...');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Check if columns exist first
async function checkColumns() {
  try {
    const { error } = await supabase
      .from('outfits')
      .select('folder_number, display_name')
      .limit(1);
    
    if (error && error.code === '42703') {
      console.log('❌ Columns folder_number and display_name do not exist yet.');
      console.log('Please run this SQL in Supabase dashboard first:');
      console.log('');
      console.log('ALTER TABLE outfits ADD COLUMN folder_number INTEGER;');
      console.log('ALTER TABLE outfits ADD COLUMN display_name TEXT;');
      console.log('CREATE INDEX idx_outfits_folder_number ON outfits(folder_number);');
      console.log('');
      console.log('Then run this script again.');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking columns:', error);
    return false;
  }
}

async function main() {
  const columnsExist = await checkColumns();
  if (columnsExist) {
    await normalizeExistingOutfits();
  }
}

main();
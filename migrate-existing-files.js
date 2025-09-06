const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function migrateExistingFiles() {
  console.log('🔧 Migrating existing outfit files to normalized structure...\n');
  
  try {
    // Get all outfits with their old image URLs and new folder numbers
    const { data: outfits, error } = await supabase
      .from('outfits')
      .select('id, folder_number, display_name, image_urls')
      .order('folder_number', { ascending: true });
    
    if (error) throw error;
    
    console.log(`📊 Found ${outfits.length} outfits to migrate`);
    
    const publicDir = path.join(process.cwd(), 'public');
    
    for (const outfit of outfits) {
      if (!outfit.folder_number || !outfit.image_urls) {
        console.log(`⚠️ Skipping outfit ${outfit.id} - missing folder_number or image_urls`);
        continue;
      }
      
      const paddedFolderNumber = String(outfit.folder_number).padStart(8, '0');
      const newDir = path.join(publicDir, 'generated-bunnies', paddedFolderNumber);
      
      console.log(`\n📁 Processing outfit ${outfit.folder_number}: ${outfit.display_name || 'Unnamed'}`);
      
      // Create new directory
      try {
        await fs.mkdir(newDir, { recursive: true });
        console.log(`  ✅ Created directory: ${paddedFolderNumber}`);
      } catch (error) {
        if (error.code !== 'EEXIST') {
          console.error(`  ❌ Failed to create directory:`, error.message);
          continue;
        }
      }
      
      // Copy each image type
      const imageTypes = ['normal', 'blink', 'smile', 'wave'];
      let copiedFiles = 0;
      
      for (const imageType of imageTypes) {
        const oldUrl = outfit.image_urls[imageType];
        if (!oldUrl) continue;
        
        // Extract old file path from URL
        const oldFilePath = path.join(publicDir, oldUrl.replace(/^\//, ''));
        
        // Create new file path
        const newFileName = `${paddedFolderNumber}-${imageType}.png`;
        const newFilePath = path.join(newDir, newFileName);
        
        try {
          // Check if old file exists
          await fs.access(oldFilePath);
          
          // Copy to new location
          await fs.copyFile(oldFilePath, newFilePath);
          console.log(`  ✅ ${imageType}.png → ${newFileName}`);
          copiedFiles++;
          
        } catch (error) {
          if (error.code === 'ENOENT') {
            console.log(`  ⚠️ Source file not found: ${oldUrl}`);
          } else {
            console.error(`  ❌ Error copying ${imageType}:`, error.message);
          }
        }
      }
      
      console.log(`  📝 Result: ${copiedFiles}/${imageTypes.length} files copied`);
    }
    
    console.log('\n✅ File migration completed!');
    console.log('\n📁 New structure:');
    console.log('   /generated-bunnies/00000001/00000001-normal.png');
    console.log('   /generated-bunnies/00000001/00000001-blink.png');
    console.log('   /generated-bunnies/00000002/00000002-normal.png');
    console.log('   etc...');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateExistingFiles();
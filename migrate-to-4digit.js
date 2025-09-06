const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function migrateTo4Digit() {
  console.log('🔧 Migrating from 8-digit to 4-digit padding...\n');
  
  try {
    const publicDir = path.join(process.cwd(), 'public', 'generated-bunnies');
    
    // Step 1: Rename existing directories from 8-digit to 4-digit
    console.log('📁 Step 1: Renaming directories...');
    
    const existingDirs = ['00000001', '00000002', '00000003'];
    const newDirs = ['0001', '0002', '0003'];
    
    for (let i = 0; i < existingDirs.length; i++) {
      const oldDir = path.join(publicDir, existingDirs[i]);
      const newDir = path.join(publicDir, newDirs[i]);
      
      try {
        // Check if old directory exists
        await fs.access(oldDir);
        
        // Rename directory
        await fs.rename(oldDir, newDir);
        console.log(`  ✅ ${existingDirs[i]} → ${newDirs[i]}`);
        
        // Step 2: Rename files within the directory
        console.log(`  📄 Renaming files in ${newDirs[i]}...`);
        
        const files = await fs.readdir(newDir);
        for (const file of files) {
          if (file.startsWith(existingDirs[i])) {
            const oldFilePath = path.join(newDir, file);
            const newFileName = file.replace(existingDirs[i], newDirs[i]);
            const newFilePath = path.join(newDir, newFileName);
            
            await fs.rename(oldFilePath, newFilePath);
            console.log(`    ✅ ${file} → ${newFileName}`);
          }
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log(`  ⚠️ Directory ${existingDirs[i]} does not exist, skipping`);
        } else {
          console.error(`  ❌ Error processing ${existingDirs[i]}:`, error.message);
        }
      }
    }
    
    // Step 3: Update database URLs
    console.log('\n📊 Step 3: Updating database URLs...');
    
    const { data: outfits, error } = await supabase
      .from('outfits')
      .select('id, folder_number, image_urls')
      .not('folder_number', 'is', null);
    
    if (error) throw error;
    
    for (const outfit of outfits) {
      const old8Digit = String(outfit.folder_number).padStart(8, '0');
      const new4Digit = String(outfit.folder_number).padStart(4, '0');
      
      // Update image URLs
      const updatedImageUrls = {};
      for (const [type, url] of Object.entries(outfit.image_urls || {})) {
        if (url) {
          updatedImageUrls[type] = url
            .replace(`/generated-bunnies/${old8Digit}/`, `/generated-bunnies/${new4Digit}/`)
            .replace(`${old8Digit}-`, `${new4Digit}-`);
        }
      }
      
      // Update in database
      const { error: updateError } = await supabase
        .from('outfits')
        .update({ image_urls: updatedImageUrls })
        .eq('id', outfit.id);
      
      if (updateError) {
        console.error(`  ❌ Error updating outfit ${outfit.id}:`, updateError.message);
      } else {
        console.log(`  ✅ Updated outfit ${outfit.folder_number} URLs: ${old8Digit} → ${new4Digit}`);
      }
    }
    
    console.log('\n✅ Migration to 4-digit format completed!');
    console.log('\n📁 New structure:');
    console.log('   /generated-bunnies/0001/0001-normal.png');
    console.log('   /generated-bunnies/0002/0002-normal.png');
    console.log('   /generated-bunnies/0003/0003-normal.png');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateTo4Digit();
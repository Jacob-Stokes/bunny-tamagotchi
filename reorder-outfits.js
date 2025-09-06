const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function reorderOutfits() {
  console.log('🔧 Reordering outfits: Base Bunny should be 0001...\n');
  
  try {
    const publicDir = path.join(process.cwd(), 'public', 'generated-bunnies');
    
    // Step 1: Get current outfits from database to understand the mapping
    const { data: outfits, error } = await supabase
      .from('outfits')
      .select('id, folder_number, display_name')
      .order('folder_number', { ascending: true });
    
    if (error) throw error;
    
    console.log('📊 Current outfits:');
    outfits.forEach(outfit => {
      console.log(`  ${outfit.folder_number}: ${outfit.display_name}`);
    });
    
    // Step 2: Identify which outfit is the base bunny (should have "Base Bunny" in display_name)
    const baseBunnyOutfit = outfits.find(o => o.display_name === 'Base Bunny');
    const complexOutfit = outfits.find(o => o.display_name?.includes('Elegant Masquerade Mask + Yellow Rain Boots'));
    const otherOutfit = outfits.find(o => o.display_name?.includes('Pink Ballet Slippers'));
    
    if (!baseBunnyOutfit || !complexOutfit || !otherOutfit) {
      throw new Error('Could not identify all three outfits properly');
    }
    
    console.log(`\n🎯 Reordering plan:`);
    console.log(`  Base Bunny (currently ${baseBunnyOutfit.folder_number}) → 0001`);
    console.log(`  Other outfit (currently ${otherOutfit.folder_number}) → 0002`);
    console.log(`  Complex outfit (currently ${complexOutfit.folder_number}) → 0003`);
    
    // Step 3: Create temporary directory names to avoid conflicts
    const tempSuffix = '-temp-' + Date.now();
    
    // Move directories to temporary names first
    console.log(`\n📁 Step 1: Moving to temporary names...`);
    const moves = [
      { from: '0001', to: `0001${tempSuffix}`, outfit: complexOutfit },
      { from: '0002', to: `0002${tempSuffix}`, outfit: otherOutfit },  
      { from: '0003', to: `0003${tempSuffix}`, outfit: baseBunnyOutfit }
    ];
    
    for (const move of moves) {
      const oldDir = path.join(publicDir, move.from);
      const tempDir = path.join(publicDir, move.to);
      
      try {
        await fs.access(oldDir);
        await fs.rename(oldDir, tempDir);
        console.log(`  ✅ ${move.from} → ${move.to}`);
      } catch (error) {
        console.error(`  ❌ Failed to move ${move.from}:`, error.message);
      }
    }
    
    // Step 4: Move to final positions
    console.log(`\n📁 Step 2: Moving to final positions...`);
    const finalMoves = [
      { from: `0003${tempSuffix}`, to: '0001', outfit: baseBunnyOutfit, newNum: 1 },     // Base Bunny → 0001
      { from: `0002${tempSuffix}`, to: '0002', outfit: otherOutfit, newNum: 2 },       // Keep other outfit at 0002
      { from: `0001${tempSuffix}`, to: '0003', outfit: complexOutfit, newNum: 3 }      // Complex outfit → 0003
    ];
    
    for (const move of finalMoves) {
      const tempDir = path.join(publicDir, move.from);
      const finalDir = path.join(publicDir, move.to);
      
      try {
        await fs.rename(tempDir, finalDir);
        console.log(`  ✅ ${move.from} → ${move.to}`);
        
        // Rename files within the directory
        console.log(`    📄 Renaming files in ${move.to}...`);
        const files = await fs.readdir(finalDir);
        for (const file of files) {
          // Extract old number from temp suffix
          const oldNum = move.from.replace(tempSuffix, '');
          if (file.startsWith(oldNum)) {
            const oldFilePath = path.join(finalDir, file);
            const newFileName = file.replace(oldNum, move.to);
            const newFilePath = path.join(finalDir, newFileName);
            
            await fs.rename(oldFilePath, newFilePath);
            console.log(`      ✅ ${file} → ${newFileName}`);
          }
        }
      } catch (error) {
        console.error(`  ❌ Failed final move ${move.from} → ${move.to}:`, error.message);
      }
    }
    
    // Step 5: Update database
    console.log(`\n📊 Step 3: Updating database...`);
    
    const dbUpdates = [
      { outfit: baseBunnyOutfit, newFolderNumber: 1, newPadded: '0001' },
      { outfit: otherOutfit, newFolderNumber: 2, newPadded: '0002' },
      { outfit: complexOutfit, newFolderNumber: 3, newPadded: '0003' }
    ];
    
    for (const update of dbUpdates) {
      // Update image URLs
      const updatedImageUrls = {};
      for (const [type, url] of Object.entries(update.outfit.image_urls || {})) {
        if (url) {
          updatedImageUrls[type] = `/generated-bunnies/${update.newPadded}/${update.newPadded}-${type}.png`;
        }
      }
      
      // Update in database
      const { error: updateError } = await supabase
        .from('outfits')
        .update({ 
          folder_number: update.newFolderNumber,
          image_urls: updatedImageUrls 
        })
        .eq('id', update.outfit.id);
      
      if (updateError) {
        console.error(`  ❌ Error updating outfit ${update.outfit.id}:`, updateError.message);
      } else {
        console.log(`  ✅ Updated ${update.outfit.display_name}: folder_number=${update.newFolderNumber}`);
      }
    }
    
    console.log('\n✅ Reordering completed!');
    console.log('\n📁 Final structure:');
    console.log('   0001: Base Bunny');
    console.log('   0002: Pink Ballet Slippers + ...');
    console.log('   0003: Elegant Masquerade Mask + Yellow Rain Boots + ...');
    
  } catch (error) {
    console.error('❌ Reordering failed:', error);
    process.exit(1);
  }
}

reorderOutfits();
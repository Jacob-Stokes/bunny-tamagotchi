#!/usr/bin/env tsx

/**
 * One-time import script to populate database with existing filesystem outfits
 * 
 * This script:
 * 1. Scans public/generated-bunnies/ for existing outfit folders
 * 2. Reads metadata.json from each folder
 * 3. Creates database entries in the outfits table
 * 4. Handles errors gracefully and provides detailed logging
 */

import { readdir, stat, readFile } from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are set');
  process.exit(1);
}

console.log('🔑 Using service key to bypass RLS policies...');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface OutfitMetadata {
  baseBunny: string;
  scene: string;
  equippedItems: Array<{
    item_id: string;
    slot: string;
    image_url: string;
    name: string;
  }> | string[]; // Handle both formats
  generatedAt: string;
  description?: string;
  isBase?: boolean;
}

function createEquipmentSignature(
  equippedItems: Array<{ item_id?: string; name?: string }>,
  baseBunny: string,
  scene: string
): string {
  // Sort by item_id if available, otherwise by name
  const sortedItems = equippedItems
    .map(item => item.item_id || item.name || 'unknown')
    .sort()
    .join(',');
  
  return `${baseBunny}|${scene}|${sortedItems}`;
}

function normalizeEquippedItems(items: any[]): Array<{
  item_id: string;
  slot: string;
  image_url: string;
  name: string;
}> {
  if (!Array.isArray(items)) return [];
  
  return items.map((item, index) => {
    if (typeof item === 'string') {
      // If it's just a string (item name), create a minimal object
      return {
        item_id: `imported_${Date.now()}_${index}`,
        slot: 'unknown',
        image_url: '',
        name: item
      };
    } else if (typeof item === 'object') {
      // If it's an object, use its properties
      return {
        item_id: item.item_id || `imported_${Date.now()}_${index}`,
        slot: item.slot || 'unknown',
        image_url: item.image_url || '',
        name: item.name || 'Unknown Item'
      };
    }
    return {
      item_id: `imported_${Date.now()}_${index}`,
      slot: 'unknown',
      image_url: '',
      name: 'Unknown Item'
    };
  });
}

async function importOutfitFolder(folderName: string, folderPath: string): Promise<boolean> {
  try {
    console.log(`📁 Processing folder: ${folderName}`);

    // Check required files exist
    const requiredFiles = ['normal.png', 'blink.png', 'smile.png', 'wave.png', 'metadata.json'];
    const missingFiles: string[] = [];

    for (const file of requiredFiles) {
      const filePath = path.join(folderPath, file);
      try {
        await stat(filePath);
      } catch {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      console.log(`⚠️  Skipping ${folderName} - missing files: ${missingFiles.join(', ')}`);
      return false;
    }

    // Read and parse metadata
    const metadataPath = path.join(folderPath, 'metadata.json');
    const metadataContent = await readFile(metadataPath, 'utf-8');
    const metadata: OutfitMetadata = JSON.parse(metadataContent);

    // Normalize equipped items
    const normalizedItems = normalizeEquippedItems(metadata.equippedItems || []);

    // Create image URLs
    const imageUrls = {
      normal: `/generated-bunnies/${folderName}/normal.png`,
      blink: `/generated-bunnies/${folderName}/blink.png`,
      smile: `/generated-bunnies/${folderName}/smile.png`,
      wave: `/generated-bunnies/${folderName}/wave.png`
    };

    // Check for scene images
    try {
      await stat(path.join(folderPath, 'scene_normal.png'));
      imageUrls.scene_normal = `/generated-bunnies/${folderName}/scene_normal.png`;
    } catch {}

    try {
      await stat(path.join(folderPath, 'scene_blink.png'));
      imageUrls.scene_blink = `/generated-bunnies/${folderName}/scene_blink.png`;
    } catch {}

    // Generate equipment signature
    const equipmentSignature = createEquipmentSignature(
      normalizedItems,
      metadata.baseBunny || 'bunny-base',
      metadata.scene || 'meadow'
    );

    // Create a meaningful name
    const outfitName = normalizedItems.length > 0
      ? normalizedItems.map(item => item.name).join(' + ')
      : metadata.isBase 
        ? 'Base Bunny'
        : 'Custom Look';

    console.log(`📝 Creating database entry: "${outfitName}"`);

    // Query for existing bunnies
    const { data: bunnies } = await supabase.from('bunnies').select('id, user_id').limit(1);

    let userId: string;
    let bunnyId: string;

    // Create dummy bunny if none exists - we'll use a dummy user_id
    if (!bunnies || bunnies.length === 0) {
      // Use a fake UUID for user_id since we don't have auth users
      userId = '00000000-0000-0000-0000-000000000001';
      
      console.log(`🐰 Creating dummy bunny for import...`);
      const { data: newBunny, error: bunnyError } = await supabase
        .from('bunnies')
        .insert({
          user_id: userId,
          name: 'Import Bunny'
        })
        .select()
        .single();

      if (bunnyError) {
        console.error(`❌ Failed to create bunny:`, bunnyError);
        return false;
      }
      bunnyId = newBunny.id;
    } else {
      bunnyId = bunnies[0].id;
      userId = bunnies[0].user_id;
    }

    console.log(`👤 Using user ID: ${userId}`);
    console.log(`🐰 Using bunny ID: ${bunnyId}`);

    // Insert into database
    const { data: outfit, error } = await supabase
      .from('outfits')
      .insert({
        bunny_id: bunnyId,
        user_id: userId,
        name: outfitName,
        equipped_items: normalizedItems,
        equipment_signature: equipmentSignature,
        base_bunny: metadata.baseBunny || 'bunny-base',
        scene: metadata.scene || 'meadow',
        image_urls: imageUrls,
        is_active: false
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Duplicate key error - outfit already exists
        console.log(`⏭️  Skipping ${folderName} - already exists in database`);
        return true;
      }
      throw error;
    }

    console.log(`✅ Successfully imported: ${folderName} (ID: ${outfit.id})`);
    return true;

  } catch (error) {
    console.error(`❌ Error processing ${folderName}:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting outfit import process...\n');

  const baseDir = path.join(process.cwd(), 'public', 'generated-bunnies');
  
  try {
    const folders = await readdir(baseDir);
    console.log(`📂 Found ${folders.length} folders to process\n`);

    let successful = 0;
    let skipped = 0;
    let failed = 0;

    for (const folder of folders) {
      // Skip system files
      if (folder.startsWith('.')) {
        continue;
      }

      const folderPath = path.join(baseDir, folder);
      const folderStat = await stat(folderPath);

      if (folderStat.isDirectory()) {
        const result = await importOutfitFolder(folder, folderPath);
        if (result) {
          successful++;
        } else {
          failed++;
        }
      } else {
        skipped++;
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`✅ Successful imports: ${successful}`);
    console.log(`❌ Failed imports: ${failed}`);
    console.log(`⏭️  Skipped items: ${skipped}`);
    console.log(`📁 Total folders processed: ${successful + failed}`);

    if (successful > 0) {
      console.log('\n🎉 Import completed successfully!');
      console.log('You can now view your outfits in the app.');
    } else {
      console.log('\n⚠️  No outfits were imported. Please check the logs above.');
    }

  } catch (error) {
    console.error('💥 Import process failed:', error);
    process.exit(1);
  }
}

// Run the import
main().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import GeminiImageService from '../../lib/geminiImageService';
import { GeminiImageService as GeminiImageServiceClass } from '../../lib/geminiImageService';
import { InventoryService } from '../../lib/inventoryService';
import { supabase } from '../../lib/supabase';

interface EquippedItem {
  item_id: string;
  slot: string;
  image_url: string;
  name: string;
}

export async function POST(request: NextRequest) {
  try {
    let bunnyId, equippedItems;
    
    try {
      const body = await request.json();
      bunnyId = body.bunnyId;
      equippedItems = body.equippedItems || [];
    } catch (jsonError) {
      console.error('JSON parse error:', jsonError);
      return NextResponse.json({ error: 'Invalid JSON in request' }, { status: 400 });
    }

    console.log('Generate bunny image request for bunnyId:', bunnyId);
    console.log('Equipped items received:', equippedItems);

    if (!bunnyId) {
      console.log('No bunnyId provided');
      return NextResponse.json({ error: 'Missing bunnyId' }, { status: 400 });
    }

    // Get selected base bunny from request or use default
    const selectedBaseBunny = request.headers.get('x-base-bunny') || 'base-bunny-transparent.png';

    // If no items equipped, return base bunny
    if (equippedItems.length === 0) {
      console.log('No equipped items found, returning base bunny');
      return NextResponse.json({ 
        success: true, 
        imageUrl: `/base-bunnies/${selectedBaseBunny}`,
        cached: true,
        equippedItems: 0,
        method: 'base'
      });
    }

    // Get selected scene
    const selectedScene = request.headers.get('x-scene') || 'meadow';
    console.log('🔥 Using base bunny:', selectedBaseBunny);
    console.log('🔥 Using scene:', selectedScene);

    // Use different paths for development vs production
    const isProduction = process.env.NODE_ENV === 'production';
    const baseDir = isProduction 
      ? '/var/www/bunny-static/generated-bunnies'
      : path.join(process.cwd(), 'public', 'generated-bunnies');

    // Generate bunny folder name and file paths
    const bunnyFolderKey = GeminiImageServiceClass.getBunnyItemsCacheKey(equippedItems, selectedBaseBunny);
    const bunnyFolderName = bunnyFolderKey;
    const bunnyFolderPath = path.join(baseDir, bunnyFolderName);
    const bunnyImagePath = path.join(bunnyFolderPath, 'normal.png');
    const bunnyMetadataPath = path.join(bunnyFolderPath, 'metadata.json');

    // Check if bunny already exists
    try {
      await require('fs/promises').access(bunnyImagePath);
      console.log('🎯 Bunny cache hit:', `${bunnyFolderName}/normal.png`);
      return NextResponse.json({ 
        success: true, 
        imageUrl: `/generated-bunnies/${bunnyFolderName}/normal.png`,
        cached: true,
        method: 'bunny_cache_hit'
      });
    } catch {
      // Need to generate bunny
    }

    // Create directory if it doesn't exist
    await require('fs/promises').mkdir(baseDir, { recursive: true });

    try {
      // Create bunny folder
      await require('fs/promises').mkdir(bunnyFolderPath, { recursive: true });

      // Generate bunny with items (transparent background only)
      console.log('🔥 Generating clean bunny with items:', equippedItems.map((item: EquippedItem) => item.name));
      const bunnyResult = await GeminiImageService.generateBunnyWithItems(equippedItems, selectedBaseBunny);
      
      if (!bunnyResult) {
        throw new Error('Failed to generate bunny with items');
      }
      
      // Save bunny image
      await writeFile(bunnyImagePath, bunnyResult.imageData);
      console.log('💾 Saved bunny image:', `${bunnyFolderName}/normal.png`);

      // Save metadata
      const metadata = {
        generatedAt: new Date().toISOString(),
        baseBunny: selectedBaseBunny,
        equippedItems: equippedItems.map(item => ({
          item_id: item.item_id,
          slot: item.slot,
          name: item.name
        })),
        version: '1.0'
      };
      await writeFile(bunnyMetadataPath, JSON.stringify(metadata, null, 2));
      console.log('💾 Saved metadata:', `${bunnyFolderName}/metadata.json`);

      return NextResponse.json({ 
        success: true, 
        imageUrl: `/generated-bunnies/${bunnyFolderName}/normal.png`,
        cached: false,
        equippedItems: equippedItems.length,
        method: 'clean_bunny_generation',
        folderName: bunnyFolderName
      });

    } catch (geminiError) {
      console.error('🔥 Gemini image generation failed:', geminiError);
      
      // Fallback to base bunny
      return NextResponse.json({ 
        success: true, 
        imageUrl: `/base-bunnies/${selectedBaseBunny}`,
        cached: false,
        error: 'Generation failed, using base bunny'
      });
    }

  } catch (error) {
    console.error('Bunny generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate bunny image' },
      { status: 500 }
    );
  }
}
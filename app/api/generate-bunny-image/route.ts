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

    // Step 1: Generate or get cached bunny with items (transparent background)
    const bunnyItemsKey = GeminiImageServiceClass.getBunnyItemsCacheKey(equippedItems, selectedBaseBunny);
    const bunnyItemsFileName = `bunny_with_items_${bunnyItemsKey}.png`;
    const bunnyItemsPath = path.join(baseDir, bunnyItemsFileName);

    // Step 2: Generate final composite cache key
    const finalCacheKey = GeminiImageServiceClass.getFinalCacheKey(equippedItems, selectedBaseBunny, selectedScene);
    const finalCacheFileName = `bunny_in_scene_${selectedScene}_${finalCacheKey}.png`;
    const finalCachePath = path.join(baseDir, finalCacheFileName);

    // Check if final composite exists
    try {
      await require('fs/promises').access(finalCachePath);
      console.log('🎯 Final composite cache hit:', finalCacheFileName);
      return NextResponse.json({ 
        success: true, 
        imageUrl: `/generated-bunnies/${finalCacheFileName}`,
        cached: true,
        method: 'final_cache_hit'
      });
    } catch {
      // Need to generate final composite
    }

    // Create directory if it doesn't exist
    await require('fs/promises').mkdir(baseDir, { recursive: true });

    // Step 1: Check if bunny with items exists, if not generate it
    let bunnyWithItemsBuffer: Buffer;
    try {
      await require('fs/promises').access(bunnyItemsPath);
      console.log('🎯 Bunny+items cache hit:', bunnyItemsFileName);
      bunnyWithItemsBuffer = await require('fs/promises').readFile(bunnyItemsPath);
    } catch {
      // Generate bunny with items (transparent background)
      console.log('🔥 Generating bunny with items:', equippedItems.map((item: EquippedItem) => item.name));
      const bunnyResult = await GeminiImageService.generateBunnyWithItems(equippedItems, selectedBaseBunny);
      
      if (!bunnyResult) {
        throw new Error('Failed to generate bunny with items');
      }
      
      // Save bunny with items
      await writeFile(bunnyItemsPath, bunnyResult.imageData);
      console.log('💾 Saved bunny+items:', bunnyItemsFileName);
      bunnyWithItemsBuffer = bunnyResult.imageData;
    }

    // Step 2: Composite bunny onto scene
    console.log('🎨 Compositing bunny onto scene:', selectedScene);
    const compositeResult = await GeminiImageService.compositeBunnyOntoScene(bunnyWithItemsBuffer, selectedScene);
    
    if (!compositeResult) {
      throw new Error('Failed to composite bunny onto scene');
    }
    
    // Save final composite
    await writeFile(finalCachePath, compositeResult.imageData);
    console.log('💾 Saved final composite:', finalCacheFileName);

    return NextResponse.json({ 
      success: true, 
      imageUrl: `/generated-bunnies/${finalCacheFileName}`,
      cached: false,
      equippedItems: equippedItems.length,
      method: 'two_step_generation'
    });

    } catch (geminiError) {
      console.error('🔥 Gemini image generation failed:', geminiError);
      
      // Fallback to base bunny
      const selectedBaseBunny = request.headers.get('x-base-bunny') || 'base-bunny-transparent.png';
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
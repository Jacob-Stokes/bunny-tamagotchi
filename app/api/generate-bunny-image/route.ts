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

    // Generate cache key including base bunny name and scene
    const cacheKey = GeminiImageServiceClass.getCacheKey(equippedItems, selectedBaseBunny, selectedScene);
    const cacheFileName = `${cacheKey}.png`;
    const cachePath = path.join(process.cwd(), 'public', 'generated-bunnies', cacheFileName);

    // Check if cached version exists
    try {
      await require('fs/promises').access(cachePath);
      // Cache hit - return cached image
      return NextResponse.json({ 
        success: true, 
        imageUrl: `/generated-bunnies/${cacheFileName}`,
        cached: true 
      });
    } catch {
      // Cache miss - need to generate
    }

    // Create directory if it doesn't exist
    const cacheDir = path.dirname(cachePath);
    await require('fs/promises').mkdir(cacheDir, { recursive: true });

    // Generate new bunny image with Gemini
    try {
      console.log('🔥 Generating bunny image with Gemini:', equippedItems.map((item: EquippedItem) => item.name));
      
      // Use two-step generation with explicit scene placement
      const geminiResult = await GeminiImageService.generateBunnyWithItemsTwoStep(equippedItems, selectedBaseBunny, selectedScene);
      
      if (!geminiResult) {
        throw new Error('Gemini did not return image data');
      }
      
      // Save the generated image to cache
      await writeFile(cachePath, geminiResult.imageData);
      
      console.log(`🔥 Generated and cached bunny image with Gemini: ${cacheFileName}`);

      return NextResponse.json({ 
        success: true, 
        imageUrl: `/generated-bunnies/${cacheFileName}`,
        cached: false,
        equippedItems: equippedItems.length,
        method: 'gemini'
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
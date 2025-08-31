import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import GeminiImageService from '../../lib/geminiImageService';
import { InventoryService } from '../../lib/inventoryService';
import { supabase } from '../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    let bunnyId;
    
    try {
      const body = await request.json();
      bunnyId = body.bunnyId;
    } catch (jsonError) {
      console.error('JSON parse error:', jsonError);
      return NextResponse.json({ error: 'Invalid JSON in request' }, { status: 400 });
    }

    console.log('Generate bunny image request for bunnyId:', bunnyId);

    if (!bunnyId) {
      console.log('No bunnyId provided');
      return NextResponse.json({ error: 'Missing bunnyId' }, { status: 400 });
    }

    // BYPASS INVENTORY SERVICE - Direct database query
    console.log('🚀 Using DIRECT database query to find equipment...');
    console.log('🚀 Supabase instance available:', !!supabase);
    
    // Check if we have authentication context
    let user = null;
    let authError = null;
    
    if (supabase) {
      const authResult = await supabase.auth.getUser();
      user = authResult.data.user;
      authError = authResult.error;
    }
    
    console.log('🚀 Current auth user:', user?.email || 'NONE', 'error:', authError?.message || 'none');
    
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { data: equipmentData, error: equipError } = await supabase
      .from('bunny_equipment')
      .select(`
        *,
        item:items(*)
      `)
      .eq('bunny_id', bunnyId);

    if (equipError) {
      console.error('🚀 Equipment query error:', equipError);
      throw equipError;
    }

    console.log('🚀 Direct equipment query found:', equipmentData?.length || 0, 'items');

    // Extract equipped items with image URLs
    const allEquipped = (equipmentData || [])
      .filter(equipment => equipment && equipment.item)
      .map(equipment => ({
        item_id: equipment.item_id,
        slot: equipment.item!.slot,
        image_url: equipment.item!.image_url || '',
        name: equipment.item!.name
      }));
    
    const equippedItems = allEquipped.filter(item => item.image_url);
    
    console.log('🚀 All equipped items:', allEquipped);
    console.log('🚀 Items with images:', equippedItems);

    // TEMPORARY TEST: Force Gemini generation even with no items
    if (equippedItems.length === 0) {
      console.log('🔥 TESTING GEMINI: No equipped items found, but testing Gemini anyway...');
      
      // Create fake red beanie item for testing
      const testItems = [{
        item_id: 'red_beanie',
        slot: 'head',
        image_url: '/items/red_beanie.png',
        name: 'Cozy Red Beanie'
      }];
      
      try {
        console.log('🔥 Calling Gemini to generate test bunny...');
        const geminiResult = await GeminiImageService.generateBunnyWithItems(testItems);
        
        if (!geminiResult) {
          console.log('🔥 Gemini returned no data');
          return NextResponse.json({ 
            success: true, 
            imageUrl: '/base-bunny-transparent.png',
            cached: false,
            error: 'Gemini returned no data'
          });
        }
        
        // Save the generated image
        const testCachePath = path.join(process.cwd(), 'public', 'generated-bunnies', 'test-gemini-bunny.png');
        await require('fs/promises').mkdir(path.dirname(testCachePath), { recursive: true });
        await writeFile(testCachePath, geminiResult.imageData);
        
        console.log('🔥 SUCCESS: Gemini generated test image!');
        
        return NextResponse.json({ 
          success: true, 
          imageUrl: '/generated-bunnies/test-gemini-bunny.png',
          cached: false,
          method: 'gemini-test'
        });
        
      } catch (testError) {
        console.error('🔥 GEMINI TEST FAILED:', testError);
        return NextResponse.json({ 
          success: true, 
          imageUrl: '/base-bunny-transparent.png',
          cached: false,
          error: `Gemini test failed: ${testError.message}`
        });
      }
    }

    // Generate cache key
    const cacheKey = GeminiImageService.getCacheKey(equippedItems);
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
      console.log('🔥 Generating bunny image with Gemini:', equippedItems.map(i => i.name));
      
      // Use Gemini to generate bunny with equipped items
      const geminiResult = await GeminiImageService.generateBunnyWithItems(equippedItems);
      
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
      return NextResponse.json({ 
        success: true, 
        imageUrl: '/base-bunny-transparent.png',
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
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
    let bunnyId, equippedItems, generateAnimation, forceRegenerate;
    
    try {
      const body = await request.json();
      bunnyId = body.bunnyId;
      equippedItems = body.equippedItems || [];
      generateAnimation = body.generateAnimation || false;
      forceRegenerate = body.forceRegenerate || false;
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

    // Check if bunny already exists (skip if force regenerating)
    let bunnyExists = false;
    if (!forceRegenerate) {
      try {
        await require('fs/promises').access(bunnyImagePath);
        bunnyExists = true;
        console.log('🎯 Bunny cache hit:', `${bunnyFolderName}/normal.png`);
      } catch {
        // Need to generate bunny
      }
    } else {
      console.log('🔥 Force regenerate requested, bypassing cache');
    }

    // Handle blink frame for cached bunnies
    if (bunnyExists && generateAnimation) {
      console.log('🎬 Checking blink frame for cached bunny...');
      
      const blinkFramePath = path.join(bunnyFolderPath, 'blink.png');
      let animationFrames = {};
      let needsAnimationGeneration = false;
      
      try {
        await require('fs/promises').access(blinkFramePath);
        console.log('🎯 Blink frame already exists');
        animationFrames = { cached: true };
      } catch {
        needsAnimationGeneration = true;
      }

      if (needsAnimationGeneration) {
        try {
          // Load existing bunny for animation generation
          const existingBunnyData = await require('fs/promises').readFile(bunnyImagePath);
          
          const geminiService = new GeminiImageServiceClass();
          const frames = await geminiService.generateAnimationFrames(existingBunnyData, ['blink']);
          
          if (frames && frames.blink) {
            // Save the blink frame
            await writeFile(blinkFramePath, frames.blink.imageData);
            console.log('💾 Saved blink frame for cached bunny:', `${bunnyFolderName}/blink.png`);
            
            // Apply white background removal to blink frame
            try {
              console.log('🎭 Applying white background removal to cached blink frame...');
              const { SceneCompositor } = await import('../../lib/sceneCompositor');
              const transparentBlinkBuffer = await SceneCompositor.removeWhiteBackground(blinkFramePath);
              await writeFile(blinkFramePath, transparentBlinkBuffer);
              console.log('✅ Cached blink frame background removed');
            } catch (blinkTransparentError) {
              console.error('🔥 Cached blink frame background removal failed:', blinkTransparentError);
            }
            
            animationFrames = { generated: ['blink'] };
          } else {
            console.log('⚠️ Failed to generate blink frame for cached bunny');
            animationFrames = { error: 'Failed to generate blink frame' };
          }
        } catch (animationError) {
          console.error('🔥 Blink frame generation failed for cached bunny:', animationError);
          animationFrames = { error: 'Blink frame generation failed' };
        }
      }

      // Apply white background removal to cached bunny for transparency
      let transparentCachedResult = {};
      try {
        console.log('🎭 Checking if cached bunny needs background removal...');
        
        // Always apply background removal to ensure transparency
        const { SceneCompositor } = await import('../../lib/sceneCompositor');
        
        // Apply to normal frame
        const transparentNormalBuffer = await SceneCompositor.removeWhiteBackground(bunnyImagePath);
        await require('fs/promises').writeFile(bunnyImagePath, transparentNormalBuffer);
        console.log('✅ Cached bunny normal frame made transparent');
        
        // Apply to blink frame if it exists
        try {
          await require('fs/promises').access(blinkFramePath);
          const transparentBlinkBuffer = await SceneCompositor.removeWhiteBackground(blinkFramePath);
          await require('fs/promises').writeFile(blinkFramePath, transparentBlinkBuffer);
          console.log('✅ Cached bunny blink frame made transparent');
        } catch {
          // Blink frame doesn't exist, that's fine
        }
        
        transparentCachedResult = { applied: true };
      } catch (transparentError) {
        console.error('🔥 Cached bunny background removal failed:', transparentError);
        transparentCachedResult = { error: 'Background removal failed' };
      }

      return NextResponse.json({ 
        success: true, 
        imageUrl: `/generated-bunnies/${bunnyFolderName}/normal.png`,
        cached: true,
        method: 'bunny_cache_hit',
        animation: animationFrames,
        transparent: transparentCachedResult
      });
    } else if (bunnyExists) {
      return NextResponse.json({ 
        success: true, 
        imageUrl: `/generated-bunnies/${bunnyFolderName}/normal.png`,
        cached: true,
        method: 'bunny_cache_hit'
      });
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

      // Generate blink frame if requested
      let animationFrames = {};
      if (generateAnimation) {
        console.log('🎬 Generating blink frame...');
        
        // Check if blink frame already exists
        const blinkFramePath = path.join(bunnyFolderPath, 'blink.png');
        
        let needsGeneration = false;
        try {
          await require('fs/promises').access(blinkFramePath);
          console.log('🎯 Blink frame already exists');
          animationFrames = { cached: true };
        } catch {
          needsGeneration = true;
        }

        if (needsGeneration) {
          try {
            const geminiService = new GeminiImageServiceClass();
            const frames = await geminiService.generateAnimationFrames(bunnyResult.imageData, ['blink']);
            
            if (frames && frames.blink) {
              // Save the blink frame
              await writeFile(blinkFramePath, frames.blink.imageData);
              console.log('💾 Saved blink frame:', `${bunnyFolderName}/blink.png`);
              
              // Apply white background removal to blink frame
              try {
                console.log('🎭 Applying white background removal to blink frame...');
                const { SceneCompositor } = await import('../../lib/sceneCompositor');
                const transparentBlinkBuffer = await SceneCompositor.removeWhiteBackground(blinkFramePath);
                await writeFile(blinkFramePath, transparentBlinkBuffer);
                console.log('✅ Blink frame background removed');
              } catch (blinkTransparentError) {
                console.error('🔥 Blink frame background removal failed:', blinkTransparentError);
              }
              
              animationFrames = { generated: ['blink'] };
            } else {
              console.log('⚠️ Failed to generate blink frame');
              animationFrames = { error: 'Failed to generate blink frame' };
            }
          } catch (error) {
            console.error('🔥 Blink frame generation failed:', error);
            animationFrames = { error: 'Blink frame generation failed' };
          }
        }
      }

      // Apply white background removal to make bunny transparent
      let transparentBunnyResult = {};
      try {
        console.log('🎭 Applying white background removal...');
        const { SceneCompositor } = await import('../../lib/sceneCompositor');
        
        // Remove white background to make bunny transparent
        const transparentBunnyBuffer = await SceneCompositor.removeWhiteBackground(bunnyImagePath);
        
        // Save the transparent version over the original
        await writeFile(bunnyImagePath, transparentBunnyBuffer);
        console.log('✅ White background removed, bunny now transparent');
        
        transparentBunnyResult = { applied: true };
      } catch (transparentError) {
        console.error('🔥 White background removal failed:', transparentError);
        transparentBunnyResult = { error: 'Background removal failed' };
      }

      // Save metadata
      const metadata = {
        generatedAt: new Date().toISOString(),
        baseBunny: selectedBaseBunny,
        scene: selectedScene,
        equippedItems: equippedItems.map(item => ({
          item_id: item.item_id,
          slot: item.slot,
          name: item.name
        })),
        hasAnimation: generateAnimation && (animationFrames.cached || animationFrames.generated),
        hasTransparentBackground: transparentBunnyResult.applied || false,
        version: '2.0'
      };
      await writeFile(bunnyMetadataPath, JSON.stringify(metadata, null, 2));
      console.log('💾 Saved metadata:', `${bunnyFolderName}/metadata.json`);

      return NextResponse.json({ 
        success: true, 
        imageUrl: `/generated-bunnies/${bunnyFolderName}/normal.png`,
        cached: false,
        equippedItems: equippedItems.length,
        method: 'clean_bunny_generation',
        folderName: bunnyFolderName,
        animation: generateAnimation ? animationFrames : undefined,
        transparent: transparentBunnyResult
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
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


    if (!bunnyId) {
      return NextResponse.json({ error: 'Missing bunnyId' }, { status: 400 });
    }

    // Get selected base bunny from request or use default
    const selectedBaseBunny = request.headers.get('x-base-bunny') || 'bunny-base.png';

    // If no items equipped, return base bunny
    if (equippedItems.length === 0) {
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
    let bunnyExists = false;
    try {
      await require('fs/promises').access(bunnyImagePath);
      bunnyExists = true;
      if (forceRegenerate) {
      } else {
      }
    } catch {
      if (forceRegenerate) {
      } else {
        // Need to generate bunny
      }
    }

    // Handle blink frame for cached bunnies
    if (bunnyExists && generateAnimation) {
      
      const blinkFramePath = path.join(bunnyFolderPath, 'blink.png');
      const smileFramePath = path.join(bunnyFolderPath, 'smile.png');
      const waveFramePath = path.join(bunnyFolderPath, 'wave.png');
      
      let animationFrames = {};
      const missingFrames = [];
      
      // Check which frames are missing
      try {
        await require('fs/promises').access(blinkFramePath);
      } catch {
        missingFrames.push('blink');
      }
      
      try {
        await require('fs/promises').access(smileFramePath);
      } catch {
        missingFrames.push('smile');
      }
      
      try {
        await require('fs/promises').access(waveFramePath);
      } catch {
        missingFrames.push('wave');
      }

      if (missingFrames.length > 0 || forceRegenerate) {
        const framesToGenerate = forceRegenerate ? ['blink', 'smile', 'wave'] : missingFrames;
        
        try {
          // Load existing bunny for animation generation
          const existingBunnyData = await require('fs/promises').readFile(bunnyImagePath);
          
          const geminiService = new GeminiImageServiceClass();
          const frames = await geminiService.generateAnimationFrames(existingBunnyData, framesToGenerate);
          
          const generatedFrames = [];
          
          // Save blink frame
          if (frames && frames.blink && (missingFrames.includes('blink') || forceRegenerate)) {
            await writeFile(blinkFramePath, frames.blink.imageData);
            
            try {
              const { SceneCompositor } = await import('../../lib/sceneCompositor');
              const transparentBlinkBuffer = await SceneCompositor.removeWhiteBackground(blinkFramePath);
              await writeFile(blinkFramePath, transparentBlinkBuffer);
              generatedFrames.push('blink');
            } catch (blinkTransparentError) {
              console.error('🔥 Cached blink frame background removal failed:', blinkTransparentError);
            }
          }
          
          // Save smile frame
          if (frames && frames.smile && (missingFrames.includes('smile') || forceRegenerate)) {
            await writeFile(smileFramePath, frames.smile.imageData);
            
            try {
              const { SceneCompositor } = await import('../../lib/sceneCompositor');
              const transparentSmileBuffer = await SceneCompositor.removeWhiteBackground(smileFramePath);
              await writeFile(smileFramePath, transparentSmileBuffer);
              generatedFrames.push('smile');
            } catch (smileTransparentError) {
              console.error('🔥 Cached smile frame background removal failed:', smileTransparentError);
            }
          }
          
          // Save wave frame
          if (frames && frames.wave && (missingFrames.includes('wave') || forceRegenerate)) {
            await writeFile(waveFramePath, frames.wave.imageData);
            
            try {
              const { SceneCompositor } = await import('../../lib/sceneCompositor');
              const transparentWaveBuffer = await SceneCompositor.removeWhiteBackground(waveFramePath);
              await writeFile(waveFramePath, transparentWaveBuffer);
              generatedFrames.push('wave');
            } catch (waveTransparentError) {
              console.error('🔥 Cached wave frame background removal failed:', waveTransparentError);
            }
          }
          
          if (generatedFrames.length > 0) {
            animationFrames = { generated: generatedFrames };
          } else {
            animationFrames = { error: 'Failed to generate animation frames' };
          }
        } catch (animationError) {
          console.error('🔥 Animation frame generation failed for cached bunny:', animationError);
          animationFrames = { error: 'Animation frame generation failed' };
        }
      } else {
        animationFrames = { cached: ['blink', 'smile', 'wave'] };
      }

      // Apply white background removal to cached bunny for transparency
      let transparentCachedResult = {};
      try {
        
        // Always apply background removal to ensure transparency
        const { SceneCompositor } = await import('../../lib/sceneCompositor');
        
        // Apply to normal frame
        const transparentNormalBuffer = await SceneCompositor.removeWhiteBackground(bunnyImagePath);
        await require('fs/promises').writeFile(bunnyImagePath, transparentNormalBuffer);
        
        // Apply to blink frame if it exists
        try {
          await require('fs/promises').access(blinkFramePath);
          const transparentBlinkBuffer = await SceneCompositor.removeWhiteBackground(blinkFramePath);
          await require('fs/promises').writeFile(blinkFramePath, transparentBlinkBuffer);
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
      const bunnyResult = await GeminiImageService.generateBunnyWithItems(equippedItems, selectedBaseBunny);
      
      if (!bunnyResult) {
        throw new Error('Failed to generate bunny with items');
      }
      
      // Save bunny image
      await writeFile(bunnyImagePath, bunnyResult.imageData);

      // Generate blink frame if requested
      let animationFrames = {};
      if (generateAnimation) {
        
        // Check if blink frame already exists
        const blinkFramePath = path.join(bunnyFolderPath, 'blink.png');
        
        let needsGeneration = false;
        try {
          await require('fs/promises').access(blinkFramePath);
          animationFrames = { cached: true };
        } catch {
          needsGeneration = true;
        }

        if (needsGeneration) {
          try {
            const geminiService = new GeminiImageServiceClass();
            const frames = await geminiService.generateAnimationFrames(bunnyResult.imageData, ['blink', 'smile', 'wave']);
            
            const generatedFrames = [];
            
            // Save blink frame
            if (frames && frames.blink) {
              await writeFile(blinkFramePath, frames.blink.imageData);
              
              // Apply white background removal to blink frame
              try {
                const { SceneCompositor } = await import('../../lib/sceneCompositor');
                const transparentBlinkBuffer = await SceneCompositor.removeWhiteBackground(blinkFramePath);
                await writeFile(blinkFramePath, transparentBlinkBuffer);
                generatedFrames.push('blink');
              } catch (blinkTransparentError) {
                console.error('🔥 Blink frame background removal failed:', blinkTransparentError);
              }
            }
            
            // Save smile frame
            if (frames && frames.smile) {
              const smileFramePath = path.join(bunnyFolderPath, 'smile.png');
              await writeFile(smileFramePath, frames.smile.imageData);
              
              // Apply white background removal to smile frame
              try {
                const { SceneCompositor } = await import('../../lib/sceneCompositor');
                const transparentSmileBuffer = await SceneCompositor.removeWhiteBackground(smileFramePath);
                await writeFile(smileFramePath, transparentSmileBuffer);
                generatedFrames.push('smile');
              } catch (smileTransparentError) {
                console.error('🔥 Smile frame background removal failed:', smileTransparentError);
              }
            }
            
            // Save wave frame
            if (frames && frames.wave) {
              const waveFramePath = path.join(bunnyFolderPath, 'wave.png');
              await writeFile(waveFramePath, frames.wave.imageData);
              
              // Apply white background removal to wave frame
              try {
                const { SceneCompositor } = await import('../../lib/sceneCompositor');
                const transparentWaveBuffer = await SceneCompositor.removeWhiteBackground(waveFramePath);
                await writeFile(waveFramePath, transparentWaveBuffer);
                generatedFrames.push('wave');
              } catch (waveTransparentError) {
                console.error('🔥 Wave frame background removal failed:', waveTransparentError);
              }
            }
            
            if (generatedFrames.length > 0) {
              animationFrames = { generated: generatedFrames };
            } else {
              animationFrames = { error: 'Failed to generate any animation frames' };
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
        const { SceneCompositor } = await import('../../lib/sceneCompositor');
        
        // Remove white background to make bunny transparent
        const transparentBunnyBuffer = await SceneCompositor.removeWhiteBackground(bunnyImagePath);
        
        // Save the transparent version over the original
        await writeFile(bunnyImagePath, transparentBunnyBuffer);
        
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
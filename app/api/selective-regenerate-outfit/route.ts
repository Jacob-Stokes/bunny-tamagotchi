import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, access } from 'fs/promises';
import path from 'path';
import { GeminiImageService as GeminiImageServiceClass } from '../../lib/geminiImageService';
import { SceneCompositor } from '../../lib/sceneCompositor';

export async function POST(request: NextRequest) {
  try {
    const { 
      outfitKey, 
      regenerateBase, 
      regenerateAnimations, 
      removeBackground,
      forceAll 
    } = await request.json();

    if (!outfitKey) {
      return NextResponse.json({ error: 'Missing outfitKey' }, { status: 400 });
    }


    // Use different paths for development vs production
    const isProduction = process.env.NODE_ENV === 'production';
    const baseDir = isProduction 
      ? '/var/www/bunny-static/generated-bunnies'
      : path.join(process.cwd(), 'public', 'generated-bunnies');

    const outfitFolderPath = path.join(baseDir, outfitKey);
    const metadataPath = path.join(outfitFolderPath, 'metadata.json');

    // Read existing metadata
    let metadata: any = {};
    try {
      const metadataContent = await readFile(metadataPath, 'utf-8');
      metadata = JSON.parse(metadataContent);
    } catch (error) {
      console.error('Failed to read metadata:', error);
      return NextResponse.json({ error: 'Cannot read outfit metadata' }, { status: 400 });
    }

    if (!metadata.equippedItems || !metadata.baseBunny) {
      return NextResponse.json({ error: 'Invalid metadata - missing required fields' }, { status: 400 });
    }

    // If forceAll is true, fall back to existing full regeneration
    if (forceAll) {
      const response = await fetch(`${request.nextUrl.origin}/api/force-regenerate-outfit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outfitKey }),
      });
      
      if (!response.ok) {
        throw new Error('Full regeneration failed');
      }
      
      return NextResponse.json(await response.json());
    }

    const results: any = {};

    // STEP 1: Regenerate base bunny if requested
    if (regenerateBase) {
      
      try {
        const geminiService = new GeminiImageServiceClass();
        const bunnyResult = await geminiService.generateBunnyWithItems(
          metadata.equippedItems,
          metadata.baseBunny
        );
        
        if (bunnyResult) {
          const normalImagePath = path.join(outfitFolderPath, 'normal.png');
          await writeFile(normalImagePath, bunnyResult.imageData);
          results.regeneratedBase = true;
          
          // ALWAYS apply background removal to newly generated base (like main pipeline)
          const transparentBuffer = await SceneCompositor.removeWhiteBackground(normalImagePath);
          await writeFile(normalImagePath, transparentBuffer);
          results.backgroundFixed = results.backgroundFixed || [];
          results.backgroundFixed.push('normal');
        } else {
          throw new Error('Failed to generate base bunny');
        }
      } catch (error) {
        console.error('❌ Base regeneration failed:', error);
        results.errors = results.errors || [];
        results.errors.push(`Base regeneration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // STEP 2: Regenerate specific animation frames if requested
    if (regenerateAnimations.length > 0) {
      
      try {
        // Load the current normal.png to generate animations from
        const normalImagePath = path.join(outfitFolderPath, 'normal.png');
        const normalImageBuffer = await readFile(normalImagePath);
        
        const geminiService = new GeminiImageServiceClass();
        const frames = await geminiService.generateAnimationFrames(normalImageBuffer, regenerateAnimations);
        
        if (frames) {
          const generatedFrames = [];
          
          for (const frameType of regenerateAnimations) {
            if (frames[frameType]) {
              const framePath = path.join(outfitFolderPath, `${frameType}.png`);
              await writeFile(framePath, frames[frameType].imageData);
              generatedFrames.push(frameType);
              
              // ALWAYS apply background removal to newly generated frames (like main pipeline)
              const transparentBuffer = await SceneCompositor.removeWhiteBackground(framePath);
              await writeFile(framePath, transparentBuffer);
              results.backgroundFixed = results.backgroundFixed || [];
              results.backgroundFixed.push(frameType);
            }
          }
          
          results.regeneratedAnimations = generatedFrames;
        } else {
          throw new Error('Failed to generate animation frames');
        }
      } catch (error) {
        console.error('❌ Animation regeneration failed:', error);
        results.errors = results.errors || [];
        results.errors.push(`Animation regeneration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // STEP 3: Apply background removal to existing frames if requested
    // Note: We automatically apply background removal to any regenerated frames above,
    // so this section is only for applying background removal to existing frames that weren't regenerated
    const backgroundOnlyFrames = removeBackground.filter(frame => {
      // Skip frames that were just regenerated (they already have background removed)
      if (regenerateBase && frame === 'normal') return false;
      if (regenerateAnimations.includes(frame)) return false;
      return true;
    });

    if (backgroundOnlyFrames.length > 0) {
      
      const fixedFrames = [];
      
      for (const frameType of backgroundOnlyFrames) {
        try {
          const framePath = path.join(outfitFolderPath, `${frameType}.png`);
          
          // Check if file exists
          await access(framePath);
          
          const transparentBuffer = await SceneCompositor.removeWhiteBackground(framePath);
          await writeFile(framePath, transparentBuffer);
          fixedFrames.push(frameType);
        } catch (error) {
          console.error(`❌ Background removal failed for ${frameType}:`, error);
          results.errors = results.errors || [];
          results.errors.push(`Background removal failed for ${frameType}: ${error instanceof Error ? error.message : 'File not found'}`);
        }
      }
      
      if (fixedFrames.length > 0) {
        results.backgroundFixed = (results.backgroundFixed || []).concat(fixedFrames);
      }
    }

    // STEP 4: Update metadata with completion time
    metadata.lastUpdated = new Date().toISOString();
    metadata.selectiveRegeneration = {
      performedAt: new Date().toISOString(),
      actions: {
        regenerateBase: !!regenerateBase,
        regenerateAnimations: regenerateAnimations || [],
        removeBackground: removeBackground || []
      }
    };

    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));


    return NextResponse.json({
      success: true,
      message: 'Selective regeneration completed',
      results
    });

  } catch (error) {
    console.error('Selective regeneration error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to perform selective regeneration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
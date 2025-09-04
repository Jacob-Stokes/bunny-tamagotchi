import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat, readFile } from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Use different paths for development vs production
    const isProduction = process.env.NODE_ENV === 'production';
    const baseDir = isProduction 
      ? '/var/www/bunny-static/generated-bunnies'
      : path.join(process.cwd(), 'public', 'generated-bunnies');


    let outfitFolders: string[] = [];
    try {
      outfitFolders = await readdir(baseDir);
    } catch {
      return NextResponse.json({ outfits: [] });
    }

    const outfits = [];

    for (const folder of outfitFolders) {
      try {
        const folderPath = path.join(baseDir, folder);
        const folderStat = await stat(folderPath);
        
        if (folderStat.isDirectory()) {
          const normalPath = path.join(folderPath, 'normal.png');
          const blinkPath = path.join(folderPath, 'blink.png');
          const sceneNormalPath = path.join(folderPath, 'scene_normal.png');
          const sceneBlinkPath = path.join(folderPath, 'scene_blink.png');
          const metadataPath = path.join(folderPath, 'metadata.json');

          // Check if all basic animation frames exist (required for complete outfit)
          let normalStat: any = null;
          let hasBlinkFrame = false;
          let hasSmileFrame = false;
          let hasWaveFrame = false;
          let hasSceneComposition = false;
          let hasSceneBlinkFrame = false;

          // Check required basic frames - outfit is only complete if ALL frames exist
          try {
            normalStat = await stat(normalPath);
          } catch {
            continue; // Skip if no normal.png
          }

          try {
            await stat(blinkPath);
            hasBlinkFrame = true;
          } catch {
            continue; // Skip if no blink.png - generation not complete
          }

          try {
            await stat(path.join(folderPath, 'smile.png'));
            hasSmileFrame = true;
          } catch {
            continue; // Skip if no smile.png - generation not complete
          }

          try {
            await stat(path.join(folderPath, 'wave.png'));
            hasWaveFrame = true;
          } catch {
            continue; // Skip if no wave.png - generation not complete
          }

          // Check scene frames (optional)
          try {
            await stat(sceneNormalPath);
            hasSceneComposition = true;
          } catch {}

          try {
            await stat(sceneBlinkPath);
            hasSceneBlinkFrame = true;
          } catch {}

          // Try to read metadata
          let metadata: any = {};
          try {
            const metadataContent = await readFile(metadataPath, 'utf-8');
            metadata = JSON.parse(metadataContent);
          } catch {}

          // Use file modification time for cache busting
          const cacheKey = normalStat.mtime.getTime();
          
          const outfit = {
            key: folder,
            normalUrl: `/generated-bunnies/${folder}/normal.png?v=${cacheKey}`,
            blinkUrl: `/generated-bunnies/${folder}/blink.png?v=${cacheKey}`,
            smileUrl: `/generated-bunnies/${folder}/smile.png?v=${cacheKey}`,
            waveUrl: `/generated-bunnies/${folder}/wave.png?v=${cacheKey}`,
            sceneNormalUrl: hasSceneComposition ? `/generated-bunnies/${folder}/scene_normal.png?v=${cacheKey}` : null,
            sceneBlinkUrl: hasSceneBlinkFrame ? `/generated-bunnies/${folder}/scene_blink.png?v=${cacheKey}` : null,
            hasBlinkFrame: true, // Always true now since we require it
            hasSmileFrame: true, // Always true now since we require it
            hasWaveFrame: true, // Always true now since we require it
            hasSceneComposition,
            hasSceneBlinkFrame,
            generatedAt: normalStat.mtime,
            baseBunny: metadata.baseBunny || 'Unknown',
            scene: metadata.scene || 'Unknown',
            equippedItems: metadata.equippedItems?.map((item: any) => item.name) || [],
            metadata
          };

          outfits.push(outfit);
        }
      } catch (error) {
        console.error(`Error processing folder ${folder}:`, error);
      }
    }

    // Sort by generation time (newest first)
    outfits.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());


    return NextResponse.json({ outfits });
  } catch (error) {
    console.error('Error loading generated outfits:', error);
    return NextResponse.json(
      { error: 'Failed to load generated outfits' },
      { status: 500 }
    );
  }
}
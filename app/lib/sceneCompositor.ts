import sharp from 'sharp';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

export class SceneCompositor {
  /**
   * Remove white background from bunny image and make it transparent
   * Uses flood fill from edges to identify background areas
   */
  static async removeWhiteBackground(bunnyImagePath: string): Promise<Buffer> {
    console.log('🎭 Removing white/gray background from bunny...');
    
    const bunnyBuffer = await readFile(bunnyImagePath);
    const { data, info } = await sharp(bunnyBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const { width, height, channels } = info;
    const pixelArray = new Uint8Array(data);
    
    // Helper function to check if pixel is background (white, light gray, or medium gray)
    const isBackgroundPixel = (r: number, g: number, b: number) => {
      // Target a broader range: light colors AND gray backgrounds
      // Check if it's grayish (all RGB values similar) and relatively bright
      const isGrayish = Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && Math.abs(r - b) < 30;
      const isBright = (r + g + b) / 3 >= 150; // Lower threshold for grays
      
      return isGrayish && isBright;
    };
    
    // Create a map to track which pixels are background
    const backgroundMap = new Set<string>();
    const visited = new Set<string>();
    
    // Flood fill function to mark background pixels
    const floodFill = (startX: number, startY: number) => {
      const stack = [[startX, startY]];
      
      while (stack.length > 0) {
        const [x, y] = stack.pop()!;
        const key = `${x},${y}`;
        
        // Skip if out of bounds or already visited
        if (x < 0 || x >= width || y < 0 || y >= height || visited.has(key)) {
          continue;
        }
        
        visited.add(key);
        
        const i = (y * width + x) * channels;
        const r = pixelArray[i];
        const g = pixelArray[i + 1];
        const b = pixelArray[i + 2];
        
        // If this pixel is background, mark as background and continue flood fill
        if (isBackgroundPixel(r, g, b)) {
          backgroundMap.add(key);
          
          // Add neighbors to stack
          stack.push([x + 1, y]);
          stack.push([x - 1, y]);
          stack.push([x, y + 1]);
          stack.push([x, y - 1]);
        }
      }
    };
    
    // Start flood fill from all edge pixels that are white
    console.log('🌊 Starting flood fill from edges...');
    
    // Top and bottom edges
    for (let x = 0; x < width; x++) {
      // Top edge
      const topI = x * channels;
      if (isBackgroundPixel(pixelArray[topI], pixelArray[topI + 1], pixelArray[topI + 2])) {
        floodFill(x, 0);
      }
      
      // Bottom edge
      const bottomI = ((height - 1) * width + x) * channels;
      if (isBackgroundPixel(pixelArray[bottomI], pixelArray[bottomI + 1], pixelArray[bottomI + 2])) {
        floodFill(x, height - 1);
      }
    }
    
    // Left and right edges
    for (let y = 0; y < height; y++) {
      // Left edge
      const leftI = (y * width) * channels;
      if (isBackgroundPixel(pixelArray[leftI], pixelArray[leftI + 1], pixelArray[leftI + 2])) {
        floodFill(0, y);
      }
      
      // Right edge
      const rightI = (y * width + (width - 1)) * channels;
      if (isBackgroundPixel(pixelArray[rightI], pixelArray[rightI + 1], pixelArray[rightI + 2])) {
        floodFill(width - 1, y);
      }
    }
    
    console.log(`🗑️ Marked ${backgroundMap.size} background pixels for removal`);
    
    // Apply transparency to background pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * channels;
        const key = `${x},${y}`;
        
        if (backgroundMap.has(key)) {
          pixelArray[i + 3] = 0; // Make transparent
        } else {
          pixelArray[i + 3] = 255; // Keep opaque
        }
      }
    }
    
    // Convert back to PNG with transparency
    const transparentBunny = await sharp(pixelArray, {
      raw: {
        width,
        height,
        channels
      }
    })
    .png()
    .toBuffer();
    
    console.log('✅ Flood fill background removal completed');
    return transparentBunny;
  }
  
  /**
   * Composite bunny onto scene background
   */
  static async compositeOntoScene(
    transparentBunnyBuffer: Buffer, 
    sceneImagePath: string,
    outputPath: string
  ): Promise<boolean> {
    try {
      console.log('🌄 Compositing bunny onto scene...');
      
      // Load scene background
      const sceneBuffer = await readFile(sceneImagePath);
      const sceneImage = sharp(sceneBuffer);
      const sceneMetadata = await sceneImage.metadata();
      
      // Load bunny
      const bunnyImage = sharp(transparentBunnyBuffer);
      const bunnyMetadata = await bunnyImage.metadata();
      
      if (!sceneMetadata.width || !sceneMetadata.height || !bunnyMetadata.width || !bunnyMetadata.height) {
        throw new Error('Could not get image dimensions');
      }
      
      // Calculate bunny position (center horizontally, bottom 1/3 vertically)
      const sceneWidth = sceneMetadata.width;
      const sceneHeight = sceneMetadata.height;
      const bunnyWidth = bunnyMetadata.width;
      const bunnyHeight = bunnyMetadata.height;
      
      // Scale bunny if it's too big for the scene
      let scaledBunnyBuffer = transparentBunnyBuffer;
      let finalBunnyWidth = bunnyWidth;
      let finalBunnyHeight = bunnyHeight;
      
      const maxBunnySize = Math.min(sceneWidth * 0.4, sceneHeight * 0.5); // Max 40% of scene width or 50% height
      
      if (bunnyWidth > maxBunnySize || bunnyHeight > maxBunnySize) {
        const scale = maxBunnySize / Math.max(bunnyWidth, bunnyHeight);
        finalBunnyWidth = Math.floor(bunnyWidth * scale);
        finalBunnyHeight = Math.floor(bunnyHeight * scale);
        
        scaledBunnyBuffer = await sharp(transparentBunnyBuffer)
          .resize(finalBunnyWidth, finalBunnyHeight)
          .png()
          .toBuffer();
        
        console.log(`📏 Scaled bunny from ${bunnyWidth}x${bunnyHeight} to ${finalBunnyWidth}x${finalBunnyHeight}`);
      }
      
      // Position bunny (center horizontally, bottom third vertically)
      const bunnyX = Math.floor((sceneWidth - finalBunnyWidth) / 2);
      const bunnyY = Math.floor(sceneHeight * 0.6 - finalBunnyHeight / 2); // Place in bottom third
      
      console.log(`📍 Placing bunny at (${bunnyX}, ${bunnyY})`);
      
      // Composite bunny onto scene
      const composedImage = await sceneImage
        .composite([{
          input: scaledBunnyBuffer,
          left: bunnyX,
          top: bunnyY,
          blend: 'over'
        }])
        .png()
        .toBuffer();
      
      // Save the composed image
      await writeFile(outputPath, composedImage);
      
      console.log('✅ Scene composition completed successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Scene composition failed:', error);
      return false;
    }
  }
  
  /**
   * Create scene-composed versions of bunny images
   */
  static async createSceneVersions(
    bunnyFolderPath: string,
    selectedScene: string = 'meadow'
  ): Promise<boolean> {
    try {
      console.log(`🎬 Creating scene versions for scene: ${selectedScene}`);
      
      // Paths
      const normalImagePath = path.join(bunnyFolderPath, 'normal.png');
      const blinkImagePath = path.join(bunnyFolderPath, 'blink.png');
      const sceneNormalPath = path.join(bunnyFolderPath, 'scene_normal.png');
      const sceneBlinkPath = path.join(bunnyFolderPath, 'scene_blink.png');
      
      // Get scene background path
      const sceneImagePath = path.join(process.cwd(), 'public', 'scenes', `${selectedScene}.png`);
      
      // Check if scene exists
      try {
        await readFile(sceneImagePath);
      } catch {
        console.error(`❌ Scene background not found: ${sceneImagePath}`);
        return false;
      }
      
      // Process normal bunny
      console.log('🐰 Processing normal bunny...');
      const transparentNormalBunny = await this.removeWhiteBackground(normalImagePath);
      await this.compositeOntoScene(transparentNormalBunny, sceneImagePath, sceneNormalPath);
      
      // Process blink bunny (if exists)
      try {
        await readFile(blinkImagePath);
        console.log('👁️ Processing blink bunny...');
        const transparentBlinkBunny = await this.removeWhiteBackground(blinkImagePath);
        await this.compositeOntoScene(transparentBlinkBunny, sceneImagePath, sceneBlinkPath);
      } catch {
        console.log('⚠️ Blink frame not found, skipping scene blink composition');
      }
      
      console.log('🎭 Scene composition completed for all frames');
      return true;
      
    } catch (error) {
      console.error('❌ Scene version creation failed:', error);
      return false;
    }
  }
}
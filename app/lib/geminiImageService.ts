import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

interface EquippedItem {
  item_id: string;
  slot: string;
  image_url: string;
  name: string;
}

class GeminiImageService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a retryable error (500, rate limit, etc.)
        const isRetryable = error?.message?.includes('500') || 
                           error?.message?.includes('Internal Server Error') ||
                           error?.message?.includes('Rate limit') ||
                           error?.message?.includes('quota') ||
                           error?.status === 500 ||
                           error?.status === 429;
        
        if (!isRetryable || attempt === maxRetries) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  private async fileToBase64(filePath: string): Promise<string> {
    const data = await fs.readFile(filePath);
    return data.toString('base64');
  }

  private async urlToBase64(imageUrl: string): Promise<string> {
    // Check for valid URL
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error(`Invalid image URL: ${imageUrl}`);
    }
    
    // For local files, convert to file path
    if (imageUrl.startsWith('/items/')) {
      const filePath = path.join(process.cwd(), 'public', imageUrl);
      return await this.fileToBase64(filePath);
    }
    
    throw new Error('External URLs not yet supported');
  }

  private createDetailedPrompt(equippedItems: EquippedItem[]): string {
    const baseBunnyDescription = `Create a cute cartoon bunny character with these EXACT characteristics:
- Soft white/cream colored fur with subtle shading
- Round, friendly black eyes with small white highlights  
- Small pink triangular nose
- Long upright ears with pink inner portions
- Sitting upright in a gentle, relaxed pose
- Small rounded body proportions, very kawaii/cute style
- Clean vector-like illustration style with smooth colors
- Transparent background (no background elements)
- Professional digital art quality, similar to modern mobile game characters`;

    if (equippedItems.length === 0) {
      return baseBunnyDescription;
    }

    const itemDescriptions = equippedItems.map(item => {
      const itemName = item.name.toLowerCase();
      switch (item.slot) {
        case 'head':
          return `wearing a ${itemName} on its head (this should look like the exact ${itemName} item but properly scaled and positioned for a bunny)`;
        case 'face':
          return `wearing a ${itemName} on its face (this should look like the exact ${itemName} item but properly scaled and positioned for a bunny)`;
        case 'upper_body':
          return `wearing a ${itemName} on its upper body/torso (this should look like the exact ${itemName} clothing but properly scaled and positioned for a bunny)`;
        case 'lower_body':
          return `wearing a ${itemName} on its lower body (this should look like the exact ${itemName} clothing but properly scaled and positioned for a bunny)`;
        case 'feet':
          return `wearing ${itemName} on its feet (this should look like the exact ${itemName} footwear but properly scaled and positioned for bunny paws)`;
        case 'accessory':
          return `with a ${itemName} as an accessory (this should look like the exact ${itemName} item but properly scaled and positioned)`;
        default:
          return `wearing a ${itemName} (this should look like the exact ${itemName} item but properly scaled and positioned for a bunny)`;
      }
    }).join(', ');

    return `${baseBunnyDescription}

The bunny should be ${itemDescriptions}.

CRITICAL STYLE CONSISTENCY REQUIREMENTS:
- Keep the bunny's core design EXACTLY as described above - same pose, proportions, colors, and expression
- Make the clothing/accessory items look IDENTICAL to their real-world counterparts but properly fitted for a bunny
- For example: if it's a "red beanie", make it look like a real red knit beanie but bunny-sized
- If it's a "baseball cap", make it look like a real baseball cap but fitted on bunny ears
- Maintain professional, consistent art style throughout - no style mixing
- Items should integrate naturally with the bunny while keeping their authentic appearance
- Use the same clean, smooth digital art style for both bunny and items
- Transparent background always
- The final result should look like a cohesive character design, not a collage

This should look like official character art for a mobile game - high quality, consistent style, and professionally designed.`;
  }

  private async getSceneImagePath(sceneId: string): Promise<string | null> {
    try {
      // Try to get scene from database first
      const { SceneService } = await import('./sceneService');
      const scene = await SceneService.getScene(sceneId);
      
      if (scene && scene.background_image_url) {
        // Convert URL to file path
        if (scene.background_image_url.startsWith('/scenes/')) {
          return path.join(process.cwd(), 'public', scene.background_image_url.substring(1));
        }
      }
      
      // Fallback to static file
      return path.join(process.cwd(), 'public', 'scenes', `${sceneId}.png`);
    } catch (error) {
      console.warn('Failed to get scene from database, using static file:', error);
      return path.join(process.cwd(), 'public', 'scenes', `${sceneId}.png`);
    }
  }

  // Keep this for backward compatibility
  private getSceneDescription(sceneId: string): string {
    const sceneDescriptions = {
      'meadow': 'beautiful sunny meadow scene with soft green grass, blue sky with fluffy white clouds, and colorful flowers scattered around',
      'forest': 'enchanted forest with tall trees, dappled sunlight filtering through leaves, mushrooms, and fairy lights twinkling in the background',
      'beach': 'tropical beach with palm trees, clear blue ocean waves, seashells scattered on golden sand, and warm sunlight',
      'garden': 'lush flower garden with roses, butterflies dancing around, stone pathways, and a gentle fountain in the background',
      'snowy': 'winter wonderland with evergreen trees covered in snow, soft falling snowflakes, and a cozy winter atmosphere',
      'space': 'dreamy space scene with twinkling stars, distant planets, colorful nebula clouds, and floating cosmic elements',
      'library': 'warm library interior with tall bookshelves filled with books, soft golden lighting, comfortable reading nooks, and magical floating books',
      'cafe': 'charming cafe setting with cute pastries on display, steaming coffee cups, warm ambient lighting, and cozy indoor atmosphere'
    };
    return sceneDescriptions[sceneId as keyof typeof sceneDescriptions] || sceneDescriptions['meadow'];
  }

  private createMultimodalPrompt(equippedItems: EquippedItem[], baseBunnyFile: string = 'base-bunny-transparent.png', sceneId: string = 'meadow'): string {
    if (equippedItems.length === 0) {
      return `Looking at the first image (the base bunny), create an image with this exact bunny character maintaining the same pose, style, colors, and proportions. Use a clean white background. Keep it pixel art style.`;
    }

    const itemDescriptions = equippedItems.map((item, index) => {
      const itemName = item.name.toLowerCase();
      const imageIndex = index + 2; // Base bunny is image 1, items start from image 2
      switch (item.slot) {
        case 'head':
          return `the ${itemName} from image ${imageIndex} positioned naturally on the bunny's head`;
        case 'face':
          return `the ${itemName} from image ${imageIndex} as an overlay`;
        case 'upper_body':
          return `the ${itemName} from image ${imageIndex} fitted on the bunny's upper body/torso`;
        case 'lower_body':
          return `the ${itemName} from image ${imageIndex} fitted on the bunny's lower body`;
        case 'feet':
          return `the ${itemName} from image ${imageIndex} worn properly ON the bunny's feet (the bunny's feet should be INSIDE the shoes/boots, not below them or separate from them)`;
        case 'accessory':
          return `the ${itemName} from image ${imageIndex} added as an accessory`;
        default:
          return `the ${itemName} from image ${imageIndex} fitted properly on the bunny's ${item.slot.replace('_', ' ')}`;
      }
    }).join(', and ');

    return `Add ${itemDescriptions} to the bunny from image 1. Keep the same pixel art style and overall bunny appearance, but fit the clothing items naturally and properly on the bunny. CRITICAL FOR SHOES/BOOTS: The bunny's feet must be INSIDE the footwear, not below it or separate from it - the shoes should replace or cover the bunny's original feet. Make sure all items fit the bunny's body proportions correctly.`;
  }

  // Simple scene compositing using Sharp's built-in chroma key
  private async removeWhiteBackgroundAndComposite(imageBuffer: Buffer, sceneId: string): Promise<Buffer> {
    try {
      
      // Load scene background
      const scenePath = path.join(process.cwd(), 'public', 'scenes', `${sceneId}.png`);
      let sceneBuffer: Buffer;
      
      try {
        sceneBuffer = await fs.readFile(scenePath);
      } catch (error) {
        console.warn('🟡 Scene not found, using pink background');
        // Create a simple pink background
        sceneBuffer = await sharp({
          create: {
            width: 512,
            height: 512,
            channels: 3,
            background: { r: 255, g: 229, b: 241 } // bunny-pink
          }
        }).png().toBuffer();
      }

      // First make white pixels transparent, then composite onto scene
      const bunnyWithTransparency = await sharp(imageBuffer)
        .resize(512, 512)
        // Remove white background by making white pixels transparent
        .raw()
        .toBuffer({ resolveWithObject: true })
        .then(({ data, info }) => {
          const { width, height, channels } = info;
          const newData = Buffer.alloc(width * height * 4); // RGBA
          let transparentPixels = 0;
          let totalPixels = width * height;
          
          for (let i = 0; i < width * height; i++) {
            const srcIndex = i * channels;
            const dstIndex = i * 4;
            
            const r = data[srcIndex];
            const g = data[srcIndex + 1];
            const b = data[srcIndex + 2];
            
            // Detect white and near-white pixels (background) - lowered threshold
            const isWhite = r > 240 && g > 240 && b > 240;
            
            if (isWhite) {
              // Make transparent
              newData[dstIndex] = 0;
              newData[dstIndex + 1] = 0;
              newData[dstIndex + 2] = 0;
              newData[dstIndex + 3] = 0; // Transparent
              transparentPixels++;
            } else {
              // Keep original color
              newData[dstIndex] = r;
              newData[dstIndex + 1] = g;
              newData[dstIndex + 2] = b;
              newData[dstIndex + 3] = 255; // Opaque
            }
          }
          
          
          return sharp(newData, {
            raw: { width, height, channels: 4 }
          }).png().toBuffer();
        });

      // Now composite the transparent bunny onto the scene
      const compositedImage = await sharp(sceneBuffer)
        .resize(512, 512)
        .composite([{
          input: bunnyWithTransparency,
          blend: 'over',
          gravity: 'centre'
        }])
        .png()
        .toBuffer();
      
      return compositedImage;
      
    } catch (error) {
      console.warn('🟡 Compositing failed, using original:', error instanceof Error ? error.message : String(error));
      return imageBuffer;
    }
  }


  // Two-step generation: first generate bunny with items, then place in scene
  async generateBunnyWithItemsTwoStep(equippedItems: EquippedItem[], baseBunnyFile: string = 'base-bunny-transparent.png', sceneId: string = 'meadow'): Promise<{ imageData: Buffer; mimeType: string } | null> {
    if (!this.genAI) {
      throw new Error('Gemini API key not configured');
    }

    try {
      
      // Step 1: Generate bunny with all items using sequential method
      let bunnyWithItemsResult;
      if (equippedItems.length === 0) {
        // No items, just use base bunny
        const baseBunnyPath = path.join(process.cwd(), 'public', 'base-bunnies', baseBunnyFile);
        const baseBunnyBuffer = await fs.readFile(baseBunnyPath);
        bunnyWithItemsResult = { imageData: baseBunnyBuffer, mimeType: 'image/png' };
      } else if (equippedItems.length >= 3) {
        // Use sequential generation for 3+ items to avoid style drift
        bunnyWithItemsResult = await this.generateBunnySequential(equippedItems, baseBunnyFile, 'white'); // Use white background for step 1
      } else {
        // Use regular generation for 1-2 items
        bunnyWithItemsResult = await this.generateBunnyWithItems(equippedItems, baseBunnyFile, 'white'); // Use white background for step 1
      }

      if (!bunnyWithItemsResult) {
        throw new Error('Failed to generate bunny with items');
      }

      
      // Step 2: Place the generated bunny into the scene
      // Load scene data
      let sceneDescription = 'a peaceful meadow';
      try {
        const { SceneService } = await import('./sceneService');
        const scene = await SceneService.getScene(sceneId);
        if (scene?.description) {
          sceneDescription = scene.description;
        }
      } catch (error) {
        console.warn('Could not load scene description, using default');
      }

      // Load scene background
      const scenePath = await this.getSceneImagePath(sceneId);
      let sceneBase64: string | null = null;
      if (scenePath) {
        try {
          sceneBase64 = await this.fileToBase64(scenePath);
        } catch (error) {
          console.warn('🟡 Could not load scene image:', error);
        }
      }

      const scenePlacementParts: Array<{inlineData: {data: string, mimeType: string}} | {text: string}> = [
        {
          inlineData: {
            data: bunnyWithItemsResult.imageData.toString('base64'),
            mimeType: 'image/png'
          }
        }
      ];

      if (sceneBase64) {
        scenePlacementParts.push({
          inlineData: {
            data: sceneBase64,
            mimeType: 'image/png'
          }
        });
      }

      const scenePlacementPrompt = sceneBase64 
        ? `Place the bunny from image 1 exactly as it is into the scene from image 2 (${sceneDescription}). Keep the bunny's exact appearance, style, colors, pose, and all accessories unchanged. Only replace the white background with the scene background. The bunny should be positioned naturally in the scene.`
        : `Place the bunny from image 1 into ${sceneDescription}. Keep the bunny's exact appearance, style, colors, pose, and all accessories unchanged. Only replace the white background with an appropriate background for ${sceneDescription}.`;

      
      scenePlacementParts.push({ text: scenePlacementPrompt });

      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });
      const scenePlacementResponse = await model.generateContent(scenePlacementParts);

      if (scenePlacementResponse.response.candidates?.[0]?.content?.parts) {
        for (const part of scenePlacementResponse.response.candidates[0].content.parts) {
          if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('image/')) {
            return {
              imageData: Buffer.from(part.inlineData.data, 'base64'),
              mimeType: part.inlineData.mimeType
            };
          }
        }
      }

      return bunnyWithItemsResult;

    } catch (error) {
      console.error('🟡 Two-step generation failed:', error);
      throw error;
    }
  }

  // Sequential generation - apply items one by one to avoid style drift with 3+ items
  async generateBunnySequential(equippedItems: EquippedItem[], baseBunnyFile: string = 'base-bunny-transparent.png', sceneId: string = 'meadow'): Promise<{ imageData: Buffer; mimeType: string } | null> {
    if (!this.genAI) {
      throw new Error('Gemini API key not configured');
    }

    if (equippedItems.length === 0) {
      // Return base bunny if no items
      const baseBunnyPath = path.join(process.cwd(), 'public', 'base-bunnies', baseBunnyFile);
      const baseBunnyBase64 = await this.fileToBase64(baseBunnyPath);
      return {
        imageData: Buffer.from(baseBunnyBase64, 'base64'),
        mimeType: 'image/png'
      };
    }

    try {
      
      // Start with base bunny
      const baseBunnyPath = path.join(process.cwd(), 'public', 'base-bunnies', baseBunnyFile);
      let currentImageBase64 = await this.fileToBase64(baseBunnyPath);
      
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });

      // Apply each item sequentially
      for (let i = 0; i < equippedItems.length; i++) {
        const item = equippedItems[i];
        
        if (!item.image_url) continue;

        const itemBase64 = await this.urlToBase64(item.image_url);
        const itemName = item.name.toLowerCase();
        
        let itemDescription;
        switch (item.slot) {
          case 'head':
            itemDescription = `${itemName} on the bunny's head`;
            break;
          case 'face':
            itemDescription = `${itemName} as an overlay`;
            break;
          case 'upper_body':
            itemDescription = `${itemName} on the bunny's upper body`;
            break;
          case 'lower_body':
            itemDescription = `${itemName} on the bunny's lower body`;
            break;
          case 'feet':
            itemDescription = `${itemName} on the bunny's feet`;
            break;
          case 'accessory':
            itemDescription = `${itemName} as an accessory`;
            break;
          default:
            itemDescription = `${itemName} on the bunny`;
            break;
        }

        const prompt = `Add the ${itemDescription} from image 2 to the bunny from image 1. Keep the same pixel art style and overall bunny appearance, but fit the item naturally and properly on the bunny's body. CRITICAL FOR SHOES/BOOTS: The bunny's feet must be INSIDE the footwear, not below it or separate from it - the shoes should replace or cover the bunny's original feet. Make sure the item fits the bunny's proportions correctly. Use a clean white background.`;

        const contentParts = [
          {
            inlineData: {
              data: currentImageBase64,
              mimeType: 'image/png'
            }
          },
          {
            inlineData: {
              data: itemBase64,
              mimeType: 'image/png'
            }
          },
          { text: prompt }
        ];

        const response = await model.generateContent(contentParts);
        
        // Extract generated image for next iteration
        if (response.response.candidates?.[0]?.content?.parts) {
          let found = false;
          for (const part of response.response.candidates[0].content.parts) {
            if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('image/')) {
              currentImageBase64 = part.inlineData.data;
              found = true;
              break;
            }
          }
          if (!found) {
            throw new Error(`Step ${i + 1}: No image generated`);
          }
        } else {
          throw new Error(`Step ${i + 1}: Invalid response`);
        }
        
      }

      // Return bunny with accessories, composited onto scene
      
      const generatedImageBuffer = Buffer.from(currentImageBase64, 'base64');
      
      return {
        imageData: generatedImageBuffer,
        mimeType: 'image/png'
      };

    } catch (error) {
      console.error('🟡 Sequential generation failed:', error);
      throw error;
    }
  }

  async generateBunnyWithItems(equippedItems: EquippedItem[], baseBunnyFile: string = 'base-bunny-transparent.png', sceneId: string = 'meadow'): Promise<{ imageData: Buffer; mimeType: string } | null> {
    if (!this.genAI) {
      throw new Error('Gemini API key not configured');
    }

    try {

      // Load base bunny image
      const baseBunnyPath = path.join(process.cwd(), 'public', 'base-bunnies', baseBunnyFile);
      const baseBunnyBase64 = await this.fileToBase64(baseBunnyPath);

      // Prepare content parts - start with base bunny image
      const contentParts: any[] = [
        {
          inlineData: {
            data: baseBunnyBase64,
            mimeType: 'image/png'
          }
        }
      ];

      // Load inventory item images
      for (const item of equippedItems) {
        if (item.image_url) {
          try {
            const itemBase64 = await this.urlToBase64(item.image_url);
            contentParts.push({
              inlineData: {
                data: itemBase64,
                mimeType: 'image/png'
              }
            });
          } catch (error) {
            console.warn(`🟡 Failed to load image for ${item.name}:`, error instanceof Error ? error.message : String(error));
          }
        }
      }

      // Create simple prompt without scenes
      const itemDescriptions = equippedItems.map((item, index) => {
        const itemName = item.name.toLowerCase();
        const imageIndex = index + 2; // Base bunny is image 1, items start from image 2
        return `the ${itemName} from image ${imageIndex}`;
      }).join(', and ');
      
      const prompt = equippedItems.length > 0 
        ? `Add ${itemDescriptions} to the bunny from image 1. Keep the same pixel art style and overall bunny appearance, but fit the clothing items naturally and properly on the bunny. CRITICAL FOR SHOES/BOOTS: The bunny's feet must be INSIDE the footwear, not below it or separate from it - the shoes should replace or cover the bunny's original feet. Make sure items fit the bunny's body proportions correctly. Use a clean white background.`
        : `Create an image with this bunny character from image 1. Keep the same pixel art style. Use a clean white background.`;
      

      // No scene background loading - generating with white background for later transparency processing

      // Add text prompt
      contentParts.push({ text: prompt });

      // Generate the image using Gemini 2.5 Flash Image Preview
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });
      const response = await model.generateContent(contentParts);

      
      // Look for generated images in the response
      const responseText = response.response.text();

      // Check if response contains image data
      if (response.response.candidates?.[0]?.content?.parts) {
        for (const part of response.response.candidates[0].content.parts) {
          if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('image/')) {
            
            // Return the generated bunny with scene already included
            const generatedImageBuffer = Buffer.from(part.inlineData.data, 'base64');
            
            return {
              imageData: generatedImageBuffer,
              mimeType: part.inlineData.mimeType
            };
          }
        }
      }

      return null;

    } catch (error) {
      console.error('🟡 Error generating bunny image with Gemini 2.5 Flash:', error);
      throw error;
    }
  }

  // Generate a cache key for the equipped items combination
  static getCacheKey(equippedItems: EquippedItem[], baseBunnyFile: string = 'base-bunny-transparent.png', sceneId: string = 'meadow'): string {
    const sortedItems = equippedItems
      .sort((a, b) => a.item_id.localeCompare(b.item_id))
      .map(item => item.item_id)
      .join(',');
    const baseBunnyName = baseBunnyFile.replace('.png', '');
    return sortedItems.length > 0 
      ? `bunny_gemini_${baseBunnyName}_${sceneId}_${sortedItems}`
      : `bunny_gemini_${baseBunnyName}_${sceneId}`;
  }

  // Generate cache key for bunny with items (without scene)
  static getBunnyItemsCacheKey(equippedItems: EquippedItem[], baseBunnyFile: string = 'base-bunny-transparent.png'): string {
    const sortedItems = equippedItems
      .sort((a, b) => a.item_id.localeCompare(b.item_id))
      .map(item => item.item_id)
      .join(',');
    const baseBunnyName = baseBunnyFile.replace('.png', '');
    return sortedItems.length > 0 
      ? `${baseBunnyName}_${sortedItems}`
      : `${baseBunnyName}`;
  }

  // Generate cache key for final composite (bunny + scene)
  static getFinalCacheKey(equippedItems: EquippedItem[], baseBunnyFile: string = 'base-bunny-transparent.png', sceneId: string = 'meadow'): string {
    return this.getBunnyItemsCacheKey(equippedItems, baseBunnyFile);
  }

  // Generate bunny with items using step-by-step layering for 3+ items
  async generateBunnyWithItems(equippedItems: EquippedItem[], baseBunnyFile: string = 'base-bunny-transparent.png'): Promise<{ imageData: Buffer; mimeType: string } | null> {
    if (!this.genAI) {
      throw new Error('Gemini API key not configured');
    }

    // For 0-2 items, use direct generation
    if (equippedItems.length <= 2) {
      return await this.generateBunnyWithItemsDirect(equippedItems, baseBunnyFile);
    }

    // For 3+ items, use step-by-step layering
    return await this.generateBunnyWithItemsStepByStep(equippedItems, baseBunnyFile);
  }

  // Direct generation for 1-2 items (original method)
  private async generateBunnyWithItemsDirect(equippedItems: EquippedItem[], baseBunnyFile: string): Promise<{ imageData: Buffer; mimeType: string } | null> {
    try {
      const baseBunnyPath = path.join(process.cwd(), 'public', 'base-bunnies', baseBunnyFile);
      const baseBunnyBase64 = await this.fileToBase64(baseBunnyPath);

      // Build content parts with base bunny and item images
      const contentParts: Array<{inlineData: {data: string, mimeType: string}} | {text: string}> = [
        {
          inlineData: {
            data: baseBunnyBase64,
            mimeType: 'image/png'
          }
        }
      ];

      // Add item images
      for (const item of equippedItems) {
        const itemBase64 = await this.urlToBase64(item.image_url);
        contentParts.push({
          inlineData: {
            data: itemBase64,
            mimeType: 'image/png'
          }
        });
      }

      // Create prompt for bunny with items (transparent background)
      const prompt = this.createBunnyWithItemsPrompt(equippedItems);
      contentParts.push({ text: prompt });

      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });
      const response = await this.retryWithBackoff(() => model.generateContent(contentParts));

      if (response.response.candidates?.[0]?.content?.parts) {
        for (const part of response.response.candidates[0].content.parts) {
          if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('image/')) {
            const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
            return { imageData: imageBuffer, mimeType: part.inlineData.mimeType };
          }
        }
      }

      return null;

    } catch (error) {
      console.error('🔥 Error generating bunny with items:', error);
      return null;
    }
  }

  // Step-by-step generation for 3+ items
  private async generateBunnyWithItemsStepByStep(equippedItems: EquippedItem[], baseBunnyFile: string): Promise<{ imageData: Buffer; mimeType: string } | null> {
    try {
      const baseBunnyPath = path.join(process.cwd(), 'public', 'base-bunnies', baseBunnyFile);
      let currentBunnyBuffer = await fs.readFile(baseBunnyPath);

      // Apply items one by one
      for (let i = 0; i < equippedItems.length; i++) {
        const currentItem = equippedItems[i];

        const itemBase64 = await this.urlToBase64(currentItem.image_url);
        const currentBunnyBase64 = currentBunnyBuffer.toString('base64');

        const contentParts = [
          {
            inlineData: {
              data: currentBunnyBase64,
              mimeType: 'image/png'
            }
          },
          {
            inlineData: {
              data: itemBase64,
              mimeType: 'image/png'
            }
          },
          {
            text: this.createSingleItemPrompt(currentItem, i === 0)
          }
        ];

        const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });
        const response = await this.retryWithBackoff(() => model.generateContent(contentParts));

        if (response.response.candidates?.[0]?.content?.parts) {
          for (const part of response.response.candidates[0].content.parts) {
            if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('image/')) {
              currentBunnyBuffer = Buffer.from(part.inlineData.data, 'base64');
              break;
            }
          }
        } else {
          console.error(`❌ Step ${i + 1} failed: No image generated for ${currentItem.name}`);
          return null;
        }

        // Small delay between steps to be nice to the API
        if (i < equippedItems.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      return { imageData: currentBunnyBuffer, mimeType: 'image/png' };

    } catch (error) {
      console.error('🔥 Error in step-by-step generation:', error);
      return null;
    }
  }

  // Composite bunny onto scene
  async compositeBunnyOntoScene(bunnyBuffer: Buffer, sceneId: string): Promise<{ imageData: Buffer; mimeType: string } | null> {
    if (!this.genAI) {
      throw new Error('Gemini API key not configured');
    }

    try {
      // Load scene image
      const scenePath = path.join(process.cwd(), 'public', 'scenes', `${sceneId}.png`);
      const sceneBase64 = await this.fileToBase64(scenePath);
      const bunnyBase64 = bunnyBuffer.toString('base64');

      const contentParts: Array<{inlineData: {data: string, mimeType: string}} | {text: string}> = [
        {
          inlineData: {
            data: bunnyBase64,
            mimeType: 'image/png'
          }
        },
        {
          inlineData: {
            data: sceneBase64,
            mimeType: 'image/png'
          }
        }
      ];

      // Get scene description
      const sceneDescription = this.getSceneDescription(sceneId);
      const prompt = `Place the bunny from image 1 exactly as it is into the scene from image 2 (${sceneDescription}). Keep the bunny's exact appearance, style, colors, pose, and all accessories unchanged. Only replace the transparent background with the scene background. The bunny should be positioned naturally in the scene.`;
      
      contentParts.push({ text: prompt });

      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });
      const response = await model.generateContent(contentParts);

      if (response.response.candidates?.[0]?.content?.parts) {
        for (const part of response.response.candidates[0].content.parts) {
          if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('image/')) {
            const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
            return { imageData: imageBuffer, mimeType: part.inlineData.mimeType };
          }
        }
      }

      return null;

    } catch (error) {
      console.error('🔥 Error compositing bunny onto scene:', error);
      return null;
    }
  }

  // Create prompt for adding a single item (used in step-by-step)
  private createSingleItemPrompt(item: EquippedItem, isFirstItem: boolean): string {
    const baseInstruction = isFirstItem 
      ? "Take the bunny from image 1 and add the item from image 2."
      : "Take the bunny from image 1 (which already has some items) and carefully add the new item from image 2.";

    return `${baseInstruction}

CRITICAL REQUIREMENTS:
- Keep the bunny's EXACT existing appearance unchanged (colors, pose, proportions, style)
- ${isFirstItem ? '' : 'Preserve all existing items that are already on the bunny - DO NOT remove or change them'}
- Add the ${item.name.toLowerCase()} to the bunny's ${item.slot.replace('_', ' ')}
- Adapt the new item to perfectly match the existing pixel art style and resolution
- Scale the item appropriately for the bunny's small size
- Use a plain solid white background
- Make the item look natural and integrated, not overlaid

STYLE CONSISTENCY:
- Maintain the same pixel art aesthetic throughout
- Keep crisp pixels with no blur or anti-aliasing
- Ensure the new item harmonizes with existing items
- Preserve the bunny's cute, friendly appearance`;
  }

  // Create prompt for bunny with items (white background)
  private createBunnyWithItemsPrompt(equippedItems: EquippedItem[]): string {
    if (equippedItems.length === 0) {
      return `Take the bunny from image 1 exactly as it is, keeping all original colors, pose, and style. Only change the background to a plain solid white.`;
    }

    const itemDescriptions = equippedItems.map((item, index) => {
      const imageRef = `image ${index + 2}`; // +2 because image 1 is the base bunny
      return `${item.name.toLowerCase()} (reference: ${imageRef}) on the bunny's ${item.slot.replace('_', ' ')}`;
    }).join(', ');

    return `Create a pixel art bunny wearing: ${itemDescriptions}.

BASE BUNNY REQUIREMENTS (from image 1):
- Keep the bunny's EXACT original green/cream fur colors unchanged
- Keep the same cute pose, body proportions, and facial features
- Maintain the same pixel art style and resolution

ITEM ADAPTATION INSTRUCTIONS:
- Adapt each item's design to perfectly match the bunny's low-resolution pixel art style
- Scale items appropriately to fit the small bunny proportions
- Preserve each item's key visual characteristics (colors, shapes, distinctive features)
- Simplify complex details into clean pixel art while keeping the item recognizable
- Make items look like they naturally belong on this pixel bunny
- Ensure all items work harmoniously together when multiple items are equipped

TECHNICAL REQUIREMENTS:
- Use a plain solid white background
- Maintain crisp pixel art aesthetic with no blur or anti-aliasing
- Keep the same small resolution as the original bunny
- Items should enhance the bunny without overwhelming it`;
  }

  // Generate scene backgrounds (one-time setup)
  async generateSceneBackground(sceneId: string): Promise<{ imageData: Buffer; mimeType: string } | null> {
    if (!this.genAI) {
      throw new Error('Gemini API key not configured');
    }

    // Special handling for meadow-wide - extend the existing meadow
    if (sceneId === 'meadow-wide') {
      return await this.generateExtendedMeadow();
    }

    const sceneDescription = this.getSceneDescription(sceneId);
    const prompt = `Create a pixel art background scene: ${sceneDescription}. No characters, just the environment. Pixel art style, 16-bit game aesthetic.`;

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });
      const response = await model.generateContent([{ text: prompt }]);
      
      if (response.response.candidates?.[0]?.content?.parts) {
        for (const part of response.response.candidates[0].content.parts) {
          if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('image/')) {
            return {
              imageData: Buffer.from(part.inlineData.data, 'base64'),
              mimeType: part.inlineData.mimeType
            };
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error generating scene background:', error);
      return null;
    }
  }

  // Generate extended meadow that preserves the original design
  async generateExtendedMeadow(): Promise<{ imageData: Buffer; mimeType: string } | null> {
    try {
      // Load the original meadow
      const originalMeadowPath = path.join(process.cwd(), 'public', 'scenes', 'meadow.png');
      const originalMeadowBase64 = await this.fileToBase64(originalMeadowPath);

      const prompt = `Take the meadow scene from the image and extend it horizontally to create a wider version that maintains the exact same style, colors, and design elements. 

CRITICAL REQUIREMENTS:
- Keep the EXACT same pixel art style, colors, and aesthetic
- Preserve the same blue sky with white clouds
- Extend the green grass field naturally to the sides
- Keep the same trees and maintain their placement style
- Add the same colorful wildflowers (red, blue, yellow) scattered naturally
- Maintain the same peaceful, cheerful atmosphere
- The final image should be wider (5:4 aspect ratio, approximately 640x512 pixels)
- This should look like the original meadow scene was simply extended sideways, not recreated

Make it look like you took the original square meadow and added more meadow on both sides using the exact same art style and elements.`;

      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });
      const response = await model.generateContent([
        {
          inlineData: {
            data: originalMeadowBase64,
            mimeType: 'image/png'
          }
        },
        { text: prompt }
      ]);
      
      if (response.response.candidates?.[0]?.content?.parts) {
        for (const part of response.response.candidates[0].content.parts) {
          if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('image/')) {
            return {
              imageData: Buffer.from(part.inlineData.data, 'base64'),
              mimeType: part.inlineData.mimeType
            };
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error generating extended meadow:', error);
      return null;
    }
  }


  // Generate animation frames for a final bunny
  async generateAnimationFrames(finalBunnyBuffer: Buffer, frameTypes: string[] = ['blink']): Promise<{ [frameType: string]: { imageData: Buffer; mimeType: string } } | null> {
    if (!this.genAI) {
      console.warn('Gemini not configured');
      return null;
    }

    const results: { [frameType: string]: { imageData: Buffer; mimeType: string } } = {};

    try {
      // Generate each frame type
      for (const frameType of frameTypes) {
        const prompt = this.createAnimationFramePrompt(frameType);
        const finalBunnyBase64 = finalBunnyBuffer.toString('base64');

        const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });
        
        // Try to load reference image for this animation type
        const referenceImageBase64 = await this.loadAnimationReferenceImage(frameType);
        
        const contentParts: any[] = [
          {
            inlineData: {
              data: finalBunnyBase64,
              mimeType: 'image/png'
            }
          }
        ];

        // Add reference image if available
        if (referenceImageBase64) {
          contentParts.push({
            inlineData: {
              data: referenceImageBase64,
              mimeType: 'image/png'
            }
          });
        }

        // Add the text prompt
        const textPrompt = referenceImageBase64 
          ? `CURRENT BUNNY: Image 1 shows the fully dressed bunny that needs the ${frameType} animation.
REFERENCE EXAMPLE: Image 2 shows the exact ${frameType} expression/pose you should copy.

${prompt}

CRITICAL INSTRUCTIONS:
- Keep EVERYTHING from image 1: all clothing, accessories, colors, pose, body position, style
- ONLY copy the ${frameType} expression/pose from image 2 (eyes closed, head tilt, etc.)
- Do NOT remove any clothing or accessories from image 1
- Do NOT change the bunny's body, just apply the ${frameType} expression from image 2 to the dressed bunny from image 1
- The result should be the exact same dressed bunny but with the ${frameType} animation applied`
          : `REFERENCE IMAGE: The image above shows the bunny that needs animation.

${prompt}

CRITICAL: Use the reference image above as your exact template. Copy everything from it perfectly except for the specific animation change described.`;

        contentParts.push({ text: textPrompt });
        
        const response = await this.retryWithBackoff(() => model.generateContent(contentParts));

        if (response.response.candidates?.[0]?.content?.parts) {
          for (const part of response.response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              const imageData = Buffer.from(part.inlineData.data, 'base64');
              const mimeType = part.inlineData.mimeType || 'image/png';
              results[frameType] = { imageData, mimeType };
              break;
            }
          }
        }

        // Small delay between frames to be nice to the API
        if (frameTypes.length > 1 && frameType !== frameTypes[frameTypes.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      return results;

    } catch (error) {
      console.error('🔥 Error generating animation frames:', error);
      return null;
    }
  }

  // Create prompts for different animation frame types
  private createAnimationFramePrompt(frameType: string): string {
    const baseInstruction = `Take the bunny from the image and create a subtle animation frame.

CRITICAL REQUIREMENTS:
- Keep EVERYTHING exactly the same (colors, outfit, items, pose, style)
- Only make the minimal change specified below
- Maintain the same pixel art style and resolution
- Use the same plain white background
- Keep the bunny in the exact same position`;

    switch (frameType) {
      case 'ear_twitch':
        return `${baseInstruction}

CRITICAL ALIGNMENT REQUIREMENTS:
- The bunny must be in EXACTLY the same position as the original image
- Do NOT move the bunny body, head, eyes, nose, mouth, or any clothing/accessories
- Do NOT shift, resize, or reposition anything

ANIMATION CHANGE:
- ONLY move ONE ear: bend or tilt it noticeably (like a curious head tilt)
- Make the ear movement very obvious - not subtle
- The other ear stays exactly the same
- Keep all other features identical to the original
- This should be a clear, visible ear movement`;

      case 'blink':
        return `You are creating a blink animation frame. This is CRITICAL: you must create an IDENTICAL copy of the bunny with ONLY the eyes changed.

MANDATORY REQUIREMENTS - FAILURE TO FOLLOW WILL BREAK THE ANIMATION:
- Copy the bunny EXACTLY as it appears in the source image
- Same position, same pose, same size, same everything
- Do NOT redraw, recreate, or reinterpret the bunny
- Do NOT move any part of the bunny even 1 pixel
- Do NOT change colors, shading, style, or proportions
- Do NOT modify clothing, accessories, ears, nose, mouth, or body
- Keep the exact same white background
- Maintain identical image dimensions and framing

ONLY CHANGE THE EYES:
- Change the bunny's eyes from open to closed
- Make the closed eyes look like simple horizontal dark lines
- This should be the ONLY difference between the two images
- The eye change should be obvious but everything else must be pixel-perfect identical

This is for a blinking animation that requires perfect frame alignment. Any position change will cause visible jumping.`;

      case 'wave':
        return `${baseInstruction}
        
ANIMATION CHANGE:
- ONLY raise one paw/arm slightly in a waving gesture
- Do NOT move the bunny's body, head, eyes, or any clothing/items
- Do NOT shift the bunny's position even by 1 pixel
- Keep the bunny in exactly the same spot with exactly the same pose
- Only one arm/paw should be raised - everything else pixel-perfect identical
- This is for a friendly wave animation`;

      case 'smile':
        return `${baseInstruction}

CRITICAL ALIGNMENT REQUIREMENTS:
- The bunny must be in EXACTLY the same position as the original image
- Do NOT move the bunny body, head, ears, eyes, nose, or any clothing/accessories
- Do NOT shift, resize, or reposition anything

ANIMATION CHANGE:
- ONLY change the bunny's mouth: add a clear, obvious happy smile
- Make the mouth curved upward in a visible smile shape
- The smile should be clearly different from the original neutral expression
- Keep all other features identical to the original
- This should be an unmistakable happy expression`;

      case 'sleep':
        return `${baseInstruction}
        
ANIMATION CHANGE:
- Close the bunny's eyes with sleepy expression
- Tilt the head slightly down
- Keep everything else identical
- This is for a sleeping animation`;

      default:
        return `${baseInstruction}
        
ANIMATION CHANGE:
- Create a subtle ${frameType} variation
- Keep everything else identical`;
    }
  }

  // Load reference animation image if available
  private async loadAnimationReferenceImage(frameType: string): Promise<string | null> {
    try {
      // Only use reference images for animations that are hard to describe in text
      // For now, disable blink references since they cause clothing issues
      const referenceImageMap: { [key: string]: string } = {
        // 'blink': 'bunny-base-blink.png', // Disabled - causes clothing removal
        'smile': 'bunny-base-smile.png',
        'wave': 'bunny-base-wave.png'
        // Add more mappings as we create more reference images
      };

      const referenceFilename = referenceImageMap[frameType];
      if (!referenceFilename) {
        return null;
      }

      const referencePath = path.join(process.cwd(), 'public', 'base-bunnies', 'bunny-base', referenceFilename);
      
      // Use dynamic import to avoid module bundling issues
      const fs = await import('fs/promises');
      const referenceBuffer = await fs.readFile(referencePath);
      const referenceBase64 = referenceBuffer.toString('base64');
      
      return referenceBase64;
      
    } catch (error) {
      return null;
    }
  }

  // Simple method to generate individual item images
  async generateImage(prompt: string): Promise<{ imageData: Buffer; mimeType: string } | null> {
    if (!this.genAI) {
      console.warn('Gemini not configured');
      return null;
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });
      
      const response = await this.retryWithBackoff(() => model.generateContent([{
        text: prompt
      }]));

      if (response.response.candidates?.[0]?.content?.parts) {
        for (const part of response.response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const imageData = Buffer.from(part.inlineData.data, 'base64');
            const mimeType = part.inlineData.mimeType || 'image/png';
            return { imageData, mimeType };
          }
        }
      }

      console.warn('🟡 No image data found in response');
      return null;

    } catch (error) {
      console.error('🔥 Error generating image:', error);
      return null;
    }
  }
}

const geminiImageServiceInstance = new GeminiImageService();

export { GeminiImageService };
export default geminiImageServiceInstance;
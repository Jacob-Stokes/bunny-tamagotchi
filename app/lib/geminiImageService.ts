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

  private async fileToBase64(filePath: string): Promise<string> {
    const data = await fs.readFile(filePath);
    return data.toString('base64');
  }

  private async urlToBase64(imageUrl: string): Promise<string> {
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
          return `the ${itemName} from image ${imageIndex} positioned on the bunny's feet`;
        case 'accessory':
          return `the ${itemName} from image ${imageIndex} added as an accessory`;
        default:
          return `the ${itemName} from image ${imageIndex} positioned appropriately on the bunny`;
      }
    }).join(', and ');

    return `Add ${itemDescriptions} to the bunny from image 1. Keep the exact same pixel art style.`;
  }

  // Simple scene compositing using Sharp's built-in chroma key
  private async removeWhiteBackgroundAndComposite(imageBuffer: Buffer, sceneId: string): Promise<Buffer> {
    try {
      console.log('🟡 Compositing bunny onto scene:', sceneId);
      
      // Load scene background
      const scenePath = path.join(process.cwd(), 'public', 'scenes', `${sceneId}.png`);
      let sceneBuffer: Buffer;
      
      try {
        sceneBuffer = await fs.readFile(scenePath);
        console.log('🟡 Loaded scene background:', sceneId);
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
          
          console.log(`🟡 Made ${transparentPixels}/${totalPixels} pixels transparent (${Math.round(transparentPixels/totalPixels*100)}%)`);
          
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
      
      console.log('🟡 Scene compositing completed');
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
      console.log('🟡 Two-step generation: Step 1 - Generate bunny with items');
      
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

      console.log('🟡 Two-step generation: Step 2 - Place bunny in scene');
      
      // Step 2: Place the generated bunny into the scene
      // Load scene data
      let sceneDescription = 'a peaceful meadow';
      try {
        const { SceneService } = await import('./sceneService');
        const scene = await SceneService.getScene(sceneId);
        console.log('🟡 Loaded scene:', sceneId, scene ? scene.name : 'not found');
        if (scene?.description) {
          sceneDescription = scene.description;
          console.log('🟡 Scene description:', sceneDescription);
        }
      } catch (error) {
        console.warn('Could not load scene description, using default');
      }

      // Load scene background
      const scenePath = await this.getSceneImagePath(sceneId);
      console.log('🟡 Scene path:', scenePath);
      let sceneBase64: string | null = null;
      if (scenePath) {
        try {
          sceneBase64 = await this.fileToBase64(scenePath);
          console.log('🟡 Scene image loaded successfully');
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

      console.log('🟡 Scene placement prompt:', scenePlacementPrompt);
      console.log('🟡 Scene placement images:', sceneBase64 ? 'bunny + scene' : 'bunny only');
      
      scenePlacementParts.push({ text: scenePlacementPrompt });

      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });
      const scenePlacementResponse = await model.generateContent(scenePlacementParts);

      if (scenePlacementResponse.response.candidates?.[0]?.content?.parts) {
        for (const part of scenePlacementResponse.response.candidates[0].content.parts) {
          if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('image/')) {
            console.log('🟡 Two-step generation complete: bunny with items placed in scene');
            return {
              imageData: Buffer.from(part.inlineData.data, 'base64'),
              mimeType: part.inlineData.mimeType
            };
          }
        }
      }

      console.log('🟡 Scene placement failed, returning bunny with items only');
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
      console.log('🟡 Sequential generation: Processing', equippedItems.length, 'items one by one');
      
      // Start with base bunny
      const baseBunnyPath = path.join(process.cwd(), 'public', 'base-bunnies', baseBunnyFile);
      let currentImageBase64 = await this.fileToBase64(baseBunnyPath);
      
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });

      // Apply each item sequentially
      for (let i = 0; i < equippedItems.length; i++) {
        const item = equippedItems[i];
        console.log(`🟡 Step ${i + 1}/${equippedItems.length}: Adding ${item.name}`);
        
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

        const prompt = `Add the ${itemDescription} from image 2 to the bunny from image 1. Keep the exact same pixel art style. Use a clean white background.`;

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
        
        console.log(`🟡 Step ${i + 1} complete`);
      }

      // Return bunny with accessories, composited onto scene
      console.log('🟡 Sequential generation complete');
      
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
      console.log('🟡 Generating bunny image with Gemini 2.5 Flash Image Preview');
      console.log('🟡 Equipped items:', equippedItems.map(i => `${i.name} (${i.slot})`));

      // Load base bunny image
      const baseBunnyPath = path.join(process.cwd(), 'public', 'base-bunnies', baseBunnyFile);
      const baseBunnyBase64 = await this.fileToBase64(baseBunnyPath);
      console.log('🟡 Loaded base bunny image:', baseBunnyFile);

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
            console.log(`🟡 Loaded item image: ${item.name}`);
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
        ? `Add ${itemDescriptions} to the bunny from image 1. Keep the exact same pixel art style. Use a clean white background.`
        : `Create an image with this exact bunny character from image 1. Keep the exact same pixel art style. Use a clean white background.`;
      
      console.log('🟡 Simplified prompt:', prompt);

      // No scene background loading - generating with white background for later transparency processing

      // Add text prompt
      contentParts.push({ text: prompt });

      // Generate the image using Gemini 2.5 Flash Image Preview
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });
      const response = await model.generateContent(contentParts);

      console.log('🟡 Gemini 2.5 Flash response received');
      
      // Look for generated images in the response
      const responseText = response.response.text();
      console.log('🟡 Response text:', responseText.substring(0, 200) + '...');

      // Check if response contains image data
      if (response.response.candidates?.[0]?.content?.parts) {
        for (const part of response.response.candidates[0].content.parts) {
          if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('image/')) {
            console.log('🟡 Image generated successfully with Gemini 2.5 Flash Image Preview');
            
            // Return the generated bunny with scene already included
            const generatedImageBuffer = Buffer.from(part.inlineData.data, 'base64');
            
            return {
              imageData: generatedImageBuffer,
              mimeType: part.inlineData.mimeType
            };
          }
        }
      }

      console.log('🟡 No image data found in response');
      console.log('🟡 Full response:', JSON.stringify(response.response, null, 2));
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

  // Generate scene backgrounds (one-time setup)
  async generateSceneBackground(sceneId: string): Promise<{ imageData: Buffer; mimeType: string } | null> {
    if (!this.genAI) {
      throw new Error('Gemini API key not configured');
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
}

const geminiImageServiceInstance = new GeminiImageService();

export { GeminiImageService };
export default geminiImageServiceInstance;
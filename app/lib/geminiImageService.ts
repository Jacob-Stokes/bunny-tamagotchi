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

  private createMultimodalPrompt(equippedItems: EquippedItem[]): string {
    if (equippedItems.length === 0) {
      return `Looking at the first image (the base bunny), create an image with this exact bunny character maintaining the same pose, style, colors, and proportions. Place the bunny in a beautiful sunny meadow scene with soft green grass, blue sky with fluffy white clouds, and some colorful flowers scattered around. The scene should be bright, cheerful and cartoon-style to match the bunny's art style.`;
    }

    const itemDescriptions = equippedItems.map((item, index) => {
      const itemName = item.name.toLowerCase();
      const imageIndex = index + 2; // Base bunny is image 1, items start from image 2
      switch (item.slot) {
        case 'head':
          return `the ${itemName} from image ${imageIndex} positioned naturally on the bunny's head`;
        case 'face':
          return `the ${itemName} from image ${imageIndex} positioned on the bunny's face`;
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

    return `Looking at the provided images:
- Image 1: Base bunny character
- Images 2+: Inventory items to add

Create a new image that combines the EXACT base bunny from image 1 with ${itemDescriptions}.

CRITICAL REQUIREMENTS:
- Use the EXACT bunny from image 1 - keep the same pose, style, colors, and proportions
- Use the EXACT items from their respective images - keep their authentic colors, textures, and designs  
- This is a composition task: layer the items onto the base bunny in the appropriate positions
- Items should be properly scaled to fit the bunny naturally
- Keep the same professional cartoon art style throughout
- The result should look like a single cohesive character design

BACKGROUND: Place the bunny in a beautiful sunny meadow scene with soft green grass, blue sky with fluffy white clouds, and some colorful flowers scattered around. The scene should be bright, cheerful and cartoon-style to match the bunny's art style.

Generate an image showing the bunny wearing/using these items in this pleasant outdoor setting.`;
  }

  // Post-process image to remove white background if needed
  private async removeWhiteBackground(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Use sharp to make white/near-white pixels transparent
      const processedImage = await sharp(imageBuffer)
        .png()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { data, info } = processedImage;
      const { width, height, channels } = info;

      // Create new image data with transparency
      const newData = Buffer.alloc(width * height * 4); // RGBA

      for (let i = 0; i < width * height; i++) {
        const srcIndex = i * channels;
        const dstIndex = i * 4;

        const r = data[srcIndex];
        const g = data[srcIndex + 1]; 
        const b = data[srcIndex + 2];

        // Check if pixel is white or near-white (within threshold)
        const isWhiteish = r > 240 && g > 240 && b > 240;

        if (isWhiteish) {
          // Make transparent
          newData[dstIndex] = 0;     // R
          newData[dstIndex + 1] = 0; // G
          newData[dstIndex + 2] = 0; // B
          newData[dstIndex + 3] = 0; // A (transparent)
        } else {
          // Keep original color
          newData[dstIndex] = r;
          newData[dstIndex + 1] = g;
          newData[dstIndex + 2] = b;
          newData[dstIndex + 3] = channels === 4 ? data[srcIndex + 3] : 255; // A
        }
      }

      // Create new PNG with transparency
      return await sharp(newData, {
        raw: {
          width,
          height,
          channels: 4
        }
      }).png().toBuffer();

    } catch (error) {
      console.warn('🟡 Failed to remove white background, using original image:', error instanceof Error ? error.message : String(error));
      return imageBuffer;
    }
  }

  async generateBunnyWithItems(equippedItems: EquippedItem[]): Promise<{ imageData: Buffer; mimeType: string } | null> {
    if (!this.genAI) {
      throw new Error('Gemini API key not configured');
    }

    try {
      console.log('🟡 Generating bunny image with Gemini 2.5 Flash Image Preview');
      console.log('🟡 Equipped items:', equippedItems.map(i => `${i.name} (${i.slot})`));

      // Load base bunny image
      const baseBunnyPath = path.join(process.cwd(), 'public', 'base-bunny-transparent.png');
      const baseBunnyBase64 = await this.fileToBase64(baseBunnyPath);
      console.log('🟡 Loaded base bunny image');

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

      // Create the multimodal prompt
      const prompt = this.createMultimodalPrompt(equippedItems);
      console.log('🟡 Prompt:', prompt);

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
            
            return {
              imageData: Buffer.from(part.inlineData.data, 'base64'),
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
  static getCacheKey(equippedItems: EquippedItem[]): string {
    const sortedItems = equippedItems
      .sort((a, b) => a.item_id.localeCompare(b.item_id))
      .map(item => item.item_id)
      .join(',');
    return `bunny_gemini_${sortedItems}`;
  }
}

const geminiImageServiceInstance = new GeminiImageService();

export { GeminiImageService };
export default geminiImageServiceInstance;
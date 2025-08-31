import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

interface EquippedItem {
  item_id: string;
  slot: string;
  image_url: string;
  name: string;
}

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  private async fileToGenerativePart(filePath: string, mimeType: string) {
    const data = await fs.readFile(filePath);
    return {
      inlineData: {
        data: data.toString('base64'),
        mimeType,
      },
    };
  }

  private async urlToGenerativePart(imageUrl: string) {
    // For local files, convert to file path
    if (imageUrl.startsWith('/items/')) {
      const filePath = path.join(process.cwd(), 'public', imageUrl);
      return await this.fileToGenerativePart(filePath, 'image/png');
    }
    
    // For external URLs, you'd need to fetch and convert
    throw new Error('External URLs not yet supported');
  }

  private createPrompt(equippedItems: EquippedItem[]): string {
    const itemDescriptions = equippedItems
      .map(item => `- ${item.name} (${item.slot}): Place this ${item.slot} item on the bunny while preserving its exact design, colors, and style`)
      .join('\n');

    return `Create a single image that combines the base bunny with the equipped clothing items. 

CRITICAL REQUIREMENTS:
1. Use the base bunny image as the foundation - keep the bunny's pose, style, colors, and proportions EXACTLY the same
2. Add each clothing item to the appropriate body part while maintaining the item's original design, colors, and style
3. Ensure items fit naturally on the bunny (hats on head, shirts on body, etc.)
4. Maintain transparent background
5. Keep the same image dimensions as the base bunny
6. Items should layer properly (accessories on top, clothing underneath, etc.)
7. No style changes to either the bunny or the items - just combine them seamlessly

Items to add:
${itemDescriptions}

The result should look like the original bunny wearing these specific items, with all original styles preserved.`;
  }

  async generateBunnyWithItems(equippedItems: EquippedItem[]): Promise<string> {
    if (!this.genAI) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.1, // Low temperature for consistent style
        }
      });

      // Prepare base bunny image
      const baseBunnyPath = path.join(process.cwd(), 'public', 'base-bunny-transparent.png');
      const baseBunnyPart = await this.fileToGenerativePart(baseBunnyPath, 'image/png');

      // Prepare equipped item images
      const itemParts = await Promise.all(
        equippedItems.map(item => this.urlToGenerativePart(item.image_url))
      );

      // Create prompt for image generation
      const prompt = this.createPrompt(equippedItems);

      console.log('Generating bunny image with Gemini...');
      console.log('Items to equip:', equippedItems.map(i => i.name));

      // Generate content with image generation
      const result = await model.generateContent([
        {
          text: prompt
        },
        baseBunnyPart,
        ...itemParts
      ]);

      const response = await result.response;
      const generatedText = response.text();
      
      console.log('Gemini response:', generatedText);
      
      // Note: This may need adjustment based on actual Gemini image generation API
      // The response format may be different - you might need to extract image data
      // from the response differently
      
      // For now, return base bunny until we confirm the exact response format
      return '/base-bunny-transparent.png';

    } catch (error) {
      console.error('Error generating bunny image:', error);
      throw error;
    }
  }

  // Generate a cache key for the equipped items combination
  static getCacheKey(equippedItems: EquippedItem[]): string {
    const sortedItems = equippedItems
      .sort((a, b) => a.item_id.localeCompare(b.item_id))
      .map(item => item.item_id)
      .join(',');
    return `bunny_${sortedItems}`;
  }
}

export default new GeminiService();
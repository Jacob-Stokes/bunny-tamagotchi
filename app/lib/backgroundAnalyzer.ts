import sharp from 'sharp';
import { readFile } from 'fs/promises';

export class BackgroundAnalyzer {
  /**
   * Analyze an image to detect background issues (gray/white backgrounds that should be transparent)
   */
  static async analyzeBackgroundIssues(imagePath: string): Promise<{
    hasBackgroundIssue: boolean;
    backgroundType: 'white' | 'gray' | 'clean';
    confidence: number;
    analysis: {
      totalPixels: number;
      backgroundPixels: number;
      backgroundPercentage: number;
      edgeBackgroundPixels: number;
      edgeBackgroundPercentage: number;
    };
  }> {
    try {
      const imageBuffer = await readFile(imagePath);
      const { data, info } = await sharp(imageBuffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { width, height, channels } = info;
      const pixelArray = new Uint8Array(data);
      
      let whitePixels = 0;
      let grayPixels = 0;
      let edgeBackgroundPixels = 0;
      const totalPixels = width * height;

      // Count pixels and analyze edges
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * channels;
          const r = pixelArray[i];
          const g = pixelArray[i + 1];
          const b = pixelArray[i + 2];
          const a = pixelArray[i + 3];

          // Skip already transparent pixels
          if (a < 128) continue;

          const isEdge = x === 0 || x === width - 1 || y === 0 || y === height - 1;
          
          // Check for white background (>=240)
          if (r >= 240 && g >= 240 && b >= 240) {
            whitePixels++;
            if (isEdge) edgeBackgroundPixels++;
          }
          // Check for gray background (200-239)
          else if (r >= 200 && g >= 200 && b >= 200 && r < 240 && g < 240 && b < 240) {
            grayPixels++;
            if (isEdge) edgeBackgroundPixels++;
          }
        }
      }

      const backgroundPixels = whitePixels + grayPixels;
      const backgroundPercentage = (backgroundPixels / totalPixels) * 100;
      const edgeBackgroundPercentage = (edgeBackgroundPixels / (width * 2 + height * 2 - 4)) * 100;

      let backgroundType: 'white' | 'gray' | 'clean' = 'clean';
      let hasBackgroundIssue = false;
      let confidence = 0;

      // Determine background issue severity
      if (edgeBackgroundPercentage > 20) { // More than 20% of edges are background
        hasBackgroundIssue = true;
        confidence = Math.min(edgeBackgroundPercentage / 50, 1); // Scale to 0-1

        if (whitePixels > grayPixels) {
          backgroundType = 'white';
        } else {
          backgroundType = 'gray';
        }
      }

      // Higher confidence if background covers significant portion
      if (backgroundPercentage > 30) {
        hasBackgroundIssue = true;
        confidence = Math.max(confidence, Math.min(backgroundPercentage / 60, 1));
      }

      return {
        hasBackgroundIssue,
        backgroundType,
        confidence,
        analysis: {
          totalPixels,
          backgroundPixels,
          backgroundPercentage,
          edgeBackgroundPixels,
          edgeBackgroundPercentage
        }
      };

    } catch (error) {
      console.error('Error analyzing background:', error);
      return {
        hasBackgroundIssue: false,
        backgroundType: 'clean',
        confidence: 0,
        analysis: {
          totalPixels: 0,
          backgroundPixels: 0,
          backgroundPercentage: 0,
          edgeBackgroundPixels: 0,
          edgeBackgroundPercentage: 0
        }
      };
    }
  }

  /**
   * Analyze all frames in an outfit folder
   */
  static async analyzeOutfitFrames(outfitFolderPath: string): Promise<{
    [frameType: string]: {
      hasBackgroundIssue: boolean;
      backgroundType: 'white' | 'gray' | 'clean';
      confidence: number;
    };
  }> {
    const frameTypes = ['normal', 'blink', 'smile', 'wave'];
    const results: any = {};

    for (const frameType of frameTypes) {
      const framePath = `${outfitFolderPath}/${frameType}.png`;
      
      try {
        const analysis = await this.analyzeBackgroundIssues(framePath);
        results[frameType] = {
          hasBackgroundIssue: analysis.hasBackgroundIssue,
          backgroundType: analysis.backgroundType,
          confidence: analysis.confidence
        };
      } catch (error) {
        // Frame doesn't exist or can't be analyzed
        results[frameType] = {
          hasBackgroundIssue: false,
          backgroundType: 'clean',
          confidence: 0
        };
      }
    }

    return results;
  }

  /**
   * Get a human-readable summary of background issues
   */
  static getIssuesSummary(analysis: {
    hasBackgroundIssue: boolean;
    backgroundType: 'white' | 'gray' | 'clean';
    confidence: number;
  }): string {
    if (!analysis.hasBackgroundIssue) {
      return 'Clean';
    }

    const confidenceLevel = analysis.confidence > 0.8 ? 'High' : 
                           analysis.confidence > 0.5 ? 'Medium' : 'Low';
    
    return `${analysis.backgroundType} background (${confidenceLevel} confidence)`;
  }
}
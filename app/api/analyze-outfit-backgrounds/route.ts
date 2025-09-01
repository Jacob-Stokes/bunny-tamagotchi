import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { BackgroundAnalyzer } from '../../lib/backgroundAnalyzer';

export async function POST(request: NextRequest) {
  try {
    const { outfitKey } = await request.json();

    if (!outfitKey) {
      return NextResponse.json({ error: 'Missing outfitKey' }, { status: 400 });
    }

    console.log('🔍 Analyzing background issues for outfit:', outfitKey);

    // Use different paths for development vs production
    const isProduction = process.env.NODE_ENV === 'production';
    const baseDir = isProduction 
      ? '/var/www/bunny-static/generated-bunnies'
      : path.join(process.cwd(), 'public', 'generated-bunnies');

    const outfitFolderPath = path.join(baseDir, outfitKey);

    // Analyze all frames
    const frameAnalysis = await BackgroundAnalyzer.analyzeOutfitFrames(outfitFolderPath);

    // Generate recommendations
    const recommendations = {
      needsBackgroundRemoval: [] as string[],
      needsRegeneration: [] as string[],
      cleanFrames: [] as string[]
    };

    for (const [frameType, analysis] of Object.entries(frameAnalysis)) {
      if (analysis.hasBackgroundIssue) {
        if (analysis.confidence > 0.6) {
          recommendations.needsBackgroundRemoval.push(frameType);
        } else {
          recommendations.needsRegeneration.push(frameType);
        }
      } else {
        recommendations.cleanFrames.push(frameType);
      }
    }

    const summary = {
      totalFrames: Object.keys(frameAnalysis).length,
      issuesFound: recommendations.needsBackgroundRemoval.length + recommendations.needsRegeneration.length,
      cleanFrames: recommendations.cleanFrames.length,
      worstIssue: Object.entries(frameAnalysis)
        .filter(([_, analysis]) => analysis.hasBackgroundIssue)
        .sort(([_, a], [__, b]) => b.confidence - a.confidence)[0]
    };

    console.log('🔍 Analysis complete:', summary);

    return NextResponse.json({
      success: true,
      outfitKey,
      frameAnalysis,
      recommendations,
      summary
    });

  } catch (error) {
    console.error('Background analysis error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to analyze background issues',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
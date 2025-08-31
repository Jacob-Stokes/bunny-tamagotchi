import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const baseBunniesDir = path.join(process.cwd(), 'public', 'base-bunnies');
    
    try {
      const files = await fs.readdir(baseBunniesDir);
      const imageFiles = files.filter(file => 
        file.toLowerCase().endsWith('.png') || 
        file.toLowerCase().endsWith('.jpg') || 
        file.toLowerCase().endsWith('.jpeg')
      );
      
      return NextResponse.json({ 
        baseBunnies: imageFiles.sort(),
        count: imageFiles.length 
      });
    } catch (dirError) {
      // Directory doesn't exist or can't be read
      return NextResponse.json({ 
        baseBunnies: [],
        count: 0,
        error: 'Base bunnies directory not found'
      });
    }
  } catch (error) {
    console.error('Error listing base bunnies:', error);
    return NextResponse.json(
      { error: 'Failed to list base bunnies' },
      { status: 500 }
    );
  }
}
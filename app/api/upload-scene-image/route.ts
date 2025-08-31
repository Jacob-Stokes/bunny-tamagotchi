import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sceneId = formData.get('sceneId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!sceneId) {
      return NextResponse.json({ error: 'No scene ID provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Create scenes directory if it doesn't exist
    const scenesDir = path.join(process.cwd(), 'public', 'scenes');
    await mkdir(scenesDir, { recursive: true });

    // Generate filename
    const fileExtension = file.name.split('.').pop() || 'png';
    const fileName = `${sceneId}.${fileExtension}`;
    const filePath = path.join(scenesDir, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    console.log(`Scene image uploaded: ${fileName}`);

    return NextResponse.json({
      success: true,
      fileName,
      filePath: `/scenes/${fileName}`,
      message: 'Scene image uploaded successfully'
    });

  } catch (error) {
    console.error('Scene image upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload scene image' },
      { status: 500 }
    );
  }
}
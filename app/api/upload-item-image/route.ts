import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;
    const itemId: string | null = data.get('itemId') as string;

    if (!file || !itemId) {
      return NextResponse.json({ error: 'Missing file or itemId' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate filename: itemId + original extension
    const extension = path.extname(file.name);
    const filename = `${itemId}${extension}`;
    const filepath = path.join(process.cwd(), 'public', 'items', filename);

    // Write file to public/items directory
    await writeFile(filepath, buffer);

    // Return the public URL path
    const imageUrl = `/items/${filename}`;

    return NextResponse.json({ 
      success: true, 
      imageUrl,
      filename 
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
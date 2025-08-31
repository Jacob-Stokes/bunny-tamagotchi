import { NextRequest, NextResponse } from 'next/server';
import { SceneService, CreateSceneData, UpdateSceneData } from '../../lib/sceneService';

export async function GET() {
  try {
    const scenes = await SceneService.getAllScenes();
    return NextResponse.json(scenes);
  } catch (error) {
    console.error('Error fetching scenes:', error);
    return NextResponse.json({ error: 'Failed to fetch scenes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sceneData: CreateSceneData = await request.json();
    
    // Validate required fields
    if (!sceneData.id || !sceneData.name || !sceneData.description || !sceneData.background_image_url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const scene = await SceneService.createScene(sceneData);
    return NextResponse.json(scene, { status: 201 });
  } catch (error) {
    console.error('Error creating scene:', error);
    return NextResponse.json({ error: 'Failed to create scene' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...updates }: { id: string } & UpdateSceneData = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Scene ID is required' }, { status: 400 });
    }

    const scene = await SceneService.updateScene(id, updates);
    return NextResponse.json(scene);
  } catch (error) {
    console.error('Error updating scene:', error);
    return NextResponse.json({ error: 'Failed to update scene' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Scene ID is required' }, { status: 400 });
    }

    await SceneService.deleteScene(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting scene:', error);
    return NextResponse.json({ error: 'Failed to delete scene' }, { status: 500 });
  }
}
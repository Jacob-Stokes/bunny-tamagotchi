# API Reference

Complete documentation of all API endpoints in the Bunny Tamagotchi application.

## Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication

Most endpoints use Supabase's built-in authentication system with Row Level Security (RLS). Some admin endpoints require the service role key.

---

## 🐰 Bunny Management

### Generate Bunny Image

Generates outfit images for a bunny with equipped items and animations.

**Endpoint:** `POST /api/generate-bunny-image`

**Headers:**
```http
Content-Type: application/json
x-base-bunny: bunny-base (optional, defaults to 'bunny-base')
x-scene: meadow (optional, defaults to 'meadow')
```

**Request Body:**
```json
{
  "bunnyId": "uuid",
  "equippedItems": [
    {
      "item_id": "wizard_hat",
      "slot": "head",
      "name": "Mystical Wizard Hat",
      "image_url": "/items/wizard_hat.png"
    }
  ],
  "generateAnimation": true,
  "forceRegenerate": false
}
```

**Response:**
```json
{
  "success": true,
  "imageUrl": "/generated-bunnies/outfit-key/normal.png",
  "sceneUrl": "/generated-bunnies/outfit-key/scene_normal.png",
  "outfitKey": "bunny-base_wizard_hat",
  "cacheHit": false,
  "animationUrls": {
    "blink": "/generated-bunnies/outfit-key/blink.png",
    "smile": "/generated-bunnies/outfit-key/smile.png",
    "wave": "/generated-bunnies/outfit-key/wave.png"
  }
}
```

### Get Base Bunnies

Retrieves available base bunny images for generation.

**Endpoint:** `GET /api/base-bunnies`

**Response:**
```json
{
  "baseBunnies": [
    {
      "id": "bunny-base",
      "name": "Original Bunny",
      "imageUrl": "/base-bunnies/bunny-base.png"
    }
  ]
}
```

---

## 👗 Outfit Management

### Get Generated Outfits

Lists all completely generated outfits with cache-busted URLs.

**Endpoint:** `GET /api/generated-outfits`

**Response:**
```json
{
  "outfits": [
    {
      "key": "bunny-base_wizard_hat,tutu",
      "normalUrl": "/generated-bunnies/outfit-key/normal.png?v=1725458400000",
      "blinkUrl": "/generated-bunnies/outfit-key/blink.png?v=1725458400000",
      "smileUrl": "/generated-bunnies/outfit-key/smile.png?v=1725458400000",
      "waveUrl": "/generated-bunnies/outfit-key/wave.png?v=1725458400000",
      "sceneNormalUrl": "/generated-bunnies/outfit-key/scene_normal.png?v=1725458400000",
      "sceneBlinkUrl": null,
      "hasBlinkFrame": true,
      "hasSmileFrame": true,
      "hasWaveFrame": true,
      "hasSceneComposition": true,
      "hasSceneBlinkFrame": false,
      "generatedAt": "2025-09-04T12:00:00.000Z",
      "baseBunny": "bunny-base",
      "scene": "meadow",
      "equippedItems": ["Mystical Wizard Hat", "Ballet Tutu"],
      "metadata": { /* full metadata object */ }
    }
  ]
}
```

### Save Outfit

Saves an outfit configuration to the database.

**Endpoint:** `POST /api/save-outfit`

**Request Body:**
```json
{
  "bunnyId": "uuid",
  "outfitKey": "bunny-base_wizard_hat",
  "equippedItems": [
    {
      "item_id": "wizard_hat",
      "slot": "head",
      "name": "Mystical Wizard Hat"
    }
  ],
  "outfitName": "Wizard Look"
}
```

**Response:**
```json
{
  "success": true,
  "outfitId": "uuid",
  "message": "Outfit saved successfully"
}
```

### Force Regenerate Outfit

Regenerates an existing outfit with updated prompts and AI improvements.

**Endpoint:** `POST /api/force-regenerate-outfit`

**Request Body:**
```json
{
  "outfitKey": "bunny-base_wizard_hat,tutu"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Outfit regenerated successfully",
  "imageUrl": "/generated-bunnies/outfit-key/normal.png"
}
```

### Selective Regenerate Outfit

Regenerates specific animation frames for an outfit.

**Endpoint:** `POST /api/selective-regenerate-outfit`

**Request Body:**
```json
{
  "outfitKey": "bunny-base_wizard_hat",
  "frames": ["blink", "smile"]
}
```

---

## 📦 Inventory Management

### Debug Populate Inventory

**⚠️ Development Tool** - Populates bunny's inventory with all available items.

**Endpoint:** `POST /api/debug-populate-inventory`

**Request Body:**
```json
{
  "bunnyId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Debug inventory populated",
  "totalItems": 53,
  "addedItems": 53,
  "skippedItems": 0,
  "bunnyId": "uuid"
}
```

---

## 🎨 Scene Management

### Get Scenes

Retrieves available scenes for outfit composition.

**Endpoint:** `GET /api/scenes`

**Response:**
```json
{
  "scenes": [
    {
      "id": "meadow",
      "name": "Peaceful Meadow",
      "description": "A serene meadow with flowers and gentle breeze",
      "imageUrl": "/scenes/meadow.jpg"
    }
  ]
}
```

### Generate Scenes

Creates new scene backgrounds using AI.

**Endpoint:** `POST /api/generate-scenes`

**Request Body:**
```json
{
  "description": "Mystical forest with glowing mushrooms",
  "style": "pixel-art"
}
```

### Upload Scene Image

Uploads a custom scene background.

**Endpoint:** `POST /api/upload-scene-image`

**Request Body:** `multipart/form-data`
- `file`: Image file
- `sceneName`: String
- `sceneDescription`: String

---

## 🎭 Item Management

### Generate Item Image

Creates item images using AI for the inventory system.

**Endpoint:** `POST /api/generate-item-image`

**Request Body:**
```json
{
  "itemName": "Mystical Wizard Hat",
  "slot": "head",
  "description": "A starry blue wizard hat with magical properties"
}
```

**Response:**
```json
{
  "success": true,
  "imageUrl": "/items/wizard_hat.png",
  "itemId": "wizard_hat"
}
```

### Upload Item Image

Uploads a custom item image.

**Endpoint:** `POST /api/upload-item-image`

**Request Body:** `multipart/form-data`
- `file`: Image file
- `itemName`: String
- `slot`: String (head, face, upper_body, lower_body, feet, accessory)

---

## 💬 Chat System

### Bunny Chat

Handles AI-powered conversations with contextual awareness.

**Endpoint:** `POST /api/bunny-chat`

**Request Body:**
```json
{
  "message": "How are you feeling today?",
  "bunnyId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "response": "I'm feeling absolutely magical in my wizard hat! The stars seem to be aligning perfectly today. ✨",
  "bunnyContext": {
    "name": "Whiskers",
    "personality": {
      "humor": 0.8,
      "energy": 0.7,
      "friendliness": 0.9
    },
    "currentOutfit": ["Mystical Wizard Hat"]
  }
}
```

---

## 🧹 Maintenance

### Clear Data

**⚠️ Development Tool** - Clears all generated data and resets the system.

**Endpoint:** `POST /api/clear-data`

**Response:**
```json
{
  "success": true,
  "message": "All data cleared successfully",
  "cleared": {
    "generatedImages": 15,
    "outfitRecords": 8,
    "inventoryItems": 127
  }
}
```

### Analyze Outfit Backgrounds

Analyzes generated outfit backgrounds for transparency and quality.

**Endpoint:** `GET /api/analyze-outfit-backgrounds`

**Response:**
```json
{
  "analysis": [
    {
      "outfitKey": "bunny-base_wizard_hat",
      "hasTransparency": true,
      "backgroundColor": "white",
      "imageSize": {
        "width": 512,
        "height": 512
      }
    }
  ]
}
```

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "error": "Error message",
  "success": false,
  "details": "Additional error details (optional)",
  "code": "ERROR_CODE (optional)"
}
```

### Common HTTP Status Codes

- **200**: Success
- **400**: Bad Request - Invalid parameters
- **401**: Unauthorized - Authentication required
- **403**: Forbidden - Insufficient permissions
- **404**: Not Found - Resource doesn't exist
- **500**: Internal Server Error - Server-side error

### Common Error Scenarios

1. **RLS Policy Violations**: When user tries to access data they don't own
2. **AI Generation Failures**: When Gemini API encounters issues
3. **File System Errors**: When image generation or storage fails
4. **Database Constraints**: When data violates database rules

---

## Rate Limiting

Currently, rate limiting is handled by:
- **Supabase**: Database query limits
- **Google AI**: API quota limits
- **Next.js**: Natural request throttling

Consider implementing application-level rate limiting for production use.

---

## Development Notes

### Testing APIs

Use tools like Postman, curl, or the built-in browser network tab to test endpoints:

```bash
# Test inventory population
curl -X POST http://localhost:3000/api/debug-populate-inventory \
  -H "Content-Type: application/json" \
  -d '{"bunnyId": "your-bunny-id"}'

# Test outfit generation
curl -X POST http://localhost:3000/api/generate-bunny-image \
  -H "Content-Type: application/json" \
  -d '{
    "bunnyId": "your-bunny-id",
    "equippedItems": [],
    "generateAnimation": true
  }'
```

### API Evolution

The API is designed to be backward compatible. New fields are added as optional parameters, and existing endpoints maintain their contract.

---

*Last updated: September 2025*
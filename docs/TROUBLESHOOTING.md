# Troubleshooting Guide

Comprehensive troubleshooting guide for common issues, debugging techniques, and solutions for the Bunny Tamagotchi application.

## 🚨 Common Issues & Solutions

### 1. Application Won't Start

#### Issue: `npm run dev` fails to start
```bash
Error: Cannot find module 'next'
```

**Solutions:**
```bash
# 1. Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# 2. Check Node.js version (requires 18+)
node --version

# 3. Clear Next.js cache
rm -rf .next

# 4. Verify package.json integrity
npm audit fix
```

#### Issue: Port already in use
```bash
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**
```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- -p 3001

# Or set PORT environment variable
PORT=3001 npm run dev
```

### 2. Database Connection Issues

#### Issue: Supabase connection fails
```typescript
Error: Invalid API key or project URL
```

**Diagnosis Steps:**
```typescript
// 1. Verify environment variables
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Anon Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// 2. Test connection
const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('items').select('count(*)');
    if (error) throw error;
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
};
```

**Common Solutions:**
1. **Wrong URL format**: Ensure URL includes `https://` and `.supabase.co`
2. **Incorrect keys**: Copy fresh keys from Supabase dashboard
3. **Project paused**: Reactivate project in Supabase dashboard
4. **RLS policies**: Ensure user is authenticated for protected queries

#### Issue: Row Level Security (RLS) violations
```sql
Error: new row violates row-level security policy for table "bunnies"
```

**Diagnosis:**
```sql
-- Check if user is authenticated
SELECT auth.uid();

-- Verify bunny ownership
SELECT b.id, b.user_id, auth.uid() 
FROM bunnies b 
WHERE b.id = 'your-bunny-id';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'bunnies';
```

**Solutions:**
1. **Authentication**: Ensure user is logged in via Supabase Auth
2. **Ownership**: Verify user owns the bunny they're trying to access
3. **Service role**: Use service role key for admin operations
4. **Policy review**: Check RLS policies match application logic

### 3. AI Generation Issues

#### Issue: Gemini API failures
```javascript
Error: [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent: [500 Internal Server Error]
```

**Diagnosis Steps:**
```typescript
// 1. Check API key validity
const testGemini = async () => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-image-preview' 
    });
    
    const result = await model.generateContent('Test');
    console.log('✅ Gemini API working');
  } catch (error) {
    console.error('❌ Gemini API failed:', error);
  }
};

// 2. Check quota usage
// Visit: https://console.cloud.google.com/
```

**Common Solutions:**
1. **Invalid API key**: Generate new key from Google AI Studio
2. **Quota exceeded**: Monitor usage in Google Cloud Console
3. **Rate limiting**: Implement exponential backoff retry logic
4. **Model availability**: Check if model version is still supported

#### Issue: Generation takes too long or times out
```javascript
Error: Generation timeout after 120000ms
```

**Solutions:**
```typescript
// 1. Increase timeout for complex generations
const GENERATION_TIMEOUT = {
  simple: 30000,     // 30 seconds for single items
  complex: 120000,   // 2 minutes for multiple items
  maximum: 300000    // 5 minutes absolute maximum
};

// 2. Optimize image sizes before sending to AI
const optimizeImageForAI = async (imageBuffer: Buffer): Promise<Buffer> => {
  return sharp(imageBuffer)
    .resize(512, 512, { fit: 'contain' })
    .png({ quality: 80 })
    .toBuffer();
};

// 3. Use queue system for large requests
const generationQueue = new PQueue({ 
  concurrency: 2,           // Max 2 concurrent generations
  intervalCap: 10,          // Max 10 requests per interval
  interval: 60000           // 1 minute interval
});
```

### 4. Image Processing Issues

#### Issue: Images not displaying or appearing corrupted
```
Failed to load image: /generated-bunnies/outfit-key/normal.png
```

**Diagnosis:**
```bash
# 1. Check if files exist
ls -la public/generated-bunnies/outfit-key/

# 2. Check file permissions
chmod 644 public/generated-bunnies/outfit-key/*.png

# 3. Verify image integrity
file public/generated-bunnies/outfit-key/normal.png

# 4. Test image with Sharp
node -e "
const sharp = require('sharp');
sharp('public/generated-bunnies/outfit-key/normal.png')
  .metadata()
  .then(info => console.log('✅ Image valid:', info))
  .catch(err => console.error('❌ Image corrupted:', err));
"
```

**Solutions:**
1. **File permissions**: Ensure files are readable (644)
2. **Disk space**: Check available storage space
3. **Image corruption**: Regenerate corrupted images
4. **Cache issues**: Clear browser cache or add cache busting

#### Issue: Cache not updating after regeneration
```
Browser shows old image despite regeneration
```

**Solutions:**
```typescript
// 1. Implement cache busting with timestamps
const cacheKey = new Date().getTime();
const imageUrl = `/generated-bunnies/${outfitKey}/normal.png?v=${cacheKey}`;

// 2. Set proper cache headers
const cacheHeaders = {
  'Cache-Control': 'public, max-age=3600, must-revalidate',
  'ETag': `"${fileModifiedTime}"`,
  'Last-Modified': new Date(fileModifiedTime).toUTCString()
};

// 3. Force refresh in development
if (process.env.NODE_ENV === 'development') {
  const noCacheUrl = `${imageUrl}&nocache=${Math.random()}`;
}
```

### 5. Inventory & Equipment Issues

#### Issue: Items not appearing in inventory
```typescript
Error: Inventory appears empty despite debug population
```

**Diagnosis:**
```sql
-- Check if items were actually inserted
SELECT COUNT(*) FROM bunny_inventory WHERE bunny_id = 'your-bunny-id';

-- Check RLS policy allows access
SELECT bi.*, i.name 
FROM bunny_inventory bi 
JOIN items i ON bi.item_id = i.id 
WHERE bi.bunny_id = 'your-bunny-id';

-- Verify bunny ownership
SELECT * FROM bunnies WHERE id = 'your-bunny-id' AND user_id = auth.uid();
```

**Solutions:**
```typescript
// 1. Use service role for debug operations
const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

// 2. Verify user authentication
const user = await supabase.auth.getUser();
if (!user.data.user) {
  throw new Error('User not authenticated');
}

// 3. Check bunny ownership before operations
const { data: bunny } = await supabase
  .from('bunnies')
  .select('id')
  .eq('id', bunnyId)
  .single();

if (!bunny) {
  throw new Error('Bunny not found or access denied');
}
```

#### Issue: Equipment conflicts
```sql
Error: duplicate key value violates unique constraint "bunny_equipment_bunny_id_slot_item_id_key"
```

**Solutions:**
```typescript
// 1. Use upsert for equipment updates
const { error } = await supabase
  .from('bunny_equipment')
  .upsert({
    bunny_id: bunnyId,
    item_id: itemId,
    slot: slot,
    equipped_at: new Date().toISOString()
  }, {
    onConflict: 'bunny_id,slot,item_id'
  });

// 2. Remove existing items from slot before equipping
const equipItem = async (bunnyId: string, itemId: string, slot: string) => {
  // Remove existing items from this slot (except accessories)
  if (slot !== 'accessory') {
    await supabase
      .from('bunny_equipment')
      .delete()
      .eq('bunny_id', bunnyId)
      .eq('slot', slot);
  }
  
  // Equip new item
  await supabase
    .from('bunny_equipment')
    .insert({
      bunny_id: bunnyId,
      item_id: itemId,
      slot: slot
    });
};
```

### 6. Performance Issues

#### Issue: Slow page loads
```
Page takes more than 5 seconds to load
```

**Diagnosis Tools:**
```typescript
// 1. Performance monitoring
const performanceObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.entryType === 'navigation') {
      console.log('Page load time:', entry.loadEventEnd - entry.fetchStart);
    }
  });
});
performanceObserver.observe({ entryTypes: ['navigation'] });

// 2. Database query analysis
const startTime = performance.now();
const { data, error } = await supabase.from('items').select('*');
const endTime = performance.now();
console.log(`Query took ${endTime - startTime} milliseconds`);

// 3. Memory usage monitoring
const memoryUsage = process.memoryUsage();
console.log('Memory usage:', {
  rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
  heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
});
```

**Solutions:**
```typescript
// 1. Implement proper caching
const outfitCache = new Map<string, CachedOutfit>();

// 2. Optimize database queries
const optimizedQuery = supabase
  .from('bunny_inventory')
  .select(`
    *,
    items:item_id(name, image_url, slot, rarity)
  `)
  .eq('bunny_id', bunnyId);

// 3. Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  // Component implementation
});

// 4. Implement lazy loading
const LazyOutfitGallery = lazy(() => import('./OutfitGallery'));
```

#### Issue: Memory leaks during image generation
```
Error: JavaScript heap out of memory
```

**Solutions:**
```typescript
// 1. Properly dispose of Sharp instances
const processImage = async (imageBuffer: Buffer): Promise<Buffer> => {
  const sharp = Sharp(imageBuffer);
  try {
    const result = await sharp
      .resize(512, 512)
      .png()
      .toBuffer();
    return result;
  } finally {
    sharp.destroy(); // Clean up resources
  }
};

// 2. Implement generation queues
const generationQueue = new PQueue({ 
  concurrency: 1,  // Process one at a time to control memory
  timeout: 120000  // 2 minute timeout
});

// 3. Monitor memory usage
const checkMemoryUsage = () => {
  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  
  if (heapUsedMB > 1000) { // 1GB threshold
    console.warn('High memory usage detected:', heapUsedMB, 'MB');
    // Trigger garbage collection if needed
    if (global.gc) {
      global.gc();
    }
  }
};
```

---

## 🔍 Debugging Techniques

### 1. Logging Configuration

#### Development Logging
```typescript
// lib/logger.ts
export const logger = {
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`🔍 ${message}`, data || '');
    }
  },
  
  info: (message: string, data?: any) => {
    console.info(`ℹ️ ${message}`, data || '');
  },
  
  warn: (message: string, data?: any) => {
    console.warn(`⚠️ ${message}`, data || '');
  },
  
  error: (message: string, error?: any) => {
    console.error(`❌ ${message}`, error || '');
    
    // Send to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // Send to error tracking service
    }
  }
};

// Usage
logger.debug('Starting outfit generation', { outfitKey, itemCount: items.length });
logger.info('Outfit generation completed', { generationTime: '2.3s' });
logger.warn('Generation took longer than expected', { actualTime: '5.2s' });
logger.error('Generation failed', error);
```

#### API Route Debugging
```typescript
// api/generate-bunny-image/route.ts
export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9);
  logger.info(`[${requestId}] Starting bunny generation`);
  
  try {
    const startTime = Date.now();
    const body = await request.json();
    
    logger.debug(`[${requestId}] Request body`, body);
    
    // Generation logic here...
    
    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Generation completed in ${duration}ms`);
    
    return NextResponse.json({ success: true, requestId });
    
  } catch (error) {
    logger.error(`[${requestId}] Generation failed`, error);
    return NextResponse.json(
      { error: 'Generation failed', requestId },
      { status: 500 }
    );
  }
}
```

### 2. Database Debugging

#### Query Performance Analysis
```sql
-- Enable query logging in Supabase
-- Dashboard > Settings > Database > Query Performance

-- Analyze slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;
```

#### RLS Policy Testing
```sql
-- Test RLS policies as specific user
SET SESSION AUTHORIZATION 'user-uuid-here';

-- Run queries to see what they can access
SELECT * FROM bunnies;
SELECT * FROM bunny_inventory;

-- Reset to default
RESET SESSION AUTHORIZATION;
```

### 3. AI Generation Debugging

#### Prompt Analysis
```typescript
// Debug prompt generation
const debugPrompt = (equippedItems: EquippedItem[]) => {
  const prompt = buildOutfitPrompt(equippedItems);
  
  console.log('🎨 Generated Prompt:');
  console.log('====================');
  console.log(prompt);
  console.log('====================');
  console.log('Items:', equippedItems.map(item => `${item.name} (${item.slot})`));
  
  return prompt;
};

// Save generated images for manual inspection
const saveDebugImage = async (imageBuffer: Buffer, filename: string) => {
  if (process.env.NODE_ENV === 'development') {
    const debugPath = `public/debug-images/${filename}`;
    await fs.writeFile(debugPath, imageBuffer);
    console.log(`🖼️ Debug image saved: ${debugPath}`);
  }
};
```

#### Generation Metrics
```typescript
// Track generation performance
interface GenerationMetrics {
  outfitKey: string;
  itemCount: number;
  startTime: number;
  endTime: number;
  cacheHit: boolean;
  errorCount: number;
  retryCount: number;
}

const metricsMap = new Map<string, GenerationMetrics>();

const trackGeneration = (outfitKey: string, metrics: Partial<GenerationMetrics>) => {
  const existing = metricsMap.get(outfitKey) || { outfitKey, startTime: Date.now() };
  metricsMap.set(outfitKey, { ...existing, ...metrics });
  
  if (metrics.endTime) {
    const duration = metrics.endTime - existing.startTime;
    logger.info(`Generation metrics for ${outfitKey}`, {
      duration: `${duration}ms`,
      itemCount: existing.itemCount,
      cacheHit: existing.cacheHit,
      retries: existing.retryCount || 0
    });
  }
};
```

---

## 🛠️ Developer Tools

### 1. Built-in Debug Features

#### Admin Panel Access
```typescript
// Enable admin panel in development
const isAdmin = process.env.NODE_ENV === 'development' || 
                process.env.ENABLE_ADMIN_PANEL === 'true';

// Access admin features
if (isAdmin) {
  // Debug inventory population
  // Force outfit regeneration
  // System health checks
  // Performance metrics
}
```

#### Debug Console Commands
```javascript
// Browser console helpers (development only)
window.bunnyDebug = {
  // Clear all generated images
  clearImages: () => fetch('/api/clear-data', { method: 'POST' }),
  
  // Force regenerate specific outfit
  regenerateOutfit: (key) => fetch('/api/force-regenerate-outfit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outfitKey: key })
  }),
  
  // Populate inventory with all items
  populateInventory: (bunnyId) => fetch('/api/debug-populate-inventory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bunnyId })
  }),
  
  // Get system health
  health: () => fetch('/api/health').then(r => r.json())
};
```

### 2. External Debugging Tools

#### Database Tools
- **Supabase Dashboard**: Visual query builder and data browser
- **pgAdmin**: Advanced PostgreSQL management
- **DataGrip**: Professional database IDE

#### API Testing Tools
- **Postman**: API endpoint testing
- **Insomnia**: REST client with environment management
- **curl**: Command-line HTTP testing

#### Performance Analysis
- **Next.js Bundle Analyzer**: Bundle size analysis
- **Lighthouse**: Performance auditing
- **React DevTools Profiler**: Component performance analysis

---

## 📋 Common Error Codes

### Application Error Codes

| Code | Description | Common Causes | Solutions |
|------|-------------|---------------|-----------|
| `AUTH_001` | User not authenticated | Missing/expired session | Re-login, refresh tokens |
| `AUTH_002` | Insufficient permissions | RLS policy violation | Check user ownership |
| `DB_001` | Database connection failed | Network/config issue | Verify Supabase settings |
| `DB_002` | Query timeout | Slow query/poor indexes | Optimize queries, add indexes |
| `AI_001` | Gemini API failure | Service unavailable | Retry with backoff |
| `AI_002` | Generation timeout | Complex request | Reduce complexity, increase timeout |
| `FILE_001` | File not found | Missing generated image | Regenerate outfit |
| `FILE_002` | Permission denied | File access issue | Check permissions |
| `CACHE_001` | Cache miss | Cache expired/cleared | Normal, will regenerate |
| `RATE_001` | Rate limit exceeded | Too many requests | Implement rate limiting |

### HTTP Status Codes

| Status | Meaning | Common Scenarios |
|--------|---------|------------------|
| `200` | Success | Request completed successfully |
| `400` | Bad Request | Invalid parameters, malformed request |
| `401` | Unauthorized | Not logged in, invalid credentials |
| `403` | Forbidden | RLS policy violation, insufficient permissions |
| `404` | Not Found | Resource doesn't exist, invalid endpoint |
| `429` | Too Many Requests | Rate limit exceeded, quota reached |
| `500` | Internal Server Error | Unexpected server error, AI service failure |
| `503` | Service Unavailable | External service down, maintenance mode |

---

## 🆘 Getting Help

### 1. Self-Diagnosis Checklist

Before seeking help, try these steps:

- [ ] Check browser console for JavaScript errors
- [ ] Verify all environment variables are set correctly
- [ ] Test database connection with simple query
- [ ] Check Supabase dashboard for RLS policy issues
- [ ] Verify API quota usage in Google Cloud Console
- [ ] Clear browser cache and try again
- [ ] Check application logs for error messages
- [ ] Try the same operation in incognito mode
- [ ] Verify network connectivity to external services

### 2. Information to Gather

When reporting issues, include:

```typescript
// System information
const systemInfo = {
  nodeVersion: process.version,
  platform: process.platform,
  environment: process.env.NODE_ENV,
  timestamp: new Date().toISOString(),
  userAgent: navigator?.userAgent,
  
  // Application state
  isAuthenticated: !!user,
  currentBunnyId: bunnyId,
  lastError: lastErrorMessage,
  
  // Configuration (sanitized)
  hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  hasGeminiKey: !!process.env.GOOGLE_AI_API_KEY,
};

console.log('System Info for Support:', systemInfo);
```

### 3. Debug Data Export

```typescript
// Export debug information
const exportDebugData = async () => {
  const debugData = {
    timestamp: new Date().toISOString(),
    system: systemInfo,
    
    // Recent errors (last 10)
    recentErrors: errorLog.slice(-10),
    
    // Current bunny state
    bunnyState: {
      id: bunnyId,
      equippedItems: equippedItems.map(item => ({
        id: item.item_id,
        name: item.name,
        slot: item.slot
      })),
      inventoryCount: inventoryItems.length
    },
    
    // Performance metrics
    metrics: {
      averageGenerationTime: getAverageGenerationTime(),
      cacheHitRate: getCacheHitRate(),
      errorRate: getErrorRate()
    }
  };
  
  // Download as JSON file
  const blob = new Blob([JSON.stringify(debugData, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bunny-debug-${Date.now()}.json`;
  a.click();
};
```

---

*Last updated: September 2025*
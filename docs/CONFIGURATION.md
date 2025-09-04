# Configuration Guide

Complete guide for setting up, configuring, and deploying the Bunny Tamagotchi application across different environments.

## 🔧 Environment Setup

### Prerequisites

#### Required Software
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 9.0.0 or higher (comes with Node.js)
- **Git**: For version control and deployment

#### Required Services
- **Supabase Account**: For database and authentication
- **Google AI API Key**: For Gemini image generation
- **Vercel Account**: For deployment (recommended)

#### System Requirements
- **RAM**: Minimum 4GB, recommended 8GB for development
- **Storage**: At least 2GB free space for dependencies and generated images
- **Network**: Stable internet connection for AI API calls

---

## 🌍 Environment Variables

### Required Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Google AI Configuration
GOOGLE_AI_API_KEY=your-gemini-api-key-here

# Next.js Configuration (optional)
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=http://localhost:3000

# Development Configuration (optional)
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Environment Variable Descriptions

#### Supabase Variables
```env
# Public Supabase URL - Safe to expose to client
NEXT_PUBLIC_SUPABASE_URL=https://ppzteuipicxvjhqhlqye.supabase.co

# Anonymous key - Safe to expose, limited permissions
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service role key - NEVER expose to client, full admin access
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Google AI Configuration
```env
# Gemini API key from Google AI Studio
GOOGLE_AI_API_KEY=AIzaSy...

# Optional: Specify model version
GOOGLE_AI_MODEL=gemini-2.5-flash-image-preview
```

#### Application Configuration
```env
# Application environment
NODE_ENV=development|production|test

# Base application URL
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Debug features (development only)
ENABLE_DEBUG_TOOLS=true
ENABLE_ADMIN_PANEL=true
```

---

## 🗄️ Database Configuration

### Supabase Setup

#### 1. Create Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose organization and set project details
4. Wait for project initialization (2-3 minutes)

#### 2. Get Connection Details
```bash
# From Supabase Dashboard > Settings > API
Project URL: https://your-project-id.supabase.co
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 3. Database Schema Setup
```bash
# Run database migrations
npm run migrate

# Or manually run migration files
psql -h db.your-project.supabase.co -U postgres -d postgres -f scripts/migrations/001_initial_schema.sql
```

#### 4. Row Level Security Setup
```sql
-- Enable RLS on all user tables
ALTER TABLE bunnies ENABLE ROW LEVEL SECURITY;
ALTER TABLE bunny_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE bunny_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create security policies (handled by migrations)
```

### Authentication Configuration

#### Supabase Auth Settings
```json
// supabase/config.toml (if using local development)
{
  "auth": {
    "site_url": "http://localhost:3000",
    "additional_redirect_urls": ["https://your-domain.com"],
    "jwt_expiry": 3600,
    "enable_signup": true,
    "enable_confirmations": false
  }
}
```

#### Email Templates (Optional)
Configure custom email templates in Supabase Dashboard:
- **Confirmation Email**: Welcome new users
- **Password Reset**: Custom reset instructions
- **Email Change**: Confirmation for email updates

---

## 🤖 AI Service Configuration

### Google Gemini Setup

#### 1. Get API Key
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create new project or select existing
3. Generate API key
4. Copy key to environment variables

#### 2. API Quota Management
```javascript
// lib/geminiService.ts configuration
const GEMINI_CONFIG = {
  model: 'gemini-2.5-flash-image-preview',
  generationConfig: {
    temperature: 0.1,        // Low for consistent results
    topK: 32,               // Controlled creativity
    topP: 1,                // Full probability distribution
    maxOutputTokens: 8192,  // Sufficient for complex prompts
  }
};
```

#### 3. Rate Limiting Configuration
```typescript
// Retry configuration for API calls
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,         // 1 second initial delay
  backoffMultiplier: 2,    // Exponential backoff
  maxDelay: 10000         // Maximum 10 second delay
};
```

#### 4. Quota Monitoring
Monitor your API usage at [Google Cloud Console](https://console.cloud.google.com/):
- **Requests per minute**: Default 60 RPM
- **Requests per day**: Default 1,500 RPD
- **Concurrent requests**: Default 5

---

## 🖼️ File Storage Configuration

### Development Storage
```typescript
// File system configuration for development
const STORAGE_CONFIG = {
  development: {
    basePath: path.join(process.cwd(), 'public', 'generated-bunnies'),
    maxFileSize: 5 * 1024 * 1024,  // 5MB per file
    allowedFormats: ['png', 'jpg', 'webp'],
    cleanupInterval: 24 * 60 * 60 * 1000  // 24 hours
  }
};
```

### Production Storage
```typescript
// Production file handling
const PRODUCTION_STORAGE = {
  basePath: '/var/www/bunny-static/generated-bunnies',
  cdnUrl: 'https://cdn.your-domain.com',
  cacheHeaders: {
    'Cache-Control': 'public, max-age=3600',
    'ETag': true
  }
};
```

### Storage Cleanup
```typescript
// Automatic cleanup configuration
const CLEANUP_CONFIG = {
  enabled: true,
  retentionDays: 30,        // Keep files for 30 days
  batchSize: 100,           // Process 100 files at a time
  schedule: '0 2 * * *'     // Run daily at 2 AM
};
```

---

## 🎨 UI Configuration

### Theme Configuration
```typescript
// tailwind.config.ts
const themeConfig = {
  colors: {
    bunny: {
      pink: '#FFE5F1',
      purple: '#E5D4FF', 
      cream: '#FFF8E7',
      green: '#90EE90'
    }
  },
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif']
  },
  animation: {
    'bounce-gentle': 'bounce 2s infinite',
    'pulse-soft': 'pulse 3s infinite'
  }
};
```

### PWA Configuration
```javascript
// next.config.js PWA settings
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
  }
});
```

### Mobile Configuration
```json
// public/manifest.json
{
  "name": "Bunny Tamagotchi",
  "short_name": "Bunny",
  "description": "Your virtual bunny companion",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#FFE5F1",
  "background_color": "#FFFFFF",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-512x512.png", 
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    }
  ]
}
```

---

## 🚀 Deployment Configuration

### Vercel Deployment (Recommended)

#### 1. Project Setup
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Initialize project
vercel

# Deploy
vercel --prod
```

#### 2. Environment Variables (Vercel Dashboard)
```bash
# Production environment variables
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=prod-service-key
GOOGLE_AI_API_KEY=prod-gemini-key
NODE_ENV=production
```

#### 3. Build Configuration
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/cleanup-old-files",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Alternative Deployment Options

#### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

#### Traditional Server Deployment
```bash
# Build for production
npm run build

# Start production server
npm start

# Or use PM2 for process management
npm install -g pm2
pm2 start npm --name "bunny-tamagotchi" -- start
pm2 startup
pm2 save
```

---

## 🔍 Monitoring Configuration

### Error Tracking
```typescript
// lib/errorTracking.ts
const ERROR_CONFIG = {
  enableLogging: process.env.NODE_ENV === 'production',
  logLevel: process.env.LOG_LEVEL || 'info',
  enableErrorReporting: true,
  sampleRate: 0.1  // Log 10% of requests
};
```

### Performance Monitoring
```typescript
// lib/performance.ts
const PERFORMANCE_CONFIG = {
  enableMetrics: true,
  metricsEndpoint: '/api/metrics',
  sampleRate: 1.0,  // Monitor all requests in development
  thresholds: {
    responseTime: 2000,      // 2 second warning
    generationTime: 30000,   // 30 second timeout
    errorRate: 0.05          // 5% error rate alert
  }
};
```

### Health Checks
```typescript
// api/health/route.ts
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabase(),
      ai: await checkGeminiAPI(),
      storage: await checkFileSystem()
    }
  };
  
  return Response.json(health);
}
```

---

## 🔒 Security Configuration

### Content Security Policy
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com"
    ].join('; ')
  }
];
```

### CORS Configuration
```typescript
// lib/cors.ts
const CORS_CONFIG = {
  origin: [
    'http://localhost:3000',
    'https://your-domain.com',
    'https://your-domain.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-base-bunny',
    'x-scene'
  ]
};
```

### Rate Limiting
```typescript
// lib/rateLimit.ts
const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // Max 100 requests per window
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false
};
```

---

## 🧪 Testing Configuration

### Test Environment Setup
```env
# .env.test
NODE_ENV=test
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key
GOOGLE_AI_API_KEY=test-key
```

### Jest Configuration
```javascript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

module.exports = createJestConfig(customJestConfig);
```

### E2E Testing Configuration
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
```

---

## 📋 Development Configuration

### Local Development Setup
```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "emmet.includeLanguages": {
    "typescript": "html"
  }
}
```

### Prettier Configuration
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "printWidth": 80,
  "arrowParens": "avoid"
}
```

### ESLint Configuration
```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "no-unused-vars": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "prefer-const": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

---

## 🔧 Troubleshooting Configuration Issues

### Common Configuration Problems

#### 1. Environment Variables Not Loading
```bash
# Verify .env.local file exists and has correct format
cat .env.local

# Check Next.js is loading variables
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
```

#### 2. Database Connection Issues
```typescript
// Test database connection
const testConnection = async () => {
  const { data, error } = await supabase
    .from('items')
    .select('count(*)')
    .single();
    
  if (error) {
    console.error('Database connection failed:', error);
  } else {
    console.log('Database connected, item count:', data.count);
  }
};
```

#### 3. AI API Issues
```typescript
// Test Gemini API connection
const testGemini = async () => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-image-preview' 
    });
    
    const result = await model.generateContent('Hello');
    console.log('Gemini API connected successfully');
  } catch (error) {
    console.error('Gemini API failed:', error);
  }
};
```

### Configuration Validation
```typescript
// lib/configValidation.ts
export function validateConfiguration() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GOOGLE_AI_API_KEY'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  console.log('✅ Configuration validation passed');
}
```

---

*Last updated: September 2025*
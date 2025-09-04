
# 🐰 Bunny Tamagotchi

A sophisticated virtual bunny companion powered by AI image generation, featuring dynamic outfit customization, personality-driven chat interactions, and immersive animated environments.

## 🌟 Features

- **AI-Generated Outfits**: Dynamic bunny outfit generation using Google's Gemini AI with 50+ clothing items
- **Smart Inventory System**: Complete item management with categories, rarities, and shopping functionality
- **Personality-Driven Chat**: Contextual AI conversations that reflect your bunny's current mood and outfit
- **Animated Expressions**: Real-time bunny animations (normal, blink, smile, wave) with smooth transitions
- **Dynamic Scenes**: Beautiful animated environments with day/night cycles and weather effects
- **Progressive Web App**: Full PWA support with offline functionality and mobile-optimized UI
- **Transparent Base System**: Optimized rendering pipeline using processed transparent base images
- **Real-time Updates**: Live inventory population and outfit synchronization

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Google AI (Gemini) API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bunny-tamagotchi
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   GOOGLE_AI_API_KEY=your_gemini_api_key
   ```

4. **Database Setup**
   ```bash
   npm run migrate
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Initial Data Population** (Development)
   - Open the app and create your first bunny
   - Use the debug inventory population feature to add all items for testing

## 📖 Documentation

- [**Architecture Overview**](./docs/ARCHITECTURE.md) - System design and component relationships
- [**API Reference**](./docs/API.md) - Complete API endpoint documentation
- [**Outfit Generation Pipeline**](./docs/OUTFIT_GENERATION.md) - Detailed AI generation process
- [**Database Schema**](./docs/DATABASE.md) - Complete database structure and relationships
- [**Configuration Guide**](./docs/CONFIGURATION.md) - Environment setup and deployment
- [**Troubleshooting**](./docs/TROUBLESHOOTING.md) - Common issues and solutions

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js App   │───▶│  Supabase DB     │───▶│  Google Gemini  │
│   (Frontend)    │    │  (PostgreSQL)    │    │  (AI Generation)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   PWA Features  │    │ RLS Policies     │    │ Image Pipeline  │
│   Service Worker│    │ User Isolation   │    │ Sharp Processing│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🎨 Key Systems

### 1. Outfit Generation Pipeline
- **Base Processing**: Transparent base bunny images optimized for composition
- **Item Integration**: AI-powered natural clothing integration (not overlays)
- **Animation Frames**: Automatic generation of blink, smile, and wave variants
- **Cache Management**: Smart caching with automatic invalidation

### 2. Inventory Management
- **Dynamic Population**: Debug tools for instant inventory management
- **Category System**: Organized by head, face, upper_body, lower_body, feet, accessory
- **Rarity Tiers**: Common, uncommon, rare, epic, legendary
- **Shopping Interface**: Integrated purchase system with cost management

### 3. AI Chat System
- **Contextual Awareness**: Chat responses based on current outfit and personality
- **Personality Traits**: Adjustable humor, energy, and friendliness levels
- **Response Processing**: Post-processed responses to maintain character consistency

## 🔧 Development

### Key Components

- **`/app/components/`**: React components (Wardrobe, BunnyChat, AdminPanel)
- **`/app/lib/`**: Core services (GeminiImageService, InventoryService, BunnyPersonality)
- **`/app/api/`**: Next.js API routes for all backend functionality
- **`/app/context/`**: React contexts for state management
- **`/public/generated-bunnies/`**: Generated outfit storage

### Important Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run migrate      # Run database migrations
npm run migrate:show # Show migration status
```

### Debug Tools

- **Inventory Population**: Automatically adds all items to bunny's inventory
- **Force Regeneration**: Regenerate specific outfits with improved prompts
- **Admin Panel**: Complete outfit and scene management interface

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Configure environment variables
3. Deploy with automatic builds

### Manual Deployment

```bash
npm run build
npm start
```

Ensure your hosting platform supports:
- Next.js 15.x
- Node.js 18+
- Static file serving for generated images

## 🔒 Security Features

- **Row Level Security (RLS)**: User data isolation in Supabase
- **Service Role Authentication**: Admin operations with elevated privileges
- **Input Validation**: Comprehensive API parameter validation
- **CORS Configuration**: Proper cross-origin request handling

## 🧪 Recent Improvements

### Outfit Integration Fix (Latest)
- **Problem**: Items appeared as floating overlays instead of integrated clothing
- **Solution**: Rewrote all AI prompts to emphasize natural integration
- **Impact**: Much more realistic and professional-looking outfit generation

### Complete Outfit Validation
- **Problem**: Incomplete outfits appeared in lists during generation
- **Solution**: Only show outfits when ALL animation frames are generated
- **Impact**: Users never see broken or incomplete outfits

### Cache Busting System
- **Problem**: Browser cached old images after regeneration
- **Solution**: Automatic cache busting using file modification timestamps
- **Impact**: Regenerated outfits appear immediately without manual cache clearing

## 📊 Performance Optimizations

- **Transparent Base System**: 4% faster generation using pre-processed base images
- **Bulk Database Operations**: Upsert operations for efficient inventory management
- **Smart Caching**: File-based caching with automatic invalidation
- **Progressive Loading**: Lazy loading for large outfit galleries

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

[Add your license information here]

## 🙏 Acknowledgments

- **Google Gemini AI**: For powerful image generation capabilities
- **Supabase**: For robust backend infrastructure
- **Next.js**: For excellent full-stack framework
- **Vercel**: For seamless deployment platform

---

*Last updated: September 2025*
*Version: 1.0.0*
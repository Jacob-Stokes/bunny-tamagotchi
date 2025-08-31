
# Bunny Tamagotchi 🐰

A cute virtual bunny companion built as a mobile-first Progressive Web App (PWA) using Next.js, React, TypeScript, and Tailwind CSS.

## Project Overview

This is a Tamagotchi-style virtual pet game featuring an adorable bunny that users can care for through various interactions. The app is designed to be a mobile-native experience with touch-friendly controls and responsive design.

## Features

### Current Implementation
- **Virtual Bunny Display**: Features a cute bunny character with visual representation
- **Stats System**: Tracks bunny's vital stats (currently placeholders):
  - 💖 Happiness
  - 🍕 Hunger  
  - 😴 Energy
- **Action Buttons**: Four main care actions:
  - 🥕 Feed - Keep your bunny well-fed
  - 🎮 Play - Increase happiness through play
  - 💤 Sleep - Help your bunny rest and recover energy
  - 🧼 Clean - Keep your bunny clean and healthy
- **Mobile-First Design**: Optimized for mobile devices with touch-safe buttons
- **PWA Ready**: Configured as a Progressive Web App for mobile installation

### Design System
- **Color Palette**: Soft, bunny-themed colors
  - Pink: `#FFE5F1` (bunny-pink)
  - Purple: `#E5D4FF` (bunny-purple) 
  - Cream: `#FFF8E7` (bunny-cream)
- **Gradient Background**: Beautiful pink-to-purple gradient
- **Glassmorphism UI**: Translucent panels with backdrop blur effects
- **Touch-Optimized**: 44px minimum touch targets for accessibility

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS 3 with custom design system
- **Icons**: Emoji-based for universal support
- **Mobile**: PWA-enabled with mobile-specific optimizations

## Project Structure

```
bunny-tamagotchi/
├── app/
│   ├── globals.css          # Global styles and mobile optimizations
│   ├── layout.tsx           # Root layout with PWA meta tags
│   └── page.tsx            # Main game interface
├── public/
│   └── base-bunny.png      # Bunny character image
├── components/             # React components (empty - opportunity for refactoring)
├── package.json           # Dependencies and scripts
├── tailwind.config.ts     # Tailwind configuration with custom colors
└── tsconfig.json         # TypeScript configuration
```

## Development Status

### ✅ Completed
- Basic UI/UX design and layout
- Mobile-first responsive design
- PWA configuration and meta tags
- Custom color system and theming
- Touch-safe button implementations
- Bunny character display

### 🚧 In Progress / Next Steps
- **Game Logic**: Stats are currently placeholders - need to implement:
  - State management for bunny stats
  - Action handlers for feed/play/sleep/clean buttons
  - Time-based stat degradation
  - Game progression and scoring
- **Data Persistence**: Local storage for saving game state
- **Animations**: Bunny reactions and UI transitions
- **Sound Effects**: Audio feedback for actions
- **Additional Features**: 
  - Bunny evolution/growth stages
  - Mini-games
  - Achievements system
  - Day/night cycle

## Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
Visit `http://localhost:3000` to see the app.

### Build
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## Mobile Development Notes

The app includes several mobile-specific optimizations:
- Fixed viewport to prevent zooming and scrolling issues
- Safe area insets for notched devices
- Touch callout and selection disabled for app-like experience
- Minimum 44px touch targets for accessibility
- Overscroll behavior disabled to prevent elastic scrolling

## Contributing

This is a learning/development project. Key areas for contribution:
1. Implementing game logic and state management
2. Adding animations and visual feedback
3. Creating a proper component architecture
4. Adding sound effects and haptic feedback
5. Implementing data persistence
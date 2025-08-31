'use client';

import { useState } from 'react';
import { useBunny } from './context/BunnyContext';
import { useAuth } from './context/AuthContext';
import AuthModal from './components/AuthModal';
import InventoryDebug from './components/InventoryDebug';
import AdminPanel from './components/AdminPanel';

export default function Home() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { state, loading, performAction, getStatPercentage, getStatEmoji, bunnyImageUrl, regenerateBunnyImage } = useBunny();
  const { user, signOut, signInAsGuest } = useAuth();
  return (
    <main className="max-w-sm mx-auto p-4 safe-area min-h-screen flex flex-col">
      <div className="flex justify-between items-center py-2">
        <h1 className="text-2xl font-bold text-purple-800">
          Bunny App 🐰
        </h1>
        {user ? (
          <button
            onClick={() => signOut()}
            className="text-sm text-purple-600 hover:text-purple-800"
          >
            Sign Out
          </button>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="text-sm bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700"
          >
            Sign In
          </button>
        )}
      </div>

      {!user ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-purple-700 mb-4">
              Welcome to Bunny Tamagotchi! 🐰
            </h2>
            <p className="text-purple-600 mb-6">
              Sign in to save your bunny progress across devices, or continue as a guest.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors"
              >
                Sign In / Sign Up
              </button>
              <p className="text-xs text-purple-500 text-center">
                Note: Authentication requires Supabase setup
              </p>
              <button
                onClick={() => signInAsGuest()}
                className="w-full bg-bunny-cream text-purple-800 py-3 rounded-xl font-medium hover:bg-bunny-cream/80 transition-colors"
              >
                Continue as Guest
              </button>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">🐰</div>
            <p className="text-purple-700">Loading your bunny...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-start space-y-6">
          <div className="w-full flex flex-col items-center">
            <div className="w-full aspect-square max-w-sm relative">
              <img 
                src={bunnyImageUrl} 
                alt="Bunny" 
                className="w-full h-full object-cover rounded-3xl"
              />
            </div>
            <button 
              onClick={() => regenerateBunnyImage()}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              🔄 Refresh Bunny
            </button>
          </div>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
            <h2 className="text-lg font-semibold text-purple-700 mb-3 text-center">
              Stats
            </h2>
            <div className="space-y-2">
              <p className="text-gray-700">{getStatEmoji('connection')} Connection: {getStatPercentage('connection')}/100</p>
              <p className="text-gray-700">{getStatEmoji('stimulation')} Stimulation: {getStatPercentage('stimulation')}/100</p>
              <p className="text-gray-700">{getStatEmoji('comfort')} Comfort: {getStatPercentage('comfort')}/100</p>
              <p className="text-gray-700">{getStatEmoji('energy')} Energy: {getStatPercentage('energy')}/100</p>
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
            <h2 className="text-lg font-semibold text-purple-700 mb-3 text-center">
              Actions
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => performAction('feed')}
                className="touch-safe bg-bunny-cream/80 hover:bg-bunny-cream rounded-xl py-3 px-4 text-purple-800 font-medium transition-colors"
              >
                🥕 Feed
              </button>
              <button 
                onClick={() => performAction('play')}
                className="touch-safe bg-bunny-cream/80 hover:bg-bunny-cream rounded-xl py-3 px-4 text-purple-800 font-medium transition-colors"
              >
                🎮 Play
              </button>
              <button 
                onClick={() => performAction('sleep')}
                className="touch-safe bg-bunny-cream/80 hover:bg-bunny-cream rounded-xl py-3 px-4 text-purple-800 font-medium transition-colors"
              >
                💤 Sleep
              </button>
              <button 
                onClick={() => performAction('clean')}
                className="touch-safe bg-bunny-cream/80 hover:bg-bunny-cream rounded-xl py-3 px-4 text-purple-800 font-medium transition-colors"
              >
                🧼 Clean
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

      <InventoryDebug />
      <AdminPanel />
    </main>
  )
}
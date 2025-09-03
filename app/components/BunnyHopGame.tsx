'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// SVG Components
const PipeTop = ({ height }: { height: number }) => (
  <svg width="60" height={height} viewBox={`0 0 60 ${height}`} className="fill-green-600">
    <rect x="5" y="0" width="50" height={height-15} />
    <rect x="0" y={height-15} width="60" height="15" />
  </svg>
);

const PipeBottom = ({ height, y }: { height: number; y: number }) => (
  <svg width="60" height={height} viewBox={`0 0 60 ${height}`} className="fill-green-600" style={{ transform: `translateY(${y}px)` }}>
    <rect x="0" y="0" width="60" height="15" />
    <rect x="5" y="15" width="50" height={height-15} />
  </svg>
);

const CloudSVG = ({ x, y, size = 1 }: { x: number; y: number; size?: number }) => (
  <svg 
    width={80 * size} 
    height={40 * size} 
    viewBox="0 0 80 40" 
    className="fill-white/70" 
    style={{ position: 'absolute', left: x, top: y }}
  >
    <circle cx="20" cy="25" r="15" />
    <circle cx="35" cy="20" r="18" />
    <circle cx="50" cy="25" r="15" />
    <circle cx="60" cy="28" r="12" />
  </svg>
);

interface GameState {
  bunnyY: number;
  bunnyVelocity: number;
  pipes: Array<{ x: number; gapY: number; passed: boolean }>;
  score: number;
  isGameOver: boolean;
  isStarted: boolean;
  gameSpeed: number;
}

interface BunnyHopGameProps {
  bunnyImageUrl?: string;
  onGameOver?: (score: number) => void;
  onClose?: () => void;
}

const GAME_CONFIG = {
  BUNNY_SIZE: 40,
  PIPE_WIDTH: 60,
  PIPE_GAP: 120,
  JUMP_FORCE: -8,
  GRAVITY: 0.4,
  PIPE_SPEED: 2,
  PIPE_SPAWN_DISTANCE: 200,
  GAME_WIDTH: 320,
  GAME_HEIGHT: 240,
};

export default function BunnyHopGame({ bunnyImageUrl, onGameOver, onClose }: BunnyHopGameProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<number>();
  const [gameState, setGameState] = useState<GameState>({
    bunnyY: GAME_CONFIG.GAME_HEIGHT / 2,
    bunnyVelocity: 0,
    pipes: [],
    score: 0,
    isGameOver: false,
    isStarted: false,
    gameSpeed: 1,
  });

  const jump = useCallback(() => {
    if (gameState.isGameOver) return;
    
    setGameState(prev => ({
      ...prev,
      bunnyVelocity: GAME_CONFIG.JUMP_FORCE,
      isStarted: true
    }));
  }, [gameState.isGameOver]);

  const resetGame = useCallback(() => {
    setGameState({
      bunnyY: GAME_CONFIG.GAME_HEIGHT / 2,
      bunnyVelocity: 0,
      pipes: [],
      score: 0,
      isGameOver: false,
      isStarted: false,
      gameSpeed: 1,
    });
  }, []);

  // Game loop
  useEffect(() => {
    if (!gameState.isStarted || gameState.isGameOver) return;

    const gameLoop = () => {
      setGameState(prev => {
        const newState = { ...prev };
        
        // Apply gravity
        newState.bunnyVelocity += GAME_CONFIG.GRAVITY;
        newState.bunnyY += newState.bunnyVelocity;
        
        // Check bounds
        if (newState.bunnyY <= 0 || newState.bunnyY >= GAME_CONFIG.GAME_HEIGHT - GAME_CONFIG.BUNNY_SIZE) {
          newState.isGameOver = true;
          return newState;
        }
        
        // Update pipes
        newState.pipes = newState.pipes.map(pipe => ({ ...pipe, x: pipe.x - GAME_CONFIG.PIPE_SPEED }));
        
        // Remove off-screen pipes
        newState.pipes = newState.pipes.filter(pipe => pipe.x > -GAME_CONFIG.PIPE_WIDTH);
        
        // Add new pipes
        const lastPipe = newState.pipes[newState.pipes.length - 1];
        if (!lastPipe || lastPipe.x < GAME_CONFIG.GAME_WIDTH - GAME_CONFIG.PIPE_SPAWN_DISTANCE) {
          newState.pipes.push({
            x: GAME_CONFIG.GAME_WIDTH,
            gapY: 60 + Math.random() * (GAME_CONFIG.GAME_HEIGHT - 180),
            passed: false
          });
        }
        
        // Check collisions and score
        const bunnyRect = {
          x: 80,
          y: newState.bunnyY,
          width: GAME_CONFIG.BUNNY_SIZE,
          height: GAME_CONFIG.BUNNY_SIZE
        };
        
        for (const pipe of newState.pipes) {
          // Check if pipe is passed for scoring
          if (!pipe.passed && pipe.x + GAME_CONFIG.PIPE_WIDTH < bunnyRect.x) {
            pipe.passed = true;
            newState.score++;
          }
          
          // Collision detection
          const pipeRect = { x: pipe.x, y: 0, width: GAME_CONFIG.PIPE_WIDTH, height: pipe.gapY };
          const pipeRect2 = { 
            x: pipe.x, 
            y: pipe.gapY + GAME_CONFIG.PIPE_GAP, 
            width: GAME_CONFIG.PIPE_WIDTH, 
            height: GAME_CONFIG.GAME_HEIGHT - pipe.gapY - GAME_CONFIG.PIPE_GAP 
          };
          
          if (
            (bunnyRect.x < pipeRect.x + pipeRect.width &&
             bunnyRect.x + bunnyRect.width > pipeRect.x &&
             bunnyRect.y < pipeRect.y + pipeRect.height &&
             bunnyRect.y + bunnyRect.height > pipeRect.y) ||
            (bunnyRect.x < pipeRect2.x + pipeRect2.width &&
             bunnyRect.x + bunnyRect.width > pipeRect2.x &&
             bunnyRect.y < pipeRect2.y + pipeRect2.height &&
             bunnyRect.y + bunnyRect.height > pipeRect2.y)
          ) {
            newState.isGameOver = true;
            break;
          }
        }
        
        return newState;
      });
      
      if (!gameState.isGameOver) {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
      }
    };
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.isStarted, gameState.isGameOver]);

  // Handle game over
  useEffect(() => {
    if (gameState.isGameOver && onGameOver) {
      onGameOver(gameState.score);
    }
  }, [gameState.isGameOver, gameState.score, onGameOver]);

  // Handle click/touch events
  useEffect(() => {
    const handleClick = () => jump();
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        jump();
      }
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [jump]);

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-blue-300 to-blue-400 overflow-hidden rounded-2xl border-2 border-purple-300">
      {/* Background clouds */}
      <CloudSVG x={50} y={60} size={0.8} />
      <CloudSVG x={200} y={120} size={0.6} />
      <CloudSVG x={120} y={40} size={0.7} />
      <CloudSVG x={300} y={180} size={0.9} />
      <CloudSVG x={80} y={250} size={0.7} />
      
      {/* Game area */}
      <div 
        ref={canvasRef}
        className="relative w-full h-full cursor-pointer"
        style={{ 
          maxWidth: '100%',
          height: '100%'
        }}
      >
        {/* Pipes */}
        {gameState.pipes.map((pipe, index) => (
          <div key={index} style={{ position: 'absolute', left: pipe.x, top: 0 }}>
            <PipeTop height={pipe.gapY} />
            <PipeBottom 
              height={GAME_CONFIG.GAME_HEIGHT - pipe.gapY - GAME_CONFIG.PIPE_GAP} 
              y={pipe.gapY + GAME_CONFIG.PIPE_GAP}
            />
          </div>
        ))}
        
        {/* Bunny */}
        <div 
          className="absolute transition-none"
          style={{ 
            left: 80, 
            top: gameState.bunnyY,
            width: GAME_CONFIG.BUNNY_SIZE,
            height: GAME_CONFIG.BUNNY_SIZE,
            transform: `rotate(${Math.min(gameState.bunnyVelocity * 3, 45)}deg)`
          }}
        >
          {bunnyImageUrl ? (
            <img 
              src={bunnyImageUrl} 
              alt="Bunny" 
              className="w-full h-full object-contain"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-white rounded-full border-2 border-purple-400 flex items-center justify-center text-xl">
              🐰
            </div>
          )}
        </div>
        
        {/* Score */}
        <div className="absolute top-2 left-2 bg-white/90 rounded px-2 py-1 text-purple-800 font-bold text-sm">
          Score: {gameState.score}
        </div>
        
        {/* Start screen */}
        {!gameState.isStarted && !gameState.isGameOver && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center text-white">
              <h3 className="text-lg font-bold mb-2">Bunny Hop!</h3>
              <p className="text-sm mb-4">Tap or press SPACE to jump</p>
              <div className="text-2xl animate-bounce">🐰</div>
            </div>
          </div>
        )}
        
        {/* Game over screen */}
        {gameState.isGameOver && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center text-white">
              <h3 className="text-lg font-bold mb-2">Game Over!</h3>
              <p className="text-sm mb-2">Score: {gameState.score}</p>
              <div className="space-x-2">
                <button 
                  onClick={resetGame}
                  className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                >
                  Play Again
                </button>
                {onClose && (
                  <button 
                    onClick={onClose}
                    className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Instructions */}
      <div className="absolute bottom-2 left-2 right-2 text-center text-white text-xs bg-black/30 rounded px-2 py-1">
        {!gameState.isStarted ? 'Click or press SPACE to start' : 'Keep clicking to stay airborne!'}
      </div>
    </div>
  );
}
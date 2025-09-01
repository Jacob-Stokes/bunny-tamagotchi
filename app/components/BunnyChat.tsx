'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BunnyContext, BunnyPersonalityService } from '../lib/bunnyPersonality';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'bunny';
  timestamp: Date;
}

interface BunnyChatProps {
  bunnyContext: BunnyContext;
  className?: string;
}

export default function BunnyChat({ bunnyContext, className }: BunnyChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add welcome message when component mounts
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome-' + Date.now(),
        content: getWelcomeMessage(bunnyContext),
        sender: 'bunny',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [bunnyContext, messages.length]);

  const getWelcomeMessage = (context: BunnyContext): string => {
    const greetings = [
      `*bounces excitedly* Hi there! 🐰`,
      `*nose twitches* Oh, hello! 👋`,
      `*hops over* Hey friend! 🌟`,
      `*ears perk up* Oh, you're here! 💕`
    ];
    
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    if (context.currentOutfit.length > 0) {
      return `${greeting} What do you think of my ${context.currentOutfit[0].name}? I'm feeling pretty stylish today! ✨`;
    }
    
    return `${greeting} How are you doing today? I'm feeling quite ${context.mood}! 😊`;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: 'user-' + Date.now(),
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Prepare chat history for context
      const chatHistory = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        content: msg.content
      }));

      const response = await fetch('/api/bunny-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          bunnyContext: bunnyContext,
          chatHistory: chatHistory
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from bunny');
      }

      const data = await response.json();

      // Simulate typing delay
      setTimeout(() => {
        const bunnyMessage: ChatMessage = {
          id: 'bunny-' + Date.now(),
          content: data.response,
          sender: 'bunny',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, bunnyMessage]);
        setIsTyping(false);
        setIsLoading(false);
      }, 1000 + Math.random() * 1000); // 1-2 second delay

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        id: 'error-' + Date.now(),
        content: "*ears droop* Sorry, I'm having trouble understanding you right now. Can you try again? 😅",
        sender: 'bunny',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex flex-col h-full bg-gradient-to-b from-purple-50 to-pink-50 ${className}`}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                message.sender === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/80 backdrop-blur-sm text-purple-800 border border-purple-200'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.sender === 'user' ? 'text-purple-200' : 'text-purple-500'
              }`}>
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/80 backdrop-blur-sm text-purple-800 border border-purple-200 rounded-2xl px-4 py-2">
              <div className="flex items-center gap-1">
                <span className="text-sm">{bunnyContext.name} is typing</span>
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-purple-200 p-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Chat with ${bunnyContext.name}...`}
            disabled={isLoading}
            className="flex-1 bg-white/80 border border-purple-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-purple-600 text-white rounded-full px-6 py-2 text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '⏳' : 'Send'}
          </button>
        </div>
        
        {/* Quick actions */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setInputMessage("How are you feeling?")}
            disabled={isLoading}
            className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full hover:bg-purple-200 disabled:opacity-50"
          >
            How are you feeling?
          </button>
          <button
            onClick={() => setInputMessage("Tell me about your outfit")}
            disabled={isLoading}
            className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full hover:bg-purple-200 disabled:opacity-50"
          >
            Tell me about your outfit
          </button>
          <button
            onClick={() => setInputMessage("What should we do today?")}
            disabled={isLoading}
            className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full hover:bg-purple-200 disabled:opacity-50"
          >
            What should we do?
          </button>
        </div>
      </div>
    </div>
  );
}
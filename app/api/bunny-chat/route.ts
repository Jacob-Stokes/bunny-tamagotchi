import { NextRequest, NextResponse } from 'next/server';
import { BunnyContext, BunnyPersonalityService } from '../../lib/bunnyPersonality';

interface ChatRequest {
  message: string;
  bunnyContext: BunnyContext;
  chatHistory: Array<{
    role: 'user' | 'model';
    content: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const { message, bunnyContext, chatHistory }: ChatRequest = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    // Import Gemini SDK
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Use Gemini Flash for fast, cheap responses
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Create system prompt with full context
    const systemPrompt = BunnyPersonalityService.createSystemPrompt(bunnyContext);

    // Build conversation history with context
    const conversationHistory = [
      {
        role: 'user' as const,
        parts: [{ text: systemPrompt }]
      },
      ...chatHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: msg.content }]
      })),
      {
        role: 'user' as const,
        parts: [{ text: message }]
      }
    ];

    // Generate response with conversation context
    const chat = model.startChat({
      history: conversationHistory.slice(0, -1) // All but the last message
    });

    const result = await chat.sendMessage(message);
    const response = result.response;
    const responseText = response.text();

    // Log for monitoring
      bunny: bunnyContext.name,
      inputTokens: message.length,
      responseLength: responseText.length
    });

    // Post-process response to ensure it stays in character
    const processedResponse = postProcessBunnyResponse(responseText, bunnyContext);

    return NextResponse.json({
      response: processedResponse,
      bunnyMood: bunnyContext.mood,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('🔥 Bunny chat error:', error);
    
    // Return a fallback bunny response if API fails
    const fallbackResponse = getFallbackResponse(error);
    
    return NextResponse.json({
      response: fallbackResponse,
      error: 'API_ERROR',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Post-process the response to ensure it stays bunny-like
 */
function postProcessBunnyResponse(response: string, context: BunnyContext): string {
  let processed = response;

  // Remove any AI assistant language
  processed = processed.replace(/as an ai|i'm an ai|as a language model|i'm a language model/gi, '');
  
  // Ensure bunny-appropriate length (not too long)
  if (processed.length > 500) {
    const sentences = processed.split(/[.!?]+/);
    processed = sentences.slice(0, 3).join('.') + (sentences.length > 3 ? '!' : '');
  }

  // Add bunny actions if missing and personality calls for it
  if (context.personality.playfulness > 70 && !processed.includes('*') && Math.random() > 0.5) {
    const actions = [
      '*bounces happily*',
      '*nose twitches*',
      '*ears perk up*',
      '*hops excitedly*',
      '*wiggles whiskers*'
    ];
    const action = actions[Math.floor(Math.random() * actions.length)];
    processed = `${action} ${processed}`;
  }

  return processed.trim();
}

/**
 * Get a contextual fallback response if the API fails
 */
function getFallbackResponse(error: any): string {
  const responses = [
    "*ears droop slightly* Sorry, I'm having a bit of trouble thinking right now. Can you say that again? 🥺",
    "*nose twitches confused* Hmm, I didn't quite catch that. My bunny brain is being a bit fuzzy! 😅",
    "*tilts head* Oops! I got a little distracted by a butterfly. What were you saying? 🦋",
    "*shakes head* Sorry friend, I'm having one of those bunny moments. Can you repeat that? 💭"
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Generate context summary for the AI
 */
function generateContextSummary(context: BunnyContext): string {
  const outfitSummary = context.currentOutfit.length > 0 
    ? `wearing ${context.currentOutfit.map(item => item.name).join(', ')}`
    : 'not wearing any special items';
    
  return `You are ${context.name}, currently ${outfitSummary} in a ${context.currentScene} setting. You're feeling ${context.mood} this ${context.timeOfDay}.`;
}
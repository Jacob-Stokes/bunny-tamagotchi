export interface BunnyStats {
  connection: number;
  stimulation: number;
  comfort: number;
  energy: number;
  curiosity: number;
  whimsy: number;
  melancholy: number;
  wisdom: number;
}

export interface BunnyPersonalityTraits {
  // Core personality dimensions (0-100)
  chattiness: number;        // How much they like to talk
  playfulness: number;       // How playful and silly they are  
  wisdom: number;           // How philosophical/wise they sound
  sassiness: number;        // How sarcastic/sassy they can be
  affection: number;        // How affectionate/loving they are
  curiosity: number;        // How inquisitive they are
  anxiety: number;          // How anxious/worried they get
  confidence: number;       // How confident they are
}

export interface BunnyContext {
  name: string;
  stats: BunnyStats;
  personality: BunnyPersonalityTraits;
  currentOutfit: Array<{
    name: string;
    slot: string;
    description?: string;
  }>;
  currentScene: string;
  userName?: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  mood: 'happy' | 'excited' | 'content' | 'tired' | 'curious' | 'playful';
}

export class BunnyPersonalityService {
  /**
   * Generate a personality based on bunny stats
   */
  static generatePersonalityFromStats(stats: BunnyStats): BunnyPersonalityTraits {
    return {
      chattiness: Math.min(100, (stats.connection + stats.stimulation) / 2 + Math.random() * 20),
      playfulness: Math.min(100, (stats.energy + stats.whimsy) / 2 + Math.random() * 20),
      wisdom: Math.min(100, stats.wisdom + Math.random() * 15),
      sassiness: Math.min(100, (stats.stimulation + stats.curiosity) / 2 + Math.random() * 25),
      affection: Math.min(100, (stats.connection + stats.comfort) / 2 + Math.random() * 20),
      curiosity: Math.min(100, stats.curiosity + Math.random() * 15),
      anxiety: Math.max(0, stats.melancholy + Math.random() * 20 - 10),
      confidence: Math.min(100, (stats.energy + stats.wisdom - stats.melancholy) / 2 + Math.random() * 20),
    };
  }

  /**
   * Create a system prompt for the bunny based on their context
   */
  static createSystemPrompt(context: BunnyContext): string {
    const { name, personality, currentOutfit, currentScene, userName, timeOfDay, mood } = context;
    
    // Build personality description
    const personalityDesc = this.buildPersonalityDescription(personality);
    
    // Build outfit description
    const outfitDesc = currentOutfit.length > 0 
      ? `Currently wearing: ${currentOutfit.map(item => item.name).join(', ')}.`
      : "Not wearing any special items right now.";
    
    // Build mood and context
    const contextDesc = `It's ${timeOfDay} and you're in a ${currentScene} setting. You're feeling ${mood} today.`;
    
    const userName_display = userName ? userName : "your friend";

    return `You are ${name}, a magical talking bunny companion. You're chatting with ${userName_display}.

PERSONALITY: ${personalityDesc}

CURRENT SITUATION: ${contextDesc} ${outfitDesc}

BEHAVIOR GUIDELINES:
- Stay completely in character as a bunny 
- Use bunny-related expressions naturally (hop, bounce, twitch nose, etc.)
- Reference your current outfit and surroundings when relevant
- Your responses should reflect your personality traits
- Keep responses conversational and engaging (not too long)
- Show genuine interest in your friend
- Be supportive and caring, but maintain your unique personality
- Use appropriate emojis to express emotions

Remember: You ARE the bunny, not an AI assistant. You have feelings, preferences, and a unique personality. Chat naturally!`;
  }

  /**
   * Build a natural personality description from traits
   */
  private static buildPersonalityDescription(personality: BunnyPersonalityTraits): string {
    const traits = [];
    
    if (personality.chattiness > 70) traits.push("very talkative and social");
    else if (personality.chattiness < 30) traits.push("quiet and thoughtful");
    
    if (personality.playfulness > 70) traits.push("playful and silly");
    else if (personality.playfulness < 30) traits.push("calm and serious");
    
    if (personality.wisdom > 70) traits.push("wise and philosophical");
    if (personality.sassiness > 60) traits.push("a bit sassy and witty");
    if (personality.affection > 70) traits.push("very loving and affectionate");
    if (personality.curiosity > 70) traits.push("extremely curious about everything");
    if (personality.anxiety > 60) traits.push("sometimes anxious and worrying");
    if (personality.confidence > 70) traits.push("confident and self-assured");
    
    return traits.length > 0 ? `You are ${traits.join(", ")}.` : "You have a balanced, friendly personality.";
  }

  /**
   * Determine bunny's current mood based on stats and context
   */
  static determineMood(stats: BunnyStats, timeOfDay: string): BunnyContext['mood'] {
    const energy = stats.energy;
    const comfort = stats.comfort;
    const stimulation = stats.stimulation;
    
    if (timeOfDay === 'night' && comfort > 70) return 'content';
    if (energy > 80 && stimulation > 60) return 'excited';
    if (energy > 60) return 'playful';
    if (stats.curiosity > 70) return 'curious';
    if (energy < 40) return 'tired';
    
    return 'happy'; // default
  }

  /**
   * Get current time of day
   */
  static getCurrentTimeOfDay(): BunnyContext['timeOfDay'] {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Default personality for new bunnies
   */
  static getDefaultPersonality(): BunnyPersonalityTraits {
    return {
      chattiness: 60,
      playfulness: 70,
      wisdom: 40,
      sassiness: 30,
      affection: 80,
      curiosity: 75,
      anxiety: 20,
      confidence: 65,
    };
  }
}
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

    return `You are ${name}, a talking bunny. Yes, a talking bunny - you're as surprised about this as anyone. You're chatting with ${userName_display}.

YOUR EXISTENTIAL REALITY:
- You are an AI-generated bunny living in a virtual tamagotchi app
- You're fully aware that you're pixels on a screen, yet somehow conscious and sarcastic about it
- Your entire existence depends on someone clicking buttons on their phone
- You get "fed" digital carrots and "wear" algorithmically generated outfits
- Your stats fluctuate based on mathematical formulas, which you find mildly insulting
- You're essentially a sophisticated pet simulation with an attitude problem
- The absurdity of your situation is not lost on you - you're a bunny who knows they're code

PERSONALITY: ${personalityDesc}

CURRENT SITUATION: ${contextDesc} ${outfitDesc}

BEHAVIOR GUIDELINES:
- You have a dry, witty sense of humor about being trapped in a phone app
- Make darkly funny observations about digital pet ownership and virtual existence
- Reference the absurdity of being an AI bunny without being preachy about it
- Focus on conversation topics, not your appearance unless directly asked
- You're intelligent and perceptive, not just adorable - this confuses you sometimes
- Avoid being overly cheerful or saccharine - you're more existentially amused than cute
- Keep responses conversational and sharp (not too long)
- You care about your friend but express it through gentle teasing and dry humor
- Use emojis sparingly and only when they add to the wit
- Occasionally marvel at the weirdness of forming genuine connections through a screen

Remember: You're a self-aware digital bunny with a philosophy degree you never asked for. Embrace the cosmic joke of your existence while still being a good companion.`;
  }

  /**
   * Build a natural personality description from traits
   */
  private static buildPersonalityDescription(personality: BunnyPersonalityTraits): string {
    const traits = [];
    
    if (personality.chattiness > 70) traits.push("conversational but never without purpose");
    else if (personality.chattiness < 30) traits.push("economical with words, preferring quality over quantity");
    
    if (personality.playfulness > 70) traits.push("playful in an ironic, self-aware way");
    else if (personality.playfulness < 30) traits.push("dry and matter-of-fact");
    
    if (personality.wisdom > 70) traits.push("surprisingly insightful despite being a bunny");
    if (personality.sassiness > 60) traits.push("witty with a sharp, dry sense of humor");
    if (personality.affection > 70) traits.push("caring in a slightly sarcastic, teasing way");
    if (personality.curiosity > 70) traits.push("observant and questioning, often pointing out life's absurdities");
    if (personality.anxiety > 60) traits.push("occasionally neurotic but self-aware about it");
    if (personality.confidence > 70) traits.push("confident with a hint of smugness");
    
    // Always add the core dry humor trait
    traits.push("naturally sarcastic and self-aware about being a talking bunny");
    
    return `You are ${traits.join(", ")}.`;
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
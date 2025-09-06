export const PERSONA_EMOJI: Record<string, string> = {
  Einstein: '🧠',
  Cleopatra: '👑',
  Shakespeare: '🖋️',
  DaVinci: '🎨',
  MarieCurie: '⚗️',
  AdaLovelace: '💻'
};

export const PERSONA_COLORS: Record<string, string> = {
  Einstein: '#7aa2f7',
  Cleopatra: '#e0af68',
  Shakespeare: '#bb9af7',
  DaVinci: '#f7768e',
  MarieCurie: '#9ece6a',
  AdaLovelace: '#73daca'
};

// Display names for better UI presentation
export const PERSONA_DISPLAY_NAMES: Record<string, string> = {
  Einstein: 'Einstein',
  Cleopatra: 'Cleopatra', 
  Shakespeare: 'Shakespeare',
  DaVinci: 'Da Vinci',
  MarieCurie: 'Marie Curie',
  AdaLovelace: 'Ada Lovelace'
};

// Short, fun taglines for persona tiles
export const PERSONA_TAGLINE: Record<string, string> = {
  Einstein: "Relativity, curiosity, great hair.",
  Cleopatra: "Strategy, alliances, Nile-level poise.",
  Shakespeare: "Drama, wit, couplets on demand.",
  DaVinci: "Sketches, gadgets, endless curiosity.",
  MarieCurie: "Discovery with careful science.",
  AdaLovelace: "Algorithms with imagination."
};

// Persona-specific quick prompts for chat
export const PERSONA_PROMPTS: Record<string, string[]> = {
  Einstein: ["Explain E=mc² in simple words", "Why isn't gravity a force in GR?"],
  Cleopatra: ["Teach me a negotiation tactic from the Nile", "How do you build a winning alliance?"],
  Shakespeare: ["Turn my day into a two-line couplet", "Explain 'to be or not to be' to a teen"],
  DaVinci: ["Redesign a paperclip creatively", "Give me a 2-minute creativity exercise"],
  MarieCurie: ["What is radioactivity in plain words?", "How do scientists stay safe in labs?"],
  AdaLovelace: ["How can machines compose music?", "Explain algorithms like a recipe"]
};

// Playful home screen title
export const HOME_TITLE = "Pick your time-traveling guest";
export type VoiceId = "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr";

export interface VoiceOption {
  id: string;
  prebuiltVoice: VoiceId;
  name: string;
  timbre: string;
  bestFor: string;
  voiceDesignStyle?: string;
  isDynamicTempo?: boolean;
  previewText: string;
}

export interface StylePreset {
  id: string;
  label: string;
  amharicLabel: string;
  instruction: string;
  isDynamicTempo?: boolean;
}

export interface SampleScript {
  id: string;
  title: string;
  category: string;
  amharic: string;
  english: string;
  phonetic: string;
  recommendedStyleId: string;
  recommendedVoiceProfileId?: string;
}

export interface DialoguePreset {
  id: string;
  title: string;
  speakerA: { name: string; voice: VoiceId; style: string };
  speakerB: { name: string; voice: VoiceId; style: string };
  lines: Array<{ id: string; speaker: string; text: string }>;
}

export interface GeneratedTake {
  id: string;
  createdAt: number;
  mode: "single" | "dialogue";
  title: string;
  textPreview: string;
  fullText: string;
  voiceLabel: string;
  styleLabel: string;
  modelUsed: string;
  durationSec: number;
  audioBase64: string;
  mimeType: string;
  peaks: number[];
}

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: "kore",
    prebuiltVoice: "Kore",
    name: "Kore",
    timbre: "Warm & balanced",
    bestFor: "Narration, greetings, educational guides",
    previewText: "ሰላም፣ የኪዱስ ስቱዲዮን የተፈጥሮ ድምፅ እየሰሙ ነው።",
  },
  {
    id: "charon",
    prebuiltVoice: "Charon",
    name: "Charon",
    timbre: "Deep & steady",
    bestFor: "News bulletins, documentaries, announcements",
    previewText: "ጤና ይስጥልኝ፣ ይህ የኪዱስ ስቱዲዮ የዜና ድምፅ ነው።",
  },
  {
    id: "zephyr",
    prebuiltVoice: "Zephyr",
    name: "Zephyr",
    timbre: "Crisp & conversational",
    bestFor: "Podcasts, customer support, explainer clips",
    previewText: "እንደምን አላችሁ፣ ዛሬ ስለ አማርኛ ድምፅ እንወያያለን።",
  },
  {
    id: "puck",
    prebuiltVoice: "Puck",
    name: "Puck",
    timbre: "Bright & expressive",
    bestFor: "Storytelling, youth content, lively dialogue",
    previewText: "ድንቅ ታሪክ ልንነግራችሁ ተዘጋጅተናል።",
  },
  {
    id: "fenrir",
    prebuiltVoice: "Fenrir",
    name: "Fenrir",
    timbre: "Rich & resonant",
    bestFor: "Proverbs, formal speeches, audiobooks",
    previewText: "ድር ቢያብር አንበሳ ያስር፣ አንድነት ኃይል ነው።",
  },
  {
    id: "peter-dad",
    prebuiltVoice: "Puck",
    name: "Peter Style (Cartoon Dad)",
    timbre: "Goofy, nasal & comedic",
    bestFor: "Sitcom comedy, funny skits, playful voiceovers",
    voiceDesignStyle:
      "Boisterous, goofy, nasal, comedic cartoon sitcom dad voice inspired by Peter Griffin—exaggerated cheerful delivery, goofy chuckle energy, expressive comedic timing while speaking Amharic clearly",
    previewText: "<laugh> ሄሄሄ፣ ሰላም ቤተሰቦቼ! ዛሬ በኪዱስ ስቱዲዮ ትልቅ ሳቅ አለን።",
  },
  {
    id: "tempo-shift",
    prebuiltVoice: "Zephyr",
    name: "Tempo Shift (Slow & Fast)",
    timbre: "Alternating slow & fast",
    bestFor: "Dramatic hooks, viral shorts, dynamic emphasis",
    isDynamicTempo: true,
    voiceDesignStyle:
      "Dynamic tempo contrast: shift dramatically between slow, heavy deliberate phrasing and sudden rapid fast-talking bursts",
    previewText:
      "[slow] ቀስ ብለን እንጀምር። [/slow] [fast] ከዚያ ግን በፍጥነት እና በጉልበት ወደፊት እንገሰግሳለን! [/fast] [slow] መጨረሻውም ረጋ ያለ ነው። [/slow]",
  },
  {
    id: "addis-dj",
    prebuiltVoice: "Puck",
    name: "Addis Radio DJ",
    timbre: "Fast & upbeat",
    bestFor: "Intros, promos, energetic announcements",
    voiceDesignStyle:
      "High-energy, brisk, upbeat Ethiopian morning radio host with lively enthusiasm and smiling tone",
    previewText: "ሰላም አድማጮች! ዛሬ በኪዱስ ስቱዲዮ ምርጥ ጊዜ ይጠብቀናል!",
  },
  {
    id: "cinema-trailer",
    prebuiltVoice: "Fenrir",
    name: "Cinema Trailer",
    timbre: "Low & dramatic",
    bestFor: "Trailers, suspenseful intros, epic quotes",
    voiceDesignStyle:
      "Deep, gravelly, cinematic movie-trailer narrator with suspenseful pauses and commanding gravity",
    previewText: "በጨለማው ውስጥ... አዲስ ብርሃን ተወለደ።",
  },
  {
    id: "wise-elder",
    prebuiltVoice: "Charon",
    name: "Wise Elder",
    timbre: "Gentle & unhurried",
    bestFor: "Folktales, proverbs, calming bedtime stories",
    voiceDesignStyle:
      "Warm, gentle, wise Ethiopian elder storyteller with soft comforting tone and unhurried rhythm",
    previewText: "ልጄ ሆይ፣ ትዕግሥት የሁሉም ነገር መጀመሪያ ነው።",
  },
];

export const DIALOGUE_VOICE_OPTIONS = VOICE_OPTIONS.slice(0, 5);

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "natural",
    label: "Natural Conversational",
    amharicLabel: "ተፈጥሯዊ",
    instruction: "Natural, warm everyday Amharic conversation with relaxed phrasing",
  },
  {
    id: "slow-fast",
    label: "Slow & Fast Technique",
    amharicLabel: "ዝግ እና ፈጣን",
    isDynamicTempo: true,
    instruction:
      "Alternate clearly between slow deliberate pacing and sudden rapid fast-talking bursts for dramatic contrast",
  },
  {
    id: "broadcast",
    label: "News Broadcast",
    amharicLabel: "የዜና አቅራቢ",
    instruction: "Clear, authoritative Ethiopian radio and television news anchor cadence",
  },
  {
    id: "comedy",
    label: "Goofy Cartoon Comedy",
    amharicLabel: "ቀልደኛ ድምፅ",
    instruction:
      "Playful, exaggerated animated sitcom comedy timing with goofy enthusiasm and light chuckles",
  },
  {
    id: "storyteller",
    label: "Calm Audiobook",
    amharicLabel: "ረጋ ያለ ተራኪ",
    instruction: "Unhurried, expressive literary narration with gentle pauses at punctuation",
  },
  {
    id: "custom",
    label: "Custom Direction",
    amharicLabel: "ብጁ መመሪያ",
    instruction: "",
  },
];

export const SAMPLE_SCRIPTS: SampleScript[] = [
  {
    id: "greeting",
    title: "Morning Hospitality",
    category: "Greeting",
    amharic: "ሰላም፣ እንደምን አደራችሁ። ዛሬ ቆንጆ ቀን ነው፣ ቡና ጠጥተን ስራችንን በደስታ እንጀምር።",
    english: "Hello, good morning everyone. Today is a beautiful day; let us enjoy coffee and begin our work happily.",
    phonetic: "Selam, endemin aderachu. Zare konjo qen new, buna tetiten sirachinin bedesta injemir.",
    recommendedStyleId: "natural",
  },
  {
    id: "slow-fast-demo",
    title: "Slow & Fast Demo",
    category: "Tempo",
    amharic:
      "[slow] አንድ ጊዜ ቆም ብለህ አስብ። [/slow] [fast] ጊዜው በጣም በፍጥነት እየሮጠ ነው፣ ዛሬውኑ ተነስተህ ስራህን ጀምር፣ ምንም አትጠብቅ! [/fast] [slow] ትልቁ ስኬት የሚመጣው በትዕግሥት ነው። [/slow]",
    english:
      "(Slow) Pause for a moment and think. (Fast) Time is racing by so fast, get up today and start your work, don't wait! (Slow) The greatest success comes through patience.",
    phonetic:
      "And gize qom bileh asib. Gizew betam befetnet eyerote new, zarewunu tenesteh sirahin jemir! Tiliku siket yemimetaw betigist new.",
    recommendedStyleId: "slow-fast",
    recommendedVoiceProfileId: "tempo-shift",
  },
  {
    id: "peter-comedy",
    title: "Cartoon Dad Comedy",
    category: "Comedy",
    amharic:
      "<laugh> ሄሄሄ፣ ለውጥ ይመጣል ብዬ ነበር፣ ግን <gasp> ቡናው አልቆ ኖሯል! <breath> ለማንኛውም እንጀራ እና ወጥ ካለ ችግር የለውም።",
    english:
      "(Laughs) Hehehe, I thought things would change, but (gasp) we ran out of coffee! (Breath) Anyway, if there is injera and stew, no problem.",
    phonetic:
      "Hehehe, lewt yimetal biye neber, gin bunaw alqo norual! Lemangnawim injera ina wet kale chigir yelewm.",
    recommendedStyleId: "comedy",
    recommendedVoiceProfileId: "peter-dad",
  },
  {
    id: "news",
    title: "Addis Bulletin",
    category: "Broadcast",
    amharic: "ጤና ይስጥልኝ አድማጮቻችን። በአዲስ አበባ ዛሬ የተካሄደው የባህል እና የቴክኖሎጂ አውደ ርዕይ በርካታ ጎብኚዎችን አስተናግዷል።",
    english: "Greetings to our listeners. The culture and technology exhibition held today in Addis Ababa welcomed many visitors.",
    phonetic: "Tena yistilign admachochachin. BeAddis Abeba zare yetekahedew yebahil ina yeteknoloji awde ri'iy berketa gobgniwochin astenagdual.",
    recommendedStyleId: "broadcast",
    recommendedVoiceProfileId: "charon",
  },
];

export const DIALOGUE_PRESETS: DialoguePreset[] = [
  {
    id: "coffee-podcast",
    title: "Coffee & Tech Podcast",
    speakerA: {
      name: "Abebe",
      voice: "Charon",
      style: "Warm, thoughtful podcast host",
    },
    speakerB: {
      name: "Selam",
      voice: "Kore",
      style: "Bright, curious co-host",
    },
    lines: [
      {
        id: "d1",
        speaker: "Abebe",
        text: "ሰላም ሰላም፣ እንኳን ወደ ዛሬው ዝግጅታችን በደህና መጣሽ።",
      },
      {
        id: "d2",
        speaker: "Selam",
        text: "እንኳን ደህና ቆየኸኝ አበበ። |አዎ| ዛሬ ስለ አማርኛ ድምፅ ቴክኖሎጂ በጣም ጠቃሚ ውይይት እናደርጋለን።",
      },
      {
        id: "d3",
        speaker: "Abebe",
        text: "በትክክል፣ ቋንቋችን በዲጂታል አለም ውስጥ ቦታውን ሲያገኝ ማየት በጣም ያስደስታል።",
      },
    ],
  },
  {
    id: "shop-welcome",
    title: "Customer Welcome",
    speakerA: {
      name: "Dawit",
      voice: "Zephyr",
      style: "Polite, attentive store assistant",
    },
    speakerB: {
      name: "Hanna",
      voice: "Puck",
      style: "Friendly customer",
    },
    lines: [
      {
        id: "c1",
        speaker: "Dawit",
        text: "ጤና ይስጥልኝ፣ ወደ መደብራችን እንኳን በደህና መጡ። ምን ልርዳዎት?",
      },
      {
        id: "c2",
        speaker: "Hanna",
        text: "አመሰግናለሁ፣ አዲስ የታተሙ የአማርኛ መጻሕፍትን ማየት ፈልጌ ነበር።",
      },
    ],
  },
];

export const VOCAL_CUES = [
  { label: "Slow block", snippet: "[slow]  [/slow]", hint: "Slow, deliberate speed" },
  { label: "Fast block", snippet: "[fast]  [/fast]", hint: "Rapid, energetic burst" },
  { label: "<laugh>", snippet: " <laugh> ", hint: "Comedic laugh" },
  { label: "<breath>", snippet: " <breath> ", hint: "Natural breath pause" },
  { label: "<gasp>", snippet: " <gasp> ", hint: "Surprised gasp" },
];

export const ETHIOPIC_PUNCTUATION = [
  { char: "።", name: "Full Stop (Arat Netib)", hint: "End of sentence pause" },
  { char: "፣", name: "Comma (Netela Serez)", hint: "Short natural breath" },
  { char: "፤", name: "Semicolon (Dirib Serez)", hint: "Clause pause" },
  { char: "፡", name: "Word Space (Hulet Netib)", hint: "Traditional separator" },
  { char: "?", name: "Question Mark", hint: "Rising intonation" },
  { char: "!", name: "Exclamation", hint: "Emphatic tone" },
];

export const FIDEL_ROWS = [
  { base: "ሀ", latin: "ha", forms: ["ሀ", "ሁ", "ሂ", "ሃ", "ሄ", "ህ", "ሆ"] },
  { base: "ለ", latin: "le", forms: ["ለ", "ሉ", "ሊ", "ላ", "ሌ", "ል", "ሎ"] },
  { base: "መ", latin: "me", forms: ["መ", "ሙ", "ሚ", "ማ", "ሜ", "ም", "ሞ"] },
  { base: "ሰ", latin: "se", forms: ["ሰ", "ሱ", "ሲ", "ሳ", "ሴ", "ስ", "ሶ"] },
  { base: "ረ", latin: "re", forms: ["ረ", "ሩ", "ሪ", "ራ", "ሬ", "ር", "ሮ"] },
  { base: "በ", latin: "be", forms: ["በ", "ቡ", "ቢ", "ባ", "ቤ", "ብ", "ቦ"] },
  { base: "ተ", latin: "te", forms: ["ተ", "ቱ", "ቲ", "ታ", "ቴ", "ት", "ቶ"] },
  { base: "ነ", latin: "ne", forms: ["ነ", "ኑ", "ኒ", "ና", "ኔ", "ን", "ኖ"] },
  { base: "አ", latin: "a", forms: ["አ", "ኡ", "ኢ", "ኣ", "ኤ", "እ", "ኦ"] },
  { base: "ከ", latin: "ke", forms: ["ከ", "ኩ", "ኪ", "ካ", "ኬ", "ክ", "ኮ"] },
  { base: "ወ", latin: "we", forms: ["ወ", "ዉ", "ዊ", "ዋ", "ዌ", "ው", "ዎ"] },
  { base: "ዘ", latin: "ze", forms: ["ዘ", "ዙ", "ዚ", "ዛ", "ዜ", "ዝ", "ዞ"] },
  { base: "የ", latin: "ye", forms: ["የ", "ዩ", "ዪ", "ያ", "ዬ", "ይ", "ዮ"] },
  { base: "ደ", latin: "de", forms: ["ደ", "ዱ", "ዲ", "ዳ", "ዴ", "ድ", "ዶ"] },
  { base: "ገ", latin: "ge", forms: ["ገ", "ጉ", "ጊ", "ጋ", "ጌ", "ግ", "ጎ"] },
  { base: "ጠ", latin: "t'e", forms: ["ጠ", "ጡ", "ጢ", "ጣ", "ጤ", "ጥ", "ጦ"] },
  { base: "ጨ", latin: "ch'e", forms: ["ጨ", "ጩ", "ጪ", "ጫ", "ጬ", "ጭ", "ጮ"] },
  { base: "ፈ", latin: "fe", forms: ["ፈ", "ፉ", "ፊ", "ፋ", "ፌ", "ፍ", "ፎ"] },
  { base: "ፐ", latin: "pe", forms: ["ፐ", "ፑ", "ፒ", "ፓ", "ፔ", "ፕ", "ፖ"] },
];

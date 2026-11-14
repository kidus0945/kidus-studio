import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const VALID_VOICES = ["Kore", "Puck", "Charon", "Fenrir", "Zephyr"] as const;
type VoiceName = (typeof VALID_VOICES)[number];

interface DialogueLineInput {
  speaker: string;
  text: string;
}

interface SpeakerConfigInput {
  speaker: string;
  voiceName: string;
  style?: string;
}

interface GenerateTtsRequestBody {
  mode?: "single" | "dialogue";
  text?: string;
  voiceName?: string;
  style?: string;
  voiceDesignStyle?: string;
  isDynamicTempo?: boolean;
  useExpressiveModel?: boolean;
  dialogueLines?: DialogueLineInput[];
  speakers?: SpeakerConfigInput[];
}

interface PrepareAmharicRequestBody {
  text?: string;
  action?: "translate" | "polish";
}

function getGenAIClient(apiVersion?: string): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({
    apiKey,
    ...(apiVersion ? { apiVersion } : {}),
    httpOptions: {
      ...(apiVersion ? { apiVersion } : {}),
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  if (err instanceof Error && err.message === "API_KEY_MISSING") {
    return {
      status: 500,
      message: "API key is not configured. Please check Settings > Secrets.",
    };
  }

  const raw = err as { status?: number; code?: number; message?: string };
  let status = raw?.status || raw?.code || 500;
  let msg = raw?.message || "Unexpected error while generating Amharic audio.";

  if (msg.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(msg) as {
        error?: { code?: number; message?: string; status?: string };
      };
      if (parsed?.error?.message) {
        msg = parsed.error.message;
      }
      if (parsed?.error?.code) {
        status = parsed.error.code;
      }
    } catch {
      // Keep original message if not valid JSON
    }
  }

  if (status === 403 || msg.includes("PERMISSION_DENIED") || msg.includes("API_KEY_INVALID")) {
    return {
      status: 403,
      message: "API key permission error. Please verify your Gemini API key in Settings > Secrets.",
    };
  }
  if (status === 429 || msg.includes("RESOURCE_EXHAUSTED")) {
    return {
      status: 429,
      message: "Rate limit reached. Please wait a moment and try again.",
    };
  }
  if (status === 404 || msg.includes("NOT_FOUND")) {
    return {
      status: 404,
      message: "Speech model unavailable. Please verify model configuration.",
    };
  }

  return {
    status: typeof status === "number" && status >= 400 && status < 600 ? status : 500,
    message: msg,
  };
}

function sanitizeVoice(voice?: string): VoiceName {
  if (voice && (VALID_VOICES as readonly string[]).includes(voice)) {
    return voice as VoiceName;
  }
  return "Kore";
}

function extractInlineAudio(response: {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { data?: string; mimeType?: string };
      }>;
    };
  }>;
}): { data: string; mimeType: string } | null {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return {
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType || "audio/wav",
      };
    }
  }
  return null;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/tts/generate", async (req, res) => {
    try {
      const body = req.body as GenerateTtsRequestBody;
      const mode = body.mode === "dialogue" ? "dialogue" : "single";
      const ai = getGenAIClient("v1beta");

      if (mode === "single") {
        const text = (body.text ?? "").trim();
        if (!text) {
          res.status(400).json({ error: "Please enter Amharic text to synthesize." });
          return;
        }
        if (text.length > 5000) {
          res.status(400).json({ error: "Text exceeds the 5,000-character limit per take." });
          return;
        }

        const voiceName = sanitizeVoice(body.voiceName);
        const userStyle = (body.style ?? "").trim();
        const voiceDesignStyle = (body.voiceDesignStyle ?? "").trim();
        const hasTempoTags = /\[(slow|fast)\][\s\S]*?\[\/\1\]/i.test(text);
        const isDynamicTempo = Boolean(body.isDynamicTempo) || hasTempoTags;
        const hasVocalCues = /<(breath|laugh|gasp)>|\|[^|]+\|/i.test(text);

        const modelUsed =
          body.useExpressiveModel ||
          Boolean(voiceDesignStyle) ||
          isDynamicTempo ||
          hasVocalCues
            ? "gemini-3.8-flash-tts"
            : "gemini-3.8-flash-lite-tts";

        const baseStyleParts = [
          "Native Ethiopian Amharic speaker with clear, authentic Ge'ez pronunciation.",
          voiceDesignStyle ? `Voice persona: ${voiceDesignStyle}.` : "",
          userStyle ? `Delivery style: ${userStyle}.` : "",
        ].filter(Boolean);
        const baseStyle = baseStyleParts.join(" ");

        interface SpeechPart {
          text: string;
          speechMetadata: { style: string };
        }

        const buildParts = (): SpeechPart[] => {
          if (hasTempoTags) {
            const segments: SpeechPart[] = [];
            const tagRegex = /\[(slow|fast)\]([\s\S]*?)\[\/\1\]/gi;
            let lastIndex = 0;
            let match: RegExpExecArray | null;

            while ((match = tagRegex.exec(text)) !== null) {
              const before = text.slice(lastIndex, match.index).trim();
              if (before) {
                segments.push({ text: before, speechMetadata: { style: baseStyle } });
              }
              const tagType = match[1].toLowerCase();
              const inner = match[2].trim();
              if (inner) {
                const tempoPrompt =
                  tagType === "slow"
                    ? `${baseStyle} Speak VERY SLOWLY and deliberately, stretching syllables with calm dramatic pauses.`
                    : `${baseStyle} Switch suddenly to a VERY FAST, rapid, brisk, energetic fast-talking pace.`;
                segments.push({ text: inner, speechMetadata: { style: tempoPrompt } });
              }
              lastIndex = tagRegex.lastIndex;
            }
            const trailing = text.slice(lastIndex).trim();
            if (trailing) {
              segments.push({ text: trailing, speechMetadata: { style: baseStyle } });
            }
            if (segments.length > 0) return segments;
          }

          if (isDynamicTempo) {
            // Split clauses on Ethiopic/Latin punctuation and alternate slow vs fast pacing
            const rawClauses = text
              .split(/(?<=[።፣፤.!?\n])\s*/)
              .map((c) => c.trim())
              .filter(Boolean);

            let chunks = rawClauses;
            if (chunks.length <= 1) {
              const words = text.split(/\s+/).filter(Boolean);
              if (words.length >= 6) {
                const third = Math.ceil(words.length / 3);
                chunks = [
                  words.slice(0, third).join(" "),
                  words.slice(third, third * 2).join(" "),
                  words.slice(third * 2).join(" "),
                ].filter(Boolean);
              }
            }

            if (chunks.length > 1) {
              return chunks.map((chunk, idx) => {
                const isFastTurn = idx % 2 === 1;
                const tempoDirection = isFastTurn
                  ? "Switch abruptly to a noticeably FAST, brisk, rapid-fire energetic speed."
                  : "Speak SLOWLY and deliberately, drawing out words with calm weighty emphasis.";
                return {
                  text: chunk,
                  speechMetadata: {
                    style: `${baseStyle} ${tempoDirection}`,
                  },
                };
              });
            }
          }

          return [
            {
              text: text.replace(/\[\/?(slow|fast)\]/gi, "").trim(),
              speechMetadata: {
                style: baseStyle,
              },
            },
          ];
        };

        const parts = buildParts();

        const response = await ai.models.generateContent({
          model: modelUsed,
          contents: [
            {
              role: "user",
              parts,
            },
          ],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        });

        const audio = extractInlineAudio(response);
        if (!audio) {
          res.status(502).json({
            error: "No audio data was returned by the speech synthesizer. Try simplifying special symbols and retrying.",
          });
          return;
        }

        res.json({
          audioBase64: audio.data,
          mimeType: audio.mimeType,
          modelUsed,
          voiceName,
        });
        return;
      }

      // Multi-speaker dialogue mode (always uses gemini-3.8-flash-tts and exactly 2 speakers)
      const lines = Array.isArray(body.dialogueLines)
        ? body.dialogueLines.filter((l) => l && l.speaker?.trim() && l.text?.trim())
        : [];
      const speakers = Array.isArray(body.speakers) ? body.speakers : [];

      if (lines.length === 0) {
        res.status(400).json({ error: "Add at least one dialogue line with text to synthesize." });
        return;
      }
      if (speakers.length !== 2) {
        res.status(400).json({ error: "Two-speaker dialogue requires exactly 2 configured speakers." });
        return;
      }

      const totalLength = lines.reduce((acc, item) => acc + item.text.length, 0);
      if (totalLength > 5000) {
        res.status(400).json({ error: "Dialogue exceeds the 5,000-character limit per take." });
        return;
      }

      const speakerMap = new Map<string, SpeakerConfigInput>();
      for (const s of speakers) {
        speakerMap.set(s.speaker.trim(), {
          speaker: s.speaker.trim(),
          voiceName: sanitizeVoice(s.voiceName),
          style: s.style?.trim(),
        });
      }

      const parts = lines.map((line) => {
        const speakerName = line.speaker.trim();
        const cfg = speakerMap.get(speakerName);
        const styleText = cfg?.style
          ? `Native Ethiopian Amharic speaker. ${cfg.style}`
          : "Natural, conversational native Ethiopian Amharic speaker";
        return {
          text: `${speakerName}: ${line.text.trim()}`,
          speechMetadata: {
            speaker: speakerName,
            style: styleText,
          },
        };
      });

      const modelUsed = "gemini-3.8-flash-tts";
      const response = await ai.models.generateContent({
        model: modelUsed,
        contents: [
          {
            role: "user",
            parts,
          },
        ],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: speakers.map((s) => ({
                speaker: s.speaker.trim(),
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: sanitizeVoice(s.voiceName),
                  },
                },
              })),
            },
          },
        },
      });

      const audio = extractInlineAudio(response);
      if (!audio) {
        res.status(502).json({
          error: "No audio data was returned for the dialogue. Please verify speaker names and text.",
        });
        return;
      }

      res.json({
        audioBase64: audio.data,
        mimeType: audio.mimeType,
        modelUsed,
      });
    } catch (error) {
      console.error("TTS generation error:", error);
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post("/api/amharic/prepare", async (req, res) => {
    try {
      const body = req.body as PrepareAmharicRequestBody;
      const inputText = (body.text ?? "").trim();
      const action = body.action === "polish" ? "polish" : "translate";

      if (!inputText) {
        res.status(400).json({ error: "Enter text to convert or polish into Amharic." });
        return;
      }
      if (inputText.length > 4000) {
        res.status(400).json({ error: "Input text must be 4,000 characters or fewer." });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        apiVersion: "v1beta",
        httpOptions: {
          apiVersion: "v1beta",
          timeout: 15000,
          retryOptions: { attempts: 1 },
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const instruction =
        action === "translate"
          ? [
              "You are an expert Amharic linguist and voice script editor.",
              "Convert the user's input (English, Romanized Amharic, or mixed) into natural Ethiopian Amharic in Ge'ez script.",
              "Use proper Ethiopic punctuation (። for full stops, ፣ for commas) and spell out numbers in spoken Amharic words.",
              'Respond ONLY with raw JSON (no markdown fences) matching: {"amharicText":"...","phoneticGuide":"...","englishSummary":"..."}.',
            ].join(" ")
          : [
              "You are an expert Amharic script editor for Text-to-Speech narration.",
              "Polish the user's Amharic text with proper Ethiopic punctuation (።, ፣, ፤) and spell out digits into spoken Amharic words.",
              'Respond ONLY with raw JSON (no markdown fences) matching: {"amharicText":"...","phoneticGuide":"...","englishSummary":"..."}.',
            ].join(" ");

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: inputText,
        config: {
          systemInstruction: instruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        },
      });

      let rawText = (response.text ?? "").trim();
      if (rawText.startsWith("```")) {
        rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      }
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : "{}") as {
        amharicText?: string;
        phoneticGuide?: string;
        englishSummary?: string;
      };

      if (!parsed.amharicText) {
        res.status(502).json({ error: "Could not produce Amharic script. Please try again." });
        return;
      }

      res.json({
        amharicText: parsed.amharicText,
        phoneticGuide: parsed.phoneticGuide ?? "",
        englishSummary: parsed.englishSummary ?? "",
      });
    } catch (error) {
      console.error("Amharic script prepare error:", error);
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  if (process.env.NODE_ENV === "production") {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("/{*splat}", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Kidus Studio listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

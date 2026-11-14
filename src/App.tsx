import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Keyboard,
  Loader2,
  Play,
  Plus,
  Square,
  Trash2,
  Volume2,
  Wand2,
} from "lucide-react";
import { AudioPlayerBar } from "./components/AudioPlayerBar";
import { FidelDrawer } from "./components/FidelDrawer";
import { LibraryView } from "./components/LibraryView";
import { ScriptGuideView } from "./components/ScriptGuideView";
import {
  DIALOGUE_PRESETS,
  DIALOGUE_VOICE_OPTIONS,
  SAMPLE_SCRIPTS,
  STYLE_PRESETS,
  VOCAL_CUES,
  VOICE_OPTIONS,
  type GeneratedTake,
  type VoiceId,
  type VoiceOption,
} from "./data/amharicData";
import { analyzeWavAudio, base64ToBlob, formatDuration } from "./utils/audioDecoder";
import {
  clearAllTakesFromDb,
  deleteTakeFromDb,
  loadSavedTakes,
  saveTake,
} from "./utils/audioStorage";

type ActiveTab = "studio" | "dialogue" | "library" | "guide";

interface DialogueLine {
  id: string;
  speaker: string;
  text: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("studio");

  // Single-speaker studio state
  const [scriptText, setScriptText] = useState<string>(SAMPLE_SCRIPTS[0].amharic);
  const [phoneticHint, setPhoneticHint] = useState<string>(SAMPLE_SCRIPTS[0].phonetic);
  const [englishGloss, setEnglishGloss] = useState<string>(SAMPLE_SCRIPTS[0].english);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(VOICE_OPTIONS[0].id);
  const [selectedStyleId, setSelectedStyleId] = useState<string>(
    SAMPLE_SCRIPTS[0].recommendedStyleId
  );
  const [customStyle, setCustomStyle] = useState<string>("");
  const [useExpressiveModel, setUseExpressiveModel] = useState<boolean>(false);

  // Voice tap-to-preview state
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const previewCacheRef = useRef<Map<string, { base64: string; mimeType: string }>>(new Map());
  const previewRequestIdRef = useRef<number>(0);

  // Translation / Romanized Amharic helper state
  const [sourceInput, setSourceInput] = useState<string>("");
  const [isPreparingText, setIsPreparingText] = useState<boolean>(false);
  const [showFidelDrawer, setShowFidelDrawer] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Two-speaker dialogue state
  const [speakerAName, setSpeakerAName] = useState<string>(DIALOGUE_PRESETS[0].speakerA.name);
  const [speakerAVoice, setSpeakerAVoice] = useState<VoiceId>(DIALOGUE_PRESETS[0].speakerA.voice);
  const [speakerAStyle, setSpeakerAStyle] = useState<string>(DIALOGUE_PRESETS[0].speakerA.style);
  const [speakerBName, setSpeakerBName] = useState<string>(DIALOGUE_PRESETS[0].speakerB.name);
  const [speakerBVoice, setSpeakerBVoice] = useState<VoiceId>(DIALOGUE_PRESETS[0].speakerB.voice);
  const [speakerBStyle, setSpeakerBStyle] = useState<string>(DIALOGUE_PRESETS[0].speakerB.style);
  const [dialogueLines, setDialogueLines] = useState<DialogueLine[]>(DIALOGUE_PRESETS[0].lines);

  // Synthesis & library state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [takes, setTakes] = useState<GeneratedTake[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState<boolean>(true);
  const [activeTakeId, setActiveTakeId] = useState<string | null>(null);

  const selectedVoiceOption =
    VOICE_OPTIONS.find((v) => v.id === selectedVoiceId) ?? VOICE_OPTIONS[0];

  useEffect(() => {
    let mounted = true;
    loadSavedTakes()
      .then((items) => {
        if (!mounted) return;
        setTakes(items);
        if (items.length > 0) {
          setActiveTakeId(items[0].id);
        }
      })
      .finally(() => {
        if (mounted) setIsLoadingLibrary(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const stopVoicePreview = () => {
    previewRequestIdRef.current += 1;
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setLoadingPreviewId(null);
    setPlayingPreviewId(null);
  };

  const playPreviewAudio = async (voiceId: string, base64: string, mimeType: string) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const blob = base64ToBlob(base64, mimeType);
    const url = URL.createObjectURL(blob);
    previewUrlRef.current = url;

    const audio = new Audio(url);
    previewAudioRef.current = audio;
    setPlayingPreviewId(voiceId);

    audio.onended = () => {
      setPlayingPreviewId((curr) => (curr === voiceId ? null : curr));
    };
    audio.onerror = () => {
      setPlayingPreviewId((curr) => (curr === voiceId ? null : curr));
    };

    try {
      await audio.play();
    } catch {
      setPlayingPreviewId(null);
    }
  };

  const handleVoiceCardTap = async (voice: VoiceOption) => {
    const isAlreadyPlayingThis = playingPreviewId === voice.id;
    const isAlreadySelected = selectedVoiceId === voice.id;

    setSelectedVoiceId(voice.id);
    setErrorMessage(null);

    if (isAlreadySelected && isAlreadyPlayingThis) {
      stopVoicePreview();
      return;
    }

    stopVoicePreview();
    const requestId = ++previewRequestIdRef.current;

    const cached = previewCacheRef.current.get(voice.id);
    if (cached) {
      await playPreviewAudio(voice.id, cached.base64, cached.mimeType);
      return;
    }

    setLoadingPreviewId(voice.id);
    try {
      const res = await fetch("/api/tts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "single",
          text: voice.previewText,
          voiceName: voice.prebuiltVoice,
          voiceDesignStyle: voice.voiceDesignStyle,
          isDynamicTempo: Boolean(voice.isDynamicTempo),
          style: voice.isDynamicTempo
            ? "Demonstrate slow and fast alternating pacing clearly"
            : "Short, clear voice sample preview",
          useExpressiveModel: Boolean(voice.voiceDesignStyle || voice.isDynamicTempo),
        }),
      });

      const data = (await res.json()) as {
        audioBase64?: string;
        mimeType?: string;
        error?: string;
      };

      if (previewRequestIdRef.current !== requestId) return;

      if (!res.ok || !data.audioBase64) {
        throw new Error(data.error || "Could not load voice preview.");
      }

      const mimeType = data.mimeType || "audio/wav";
      previewCacheRef.current.set(voice.id, {
        base64: data.audioBase64,
        mimeType,
      });

      setLoadingPreviewId(null);
      await playPreviewAudio(voice.id, data.audioBase64, mimeType);
    } catch (err) {
      if (previewRequestIdRef.current !== requestId) return;
      setLoadingPreviewId(null);
      setErrorMessage(err instanceof Error ? err.message : "Voice preview failed.");
    }
  };

  const activeTake = takes.find((t) => t.id === activeTakeId) ?? null;

  const insertAtCursor = (snippet: string) => {
    const el = textareaRef.current;
    if (!el) {
      setScriptText((prev) => prev + snippet);
      return;
    }
    const start = el.selectionStart ?? scriptText.length;
    const end = el.selectionEnd ?? scriptText.length;
    const next = scriptText.slice(0, start) + snippet + scriptText.slice(end);
    setScriptText(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = snippet.includes("]  [/") ? start + snippet.indexOf("]") + 2 : start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleNewScript = () => {
    setErrorMessage(null);
    if (activeTab === "dialogue") {
      setDialogueLines([
        { id: crypto.randomUUID(), speaker: speakerAName || "Speaker 1", text: "" },
        { id: crypto.randomUUID(), speaker: speakerBName || "Speaker 2", text: "" },
      ]);
      return;
    }
    setActiveTab("studio");
    setScriptText("");
    setPhoneticHint("");
    setEnglishGloss("");
    setSourceInput("");
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleLoadSample = (sampleId: string) => {
    const found = SAMPLE_SCRIPTS.find((s) => s.id === sampleId);
    if (!found) return;
    setErrorMessage(null);
    setScriptText(found.amharic);
    setPhoneticHint(found.phonetic);
    setEnglishGloss(found.english);
    setSelectedStyleId(found.recommendedStyleId);
    if (found.recommendedVoiceProfileId) {
      setSelectedVoiceId(found.recommendedVoiceProfileId);
    }
  };

  const handleLoadDialoguePreset = (presetId: string) => {
    const preset = DIALOGUE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setErrorMessage(null);
    setSpeakerAName(preset.speakerA.name);
    setSpeakerAVoice(preset.speakerA.voice);
    setSpeakerAStyle(preset.speakerA.style);
    setSpeakerBName(preset.speakerB.name);
    setSpeakerBVoice(preset.speakerB.voice);
    setSpeakerBStyle(preset.speakerB.style);
    setDialogueLines(preset.lines.map((l) => ({ ...l, id: crypto.randomUUID() })));
  };

  const handlePrepareAmharic = async (action: "translate" | "polish") => {
    const textToProcess = action === "translate" ? sourceInput.trim() : scriptText.trim();
    if (!textToProcess) {
      setErrorMessage(
        action === "translate"
          ? "Enter English or Romanized Amharic text to convert."
          : "Enter Amharic text in the editor before polishing."
      );
      return;
    }

    setErrorMessage(null);
    setIsPreparingText(true);
    try {
      const res = await fetch("/api/amharic/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToProcess, action }),
      });
      const data = (await res.json()) as {
        amharicText?: string;
        phoneticGuide?: string;
        englishSummary?: string;
        error?: string;
      };

      if (!res.ok || !data.amharicText) {
        throw new Error(data.error || "Unable to process Amharic text.");
      }

      setScriptText(data.amharicText);
      setPhoneticHint(data.phoneticGuide ?? "");
      setEnglishGloss(data.englishSummary ?? "");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to prepare Amharic script.");
    } finally {
      setIsPreparingText(false);
    }
  };

  const handleGenerateAudio = async () => {
    setErrorMessage(null);
    stopVoicePreview();

    const isDialogue = activeTab === "dialogue";

    if (!isDialogue) {
      if (!scriptText.trim()) {
        setErrorMessage("Please enter or convert some Amharic text before generating audio.");
        return;
      }
    } else {
      const validLines = dialogueLines.filter((l) => l.text.trim().length > 0);
      if (validLines.length === 0) {
        setErrorMessage("Add at least one Amharic dialogue line with text.");
        return;
      }
      if (!speakerAName.trim() || !speakerBName.trim()) {
        setErrorMessage("Both speakers must have names configured.");
        return;
      }
      if (speakerAName.trim() === speakerBName.trim()) {
        setErrorMessage("Please give Speaker 1 and Speaker 2 distinct names.");
        return;
      }
    }

    setIsGenerating(true);

    try {
      const styleObj = STYLE_PRESETS.find((s) => s.id === selectedStyleId);
      const effectiveStyle =
        selectedStyleId === "custom"
          ? customStyle.trim() || "Natural, expressive Amharic speech"
          : styleObj?.instruction || "Natural, clear Amharic speech";

      const isDynamicTempo = Boolean(
        selectedVoiceOption.isDynamicTempo || styleObj?.isDynamicTempo
      );

      const payload = isDialogue
        ? {
            mode: "dialogue" as const,
            speakers: [
              {
                speaker: speakerAName.trim(),
                voiceName: speakerAVoice,
                style: speakerAStyle.trim(),
              },
              {
                speaker: speakerBName.trim(),
                voiceName: speakerBVoice,
                style: speakerBStyle.trim(),
              },
            ],
            dialogueLines: dialogueLines
              .filter((l) => l.text.trim().length > 0)
              .map((l) => ({
                speaker: l.speaker.trim(),
                text: l.text.trim(),
              })),
          }
        : {
            mode: "single" as const,
            text: scriptText.trim(),
            voiceName: selectedVoiceOption.prebuiltVoice,
            voiceDesignStyle: selectedVoiceOption.voiceDesignStyle,
            isDynamicTempo,
            style: effectiveStyle,
            useExpressiveModel:
              useExpressiveModel ||
              Boolean(selectedVoiceOption.voiceDesignStyle) ||
              isDynamicTempo,
          };

      const res = await fetch("/api/tts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as {
        audioBase64?: string;
        mimeType?: string;
        modelUsed?: string;
        error?: string;
      };

      if (!res.ok || !data.audioBase64) {
        throw new Error(data.error || "Speech synthesis failed. Please try again.");
      }

      const mimeType = data.mimeType || "audio/wav";
      const decoded = await analyzeWavAudio(data.audioBase64, mimeType, 64);
      URL.revokeObjectURL(decoded.blobUrl);

      const cleanPreviewText = scriptText.replace(/\[\/?(slow|fast)\]/gi, "").trim();
      const fullText = isDialogue
        ? dialogueLines
            .filter((l) => l.text.trim())
            .map((l) => `${l.speaker}: ${l.text.trim()}`)
            .join("\n")
        : scriptText.trim();

      const previewLine = isDialogue
        ? dialogueLines.find((l) => l.text.trim())?.text.trim() || "Amharic Dialogue"
        : cleanPreviewText;

      const newTake: GeneratedTake = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        mode: isDialogue ? "dialogue" : "single",
        title: previewLine.slice(0, 68) + (previewLine.length > 68 ? "…" : ""),
        textPreview: previewLine.slice(0, 96) + (previewLine.length > 96 ? "…" : ""),
        fullText,
        voiceLabel: isDialogue
          ? `${speakerAName} & ${speakerBName}`
          : selectedVoiceOption.name,
        styleLabel: isDialogue
          ? "Two-Speaker Dialogue"
          : selectedStyleId === "custom"
            ? customStyle.trim() || "Custom Style"
            : styleObj?.label || "Natural",
        modelUsed: data.modelUsed || "gemini-3.8-flash-lite-tts",
        durationSec: decoded.durationSec,
        audioBase64: data.audioBase64,
        mimeType,
        peaks: decoded.peaks,
      };

      setTakes((prev) => [newTake, ...prev]);
      setActiveTakeId(newTake.id);
      await saveTake(newTake);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not generate Amharic audio. Please retry."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteTake = async (id: string) => {
    setTakes((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeTakeId === id) {
        setActiveTakeId(next[0]?.id ?? null);
      }
      return next;
    });
    await deleteTakeFromDb(id);
  };

  const handleClearLibrary = async () => {
    setTakes([]);
    setActiveTakeId(null);
    await clearAllTakesFromDb();
  };

  const handleReuseScript = (take: GeneratedTake) => {
    setActiveTakeId(take.id);
    if (take.mode === "dialogue") {
      const parsed = take.fullText
        .split("\n")
        .map((line): DialogueLine | null => {
          const idx = line.indexOf(":");
          if (idx === -1) return null;
          return {
            id: crypto.randomUUID(),
            speaker: line.slice(0, idx).trim(),
            text: line.slice(idx + 1).trim(),
          };
        })
        .filter((x): x is DialogueLine => x !== null);
      if (parsed.length > 0) {
        setDialogueLines(parsed);
      }
      setActiveTab("dialogue");
    } else {
      setScriptText(take.fullText);
      setActiveTab("studio");
    }
  };

  const charCount = scriptText.length;
  const wordCount = scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0;
  const dialogueCharCount = dialogueLines.reduce((sum, l) => sum + l.text.length, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F5F7] text-[#111827]">
      {/* Top Bar Contract: Exactly 3 zones separated by gap-8 */}
      <header className="bg-white border-b border-[#E2E5EA] sticky top-0 z-20">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab("studio")}
            className="text-lg font-bold tracking-tight text-[#111827] whitespace-nowrap shrink-0 text-left focus-visible:outline-2 focus-visible:outline-[#0F766E]"
          >
            Kidus Studio
          </button>

          {/* Zone 2: Clean single-line text nav links */}
          <nav className="flex items-center gap-6 overflow-x-auto" aria-label="Primary">
            {(
              [
                { id: "studio", label: "Studio" },
                { id: "dialogue", label: "Dialogue" },
                {
                  id: "library",
                  label: takes.length > 0 ? `Library (${takes.length})` : "Library",
                },
                { id: "guide", label: "Script Guide" },
              ] as const
            ).map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#0F766E] ${
                    isActive
                      ? "border-[#0F766E] text-[#111827]"
                      : "border-transparent text-[#6B7280] hover:text-[#111827]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleNewScript}
              className="px-4 py-2 text-xs font-medium text-[#111827] bg-white border border-[#E2E5EA] hover:bg-[#F4F5F7] rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#0F766E]"
            >
              New Script
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-6 py-8">
        {/* Page Heading */}
        <div className="mb-7 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111827] text-balance">
              {activeTab === "studio" && "Amharic Text to Speech"}
              {activeTab === "dialogue" && "Two-Speaker Amharic Dialogue"}
              {activeTab === "library" && "Saved Audio Library"}
              {activeTab === "guide" && "Amharic Script & Fidel Guide"}
            </h1>
            <p className="text-sm text-[#4B5563] mt-1">
              {activeTab === "studio" &&
                "Tap any voice on the right to preview it, or write Amharic text with slow/fast pacing and character voices."}
              {activeTab === "dialogue" &&
                "Script conversations between two distinct voices with natural pacing and vocal cues."}
              {activeTab === "library" &&
                "Replay previous takes, reload scripts into the studio, or export 24 kHz WAV files."}
              {activeTab === "guide" &&
                "Formatting practices for clear Amharic speech synthesis and quick Ethiopic character reference."}
            </p>
          </div>
          <div className="text-xs text-[#6B7280] flex items-center gap-2 whitespace-nowrap shrink-0">
            <span className="font-ethiopic text-[#111827] font-medium">አማርኛ</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">am-ET</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">24 kHz WAV</span>
          </div>
        </div>

        {activeTab === "library" && (
          <div className="space-y-6">
            <AudioPlayerBar take={activeTake} isGenerating={isGenerating} />
            <LibraryView
              takes={takes}
              isLoading={isLoadingLibrary}
              activeTakeId={activeTakeId}
              onSelectTake={(take) => setActiveTakeId(take.id)}
              onReuseScript={handleReuseScript}
              onDeleteTake={handleDeleteTake}
              onClearAll={handleClearLibrary}
              onGoToStudio={() => setActiveTab("studio")}
            />
          </div>
        )}

        {activeTab === "guide" && (
          <ScriptGuideView
            onSendToStudio={(snippet) => {
              setActiveTab("studio");
              requestAnimationFrame(() => insertAtCursor(snippet));
            }}
          />
        )}

        {(activeTab === "studio" || activeTab === "dialogue") && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Main Studio Workspace (8 cols) */}
            <div className="lg:col-span-8 space-y-5">
              {activeTab === "studio" ? (
                <>
                  {/* English / Romanized -> Amharic Converter Strip */}
                  <div className="bg-white border border-[#E2E5EA] rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        type="text"
                        value={sourceInput}
                        onChange={(e) => setSourceInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handlePrepareAmharic("translate");
                          }
                        }}
                        placeholder="Type English or Romanized Amharic (e.g. 'Selam endemin nachu' or 'Welcome to Addis')..."
                        className="flex-1 px-3.5 py-2 text-sm bg-[#F8F9FA] border border-[#E2E5EA] rounded-lg text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#0F766E]"
                      />
                      <button
                        type="button"
                        disabled={isPreparingText}
                        onClick={() => handlePrepareAmharic("translate")}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-[#0F766E] bg-[#0F766E]/10 hover:bg-[#0F766E]/15 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#0F766E]"
                      >
                        {isPreparingText ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ArrowRight className="w-3.5 h-3.5" />
                        )}
                        <span>Convert to Amharic</span>
                      </button>
                    </div>
                  </div>

                  {/* Main Amharic Script Editor */}
                  <div className="bg-white border border-[#E2E5EA] rounded-xl">
                    <div className="px-4 py-3 border-b border-[#E2E5EA] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium text-[#6B7280] mr-1">Samples:</span>
                        {SAMPLE_SCRIPTS.map((sample) => (
                          <button
                            key={sample.id}
                            type="button"
                            onClick={() => handleLoadSample(sample.id)}
                            className="px-2.5 py-1 text-xs font-medium text-[#374151] bg-[#F4F5F7] hover:bg-[#E5E7EB] rounded-md transition-colors whitespace-nowrap shrink-0"
                          >
                            {sample.title}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={isPreparingText || !scriptText.trim()}
                          onClick={() => handlePrepareAmharic("polish")}
                          title="Add proper Ethiopic punctuation and expand numbers for clear speech"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#374151] bg-white border border-[#E2E5EA] hover:bg-[#F4F5F7] disabled:opacity-50 rounded-md transition-colors whitespace-nowrap shrink-0"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>Polish Script</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowFidelDrawer((v) => !v)}
                          aria-expanded={showFidelDrawer}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-md transition-colors whitespace-nowrap shrink-0 ${
                            showFidelDrawer
                              ? "bg-[#0F766E] text-white border-[#0F766E]"
                              : "bg-white text-[#374151] border-[#E2E5EA] hover:bg-[#F4F5F7]"
                          }`}
                        >
                          <Keyboard className="w-3.5 h-3.5" />
                          <span>Fidel Helper</span>
                        </button>
                      </div>
                    </div>

                    {/* Tempo & Sound Cue Quick-Insert Bar */}
                    <div className="px-4 py-2 bg-[#F8F9FA] border-b border-[#E2E5EA] flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-[#6B7280] mr-1">Tempo & cues:</span>
                      {VOCAL_CUES.map((cue) => (
                        <button
                          key={cue.label}
                          type="button"
                          title={cue.hint}
                          onClick={() => insertAtCursor(cue.snippet)}
                          className="px-2 py-1 text-xs font-mono text-[#374151] bg-white border border-[#E2E5EA] hover:border-[#0F766E] hover:text-[#0F766E] rounded transition-colors whitespace-nowrap shrink-0"
                        >
                          {cue.label}
                        </button>
                      ))}
                    </div>

                    <div className="p-4">
                      <textarea
                        ref={textareaRef}
                        value={scriptText}
                        onChange={(e) => setScriptText(e.target.value)}
                        rows={7}
                        placeholder="አማርኛ ጽሑፍዎን እዚህ ይጻፉ ወይም ይለጥፉ..."
                        aria-label="Amharic script text"
                        className="w-full font-ethiopic text-lg leading-[1.85] text-[#111827] placeholder:text-[#9CA3AF] bg-transparent resize-y focus:outline-none"
                      />

                      {(phoneticHint || englishGloss) && (
                        <div className="mt-3 pt-3 border-t border-[#F1F3F5] space-y-1 text-xs text-[#4B5563]">
                          {phoneticHint && (
                            <p>
                              <span className="font-medium text-[#6B7280]">Pronunciation: </span>
                              {phoneticHint}
                            </p>
                          )}
                          {englishGloss && (
                            <p>
                              <span className="font-medium text-[#6B7280]">Meaning: </span>
                              {englishGloss}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="px-4 py-2.5 border-t border-[#E2E5EA] flex flex-wrap items-center justify-between gap-3 text-xs text-[#6B7280]">
                      <div className="flex items-center gap-2 font-mono tabular-nums">
                        <span>{charCount} / 5000 chars</span>
                        <span aria-hidden="true">·</span>
                        <span>{wordCount} words</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[#6B7280] mr-1">Insert pause:</span>
                        {["።", "፣", "፤"].map((mark) => (
                          <button
                            key={mark}
                            type="button"
                            onClick={() => insertAtCursor(mark)}
                            className="px-2 py-0.5 font-ethiopic text-sm text-[#111827] bg-[#F4F5F7] hover:bg-[#E5E7EB] rounded transition-colors"
                          >
                            {mark}
                          </button>
                        ))}
                      </div>
                    </div>

                    {showFidelDrawer && <FidelDrawer onInsert={insertAtCursor} />}
                  </div>
                </>
              ) : (
                /* Two-Speaker Dialogue Editor */
                <div className="bg-white border border-[#E2E5EA] rounded-xl">
                  <div className="px-4 py-3 border-b border-[#E2E5EA] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-medium text-[#6B7280] mr-1">
                        Dialogue Presets:
                      </span>
                      {DIALOGUE_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleLoadDialoguePreset(preset.id)}
                          className="px-2.5 py-1 text-xs font-medium text-[#374151] bg-[#F4F5F7] hover:bg-[#E5E7EB] rounded-md transition-colors whitespace-nowrap shrink-0"
                        >
                          {preset.title}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-mono tabular-nums text-[#6B7280]">
                      {dialogueCharCount} / 5000 chars
                    </span>
                  </div>

                  <div className="p-4 space-y-3">
                    {dialogueLines.map((line, index) => (
                      <div
                        key={line.id}
                        className="flex flex-col sm:flex-row sm:items-start gap-2.5 pb-3 border-b border-[#F1F3F5] last:border-b-0 last:pb-0"
                      >
                        <div className="flex items-center gap-2 sm:w-36 shrink-0 pt-1">
                          <span className="text-xs font-mono tabular-nums text-[#9CA3AF] w-5">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <select
                            aria-label={`Speaker for line ${index + 1}`}
                            value={line.speaker}
                            onChange={(e) =>
                              setDialogueLines((prev) =>
                                prev.map((item) =>
                                  item.id === line.id ? { ...item, speaker: e.target.value } : item
                                )
                              )
                            }
                            className="flex-1 px-2.5 py-1.5 text-xs font-medium bg-[#F8F9FA] border border-[#E2E5EA] rounded-md text-[#111827] focus:outline-none focus:border-[#0F766E]"
                          >
                            <option value={speakerAName || "Speaker 1"}>
                              {speakerAName || "Speaker 1"}
                            </option>
                            <option value={speakerBName || "Speaker 2"}>
                              {speakerBName || "Speaker 2"}
                            </option>
                          </select>
                        </div>

                        <textarea
                          value={line.text}
                          onChange={(e) =>
                            setDialogueLines((prev) =>
                              prev.map((item) =>
                                item.id === line.id ? { ...item, text: e.target.value } : item
                              )
                            )
                          }
                          rows={2}
                          placeholder="የአማርኛ ንግግር እዚህ ይጻፉ..."
                          className="flex-1 font-ethiopic text-base leading-relaxed px-3 py-2 bg-[#F8F9FA] border border-[#E2E5EA] rounded-lg text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#0F766E] resize-y"
                        />

                        <button
                          type="button"
                          disabled={dialogueLines.length <= 1}
                          onClick={() =>
                            setDialogueLines((prev) => prev.filter((item) => item.id !== line.id))
                          }
                          aria-label="Remove line"
                          className="p-2 text-[#9CA3AF] hover:text-[#DC2626] disabled:opacity-30 rounded-md transition-colors self-end sm:self-start mt-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="px-4 py-3 border-t border-[#E2E5EA] flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const lastSpeaker =
                          dialogueLines[dialogueLines.length - 1]?.speaker || speakerAName;
                        const nextSpeaker =
                          lastSpeaker === speakerAName ? speakerBName : speakerAName;
                        setDialogueLines((prev) => [
                          ...prev,
                          { id: crypto.randomUUID(), speaker: nextSpeaker, text: "" },
                        ]);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#111827] bg-[#F4F5F7] hover:bg-[#E5E7EB] rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Dialogue Line</span>
                    </button>

                    <span className="text-xs text-[#6B7280]">
                      Supports cues:{" "}
                      <code className="font-mono bg-[#F4F5F7] px-1 rounded">&lt;breath&gt;</code>,{" "}
                      <code className="font-mono bg-[#F4F5F7] px-1 rounded">&lt;laugh&gt;</code>,{" "}
                      <code className="font-mono bg-[#F4F5F7] px-1 rounded">|አዎ|</code>
                    </span>
                  </div>
                </div>
              )}

              {/* Active Audio Player */}
              <AudioPlayerBar take={activeTake} isGenerating={isGenerating} />

              {/* Compact Recent Takes Strip */}
              {takes.length > 0 && (
                <div className="bg-white border border-[#E2E5EA] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#E2E5EA] flex items-center justify-between">
                    <h2 className="text-xs font-semibold text-[#374151]">Recent Takes</h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab("library")}
                      className="text-xs font-medium text-[#0F766E] hover:underline"
                    >
                      View all ({takes.length})
                    </button>
                  </div>
                  <div className="divide-y divide-[#E2E5EA]">
                    {takes.slice(0, 3).map((take) => {
                      const isSelected = take.id === activeTakeId;
                      return (
                        <button
                          key={take.id}
                          type="button"
                          onClick={() => setActiveTakeId(take.id)}
                          className={`w-full px-4 py-3 text-left flex items-center justify-between gap-4 transition-colors ${
                            isSelected ? "bg-[#0F766E]/[0.05]" : "hover:bg-[#F9FAFB]"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-ethiopic font-medium text-[#111827] truncate">
                              {take.textPreview}
                            </p>
                            <p className="text-xs text-[#6B7280] mt-0.5">
                              {take.voiceLabel} · {take.styleLabel}
                            </p>
                          </div>
                          <span className="text-xs font-mono tabular-nums text-[#4B5563] shrink-0">
                            {formatDuration(take.durationSec)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Voice & Delivery Configuration Rail (4 cols) */}
            <aside className="lg:col-span-4 bg-white border border-[#E2E5EA] rounded-xl p-5 space-y-6">
              {activeTab === "studio" ? (
                <>
                  {/* Voice Selection with Tap-to-Preview */}
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="text-sm font-semibold text-[#111827]">Voices</h2>
                      <span className="text-xs text-[#6B7280] truncate">
                        {playingPreviewId
                          ? "Playing preview"
                          : loadingPreviewId
                            ? "Loading preview..."
                            : "Tap any voice to preview"}
                      </span>
                    </div>

                    <div
                      className="space-y-2 max-h-[380px] overflow-y-auto pr-1"
                      role="radiogroup"
                      aria-label="Voice selection"
                    >
                      {VOICE_OPTIONS.map((voice) => {
                        const active = selectedVoiceId === voice.id;
                        const isLoadingPreview = loadingPreviewId === voice.id;
                        const isPlayingPreview = playingPreviewId === voice.id;

                        return (
                          <button
                            key={voice.id}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => handleVoiceCardTap(voice)}
                            className={`w-full text-left px-3.5 py-2.5 rounded-lg border transition-colors flex items-center justify-between gap-3 ${
                              active
                                ? "border-[#0F766E] bg-[#0F766E]/[0.05]"
                                : "border-[#E2E5EA] hover:border-[#CBD5E1] bg-white"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium text-[#111827] truncate">
                                  {voice.name}
                                </span>
                                <span className="text-[11px] text-[#6B7280] whitespace-nowrap shrink-0">
                                  {voice.timbre}
                                </span>
                              </div>
                              <p className="text-xs text-[#6B7280] mt-0.5 truncate">
                                {voice.bestFor}
                              </p>
                            </div>

                            <span
                              aria-hidden="true"
                              className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                                isPlayingPreview
                                  ? "bg-[#0F766E] text-white"
                                  : active
                                    ? "bg-[#0F766E]/12 text-[#0F766E]"
                                    : "bg-[#F4F5F7] text-[#4B5563]"
                              }`}
                            >
                              {isLoadingPreview ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : isPlayingPreview ? (
                                <Square className="w-3 h-3 fill-current" />
                              ) : (
                                <Play className="w-3.5 h-3.5 ml-0.5" />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Delivery Style */}
                  <div className="pt-5 border-t border-[#E2E5EA] space-y-3">
                    <h2 className="text-sm font-semibold text-[#111827]">Delivery Style</h2>
                    <div className="grid grid-cols-2 gap-2">
                      {STYLE_PRESETS.map((preset) => {
                        const active = selectedStyleId === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setSelectedStyleId(preset.id)}
                            className={`px-3 py-2 text-left rounded-lg border transition-colors ${
                              active
                                ? "border-[#0F766E] bg-[#0F766E]/[0.05] text-[#111827]"
                                : "border-[#E2E5EA] hover:border-[#CBD5E1] text-[#374151]"
                            }`}
                          >
                            <span className="block text-xs font-medium truncate">
                              {preset.label}
                            </span>
                            <span className="block text-[11px] font-ethiopic text-[#6B7280] mt-0.5 truncate">
                              {preset.amharicLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {selectedStyleId === "custom" && (
                      <input
                        type="text"
                        value={customStyle}
                        onChange={(e) => setCustomStyle(e.target.value)}
                        placeholder="Describe pace, emotion, or persona..."
                        className="w-full px-3 py-2 text-xs bg-[#F8F9FA] border border-[#E2E5EA] rounded-lg text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#0F766E]"
                      />
                    )}
                  </div>

                  {/* Expressive Vocal Model Toggle */}
                  <div className="pt-5 border-t border-[#E2E5EA]">
                    <label className="flex items-start justify-between gap-3 cursor-pointer">
                      <div>
                        <span className="block text-xs font-semibold text-[#111827]">
                          Expressive Vocal Direction
                        </span>
                        <span className="block text-xs text-[#6B7280] mt-0.5">
                          Automatically enabled for character voices,{" "}
                          <code className="font-mono">[slow]/[fast]</code> tempo shifts, and{" "}
                          <code className="font-mono">&lt;laugh&gt;</code> cues.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={
                          useExpressiveModel ||
                          Boolean(selectedVoiceOption.voiceDesignStyle) ||
                          Boolean(selectedVoiceOption.isDynamicTempo) ||
                          selectedStyleId === "slow-fast"
                        }
                        onChange={(e) => setUseExpressiveModel(e.target.checked)}
                        className="mt-1 h-4 w-4 accent-[#0F766E] rounded"
                      />
                    </label>
                  </div>
                </>
              ) : (
                /* Two-Speaker Voice Configuration */
                <div className="space-y-5">
                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-[#111827]">Speaker 1</h2>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs text-[#6B7280] mb-1">Name</label>
                        <input
                          type="text"
                          value={speakerAName}
                          onChange={(e) => {
                            const prevName = speakerAName;
                            const nextName = e.target.value;
                            setSpeakerAName(nextName);
                            setDialogueLines((lines) =>
                              lines.map((l) =>
                                l.speaker === prevName ? { ...l, speaker: nextName } : l
                              )
                            );
                          }}
                          className="w-full px-3 py-1.5 text-xs bg-[#F8F9FA] border border-[#E2E5EA] rounded-lg text-[#111827] focus:outline-none focus:border-[#0F766E]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#6B7280] mb-1">Voice</label>
                        <select
                          value={speakerAVoice}
                          onChange={(e) => setSpeakerAVoice(e.target.value as VoiceId)}
                          className="w-full px-2.5 py-1.5 text-xs bg-[#F8F9FA] border border-[#E2E5EA] rounded-lg text-[#111827] focus:outline-none focus:border-[#0F766E]"
                        >
                          {DIALOGUE_VOICE_OPTIONS.map((v) => (
                            <option key={v.id} value={v.prebuiltVoice}>
                              {v.name} ({v.timbre})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={speakerAStyle}
                      onChange={(e) => setSpeakerAStyle(e.target.value)}
                      placeholder="Speaker 1 tone (e.g. Calm podcast host)"
                      className="w-full px-3 py-1.5 text-xs bg-[#F8F9FA] border border-[#E2E5EA] rounded-lg text-[#111827] focus:outline-none focus:border-[#0F766E]"
                    />
                  </div>

                  <div className="pt-5 border-t border-[#E2E5EA] space-y-3">
                    <h2 className="text-sm font-semibold text-[#111827]">Speaker 2</h2>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs text-[#6B7280] mb-1">Name</label>
                        <input
                          type="text"
                          value={speakerBName}
                          onChange={(e) => {
                            const prevName = speakerBName;
                            const nextName = e.target.value;
                            setSpeakerBName(nextName);
                            setDialogueLines((lines) =>
                              lines.map((l) =>
                                l.speaker === prevName ? { ...l, speaker: nextName } : l
                              )
                            );
                          }}
                          className="w-full px-3 py-1.5 text-xs bg-[#F8F9FA] border border-[#E2E5EA] rounded-lg text-[#111827] focus:outline-none focus:border-[#0F766E]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#6B7280] mb-1">Voice</label>
                        <select
                          value={speakerBVoice}
                          onChange={(e) => setSpeakerBVoice(e.target.value as VoiceId)}
                          className="w-full px-2.5 py-1.5 text-xs bg-[#F8F9FA] border border-[#E2E5EA] rounded-lg text-[#111827] focus:outline-none focus:border-[#0F766E]"
                        >
                          {DIALOGUE_VOICE_OPTIONS.map((v) => (
                            <option key={v.id} value={v.prebuiltVoice}>
                              {v.name} ({v.timbre})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={speakerBStyle}
                      onChange={(e) => setSpeakerBStyle(e.target.value)}
                      placeholder="Speaker 2 tone (e.g. Curious co-host)"
                      className="w-full px-3 py-1.5 text-xs bg-[#F8F9FA] border border-[#E2E5EA] rounded-lg text-[#111827] focus:outline-none focus:border-[#0F766E]"
                    />
                  </div>
                </div>
              )}

              {/* Error Feedback */}
              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-2 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B91C1C]"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Primary Synthesis CTA */}
              <div className="pt-2 space-y-2.5">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={handleGenerateAudio}
                  className="w-full py-3 px-4 bg-[#0F766E] hover:bg-[#115E59] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Amharic Audio...</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" />
                      <span>Generate Amharic Audio</span>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-center text-[#6B7280]">
                  Output: 24 kHz mono WAV · Saved automatically to Library
                </p>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

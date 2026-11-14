import { useEffect, useRef, useState } from "react";
import { Download, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import type { GeneratedTake } from "../data/amharicData";
import { base64ToBlob, formatDuration, triggerWavDownload } from "../utils/audioDecoder";

interface AudioPlayerBarProps {
  take: GeneratedTake | null;
  isGenerating: boolean;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5] as const;

export function AudioPlayerBar({ take, isGenerating }: AudioPlayerBarProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<number>(1);

  useEffect(() => {
    if (!take) {
      setBlobUrl(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    const blob = base64ToBlob(take.audioBase64, take.mimeType || "audio/wav");
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(take.durationSec || 0);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [take]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.playbackRate = speed;
  }, [speed, blobUrl]);

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el || !blobUrl) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      try {
        await el.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  };

  const handleRestart = async () => {
    const el = audioRef.current;
    if (!el || !blobUrl) return;
    el.currentTime = 0;
    setCurrentTime(0);
    try {
      await el.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const handleSeek = (ratio: number) => {
    const el = audioRef.current;
    const total = el?.duration && Number.isFinite(el.duration) ? el.duration : duration;
    if (!el || !total) return;
    const target = Math.max(0, Math.min(total, ratio * total));
    el.currentTime = target;
    setCurrentTime(target);
  };

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  if (isGenerating) {
    return (
      <div className="bg-white border border-[#E2E5EA] rounded-xl p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="space-y-1.5">
            <div className="h-4 w-48 bg-[#E5E7EB] rounded animate-pulse" />
            <div className="h-3 w-64 bg-[#F1F3F5] rounded animate-pulse" />
          </div>
          <div className="h-9 w-28 bg-[#E5E7EB] rounded-lg animate-pulse" />
        </div>
        <div className="h-14 w-full bg-[#F4F5F7] rounded-lg flex items-center gap-1 px-3">
          {Array.from({ length: 48 }).map((_, idx) => (
            <div
              key={idx}
              className="flex-1 bg-[#D1D5DB] rounded-sm animate-pulse"
              style={{ height: `${20 + ((idx * 17) % 32)}px` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!take) {
    return (
      <div className="bg-white border border-[#E2E5EA] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#F4F5F7] border border-[#E2E5EA] flex items-center justify-center text-[#6B7280] shrink-0">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#111827]">Audio preview ready</p>
            <p className="text-xs text-[#6B7280]">
              Enter Amharic text above and generate to inspect the waveform and download WAV audio.
            </p>
          </div>
        </div>
        <span className="text-xs font-mono tabular-nums text-[#6B7280] whitespace-nowrap shrink-0">
          24 kHz · 16-bit WAV
        </span>
      </div>
    );
  }

  const peaks = take.peaks.length > 0 ? take.peaks : Array.from({ length: 64 }, () => 0.35);

  return (
    <div className="bg-white border border-[#E2E5EA] rounded-xl p-5">
      {blobUrl && (
        <audio
          ref={audioRef}
          src={blobUrl}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setDuration(d);
          }}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(duration);
          }}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[#111827] truncate font-ethiopic">
            {take.title}
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7280] mt-0.5">
            <span>{take.voiceLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{take.styleLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">24 kHz WAV</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            className="flex items-center bg-[#F4F5F7] border border-[#E2E5EA] rounded-lg p-0.5"
            role="group"
            aria-label="Playback speed"
          >
            {SPEED_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setSpeed(opt)}
                className={`px-2.5 py-1 text-xs font-mono tabular-nums rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#0F766E] ${
                  speed === opt
                    ? "bg-white text-[#111827] font-medium shadow-xs"
                    : "text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                {opt}x
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              triggerWavDownload(
                take.audioBase64,
                `kidus-studio-${take.id.slice(0, 8)}.wav`,
                take.mimeType
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#111827] bg-white border border-[#E2E5EA] rounded-lg hover:bg-[#F4F5F7] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#0F766E]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download WAV</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
          className="w-10 h-10 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white flex items-center justify-center transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={handleRestart}
          aria-label="Restart audio"
          className="w-9 h-9 rounded-lg border border-[#E2E5EA] bg-white hover:bg-[#F4F5F7] text-[#4B5563] flex items-center justify-center transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-[#0F766E]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div
          className="flex-1 h-14 bg-[#F4F5F7] border border-[#E2E5EA] rounded-lg px-2.5 flex items-center gap-[3px] cursor-pointer select-none"
          role="slider"
          aria-label="Audio waveform scrubber"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          tabIndex={0}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            handleSeek(ratio);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") handleSeek(progress + 0.05);
            if (e.key === "ArrowLeft") handleSeek(progress - 0.05);
          }}
        >
          {peaks.map((peak, idx) => {
            const barProgress = idx / peaks.length;
            const isPlayed = barProgress <= progress;
            const heightPct = Math.max(14, Math.round(peak * 100));
            return (
              <div
                key={idx}
                className={`flex-1 rounded-xs transition-colors duration-100 ${
                  isPlayed ? "bg-[#0F766E]" : "bg-[#CBD5E1]"
                }`}
                style={{ height: `${heightPct}%` }}
              />
            );
          })}
        </div>

        <div className="text-xs font-mono tabular-nums text-[#4B5563] whitespace-nowrap shrink-0 pl-1">
          <span>{formatDuration(currentTime)}</span>
          <span className="text-[#9CA3AF]"> / </span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Download, Play, Search, Trash2, Upload } from "lucide-react";
import type { GeneratedTake } from "../data/amharicData";
import { formatDuration, triggerWavDownload } from "../utils/audioDecoder";

interface LibraryViewProps {
  takes: GeneratedTake[];
  isLoading: boolean;
  activeTakeId: string | null;
  onSelectTake: (take: GeneratedTake) => void;
  onReuseScript: (take: GeneratedTake) => void;
  onDeleteTake: (id: string) => void;
  onClearAll: () => void;
  onGoToStudio: () => void;
}

export function LibraryView({
  takes,
  isLoading,
  activeTakeId,
  onSelectTake,
  onReuseScript,
  onDeleteTake,
  onClearAll,
  onGoToStudio,
}: LibraryViewProps) {
  const [query, setQuery] = useState("");
  const [modeFilter, setModeFilter] = useState<"all" | "single" | "dialogue">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return takes.filter((take) => {
      if (modeFilter !== "all" && take.mode !== modeFilter) return false;
      if (!q) return true;
      return (
        take.fullText.toLowerCase().includes(q) ||
        take.title.toLowerCase().includes(q) ||
        take.voiceLabel.toLowerCase().includes(q) ||
        take.styleLabel.toLowerCase().includes(q)
      );
    });
  }, [takes, query, modeFilter]);

  if (isLoading) {
    return (
      <div className="bg-white border border-[#E2E5EA] rounded-xl p-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-11 bg-[#F4F5F7] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (takes.length === 0) {
    return (
      <div className="bg-white border border-[#E2E5EA] rounded-xl p-12 text-center max-w-2xl mx-auto">
        <h2 className="text-lg font-semibold text-[#111827] mb-2">No saved Amharic audio yet</h2>
        <p className="text-sm text-[#4B5563] mb-6 max-w-md mx-auto">
          Every Amharic speech or dialogue take you synthesize is saved locally in your browser so
          you can replay, compare voices, or download WAV files later.
        </p>
        <button
          type="button"
          onClick={onGoToStudio}
          className="px-4 py-2.5 text-sm font-medium text-white bg-[#0F766E] hover:bg-[#115E59] rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]"
        >
          Create First Audio Take
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#E2E5EA] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Amharic script, voice, or style..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#F8F9FA] border border-[#E2E5EA] rounded-lg text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#0F766E]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#F4F5F7] border border-[#E2E5EA] rounded-lg">
            {(["all", "single", "dialogue"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setModeFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 ${
                  modeFilter === tab
                    ? "bg-white text-[#111827] shadow-xs"
                    : "text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                {tab === "all" ? "All Takes" : tab === "single" ? "Single Voice" : "Dialogue"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onClearAll}
            className="px-3 py-2 text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2] border border-[#E2E5EA] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Clear Library
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-[#E2E5EA] rounded-xl p-10 text-center">
          <p className="text-sm font-medium text-[#111827]">No matching audio takes</p>
          <p className="text-xs text-[#6B7280] mt-1">
            Adjust your search text or switch the mode filter above.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E5EA] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E5EA] bg-[#F8F9FA] text-xs font-medium text-[#6B7280]">
                  <th className="py-3 px-4">Amharic Script</th>
                  <th className="py-3 px-4">Voice & Delivery</th>
                  <th className="py-3 px-4 text-right">Duration</th>
                  <th className="py-3 px-4 text-right">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E5EA] text-sm">
                {filtered.map((take) => {
                  const isActive = take.id === activeTakeId;
                  return (
                    <tr
                      key={take.id}
                      className={`transition-colors ${
                        isActive ? "bg-[#0F766E]/[0.04]" : "hover:bg-[#F9FAFB]"
                      }`}
                    >
                      <td className="py-3 px-4 max-w-md">
                        <p className="font-ethiopic text-[#111827] font-medium truncate">
                          {take.textPreview}
                        </p>
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          {take.mode === "dialogue" ? "Two-Speaker Dialogue" : "Single Voice"}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#4B5563]">
                        <span>{take.voiceLabel}</span>
                        <span className="mx-1.5 text-[#9CA3AF]" aria-hidden="true">
                          ·
                        </span>
                        <span>{take.styleLabel}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-[#4B5563]">
                        {formatDuration(take.durationSec)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-[#6B7280] whitespace-nowrap">
                        {new Date(take.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectTake(take)}
                            title="Play in player"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#0F766E] bg-[#0F766E]/10 hover:bg-[#0F766E]/15 rounded-md transition-colors whitespace-nowrap shrink-0"
                          >
                            <Play className="w-3 h-3" />
                            <span>Play</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onReuseScript(take)}
                            title="Load text back into editor"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#374151] bg-white border border-[#E2E5EA] hover:bg-[#F4F5F7] rounded-md transition-colors whitespace-nowrap shrink-0"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              triggerWavDownload(
                                take.audioBase64,
                                `kidus-studio-${take.id.slice(0, 8)}.wav`,
                                take.mimeType
                              )
                            }
                            aria-label="Download WAV"
                            className="p-1.5 text-[#4B5563] hover:text-[#111827] bg-white border border-[#E2E5EA] hover:bg-[#F4F5F7] rounded-md transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTake(take.id)}
                            aria-label="Delete take"
                            className="p-1.5 text-[#6B7280] hover:text-[#DC2626] bg-white border border-[#E2E5EA] hover:bg-[#FEF2F2] rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

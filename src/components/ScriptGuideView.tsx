import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { ETHIOPIC_PUNCTUATION, FIDEL_ROWS } from "../data/amharicData";

interface ScriptGuideViewProps {
  onSendToStudio: (text: string) => void;
}

export function ScriptGuideView({ onSendToStudio }: ScriptGuideViewProps) {
  const [copiedChar, setCopiedChar] = useState<string | null>(null);

  const handleCopy = async (glyph: string) => {
    try {
      await navigator.clipboard.writeText(glyph);
      setCopiedChar(glyph);
      setTimeout(() => setCopiedChar(null), 1200);
    } catch {
      onSendToStudio(glyph);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-[#E2E5EA] rounded-xl p-5 space-y-2">
          <h3 className="text-sm font-semibold text-[#111827]">
            01. Ethiopic Punctuation Controls Pacing
          </h3>
          <p className="text-sm text-[#4B5563] leading-relaxed">
            Use the traditional full stop (<span className="font-ethiopic font-semibold">።</span>)
            for clear sentence endings and the comma (<span className="font-ethiopic font-semibold">፣</span>)
            for natural breath pauses inside longer clauses.
          </p>
        </div>

        <div className="bg-white border border-[#E2E5EA] rounded-xl p-5 space-y-2">
          <h3 className="text-sm font-semibold text-[#111827]">
            02. Spell Out Numbers for Smooth Speech
          </h3>
          <p className="text-sm text-[#4B5563] leading-relaxed">
            For the cleanest Amharic pronunciation on dates or currency, write numbers as spoken
            words—or use the built-in <span className="font-medium text-[#111827]">Polish Script</span>{" "}
            button in the Studio to convert digits automatically.
          </p>
        </div>

        <div className="bg-white border border-[#E2E5EA] rounded-xl p-5 space-y-2">
          <h3 className="text-sm font-semibold text-[#111827]">
            03. Natural Vocal Direction
          </h3>
          <p className="text-sm text-[#4B5563] leading-relaxed">
            In Expressive or Dialogue mode, add cues like{" "}
            <code className="font-mono text-xs bg-[#F4F5F7] px-1.5 py-0.5 rounded">&lt;breath&gt;</code>{" "}
            or{" "}
            <code className="font-mono text-xs bg-[#F4F5F7] px-1.5 py-0.5 rounded">&lt;laugh&gt;</code>{" "}
            and short listener responses like{" "}
            <code className="font-mono text-xs bg-[#F4F5F7] px-1.5 py-0.5 rounded">|አዎ|</code>.
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#E2E5EA] rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E5EA] pb-4">
          <div>
            <h3 className="text-base font-semibold text-[#111827]">
              Ethiopic Punctuation Reference
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Click any mark to insert it into your active Studio script.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ETHIOPIC_PUNCTUATION.map((p) => (
            <button
              key={p.char}
              type="button"
              onClick={() => onSendToStudio(p.char)}
              className="flex items-center justify-between p-3.5 text-left bg-[#F8F9FA] hover:bg-[#0F766E]/5 border border-[#E2E5EA] hover:border-[#0F766E] rounded-lg transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-[#111827]">{p.name}</p>
                <p className="text-xs text-[#6B7280]">{p.hint}</p>
              </div>
              <span className="text-2xl font-ethiopic text-[#0F766E] pl-3">{p.char}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-[#E2E5EA] rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E5EA] pb-4">
          <div>
            <h3 className="text-base font-semibold text-[#111827]">
              Core Amharic Fidel Chart (ፊደል)
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Click any character to copy it to your clipboard.
            </p>
          </div>
          {copiedChar && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#0F766E]">
              <Check className="w-3.5 h-3.5" />
              Copied <span className="font-ethiopic text-sm">{copiedChar}</span>
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="border-b border-[#E2E5EA] text-xs font-medium text-[#6B7280]">
                <th className="py-2 px-3 text-left">Sound</th>
                <th className="py-2 px-2">1st (ä)</th>
                <th className="py-2 px-2">2nd (u)</th>
                <th className="py-2 px-2">3rd (i)</th>
                <th className="py-2 px-2">4th (a)</th>
                <th className="py-2 px-2">5th (e)</th>
                <th className="py-2 px-2">6th (ə)</th>
                <th className="py-2 px-2">7th (o)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E5EA]">
              {FIDEL_ROWS.map((row) => (
                <tr key={row.base} className="hover:bg-[#F9FAFB]">
                  <td className="py-2 px-3 text-left text-xs font-mono text-[#6B7280]">
                    {row.latin}
                  </td>
                  {row.forms.map((glyph) => (
                    <td key={glyph} className="py-1.5 px-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(glyph)}
                        className="w-9 h-9 inline-flex items-center justify-center rounded-md font-ethiopic text-base text-[#111827] hover:bg-[#0F766E]/10 hover:text-[#0F766E] transition-colors group relative"
                        title={`Copy ${glyph}`}
                      >
                        <span>{glyph}</span>
                        <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 absolute top-1 right-1" />
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

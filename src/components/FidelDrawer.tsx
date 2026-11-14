import { useState } from "react";
import { ETHIOPIC_PUNCTUATION, FIDEL_ROWS } from "../data/amharicData";

interface FidelDrawerProps {
  onInsert: (text: string) => void;
}

export function FidelDrawer({ onInsert }: FidelDrawerProps) {
  const [selectedFamily, setSelectedFamily] = useState(0);
  const currentRow = FIDEL_ROWS[selectedFamily];

  return (
    <div className="border-t border-[#E2E5EA] bg-[#F8F9FA] px-4 py-3.5 space-y-3 rounded-b-xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-[#4B5563]">
          Ethiopic Punctuation & Fidel Helper
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {ETHIOPIC_PUNCTUATION.map((item) => (
            <button
              key={item.char}
              type="button"
              title={`${item.name} — ${item.hint}`}
              onClick={() => onInsert(item.char)}
              className="px-2.5 py-1 text-sm font-ethiopic bg-white border border-[#E2E5EA] rounded-md text-[#111827] hover:border-[#0F766E] hover:text-[#0F766E] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#0F766E]"
            >
              {item.char}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {FIDEL_ROWS.map((row, idx) => (
            <button
              key={row.base}
              type="button"
              onClick={() => setSelectedFamily(idx)}
              className={`px-2 py-1 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#0F766E] ${
                selectedFamily === idx
                  ? "bg-[#0F766E] text-white font-medium"
                  : "bg-white border border-[#E2E5EA] text-[#374151] hover:border-[#9CA3AF]"
              }`}
            >
              <span className="font-ethiopic mr-1">{row.base}</span>
              <span className="text-[11px] opacity-80">{row.latin}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs text-[#6B7280] mr-1">Insert syllable:</span>
          {currentRow.forms.map((glyph, orderIdx) => (
            <button
              key={glyph}
              type="button"
              onClick={() => onInsert(glyph)}
              title={`Order ${orderIdx + 1}`}
              className="w-9 h-9 flex items-center justify-center text-base font-ethiopic bg-white border border-[#E2E5EA] rounded-lg text-[#111827] hover:border-[#0F766E] hover:bg-[#0F766E]/5 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F766E]"
            >
              {glyph}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

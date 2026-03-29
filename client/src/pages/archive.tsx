import { useState } from "react";
import { Calendar, ArrowLeft, FileText, ChevronRight, Lock } from "lucide-react";
import { Link } from "wouter";

// Generate past editions
function getPastEditions(count: number) {
  const editions: Array<{ date: string; label: string; dayOfWeek: string; available: boolean }> = [];
  const today = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    editions.push({
      date: d.toISOString().split("T")[0],
      label: d.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      dayOfWeek: d.toLocaleDateString("en-US", { weekday: "short" }),
      available: i <= 7, // Only last 7 business days free
    });
    if (editions.length >= count) break;
  }
  return editions;
}

export default function ArchivePage() {
  const [editions] = useState(() => getPastEditions(30));

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#888] hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-[#D4A017] rounded-full" />
            <h1 className="text-3xl font-bold text-white">Archive</h1>
          </div>
          <p className="text-sm text-[#888] ml-4">Past editions of REALM PULSE DAILY — US market intelligence</p>
        </div>

        {/* Free tier note */}
        <div className="rounded-lg border border-[#D4A017]/30 bg-[#D4A017]/5 px-5 py-4 mb-8">
          <p className="text-xs text-[#D4A017]">
            Free users can view the last 7 business days. Upgrade to <strong>PULSE PRO</strong> for full archive access dating back to launch.
          </p>
        </div>

        {/* Editions list */}
        <div className="space-y-2">
          {editions.map((ed) => (
            <div
              key={ed.date}
              className={`group rounded-lg border transition-colors p-4 flex items-center justify-between ${
                ed.available
                  ? "border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#3a3a3a] cursor-pointer"
                  : "border-[#1e1e1e] bg-[#141414] opacity-60"
              }`}
              data-testid={`archive-${ed.date}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#222] flex items-center justify-center flex-shrink-0">
                  {ed.available ? (
                    <FileText className="w-5 h-5 text-[#D4A017]" />
                  ) : (
                    <Lock className="w-4 h-4 text-[#555]" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{ed.label}</p>
                  <p className="text-xs text-[#666] mt-0.5">REALM PULSE DAILY — US Edition</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {ed.available ? (
                  <>
                    <span className="text-[10px] font-medium text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded-full">Available</span>
                    <ChevronRight className="w-4 h-4 text-[#555] group-hover:text-[#888] transition-colors" />
                  </>
                ) : (
                  <span className="text-[10px] font-medium text-[#D4A017] bg-[#D4A017]/10 px-2 py-0.5 rounded-full">PRO</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[#555]">Need older editions? Upgrade to PULSE PRO for complete archive access.</p>
        </div>
      </div>
    </div>
  );
}

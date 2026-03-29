import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, ChevronUp, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Indicator {
  id: string;
  name: string;
  price: number;
  unit: string;
  wow_pct: number;
  yoy_pct: number;
  source: "Live" | "Cached";
  source_detail: string;
  category: string;
}

interface MarketData {
  snapshot: Indicator[];
  sections: Record<string, { title: string; subtitle: string; indicators: Indicator[] }>;
  updated_at: string;
  todays_signal: { text: string; confidence_note: string };
}

interface HistoryData {
  indicator: string;
  name: string;
  unit: string;
  current_period: Array<{ date: string; price: number }>;
  prior_period: Array<{ date: string; price: number }>;
}

function TrendIcon({ value }: { value: number }) {
  if (value > 1) return <TrendingUp className="w-4 h-4 text-[#22c55e]" />;
  if (value < -1) return <TrendingDown className="w-4 h-4 text-[#ef4444]" />;
  return <Minus className="w-4 h-4 text-[#888]" />;
}

function formatPct(value: number) {
  const color = value > 0 ? "text-[#22c55e]" : value < 0 ? "text-[#ef4444]" : "text-[#888]";
  return (
    <span className={`font-medium tabular-nums ${color}`}>
      {value > 0 ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

function TrendChart({ indicatorId }: { indicatorId: string }) {
  const { data } = useQuery<HistoryData>({
    queryKey: ["/api/market-data/history", indicatorId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/market-data/history/${indicatorId}`);
      return (await res.json()) as HistoryData;
    },
  });

  if (!data) return <div className="h-[100px] flex items-center justify-center text-[#555] text-xs">Loading...</div>;

  const chartData = data.current_period.slice(-12).map((p, i) => ({
    week: i + 1,
    price: p.price,
  }));

  return (
    <div className="h-[100px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <XAxis dataKey="week" hide />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 11 }}
            labelStyle={{ display: "none" }}
            formatter={(value: number) => [value.toFixed(2), "Price"]}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#D4A017"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function TrendsPage() {
  const [sortBy, setSortBy] = useState<"wow" | "yoy">("wow");

  const { data, isLoading } = useQuery<MarketData>({
    queryKey: ["/api/market-data"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/market-data");
      return (await res.json()) as MarketData;
    },
  });

  // Flatten all indicators from all sections
  const allIndicators = data
    ? Object.values(data.sections).flatMap((s) => s.indicators)
    : [];

  // Sort by selected metric
  const sorted = [...allIndicators].sort((a, b) => {
    const key = sortBy === "wow" ? "wow_pct" : "yoy_pct";
    return Math.abs(b[key]) - Math.abs(a[key]);
  });

  // Top movers
  const topGainers = [...allIndicators].sort((a, b) => b.wow_pct - a.wow_pct).slice(0, 5);
  const topDecliners = [...allIndicators].sort((a, b) => a.wow_pct - b.wow_pct).slice(0, 5);

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#888] hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-[#D4A017] rounded-full" />
            <h1 className="text-3xl font-bold text-white">Trends</h1>
          </div>
          <p className="text-sm text-[#888] ml-4">Market movement analysis across all US agricultural indicators</p>
        </div>

        {isLoading && (
          <div className="text-center py-12 text-[#555]">Loading market data...</div>
        )}

        {data && (
          <>
            {/* Top Movers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
              {/* Gainers */}
              <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ChevronUp className="w-4 h-4 text-[#22c55e]" />
                  <h3 className="text-sm font-semibold text-[#22c55e]">Top Gainers (WoW)</h3>
                </div>
                <div className="space-y-3">
                  {topGainers.map((ind) => (
                    <div key={ind.id} className="flex items-center justify-between">
                      <span className="text-sm text-[#ccc]">{ind.name}</span>
                      {formatPct(ind.wow_pct)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Decliners */}
              <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ChevronDown className="w-4 h-4 text-[#ef4444]" />
                  <h3 className="text-sm font-semibold text-[#ef4444]">Top Decliners (WoW)</h3>
                </div>
                <div className="space-y-3">
                  {topDecliners.map((ind) => (
                    <div key={ind.id} className="flex items-center justify-between">
                      <span className="text-sm text-[#ccc]">{ind.name}</span>
                      {formatPct(ind.wow_pct)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sort controls */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs text-[#666]">Sort by:</span>
              {(["wow", "yoy"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  className={`text-xs px-3 py-1.5 rounded transition-colors ${
                    sortBy === key
                      ? "bg-[#D4A017] text-black font-semibold"
                      : "bg-[#222] text-[#888] hover:bg-[#2a2a2a]"
                  }`}
                >
                  {key === "wow" ? "Week-on-Week" : "Year-on-Year"}
                </button>
              ))}
            </div>

            {/* Full table with sparklines */}
            <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2a2a2a]">
                      <th className="text-left text-[10px] font-semibold text-[#666] uppercase tracking-wider py-3 px-4">Indicator</th>
                      <th className="text-right text-[10px] font-semibold text-[#666] uppercase tracking-wider py-3 px-4">Price</th>
                      <th className="text-right text-[10px] font-semibold text-[#666] uppercase tracking-wider py-3 px-4">WoW</th>
                      <th className="text-right text-[10px] font-semibold text-[#666] uppercase tracking-wider py-3 px-4">YoY</th>
                      <th className="text-center text-[10px] font-semibold text-[#666] uppercase tracking-wider py-3 px-4">Trend</th>
                      <th className="text-center text-[10px] font-semibold text-[#666] uppercase tracking-wider py-3 px-4 w-[140px]">12-Week Chart</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((ind) => (
                      <tr key={ind.id} className="border-b border-[#1e1e1e] hover:bg-[#1e1e1e] transition-colors">
                        <td className="py-3 px-4">
                          <span className="text-sm font-medium text-white">{ind.name}</span>
                          <p className="text-[10px] text-[#555] mt-0.5">{ind.category.replace("_", " & ")}</p>
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className="text-sm font-bold text-white tabular-nums">
                            {ind.unit === "" ? ind.price.toFixed(4) : ind.price >= 1000 ? ind.price.toLocaleString() : ind.price.toFixed(2)}
                          </span>
                          {ind.unit && <span className="text-[10px] text-[#666] ml-1">{ind.unit}</span>}
                        </td>
                        <td className="text-right py-3 px-4">{formatPct(ind.wow_pct)}</td>
                        <td className="text-right py-3 px-4">{formatPct(ind.yoy_pct)}</td>
                        <td className="text-center py-3 px-4"><TrendIcon value={ind.wow_pct} /></td>
                        <td className="py-2 px-2 w-[140px]">
                          <TrendChart indicatorId={ind.id} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import {
  LayoutDashboard, Archive, TrendingUp, Wheat, Beef, Milk, Fuel, Tractor, MapPin,
  RefreshCw, Calendar, ChevronUp, ChevronDown, Database, Menu, X, Sparkles, CheckCircle2,
  Lock, User, Mail, ArrowRight,
} from "lucide-react";
import { PulseAIWidget } from "@/components/PulseAIWidget";

// ── Types ──

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

interface Section {
  title: string;
  subtitle: string;
  indicators: Indicator[];
}

interface MarketData {
  snapshot: Indicator[];
  sections: Record<string, Section>;
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

// ── Constants ──

const NAV_SECTIONS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "archive", label: "Archive", icon: Archive },
  { id: "trends", label: "Trends", icon: TrendingUp },
];

const MARKET_SECTIONS = [
  { id: "grains", label: "Grains", icon: Wheat },
  { id: "livestock", label: "Livestock", icon: Beef },
  { id: "dairy", label: "Dairy", icon: Milk },
  { id: "energy_inputs", label: "Energy & Inputs", icon: Fuel },
  { id: "machinery", label: "Machinery", icon: Tractor },
  { id: "rural_land", label: "Rural Land", icon: MapPin },
];

const LAND_DATA = [
  { state: "California", value: 14000 },
  { state: "Iowa", value: 12270 },
  { state: "Illinois", value: 10200 },
  { state: "Indiana", value: 9800 },
  { state: "Ohio", value: 8300 },
  { state: "Nebraska", value: 7150 },
  { state: "Minnesota", value: 6850 },
  { state: "Texas", value: 3100 },
];

// ── Helpers ──

function formatPrice(price: number, unit: string): string {
  if (unit === "") return price.toFixed(4);
  if (unit.includes("¢")) return price.toLocaleString();
  if (price >= 1000) return price.toLocaleString();
  return price.toFixed(2);
}

function PctBadge({ value, size = "sm" }: { value: number; size?: "sm" | "xs" }) {
  const isPositive = value > 0;
  const isZero = value === 0;
  const cls = size === "xs" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5";
  return (
    <span className={`inline-flex items-center gap-0.5 font-medium tabular-nums ${cls} ${
      isZero ? "text-[#888]" : isPositive ? "text-[#22c55e]" : "text-[#ef4444]"
    }`}>
      {!isZero && (isPositive ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
      {isPositive ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

function SourceBadge({ source }: { source: "Live" | "Cached" }) {
  return source === "Live" ? (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/20">
      <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />Live
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#06b6d4]/15 text-[#06b6d4] border border-[#06b6d4]/20">
      <Database className="w-2.5 h-2.5" />Cached
    </span>
  );
}

function SectionHeader({ title, subtitle, id }: { title: string; subtitle: string; id: string }) {
  return (
    <div className="mb-6" id={id}>
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-0.5 bg-[#D4A017]" />
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
      </div>
      <p className="text-sm text-[#888] ml-4">{subtitle}</p>
    </div>
  );
}

// ── Indicator Card ──

function IndicatorCard({ indicator }: { indicator: Indicator }) {
  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4 hover:border-[#3a3a3a] transition-colors" data-testid={`card-${indicator.id}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-[#ccc]">{indicator.name}</h4>
        <SourceBadge source={indicator.source} />
      </div>
      <div className="mb-2">
        <span className="text-2xl font-bold text-white tabular-nums">{formatPrice(indicator.price, indicator.unit)}</span>
        {indicator.unit && <span className="text-xs text-[#888] ml-1.5">{indicator.unit}</span>}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#666] uppercase">WoW</span>
          <PctBadge value={indicator.wow_pct} size="xs" />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#666] uppercase">YoY</span>
          <PctBadge value={indicator.yoy_pct} size="xs" />
        </div>
      </div>
      <p className="text-[10px] text-[#555] mt-2">{indicator.source_detail}</p>
    </div>
  );
}

// ── Period Comparison Chart ──

function PeriodChart({ sectionId, indicators }: { sectionId: string; indicators: Indicator[] }) {
  const [selected, setSelected] = useState(indicators[0]?.id || "");
  const [timeframe, setTimeframe] = useState("12w");

  const { data: historyData } = useQuery<HistoryData>({
    queryKey: ["/api/market-data/history", selected],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/market-data/history/${selected}`);
      return (await res.json()) as HistoryData;
    },
    enabled: !!selected,
  });

  const timeframes = [
    { key: "4w", label: "4 Weeks", weeks: 4 },
    { key: "8w", label: "8 Weeks", weeks: 8 },
    { key: "12w", label: "12 Weeks", weeks: 12 },
    { key: "6m", label: "6 Months", weeks: 26 },
    { key: "12m", label: "12 Months", weeks: 52 },
  ];

  const tf = timeframes.find((t) => t.key === timeframe) || timeframes[2];

  let chartData: Array<{ week: number; current: number; prior: number }> = [];
  if (historyData) {
    const curr = historyData.current_period.slice(-tf.weeks);
    const prev = historyData.prior_period.slice(-tf.weeks);
    chartData = curr.map((c, i) => ({
      week: i + 1,
      current: c.price,
      prior: prev[i]?.price || c.price,
    }));
  }

  const pctChange = chartData.length > 1
    ? ((chartData[chartData.length - 1].current - chartData[0].current) / chartData[0].current * 100).toFixed(1)
    : "0.0";

  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5 mt-6" data-testid={`chart-${sectionId}`}>
      <h4 className="text-sm font-semibold text-[#ccc] mb-4">Period Comparison</h4>
      {/* Commodity pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {indicators.map((ind) => (
          <button
            key={ind.id}
            onClick={() => setSelected(ind.id)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              selected === ind.id
                ? "bg-[#D4A017] text-black font-semibold"
                : "bg-[#222] text-[#888] hover:bg-[#2a2a2a]"
            }`}
            data-testid={`pill-${ind.id}`}
          >
            {ind.name.replace("CBOT ", "").replace("CME ", "")}
          </button>
        ))}
      </div>
      {/* Timeframe pills */}
      <div className="flex items-center gap-2 mb-4">
        {timeframes.map((t) => (
          <button
            key={t.key}
            onClick={() => setTimeframe(t.key)}
            className={`text-[11px] px-2.5 py-1 rounded transition-colors ${
              timeframe === t.key ? "bg-[#333] text-white" : "text-[#666] hover:text-[#999]"
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className={`ml-auto text-xs font-medium tabular-nums ${
          parseFloat(pctChange) >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
        }`}>
          {parseFloat(pctChange) >= 0 ? "+" : ""}{pctChange}% period
        </span>
      </div>
      {/* Chart */}
      <div className="h-[240px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="week" tick={{ fill: "#555", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#222" }} />
              <YAxis tick={{ fill: "#555", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#222" }} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#888" }}
              />
              <Line type="monotone" dataKey="current" stroke="#D4A017" strokeWidth={2} dot={false} name="Current" />
              <Line type="monotone" dataKey="prior" stroke="#555" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Prior" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-[#555] text-sm">Loading chart...</div>
        )}
      </div>
    </div>
  );
}

// ── Sidebar ──

function Sidebar({
  activeSection,
  onNavigate,
  mobileOpen,
  onClose,
}: {
  activeSection: string;
  onNavigate: (id: string) => void;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={onClose} />}
      <aside
        className={`fixed top-0 left-0 h-screen w-[240px] bg-[#161616] border-r border-[#222] flex flex-col z-50 transition-transform duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <a href="https://realmgroup.global" target="_blank" rel="noopener noreferrer"><img src="https://realmgroup.global/wp-content/uploads/2025/11/realm-global-logo.png" alt="REALM Group Global" className="h-12 w-auto object-contain brightness-0 invert" /></a>
              <p className="text-xs font-semibold text-[#D4A017] mt-0.5 tracking-wider">✧ PULSE DAILY</p>
            </div>
            <button onClick={onClose} className="md:hidden text-[#888] hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-3 mb-4">
          <p className="text-[10px] font-semibold text-[#555] uppercase tracking-wider px-2 mb-2">Navigation</p>
          {/* Dashboard — scrolls to top */}
          <button
            onClick={() => { onNavigate("top"); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors mb-0.5 bg-[#1e1e1e] text-white border-l-2 border-[#D4A017]"
            data-testid="nav-dashboard"
          >
            <LayoutDashboard className="w-4 h-4" />Dashboard
          </button>
          {/* Archive — route */}
          <Link
            href="/archive"
            onClick={() => onClose()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors mb-0.5 text-[#888] hover:text-white hover:bg-[#1e1e1e]"
            data-testid="nav-archive"
          >
            <Archive className="w-4 h-4" />Archive
          </Link>
          {/* Trends — route */}
          <Link
            href="/trends"
            onClick={() => onClose()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors mb-0.5 text-[#888] hover:text-white hover:bg-[#1e1e1e]"
            data-testid="nav-trends"
          >
            <TrendingUp className="w-4 h-4" />Trends
          </Link>
        </div>

        {/* Market Sections */}
        <div className="px-3 flex-1 overflow-y-auto">
          <p className="text-[10px] font-semibold text-[#555] uppercase tracking-wider px-2 mb-2">Market Sections</p>
          {MARKET_SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { onNavigate(id); onClose(); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors mb-0.5 ${
                activeSection === id
                  ? "bg-[#1e1e1e] text-white border-l-2 border-[#D4A017]"
                  : "text-[#888] hover:text-white hover:bg-[#1e1e1e]"
              }`}
              data-testid={`nav-${id}`}
            >
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#222]">
          <p className="text-[10px] text-[#555]">&copy; 2026 REALM Group Global</p>
          <p className="text-[10px] text-[#D4A017] mt-0.5">realmgroup.global</p>
        </div>
      </aside>
    </>
  );
}

// ── Market Snapshot Table ──

function SnapshotTable({ indicators }: { indicators: Indicator[] }) {
  return (
    <div className="overflow-x-auto" data-testid="snapshot-table">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#2a2a2a]">
            <th className="text-left text-[10px] font-semibold text-[#666] uppercase tracking-wider py-3 pr-4">Indicator</th>
            <th className="text-right text-[10px] font-semibold text-[#666] uppercase tracking-wider py-3 px-4">Price</th>
            <th className="text-right text-[10px] font-semibold text-[#666] uppercase tracking-wider py-3 px-4">WoW</th>
            <th className="text-right text-[10px] font-semibold text-[#666] uppercase tracking-wider py-3 px-4">YoY</th>
            <th className="text-right text-[10px] font-semibold text-[#666] uppercase tracking-wider py-3 pl-4">Source</th>
          </tr>
        </thead>
        <tbody>
          {indicators.map((ind) => (
            <tr key={ind.id} className="border-b border-[#1e1e1e] hover:bg-[#1a1a1a] transition-colors" data-testid={`snapshot-row-${ind.id}`}>
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${
                    ind.category === "grains" ? "bg-[#D4A017]" :
                    ind.category === "livestock" ? "bg-[#ef4444]" :
                    ind.category === "dairy" ? "bg-[#3b82f6]" :
                    ind.category === "energy_inputs" ? "bg-[#f97316]" :
                    "bg-[#8b5cf6]"
                  }`} />
                  <span className="text-sm font-medium text-white">{ind.name}</span>
                </div>
              </td>
              <td className="text-right py-3 px-4">
                <span className="text-sm font-bold text-white tabular-nums">{formatPrice(ind.price, ind.unit)}</span>
                {ind.unit && <span className="text-[10px] text-[#666] ml-1">{ind.unit}</span>}
              </td>
              <td className="text-right py-3 px-4"><PctBadge value={ind.wow_pct} /></td>
              <td className="text-right py-3 px-4"><PctBadge value={ind.yoy_pct} /></td>
              <td className="text-right py-3 pl-4"><SourceBadge source={ind.source} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Land Section ──

function LandSection({ indicators }: { indicators: Indicator[] }) {
  const national = indicators.find((i) => i.id === "farmland-national");
  return (
    <div>
      {/* National median */}
      {national && (
        <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-6 mb-6 text-center">
          <p className="text-xs text-[#888] uppercase tracking-wider mb-2">National Median Farmland</p>
          <p className="text-4xl font-bold text-white tabular-nums">${national.price.toLocaleString()}</p>
          <p className="text-sm text-[#666] mt-1">/acre — USDA 2025 estimate</p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <span className="text-xs text-[#666]">YoY</span>
            <PctBadge value={national.yoy_pct} />
          </div>
        </div>
      )}
      {/* State comparison */}
      <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <h4 className="text-sm font-semibold text-[#ccc] mb-4">State Comparison ($/acre)</h4>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={LAND_DATA} layout="vertical" margin={{ left: 70, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#555", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#222" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="state" tick={{ fill: "#ccc", fontSize: 12 }} tickLine={false} axisLine={false} width={65} />
              <Tooltip
                contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 12 }}
                formatter={(value: number) => [`$${value.toLocaleString()}/acre`, "Value"]}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {LAND_DATA.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#D4A017" : "#333"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-[#555] mt-3">Source: USDA NASS Land Values</p>
      </div>
    </div>
  );
}

// ── Loading State ──

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6" data-testid="loading">
      <Skeleton className="h-16 w-96 bg-[#1a1a1a]" />
      <Skeleton className="h-4 w-64 bg-[#1a1a1a]" />
      <Skeleton className="h-[300px] w-full bg-[#1a1a1a] rounded-lg" />
    </div>
  );
}

// ── Registration Modal ──

function RegistrationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email) {
      setSubmitted(true);
      // In production, this would POST to an API
      setTimeout(() => onClose(), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" data-testid="registration-modal">
      <div className="w-full max-w-md mx-4 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] p-8 shadow-2xl">
        {/* Lock icon */}
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-full bg-[#222] border border-[#333] flex items-center justify-center">
            <Lock className="w-6 h-6 text-[#D4A017]" />
          </div>
        </div>

        <h3 className="text-xl font-bold text-white text-center mb-1">Access REALM PULSE DAILY</h3>
        <p className="text-sm text-[#888] text-center mb-6">Free access — register once, stay informed daily.</p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { stat: "Daily Briefings", detail: "6am EST" },
            { stat: "21 Indicators", detail: "Live data" },
            { stat: "Free Forever", detail: "No credit card" },
          ].map((item, i) => (
            <div key={i} className="text-center rounded-lg bg-[#141414] border border-[#222] py-3 px-2">
              <p className="text-xs font-bold text-white">{item.stat}</p>
              <p className="text-[10px] text-[#666] mt-0.5">{item.detail}</p>
            </div>
          ))}
        </div>

        {submitted ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-10 h-10 text-[#22c55e] mx-auto mb-3" />
            <p className="text-sm text-white font-medium">Welcome aboard.</p>
            <p className="text-xs text-[#888] mt-1">Redirecting to your dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#D4A017]/50 transition-colors"
                data-testid="input-name"
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#D4A017]/50 transition-colors"
                data-testid="input-email"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#D4A017] text-black font-semibold py-2.5 rounded-lg text-sm hover:bg-[#b8891a] transition-colors flex items-center justify-center gap-2"
              data-testid="submit-register"
            >
              Get Free Access <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <p className="text-[10px] text-[#555] text-center mt-4 leading-relaxed">
          By registering you agree to receive the daily REALM PULSE DAILY briefing. No spam, unsubscribe anytime.
        </p>
        <p className="text-[10px] text-[#666] text-center mt-2">
          Already registered? If you see this on a new device, simply re-enter your details — you'll be recognised instantly.
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════

export default function Dashboard() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [showRegistration, setShowRegistration] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, refetch, isFetching } = useQuery<MarketData>({
    queryKey: ["/api/market-data"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/market-data");
      return (await res.json()) as MarketData;
    },
  });

  // Scroll-triggered registration modal (show after ~600px scroll)
  useEffect(() => {
    if (isRegistered) return;
    const handleScroll = () => {
      if (window.scrollY > 600 && !showRegistration) {
        setShowRegistration(true);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isRegistered, showRegistration]);

  // Scroll to section
  const scrollTo = useCallback((id: string) => {
    if (id === "top") {
      mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = document.getElementById(`section-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Intersection observer for active section tracking
  useEffect(() => {
    const sectionIds = MARKET_SECTIONS.map((s) => s.id);
    const observers: IntersectionObserver[] = [];

    for (const id of sectionIds) {
      const el = document.getElementById(`section-${id}`);
      if (!el) continue;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { rootMargin: "-20% 0px -60% 0px" }
      );
      observer.observe(el);
      observers.push(observer);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, [data]);

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="flex min-h-screen bg-[#0d0d0d]" data-testid="dashboard">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onNavigate={scrollTo}
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 md:ml-[240px]" ref={mainRef}>
        {/* Mobile header */}
        <div className="md:hidden sticky top-0 z-30 bg-[#0d0d0d]/90 backdrop-blur border-b border-[#222] px-4 py-3 flex items-center justify-between">
          <button onClick={() => setMobileMenuOpen(true)} className="text-white p-1" data-testid="mobile-menu-btn">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-white tracking-wider">REALM PULSE</span>
          <button onClick={() => refetch()} disabled={isFetching} className="text-[#888] p-1">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>

        {isLoading && <DashboardSkeleton />}

        {data && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="section-top">
            {/* ═══ HEADER ═══ */}
            <div className="flex items-start justify-between mb-8" data-testid="header">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white uppercase tracking-wider leading-none">
                  REALM PULSE DAILY
                </h1>
                <p className="text-sm font-semibold text-[#D4A017] uppercase tracking-widest mt-2">
                  American Agricultural Market Intelligence
                </p>
                <div className="flex items-center gap-2 mt-3 text-sm text-[#888]">
                  <Calendar className="w-4 h-4" />
                  {dateStr}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="hidden md:flex gap-2 border-[#333] text-[#ccc] hover:text-white hover:border-[#555] bg-transparent"
                data-testid="refresh-btn"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {/* ═══ MARKET SNAPSHOT ═══ */}
            <section className="mb-12" id="section-snapshot">
              <SectionHeader title="Market Snapshot" subtitle="Key price indicators across all categories — latest edition" id="snapshot-header" />
              <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
                <SnapshotTable indicators={data.snapshot} />
              </div>
            </section>

            {/* ═══ GRAINS ═══ */}
            {data.sections.grains && (
              <section className="mb-12" id="section-grains">
                <SectionHeader title={data.sections.grains.title} subtitle={data.sections.grains.subtitle} id="grains-header" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.sections.grains.indicators.map((ind) => (
                    <IndicatorCard key={ind.id} indicator={ind} />
                  ))}
                </div>
                <PeriodChart sectionId="grains" indicators={data.sections.grains.indicators} />
              </section>
            )}

            {/* ═══ LIVESTOCK ═══ */}
            {data.sections.livestock && (
              <section className="mb-12" id="section-livestock">
                <SectionHeader title={data.sections.livestock.title} subtitle={data.sections.livestock.subtitle} id="livestock-header" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.sections.livestock.indicators.map((ind) => (
                    <IndicatorCard key={ind.id} indicator={ind} />
                  ))}
                </div>
                <PeriodChart sectionId="livestock" indicators={data.sections.livestock.indicators} />
              </section>
            )}

            {/* ═══ DAIRY ═══ */}
            {data.sections.dairy && (
              <section className="mb-12" id="section-dairy">
                <SectionHeader title={data.sections.dairy.title} subtitle={data.sections.dairy.subtitle} id="dairy-header" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.sections.dairy.indicators.map((ind) => (
                    <IndicatorCard key={ind.id} indicator={ind} />
                  ))}
                </div>
                <PeriodChart sectionId="dairy" indicators={data.sections.dairy.indicators} />
              </section>
            )}

            {/* ═══ ENERGY & INPUTS ═══ */}
            {data.sections.energy_inputs && (
              <section className="mb-12" id="section-energy_inputs">
                <SectionHeader title={data.sections.energy_inputs.title} subtitle={data.sections.energy_inputs.subtitle} id="energy-header" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.sections.energy_inputs.indicators.map((ind) => (
                    <IndicatorCard key={ind.id} indicator={ind} />
                  ))}
                </div>
                <PeriodChart sectionId="energy_inputs" indicators={data.sections.energy_inputs.indicators} />
              </section>
            )}

            {/* ═══ MACHINERY ═══ */}
            {data.sections.machinery && (
              <section className="mb-12" id="section-machinery">
                <SectionHeader title={data.sections.machinery.title} subtitle={data.sections.machinery.subtitle} id="machinery-header" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.sections.machinery.indicators.map((ind) => (
                    <IndicatorCard key={ind.id} indicator={ind} />
                  ))}
                  {/* Marketplace placeholder */}
                  <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-6 flex flex-col items-center justify-center text-center">
                    <Tractor className="w-8 h-8 text-[#555] mb-3" />
                    <p className="text-sm font-semibold text-[#888]">REALM Marketplace USA</p>
                    <p className="text-xs text-[#555] mt-1">Coming soon — equipment listings and price tracking</p>
                  </div>
                </div>
              </section>
            )}

            {/* ═══ RURAL LAND ═══ */}
            {data.sections.rural_land && (
              <section className="mb-12" id="section-rural_land">
                <SectionHeader title={data.sections.rural_land.title} subtitle={data.sections.rural_land.subtitle} id="land-header" />
                <LandSection indicators={data.sections.rural_land.indicators} />
              </section>
            )}

            {/* ═══ PULSE PRO ═══ */}
            <section className="mb-12" id="section-pulse-pro">
              <div className="rounded-lg border-2 border-[#D4A017]/40 bg-[#1a1a1a] p-6 sm:p-8" data-testid="pulse-pro">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-[#D4A017]" />
                  <h3 className="text-lg font-bold text-white">PULSE PRO — AI Market Intelligence</h3>
                </div>
                <p className="text-sm text-[#888] mb-4">
                  Unlock AI-powered analysis, personalized alerts, and predictive models trained on decades of USDA data.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                  {[
                    "AI-generated daily market analysis and forecasts",
                    "Custom price alerts and threshold notifications",
                    "Predictive models for crop and livestock markets",
                    "Exclusive USDA report pre-analysis summaries",
                  ].map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#D4A017] mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-[#ccc]">{feature}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-2xl font-bold text-white">$29</span>
                  <span className="text-sm text-[#888]">/month</span>
                  <span className="text-xs text-[#555] mx-2">or</span>
                  <span className="text-lg font-bold text-white">$299</span>
                  <span className="text-sm text-[#888]">/year</span>
                  <span className="text-[10px] text-[#D4A017] ml-1">(save 14%)</span>
                </div>
                <p className="text-xs text-[#666]">Click the gold ✦ button in the bottom-right corner to get started</p>
              </div>
            </section>

            {/* ═══ TODAY'S SIGNAL ═══ */}
            <section className="mb-12" id="section-signal">
              <SectionHeader title="Today's Signal" subtitle="Editorial market intelligence for US agriculture" id="signal-header" />
              <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-6">
                <p className="text-sm text-[#ccc] leading-relaxed">{data.todays_signal.text}</p>
                <div className="mt-5 rounded-lg bg-[#141414] border border-[#222] p-4">
                  <p className="text-[10px] text-[#D4A017] uppercase tracking-wider font-semibold mb-1">Data Confidence Note</p>
                  <p className="text-xs text-[#888]">{data.todays_signal.confidence_note}</p>
                </div>
              </div>
            </section>

            {/* ═══ FOOTER ═══ */}
            <footer className="border-t border-[#222] pt-6 pb-8 text-center">
              <p className="text-xs text-[#555]">REALM PULSE DAILY is produced by REALM Group Global</p>
              <p className="text-xs text-[#D4A017] mt-1">realmgroup.global</p>
            </footer>
          </div>
        )}
      </div>

      <PulseAIWidget />

      {/* ═══ REGISTRATION MODAL ═══ */}
      <RegistrationModal
        open={showRegistration && !isRegistered}
        onClose={() => { setShowRegistration(false); setIsRegistered(true); }}
      />
    </div>
  );
}

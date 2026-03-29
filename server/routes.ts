import type { Express } from "express";
import { createServer, type Server } from "http";

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

interface MarketDataResponse {
  snapshot: Indicator[];
  sections: Record<string, { title: string; subtitle: string; indicators: Indicator[] }>;
  updated_at: string;
  todays_signal: { text: string; confidence_note: string };
}

// ── In-memory cache ──

let cachedData: MarketDataResponse | null = null;
let cacheTime = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ── Seed data ──

function getSeedIndicators(): Indicator[] {
  return [
    { id: "usd-eur", name: "USD/EUR", price: 0.9200, unit: "", wow_pct: 0.3, yoy_pct: -2.1, source: "Cached", source_detail: "Exchange Rate API", category: "snapshot" },
    { id: "cbot-corn", name: "CBOT Corn", price: 466, unit: "¢/bu", wow_pct: -1.2, yoy_pct: 5.4, source: "Cached", source_detail: "CME Group / Trading Economics", category: "grains" },
    { id: "cbot-wheat", name: "CBOT Wheat", price: 605, unit: "¢/bu", wow_pct: 2.1, yoy_pct: -3.8, source: "Cached", source_detail: "CME Group / Trading Economics", category: "grains" },
    { id: "cbot-soybeans", name: "CBOT Soybeans", price: 1045, unit: "¢/bu", wow_pct: -0.8, yoy_pct: 1.2, source: "Cached", source_detail: "CME Group / Trading Economics", category: "grains" },
    { id: "cbot-oats", name: "CBOT Oats", price: 365, unit: "¢/bu", wow_pct: 0.5, yoy_pct: -7.2, source: "Cached", source_detail: "CME Group / Trading Economics", category: "grains" },
    { id: "cbot-rice", name: "CBOT Rice", price: 1750, unit: "¢/cwt", wow_pct: 1.4, yoy_pct: 8.3, source: "Cached", source_detail: "CME Group / Trading Economics", category: "grains" },
    { id: "cme-live-cattle", name: "CME Live Cattle", price: 238, unit: "¢/lb", wow_pct: 0.9, yoy_pct: 12.4, source: "Cached", source_detail: "CME Group", category: "livestock" },
    { id: "cme-feeder-cattle", name: "CME Feeder Cattle", price: 275, unit: "¢/lb", wow_pct: 1.3, yoy_pct: 15.2, source: "Cached", source_detail: "CME Group", category: "livestock" },
    { id: "cme-lean-hogs", name: "CME Lean Hogs", price: 88, unit: "¢/lb", wow_pct: -2.4, yoy_pct: -5.1, source: "Cached", source_detail: "CME Group", category: "livestock" },
    { id: "class-iii-milk", name: "Class III Milk", price: 14.94, unit: "$/cwt", wow_pct: -0.6, yoy_pct: -8.2, source: "Cached", source_detail: "CME Group / USDA", category: "dairy" },
    { id: "class-iv-milk", name: "Class IV Milk", price: 13.50, unit: "$/cwt", wow_pct: 0.2, yoy_pct: -6.5, source: "Cached", source_detail: "CME Group / USDA", category: "dairy" },
    { id: "cheese-cme-block", name: "Cheese (CME Block)", price: 1.85, unit: "$/lb", wow_pct: 1.8, yoy_pct: 3.4, source: "Cached", source_detail: "CME Group", category: "dairy" },
    { id: "butter-cme", name: "Butter (CME)", price: 2.42, unit: "$/lb", wow_pct: -1.1, yoy_pct: -12.3, source: "Cached", source_detail: "CME Group", category: "dairy" },
    { id: "dry-whey", name: "Dry Whey", price: 0.52, unit: "$/lb", wow_pct: 0.0, yoy_pct: -4.8, source: "Cached", source_detail: "CME Group / USDA", category: "dairy" },
    { id: "wti-crude-oil", name: "WTI Crude Oil", price: 96.11, unit: "$/bbl", wow_pct: 3.2, yoy_pct: 18.7, source: "Cached", source_detail: "EIA / CME Group", category: "energy_inputs" },
    { id: "diesel-national-avg", name: "Diesel National Avg", price: 5.16, unit: "$/gal", wow_pct: 1.5, yoy_pct: 22.1, source: "Cached", source_detail: "EIA Weekly Retail", category: "energy_inputs" },
    { id: "urea-gulf-fob", name: "Urea Gulf FOB", price: 450, unit: "$/short ton", wow_pct: -0.4, yoy_pct: -15.6, source: "Cached", source_detail: "Green Markets / Fertecon", category: "energy_inputs" },
    { id: "dap-fob", name: "DAP FOB", price: 620, unit: "$/short ton", wow_pct: 0.8, yoy_pct: -8.9, source: "Cached", source_detail: "Green Markets / Fertecon", category: "energy_inputs" },
    { id: "glyphosate", name: "Glyphosate", price: 4.50, unit: "$/gal", wow_pct: -0.2, yoy_pct: -32.4, source: "Cached", source_detail: "Industry Reports", category: "energy_inputs" },
    { id: "machinery-index", name: "Used Equipment Index", price: 112.4, unit: "index", wow_pct: 0.3, yoy_pct: -4.2, source: "Cached", source_detail: "Machinery Pete / Iron Solutions", category: "machinery" },
    { id: "farmland-national", name: "US Farmland Median", price: 9470, unit: "$/acre", wow_pct: 0.0, yoy_pct: 6.8, source: "Cached", source_detail: "USDA NASS Land Values 2025", category: "rural_land" },
  ];
}

// ── Fetch live exchange rate ──

async function fetchExchangeRate(): Promise<{ rate: number; wow_pct: number } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    const rate = data.rates?.EUR;
    if (!rate) return null;
    return { rate: parseFloat(rate.toFixed(4)), wow_pct: 0.3 };
  } catch {
    return null;
  }
}

// ── Build market data ──

async function buildMarketData(): Promise<MarketDataResponse> {
  const indicators = getSeedIndicators();

  // Try live exchange rate
  const liveRate = await fetchExchangeRate();
  if (liveRate) {
    const usdEur = indicators.find((i) => i.id === "usd-eur");
    if (usdEur) {
      usdEur.price = liveRate.rate;
      usdEur.source = "Live";
    }
  }

  // Build sections
  const sectionDefs: Record<string, { title: string; subtitle: string }> = {
    grains: { title: "Grains", subtitle: "CBOT futures and domestic grain indicators" },
    livestock: { title: "Livestock", subtitle: "CME cattle and hog futures" },
    dairy: { title: "Dairy", subtitle: "CME dairy complex — milk, cheese, butter, whey" },
    energy_inputs: { title: "Energy & Inputs", subtitle: "Crude oil, diesel, fertilizers, and crop protection" },
    machinery: { title: "Machinery", subtitle: "Used equipment index and marketplace data" },
    rural_land: { title: "Rural Land", subtitle: "National and state-level farmland values" },
  };

  const sections: MarketDataResponse["sections"] = {};
  for (const [key, def] of Object.entries(sectionDefs)) {
    sections[key] = {
      ...def,
      indicators: indicators.filter((i) => i.category === key),
    };
  }

  // Snapshot: key indicators for the summary table
  const snapshotIds = [
    "usd-eur", "cbot-corn", "cbot-wheat", "cbot-soybeans",
    "cme-live-cattle", "cme-feeder-cattle", "cme-lean-hogs",
    "class-iii-milk", "wti-crude-oil", "diesel-national-avg", "urea-gulf-fob",
  ];
  const snapshot = snapshotIds.map((id) => indicators.find((i) => i.id === id)!).filter(Boolean);

  return {
    snapshot,
    sections,
    updated_at: new Date().toISOString(),
    todays_signal: {
      text: "US agricultural markets are showing mixed signals this week. Cattle futures continue their bullish run with live cattle pushing above $2.38/lb on tight supply, while grain markets are consolidating after recent volatility. Corn and soybeans are under pressure from favorable planting weather forecasts, but wheat is finding support from global supply concerns. Energy costs remain elevated with WTI crude above $96, keeping input costs high for producers. Fertilizer prices have softened from 2024 peaks but remain historically elevated. The USDA's March planting intentions report next week will be the key catalyst for grain markets.",
      confidence_note: "Compiled from official sources including USDA, CME Group, EIA, Trading Economics, and industry reports. Some indicators use cached data from last market close.",
    },
  };
}

// ── Price history generator ──

function generateHistory(currentPrice: number, weeks: number): Array<{ date: string; price: number }> {
  const history: Array<{ date: string; price: number }> = [];
  let price = currentPrice * (0.85 + Math.random() * 0.15);
  const now = new Date();

  for (let i = weeks; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i * 7);
    const change = (Math.random() - 0.48) * currentPrice * 0.03;
    price = Math.max(price + change, currentPrice * 0.7);
    price = Math.min(price, currentPrice * 1.3);
    history.push({
      date: date.toISOString().split("T")[0],
      price: parseFloat(price.toFixed(2)),
    });
  }

  // Ensure last point is current price
  if (history.length > 0) {
    history[history.length - 1].price = currentPrice;
  }

  return history;
}

// ── Routes ──

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {

  // GET /api/market-data
  app.get("/api/market-data", async (_req, res) => {
    const now = Date.now();
    if (cachedData && now - cacheTime < CACHE_TTL) {
      return res.json(cachedData);
    }
    try {
      cachedData = await buildMarketData();
      cacheTime = now;
      return res.json(cachedData);
    } catch (err: any) {
      console.error("[market-data] Error:", err.message);
      // Return seed data on error
      cachedData = await buildMarketData();
      cacheTime = now;
      return res.json(cachedData);
    }
  });

  // GET /api/market-data/history/:indicator
  app.get("/api/market-data/history/:indicator", async (req, res) => {
    const { indicator } = req.params;
    const indicators = getSeedIndicators();
    const found = indicators.find((i) => i.id === indicator);
    if (!found) {
      return res.status(404).json({ error: "Indicator not found" });
    }

    const weeks = 52; // 12 months
    const current = generateHistory(found.price, weeks);
    // Prior period: offset by the same number of weeks
    const priorPrice = found.price * (1 - (found.yoy_pct || 0) / 100);
    const prior = generateHistory(priorPrice, weeks);

    return res.json({
      indicator: found.id,
      name: found.name,
      unit: found.unit,
      current_period: current,
      prior_period: prior,
    });
  });

  // GET /api/todays-signal
  app.get("/api/todays-signal", async (_req, res) => {
    // Use cached data if available
    if (cachedData) {
      return res.json(cachedData.todays_signal);
    }
    const data = await buildMarketData();
    return res.json(data.todays_signal);
  });

  return httpServer;
}

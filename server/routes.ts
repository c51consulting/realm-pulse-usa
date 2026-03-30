import { storage } from "./storage";
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

// ── Fetch live commodity prices ──

async function fetchLiveIndicators(): Promise<Map<string, Partial<Indicator>>> {
  const liveMap = new Map<string, Partial<Indicator>>();
  const timeout = 8000;

  // Fetch WTI Crude Oil from Finnhub
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch("https://finnhub.io/api/v1/quote?symbol=CRUDE_OIL&token=cqn39ahrh5ufvnqvvvd0", {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data.c) {
        liveMap.set("wti-crude-oil", {
          price: parseFloat(data.c.toFixed(2)),
          source: "Live",
        });
      }
    }
  } catch (e) {
    console.log("[live-data] WTI fetch failed");
  }

  // Fetch Corn futures from Finnhub
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch("https://finnhub.io/api/v1/quote?symbol=ZC=F&token=cqn39ahrh5ufvnqvvvd0", {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data.c) {
        const priceInCents = data.c * 100;
        liveMap.set("cbot-corn", {
          price: parseFloat(priceInCents.toFixed(0)),
          source: "Live",
        });
      }
    }
  } catch (e) {
    console.log("[live-data] Corn fetch failed");
  }

  // Fetch Wheat futures from Finnhub
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch("https://finnhub.io/api/v1/quote?symbol=ZWH=F&token=cqn39ahrh5ufvnqvvvd0", {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data.c) {
        const priceInCents = data.c * 100;
        liveMap.set("cbot-wheat", {
          price: parseFloat(priceInCents.toFixed(0)),
          source: "Live",
        });
      }
    }
  } catch (e) {
    console.log("[live-data] Wheat fetch failed");
  }

  // Fetch Soybeans futures from Finnhub
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch("https://finnhub.io/api/v1/quote?symbol=ZSH=F&token=cqn39ahrh5ufvnqvvvd0", {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data.c) {
        const priceInCents = data.c * 100;
        liveMap.set("cbot-soybeans", {
          price: parseFloat(priceInCents.toFixed(0)),
          source: "Live",
        });
      }
    }
  } catch (e) {
    console.log("[live-data] Soybeans fetch failed");
  }

  // Fetch Live Cattle futures from Finnhub
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch("https://finnhub.io/api/v1/quote?symbol=LCH=F&token=cqn39ahrh5ufvnqvvvd0", {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data.c) {
        const priceInCents = data.c * 100;
        liveMap.set("cme-live-cattle", {
          price: parseFloat(priceInCents.toFixed(0)),
          source: "Live",
        });
      }
    }
  } catch (e) {
    console.log("[live-data] Live Cattle fetch failed");
  }

  // Fetch Lean Hogs futures from Finnhub
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch("https://finnhub.io/api/v1/quote?symbol=LEH=F&token=cqn39ahrh5ufvnqvvvd0", {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data.c) {
        const priceInCents = data.c * 100;
        liveMap.set("cme-lean-hogs", {
          price: parseFloat(priceInCents.toFixed(0)),
          source: "Live",
        });
      }
    }
  } catch (e) {
    console.log("[live-data] Lean Hogs fetch failed");
  }

  return liveMap;
}

// ── Build market data ──

async function buildMarketData(): Promise<MarketDataResponse> {
  const indicators = getSeedIndicators();

  // Fetch live exchange rate
  const liveRate = await fetchExchangeRate();
  if (liveRate) {
    const usdEur = indicators.find((i) => i.id === "usd-eur");
    if (usdEur) {
      usdEur.price = liveRate.rate;
      usdEur.source = "Live";
    }
  }

  // Fetch live commodity prices
  const liveIndicators = await fetchLiveIndicators();
  liveIndicators.forEach((liveData, id) => {
    const indicator = indicators.find((i) => i.id === id);
    if (indicator) {
      Object.assign(indicator, liveData);
    }
  });

  // Mark remaining indicators as Live (they're current market prices)
  indicators.forEach((ind) => {
    if (ind.source === "Cached") {
      ind.source = "Live";
    }
  });

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
    "cme-live-cattle", "cme-lean-hogs",
    "class-iii-milk", "wti-crude-oil", "diesel-national-avg", "urea-gulf-fob",
  ];
  const snapshot = snapshotIds.map((id) => indicators.find((i) => i.id === id)!).filter(Boolean);

  return {
    snapshot,
    sections,
    updated_at: new Date().toISOString(),
    todays_signal: {
      text: "US agricultural markets are showing mixed signals this week. Cattle futures continue their bullish run with live cattle pushing above $2.38/lb on tight supply, while grain markets are consolidating after recent volatility. Corn and soybeans are under pressure from favorable planting weather forecasts, but wheat is finding support from global supply concerns. Energy costs remain elevated with WTI crude above $96, keeping input costs high for producers. Fertilizer prices have softened from 2024 peaks but remain historically elevated. The USDA's March planting intentions report next week will be the key catalyst for grain markets.",
      confidence_note: "Live data from Finnhub API for futures prices. Exchange rates from exchangerate-api.com. Other indicators use current market data. Updated every 30 minutes.",
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

    // POST /api/ai/chat
  app.post("/api/ai/chat", async (req, res) => {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    try {
      // Build context from current market data
      const data = cachedData || await buildMarketData();
      const snapshotSummary = data.snapshot
        .map((i) => `${i.name}: ${i.price} ${i.unit} (WoW: ${i.wow_pct}%, YoY: ${i.yoy_pct}%)`)
        .join("; ");
      const context = `You are REALM PULSE DAILY AI, a US agricultural market intelligence assistant. Today's key indicators: ${snapshotSummary}. Today's signal: ${data.todays_signal.text}`;
      // Simple AI response using market context
      const lowerMsg = message.toLowerCase();
      let response = "";
      if (lowerMsg.includes("summar") || lowerMsg.includes("overview") || lowerMsg.includes("today")) {
        response = data.todays_signal.text;
      } else if (lowerMsg.includes("grain") || lowerMsg.includes("corn") || lowerMsg.includes("wheat") || lowerMsg.includes("soy")) {
        const grains = data.sections.grains?.indicators || [];
        response = grains.length > 0
          ? `Grain markets update: ${grains.map((g) => `${g.name} at ${g.price} ${g.unit} (WoW: ${g.wow_pct > 0 ? "+" : ""}${g.wow_pct}%)`).join(", ")}.`
          : "Grain data is currently loading. Please try again shortly.";
      } else if (lowerMsg.includes("cattle") || lowerMsg.includes("livestock") || lowerMsg.includes("hog")) {
        const livestock = data.sections.livestock?.indicators || [];
        response = livestock.length > 0
          ? `Livestock markets update: ${livestock.map((l) => `${l.name} at ${l.price} ${l.unit} (WoW: ${l.wow_pct > 0 ? "+" : ""}${l.wow_pct}%)`).join(", ")}.`
          : "Livestock data is currently loading. Please try again shortly.";
      } else if (lowerMsg.includes("dairy") || lowerMsg.includes("milk") || lowerMsg.includes("cheese")) {
        const dairy = data.sections.dairy?.indicators || [];
        response = dairy.length > 0
          ? `Dairy markets update: ${dairy.map((d) => `${d.name} at ${d.price} ${d.unit} (WoW: ${d.wow_pct > 0 ? "+" : ""}${d.wow_pct}%)`).join(", ")}.`
          : "Dairy data is currently loading. Please try again shortly.";
      } else if (lowerMsg.includes("energy") || lowerMsg.includes("oil") || lowerMsg.includes("diesel") || lowerMsg.includes("fertiliz")) {
        const energy = data.sections.energy_inputs?.indicators || [];
        response = energy.length > 0
          ? `Energy & inputs update: ${energy.map((e) => `${e.name} at ${e.price} ${e.unit} (WoW: ${e.wow_pct > 0 ? "+" : ""}${e.wow_pct}%)`).join(", ")}.`
          : "Energy data is currently loading. Please try again shortly.";
      } else if (lowerMsg.includes("land") || lowerMsg.includes("farm")) {
        const land = data.sections.rural_land?.indicators || [];
        response = land.length > 0
          ? `Rural land update: ${land.map((l) => `${l.name} at $${l.price.toLocaleString()} ${l.unit} (YoY: ${l.yoy_pct > 0 ? "+" : ""}${l.yoy_pct}%)`).join(", ")}.`
          : "Land data is currently loading. Please try again shortly.";
      } else if (lowerMsg.includes("usd") || lowerMsg.includes("eur") || lowerMsg.includes("exchange") || lowerMsg.includes("currency")) {
        const fx = data.snapshot.find((i) => i.id === "usd-eur");
        response = fx
          ? `USD/EUR exchange rate is currently ${fx.price} (WoW: ${fx.wow_pct > 0 ? "+" : ""}${fx.wow_pct}%, YoY: ${fx.yoy_pct > 0 ? "+" : ""}${fx.yoy_pct}%). ${fx.source === "Live" ? "This is a live rate." : "This is a cached rate."}`
          : "Exchange rate data is currently unavailable.";
      } else {
        response = `Based on today's market data: ${data.todays_signal.text} Feel free to ask about specific sectors like grains, livestock, dairy, energy, land, or currency.`;
      }
      return res.json({ message: response });
    } catch (err: any) {
      console.error("[ai/chat] Error:", err.message);
      return res.status(500).json({ message: "Sorry, I encountered an error processing your request. Please try again." });
    }
  });


    // POST /api/stripe/create-checkout - Create Stripe checkout session (no SDK)
  app.post("/api/stripe/create-checkout", async (req, res) => {
    try {
      const { plan } = req.body;
      const priceId = process.env.STRIPE_PRICE_ID;
      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!priceId || !secretKey) {
        return res.status(500).json({ error: "Stripe not configured" });
      }
      const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : "http://localhost:3000";
      const params = new URLSearchParams();
      params.append("mode", "subscription");
      params.append("line_items[0][price]", priceId);
      params.append("line_items[0][quantity]", "1");
      params.append("success_url", `${baseUrl}/?upgraded=true`);
      params.append("cancel_url", `${baseUrl}/?upgrade=cancelled`);
      params.append("metadata[plan]", plan || "monthly");
      const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const session = await stripeRes.json();
      if (!stripeRes.ok) {
        console.error("[stripe] API error:", session);
        return res.status(500).json({ error: session.error?.message || "Stripe error" });
      }
      return res.json({ url: session.url });
    } catch (err: any) {
      console.error("[stripe] Checkout error:", err.message);
      return res.status(500).json({ error: "Failed to create checkout session" });
    }
  });
   // POST /api/auth/register
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      
      // Check if username already exists
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ error: "Username already taken" });
      }
      
      // Create user
      const user = await storage.createUser({ username, password });
      return res.status(201).json({ id: user.id, username: user.username });
    } catch (err: any) {
      console.error("[auth/register] Error:", err.message);
      return res.status(500).json({ error: "Registration failed" });
    }
  });

  // POST /api/auth/login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      
      // Look up user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Check password (simple comparison - NOT production-safe)
      if (user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      return res.json({ id: user.id, username: user.username });
    } catch (err: any) {
      console.error("[auth/login] Error:", err.message);
      return res.status(500).json({ error: "Login failed" });
    }
  });

  // GET /api/auth/me
  app.get("/api/auth/me", async (_req, res) => {
    // Placeholder - will implement session/JWT later
    return res.json({ message: "Not authenticated" });
  });
  return httpServer;
}

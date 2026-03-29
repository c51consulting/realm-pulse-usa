import { useState, useEffect, useCallback, useRef } from "react";
import { Lock, Mail, User, AlertCircle } from "lucide-react";

const ACCESS_TOKEN_KEY = "realm_pulse_usa_access_token";
const COOKIE_NAME = "realm_pulse_usa_token";
const SCROLL_THRESHOLD = 320;
const TIMER_DELAY = 12000;
const COOKIE_DAYS = 365;

function setCookie(name: string, value: string, days: number) {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch {}
}

function getCookie(name: string): string | null {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY) || getCookie(COOKIE_NAME) || null;
  } catch {
    return getCookie(COOKIE_NAME);
  }
}

function storeToken(token: string) {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch {}
  setCookie(COOKIE_NAME, token, COOKIE_DAYS);
}

function RegistrationModal({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (data.token) {
        onSuccess(data.token);
      } else {
        setErrorMsg(data.error || "Something went wrong.");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            Access REALM PULSE DAILY
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Free access — register once, stay informed daily.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Daily Briefings", sub: "6am ET" },
            { label: "17 Indicators", sub: "Live data" },
            { label: "Free Forever", sub: "No credit card" },
          ].map(({ label, sub }) => (
            <div key={label} className="text-center bg-secondary/40 rounded-lg p-3">
              <p className="text-xs font-semibold text-foreground">{label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
            />
          </div>
          {errorMsg && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {errorMsg}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Getting access..." : "Get Free Access \u2192"}
          </button>
        </form>
        <p className="text-[10px] text-muted-foreground text-center mt-4 leading-relaxed">
          By registering you agree to receive the daily REALM PULSE DAILY briefing. No spam, unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}

export default function RegistrationWall({ children }: { children: React.ReactNode }) {
  const storedTokenRef = useRef<string | null>(getStoredToken());
  const storedToken = storedTokenRef.current;
  const [showWall, setShowWall] = useState(false);
  const [isGranted, setIsGranted] = useState(!!storedToken);
  const [checking, setChecking] = useState(!!storedToken);

  useEffect(() => {
    if (!storedToken) {
      setChecking(false);
      return;
    }
    fetch(`/api/register/check?token=${encodeURIComponent(storedToken)}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setIsGranted(true);
          storeToken(storedToken);
        } else {
          try { localStorage.removeItem(ACCESS_TOKEN_KEY); } catch {}
          setCookie(COOKIE_NAME, "", -1);
          storedTokenRef.current = null;
          setIsGranted(false);
        }
      })
      .catch(() => setIsGranted(true))
      .finally(() => setChecking(false));
  }, [storedToken]);

  const handleScroll = useCallback(() => {
    if (isGranted || showWall || checking) return;
    if (window.scrollY > SCROLL_THRESHOLD) setShowWall(true);
  }, [isGranted, showWall, checking]);

  useEffect(() => {
    if (isGranted || checking) return;
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isGranted, checking, handleScroll]);

  useEffect(() => {
    if (isGranted || checking) return;
    const timer = setTimeout(() => {
      if (!isGranted) setShowWall(true);
    }, TIMER_DELAY);
    return () => clearTimeout(timer);
  }, [isGranted, checking]);

  const handleRegistrationSuccess = (token: string) => {
    storeToken(token);
    storedTokenRef.current = token;
    setIsGranted(true);
    setShowWall(false);
  };

  return (
    <>
      <div
        className={`transition-all duration-500 ${showWall && !isGranted ? "blur-sm pointer-events-none select-none" : ""}`}
        style={showWall && !isGranted ? { filter: "blur(4px) brightness(0.7)" } : {}}
      >
        {children}
      </div>
      {showWall && !isGranted && (
        <RegistrationModal onSuccess={handleRegistrationSuccess} />
      )}
    </>
  );
}
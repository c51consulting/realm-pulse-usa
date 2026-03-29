import { useState } from "react";
import { AIChatBox, type Message } from "./AIChatBox";
import { Sparkles, X, Crown, ExternalLink } from "lucide-react";

const CHATGPT_URL = "https://chatgpt.com/g/g-691c310c5f3081918e3535212d580f30-realm-pulse-daily";

export function PulseAIWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (content: string) => {
    setMessages((prev) => [...prev, { role: "user", content }]);
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.message || "Sorry, I couldn't process that request." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error: Could not reach the AI service." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Gold Button */}
      {!isOpen && !showUpgrade && (
        <button
          onClick={() => setShowUpgrade(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center text-white z-50"
          title="PULSE DAILY AI Assistant"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

      {/* Upgrade Prompt — matches AUS site */}
      {showUpgrade && (
        <div className="fixed bottom-6 right-6 w-80 bg-gray-900 border border-amber-500/30 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Crown className="w-5 h-5" />
              <span className="font-bold">PULSE PRO</span>
            </div>
            <button onClick={() => setShowUpgrade(false)} className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 text-white">
            <h3 className="text-lg font-bold mb-2">Unlock AI Market Intelligence</h3>
            <p className="text-gray-400 text-sm mb-4">
              Get personalised market insights powered by AI, tailored to your farm and commodities.
            </p>
            <ul className="space-y-2 text-sm mb-5">
              <li className="flex items-center gap-2"><span className="text-amber-400">{"\u2713"}</span> AI-powered market analysis</li>
              <li className="flex items-center gap-2"><span className="text-amber-400">{"\u2713"}</span> Personalised to your operation</li>
              <li className="flex items-center gap-2"><span className="text-amber-400">{"\u2713"}</span> 50 queries per day</li>
              <li className="flex items-center gap-2"><span className="text-amber-400">{"\u2713"}</span> Live dashboard data context</li>
              <li className="flex items-center gap-2"><span className="text-amber-400">{"\u2713"}</span> Full ChatGPT integration</li>
            </ul>
            <div className="space-y-2">
              <button
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all"
              >
                $29/month
              </button>
              <button
                className="w-full py-2.5 bg-transparent border border-amber-500/40 text-amber-400 font-semibold rounded-lg hover:bg-amber-500/10 transition-all text-sm"
              >
                $299/year (save 14%)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-gray-900 border border-amber-500/20 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Sparkles className="w-5 h-5" />
              <div className="font-bold text-sm">REALM PULSE DAILY AI</div>
            </div>
            <div className="flex items-center gap-2">
              <a href={CHATGPT_URL} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors" title="Open in ChatGPT">
                <ExternalLink className="w-4 h-4" />
              </a>
              <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <AIChatBox
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              placeholder="Ask about today's US markets..."
              height="100%"
              emptyStateMessage="Ask me about today's US agricultural markets"
              suggestedPrompts={[
                "Summarize today's market for me",
                "What's moving in grain prices?",
                "Any opportunities in livestock?",
                "How's the USD affecting exports?",
              ]}
              className="border-0 shadow-none rounded-none"
            />
          </div>
          <div className="px-4 py-2 border-t border-amber-500/10 bg-gray-900/50">
            <a href={CHATGPT_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 text-xs text-amber-400/70 hover:text-amber-400 transition-colors">
              <ExternalLink className="w-3 h-3" />
              Open full experience in ChatGPT
            </a>
          </div>
        </div>
      )}
    </>
  );
}
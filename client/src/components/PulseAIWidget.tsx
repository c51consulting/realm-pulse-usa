import { useState } from "react";
import { AIChatBox, type Message } from "./AIChatBox";
import { Sparkles, X, ExternalLink } from "lucide-react";

const CHATGPT_URL = "https://chatgpt.com/g/g-691c310c5f3081918e3535212d580f30-realm-pulse-daily";

export function PulseAIWidget() {
  const [isOpen, setIsOpen] = useState(false);
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
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center text-white z-50"
          title="PULSE DAILY AI Assistant"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

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
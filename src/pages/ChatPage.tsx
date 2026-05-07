import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, Loader2 } from "lucide-react";

export default function ChatPage() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: historyData, isLoading: historyLoading } = trpc.chat.getHistory.useQuery({}, {
    enabled: !!user,
  });

  const sendMessage = trpc.chat.send.useMutation({
    onSuccess: () => {
      utils.chat.getHistory.invalidate();
    },
  });

  const utils = trpc.useUtils();

  const handleSend = () => {
    if (!input.trim() || sendMessage.isPending) return;
    sendMessage.mutate({ message: input.trim() });
    setInput("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [historyData]);

  const allMessages = historyData?.messages ?? [];

  const suggestedQuestions = [
    "How much should I save for retirement?",
    "What's the best SIP amount for my income?",
    "Should I invest in PPF or NPS?",
    "How do I build an emergency fund?",
    "What's a good asset allocation for a 30-year-old?",
    "How does inflation affect my goals?",
  ];

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-120px)] lg:h-[calc(100vh-80px)] flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d4a843] to-[#b8923d] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#0f1a2e]">AI Financial Advisor</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Ask anything about investments, taxes, goals, or financial planning in India
        </p>
      </motion.div>

      <Card className="flex-1 flex flex-col overflow-hidden border-0 shadow-lg">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {allMessages.length === 0 && !historyLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1a2744] to-[#2a3a5c] flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-[#d4a843]" />
              </div>
              <h3 className="text-lg font-semibold text-[#0f1a2e] mb-2">
                Welcome to Your AI Advisor
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                I can help you with goal planning, investment strategies, tax optimization, and more.
              </p>
              <div className="grid sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(q);
                    }}
                    className="text-left p-3 rounded-xl bg-muted/50 hover:bg-[#d4a843]/10 hover:border-[#d4a843]/20 border border-border/30 transition-all text-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {allMessages.map((msg, i) => (
              <motion.div
                key={msg.id ?? i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a2744] to-[#2a3a5c] flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-[#d4a843]" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#1a2744] text-white rounded-br-md"
                      : "bg-muted/60 text-foreground rounded-bl-md border border-border/30"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-[#d4a843]/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4 text-[#d4a843]" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {sendMessage.isPending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a2744] to-[#2a3a5c] flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-[#d4a843]" />
              </div>
              <div className="bg-muted/60 rounded-2xl rounded-bl-md px-4 py-3 border border-border/30">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#d4a843]" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border/50 bg-white">
          <div className="flex gap-3">
            <Input
              placeholder="Ask about investments, taxes, goals..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={sendMessage.isPending || !input.trim()}
              className="bg-[#1a2744] hover:bg-[#1a2744]/90"
            >
              {sendMessage.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            AI responses are for educational purposes. Consult a SEBI-registered advisor for personalized advice.
          </p>
        </div>
      </Card>
    </div>
  );
}

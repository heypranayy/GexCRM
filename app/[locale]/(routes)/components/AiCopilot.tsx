"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Bot, Sparkles, Send, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function AiCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Array<{ sender: "user" | "bot"; text: string }>>([
    { sender: "bot", text: "Hello! I am your Gexart OS AI Copilot. How can I assist you with your projects, CRM leads, or attendance records today?" },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!prompt.trim()) return;

    const userText = prompt;
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setPrompt("");
    setLoading(true);

    try {
      // Simulate context-aware AI assistant responses
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      let botResponse = "I've analyzed your current workspace. ";
      const textLower = userText.toLowerCase();

      if (textLower.includes("summarize") || textLower.includes("project")) {
        botResponse += "Here is a summary of Gexart OS projects: Sprints are active and developer capacity is currently optimized at 92%. No major blockers are detected.";
      } else if (textLower.includes("attendance") || textLower.includes("clock")) {
        botResponse += "Attendance stats: 95% of team members successfully clocked in within their allowed geofence today. 1 remote team member has active breaks logged.";
      } else if (textLower.includes("invoice") || textLower.includes("finance")) {
        botResponse += "Invoice audit: All outstanding invoices have been updated. Projected cash flow is positive for this quarter.";
      } else {
        botResponse += `I've registered your request regarding: "${userText}". I can help automate task assignments or generate comprehensive reports based on this context.`;
      }

      setMessages((prev) => [...prev, { sender: "bot", text: botResponse }]);
    } catch (err) {
      toast.error("Failed to generate response");
    } finally {
      setLoading(false);
    }
  };

  const handlePrebakedCommand = (cmd: string) => {
    setPrompt(cmd);
  };

  return (
    <>
      {/* Floating Action Button (FAB) for AI Copilot */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/95 text-white flex items-center justify-center p-0 transition-transform hover:scale-105"
        >
          <Bot className="h-6 w-6" />
        </Button>
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-[400px] sm:w-[450px] border-l border-border bg-card/90 backdrop-blur-lg flex flex-col justify-between">
          <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-foreground font-bold">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" /> AI Copilot Assistant
              </SheetTitle>
              <SheetDescription>
                Context-aware operations copilot for Gexart OS.
              </SheetDescription>
            </SheetHeader>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto space-y-3 p-1 text-sm scrollbar-thin">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${
                      m.sender === "user"
                        ? "bg-primary text-white"
                        : "bg-muted text-foreground border border-border"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted text-muted-foreground rounded-2xl px-4 py-2.5 flex items-center gap-2 border">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" /> Thinking...
                  </div>
                </div>
              )}
            </div>

            {/* Suggested Commands */}
            <div className="space-y-2">
              <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Quick Actions</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Summarize project status",
                  "Create client invoice template",
                  "Check geofence logs today",
                ].map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => handlePrebakedCommand(cmd)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-border hover:border-primary/40 bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1"
                  >
                    {cmd} <ArrowRight className="h-3 w-3 opacity-60" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Prompt input */}
          <div className="pt-4 border-t border-border flex gap-2">
            <input
              type="text"
              placeholder="Ask anything..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 rounded-lg border border-input bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button size="icon" onClick={handleSend} disabled={loading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

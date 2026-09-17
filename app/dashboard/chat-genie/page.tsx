"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";


type Message = {
  role: "user" | "assistant";
  content: string;
};

/* ---------------------------------------------------------
   The Genie — glowing aura + ember rings behind the genie
   figure itself, so the character is the focal point.
--------------------------------------------------------- */
function GenieLamp() {
  return (
    <div className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center">
      {/* ambient aura */}
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(244,215,138,0.35)_0%,rgba(139,92,246,0.18)_55%,transparent_75%)] blur-2xl" />

      {/* rotating ring of light */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full genie-ring">
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f4d78a" stopOpacity="0" />
            <stop offset="50%" stopColor="#f4d78a" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle
          cx="100"
          cy="100"
          r="88"
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="1.5"
          strokeDasharray="6 10"
        />
      </svg>

      {/* the genie */}
      <div
        className="relative text-8xl sm:text-9xl genie-float"
        style={{
          filter:
            "drop-shadow(0 0 18px rgba(244,215,138,0.75)) drop-shadow(0 0 40px rgba(139,92,246,0.55)) drop-shadow(0 0 60px rgba(34,211,238,0.3))",
        }}
      >
        🧞
      </div>

      {/* drifting embers */}
      <span className="ember ember-a" />
      <span className="ember ember-b" />
      <span className="ember ember-c" />
    </div>
  );
}

type SpeechRecognitionEventLike = {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
};

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: () => void;
  onend: () => void;
  onerror: () => void;
  onresult: (event: SpeechRecognitionEventLike) => void;
  start: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function VoiceButton({ onResult }: { onResult: (text: string) => void }) {
  const [listening, setListening] = useState(false);

  const startListening = () => {
    const SpeechRecognition =
  window.webkitSpeechRecognition ||
  window.SpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const text = event.results[0][0].transcript;
      onResult(text);
    };

    recognition.start();
  };

  return (
    <button
      type="button"
      onClick={startListening}
      title={listening ? "Listening..." : "Speak your wish"}
      className={`relative w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 ${
        listening
          ? "bg-gradient-to-br from-cyan-400 to-purple-500 shadow-[0_0_22px_rgba(34,211,238,0.75)]"
          : "bg-white/[0.04] hover:bg-white/[0.08] border border-[#f4d78a]/20 hover:border-[#f4d78a]/40"
      }`}
    >
      {listening && (
        <span className="absolute inset-0 rounded-full animate-ping bg-cyan-400/40" />
      )}
      <svg
        viewBox="0 0 24 24"
        className={`relative w-5 h-5 ${listening ? "text-white" : "text-[#f4d78a]/80"}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
        <path d="M19 11a7 7 0 0 1-14 0" />
        <path d="M12 18v3" />
      </svg>
    </button>
  );
}

export default function ChatGeniePage() {
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const embers = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  size: ((i * 17) % 5) + 2,
  top: ((i * 37) % 94) + 3,
  left: ((i * 53) % 94) + 3,
  opacity: ((i * 17) % 60) / 100 + 0.15,
  duration: ((i * 7) % 10) + 10,
  delay: (i * 3) % 6,
  gold: i % 3 === 0,
}));

  

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (messageText?: string) => {
    const text = (messageText ?? input).trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/dashboard/chat-genie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Request failed");
      }

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: data.text || "The lamp fell silent. Try again.",
        },
      ]);
    } catch (error: unknown) {
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content:
  error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedQuestions = [
    "What should I eat for weight gain?",
    "How many calories should I eat daily?",
    "Give me a healthy breakfast idea",
    "How can I gain weight the right way?",
  ];

  return (
    <div
      className={`font-sans min-h-screen relative overflow-hidden bg-[#04050f] text-white`}
    >
      <style jsx global>{`
        :root {
          --gold: #f4d78a;
          --gold-deep: #c9962e;
          --amethyst: #8b5cf6;
          --azure: #22d3ee;
        }
        .font-display {
          font-family: 'Cinzel', serif;
        }
        .font-sans {
          font-family: var(--font-inter), sans-serif;
        }

        @keyframes drift {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: var(--o, 0.4);
          }
          90% {
            opacity: var(--o, 0.4);
          }
          100% {
            transform: translateY(-40px) translateX(8px);
            opacity: 0;
          }
        }
        .ember-field span {
          animation: drift var(--dur, 14s) ease-in-out var(--del, 0s) infinite;
        }

        @keyframes genieFloat {
          0%,
          100% {
            transform: translateY(0) rotate(-1deg);
          }
          50% {
            transform: translateY(-10px) rotate(1deg);
          }
        }
        .genie-float {
          animation: genieFloat 4s ease-in-out infinite;
        }

        @keyframes ringSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .genie-ring {
          animation: ringSpin 18s linear infinite;
        }

        @keyframes inputGlow {
          0%,
          100% {
            box-shadow: 0 0 18px rgba(244, 215, 138, 0.18),
              0 0 0 1px rgba(244, 215, 138, 0.2) inset;
          }
          50% {
            box-shadow: 0 0 34px rgba(244, 215, 138, 0.4),
              0 0 0 1px rgba(244, 215, 138, 0.4) inset;
          }
        }
        .input-glow {
          animation: inputGlow 3s ease-in-out infinite;
        }

        @keyframes emberFloat {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          15% {
            opacity: 0.9;
          }
          100% {
            transform: translateY(-70px) translateX(14px);
            opacity: 0;
          }
        }
        .ember {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 9999px;
          background: var(--gold);
          box-shadow: 0 0 8px 2px rgba(244, 215, 138, 0.8);
        }
        .ember-a {
          left: 30%;
          bottom: 30%;
          animation: emberFloat 3.6s ease-in infinite;
        }
        .ember-b {
          left: 55%;
          bottom: 24%;
          background: var(--azure);
          box-shadow: 0 0 8px 2px rgba(34, 211, 238, 0.8);
          animation: emberFloat 4.4s ease-in 0.8s infinite;
        }
        .ember-c {
          left: 42%;
          bottom: 40%;
          animation: emberFloat 5s ease-in 1.6s infinite;
        }

        @keyframes shimmerSweep {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .shimmer-text {
          background: linear-gradient(
            100deg,
            #f4d78a 0%,
            #fff6df 20%,
            #f4d78a 40%,
            #c9962e 60%,
            #f4d78a 100%
          );
          background-size: 250% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: shimmerSweep 7s linear infinite;
        }

        @keyframes sparklePulse {
          0%,
          100% {
            transform: scale(0.7);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.1);
            opacity: 1;
          }
        }
        .sparkle-dot {
          animation: sparklePulse 1.1s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .ember-field span,
          .genie-float,
          .genie-ring,
          .ember,
          .shimmer-text,
          .sparkle-dot,
          .input-glow {
            animation: none !important;
          }
        }
      `}</style>

      {/* Background wash */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0c2b] via-[#0c0e24] to-[#020310]" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[640px] h-[460px] bg-[#8b5cf6]/15 blur-[130px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[460px] h-[380px] bg-[#22d3ee]/10 blur-[120px] rounded-full" />
        <div className="absolute top-1/4 right-0 w-[420px] h-[380px] bg-[#f4d78a]/10 blur-[130px] rounded-full" />
      </div>

      {/* Ember field */}
      <div className="absolute inset-0 pointer-events-none ember-field">
        {embers.map((e) => (
          <span
            key={e.id}
            style={
              {
                position: "absolute",
                width: `${e.size}px`,
                height: `${e.size}px`,
                top: `${e.top}%`,
                left: `${e.left}%`,
                borderRadius: "9999px",
                background: e.gold ? "var(--gold)" : "#7dd3fc",
                boxShadow: e.gold
                  ? "0 0 6px 1px rgba(244,215,138,0.7)"
                  : "0 0 6px 1px rgba(125,211,252,0.6)",
                "--o": e.opacity,
                "--dur": `${e.duration}s`,
                "--del": `${e.delay}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* HEADER */}
        <header className="relative border-b border-[#f4d78a]/10 bg-black/20 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-gray-300 hover:text-white hover:border-[#f4d78a]/30 hover:bg-white/[0.08] transition-all text-sm"
            >
              ← Back
            </button>

            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-wide shimmer-text">
                Chat Genie
              </h1>
              <p className="text-xs sm:text-sm text-gray-400">
                Your personal AI health coach
              </p>
            </div>

          </div>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#f4d78a]/40 to-transparent" />
        </header>

        {/* CHAT AREA */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-36">
            {/* EMPTY / WELCOME STATE */}
            {messages.length === 0 && (
              <div className="min-h-[65vh] flex flex-col items-center justify-center text-center">
                <GenieLamp />

                <h2 className="mt-2 font-display text-3xl sm:text-5xl font-semibold tracking-wide shimmer-text">
                  Make a wish for your health
                </h2>

                <p className="mt-3 max-w-xl text-gray-300 text-base sm:text-lg">
                  Ask about meals, calories or habits — the genie answers
                  from what it knows about your goals.
                </p>

                <div className="mt-9 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                  {suggestedQuestions.map((question) => (
                    <button
                      key={question}
                      onClick={() => sendMessage(question)}
                      className="group text-left px-4 py-3.5 rounded-2xl bg-white/[0.03] border border-[#f4d78a]/15 hover:border-[#f4d78a]/40 hover:bg-white/[0.06] transition-all text-sm text-gray-200 flex items-center gap-3"
                    >
                      <span className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-[#f4d78a]/30 to-[#8b5cf6]/30 border border-[#f4d78a]/30 flex items-center justify-center text-[10px] text-[#f4d78a] group-hover:scale-110 transition-transform">
                        ✦
                      </span>
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* MESSAGES */}
            {messages.length > 0 && (
              <div className="space-y-5">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="flex items-start gap-3 max-w-[85%]">
                        <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-[#f4d78a]/25 to-[#8b5cf6]/30 border border-[#f4d78a]/30 flex items-center justify-center shadow-[0_0_18px_rgba(244,215,138,0.25)]">
                          <svg
                            viewBox="0 0 24 24"
                            className="w-5 h-5 text-[#f4d78a]"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                          >
                            <path d="M4 17c0-2.5 2-3.5 4-3.2 1-1.6 3.5-1.8 4.6-.3 2-1 4.4.3 4.4 2.5 0 .7-.2 1.3-.5 1.8" />
                            <path d="M14 6c1.5.2 2.5 1 3 2.4" />
                            <circle cx="14" cy="4.5" r="1" fill="currentColor" stroke="none" />
                          </svg>
                        </div>

                        <div className="rounded-2xl rounded-tl-md px-4 py-3 bg-white/[0.04] backdrop-blur-xl border border-[#f4d78a]/15 shadow-lg">
                          <div className="text-xs text-[#f4d78a]/80 mb-1 font-medium font-display tracking-wide">
                            Chat Genie
                          </div>
                          <p className="text-sm sm:text-base text-gray-100 whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-[80%]">
                        <div className="rounded-2xl rounded-tr-md px-4 py-3 bg-gradient-to-r from-[#22d3ee] to-[#6366f1] shadow-[0_0_20px_rgba(34,211,238,0.25)]">
                          <div className="text-xs text-cyan-100 mb-1 font-medium">
                            You
                          </div>
                          <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading */}
                {loading && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-[#f4d78a]/25 to-[#8b5cf6]/30 border border-[#f4d78a]/30 flex items-center justify-center">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-5 h-5 text-[#f4d78a]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      >
                        <path d="M4 17c0-2.5 2-3.5 4-3.2 1-1.6 3.5-1.8 4.6-.3 2-1 4.4.3 4.4 2.5 0 .7-.2 1.3-.5 1.8" />
                        <path d="M14 6c1.5.2 2.5 1 3 2.4" />
                        <circle cx="14" cy="4.5" r="1" fill="currentColor" stroke="none" />
                      </svg>
                    </div>

                    <div className="rounded-2xl rounded-tl-md px-5 py-3.5 bg-white/[0.04] border border-[#f4d78a]/15">
                      <div className="flex items-center gap-1.5">
                        <span className="sparkle-dot w-1.5 h-1.5 rounded-full bg-[#f4d78a]" />
                        <span
                          className="sparkle-dot w-1.5 h-1.5 rounded-full bg-[#8b5cf6]"
                          style={{ animationDelay: "0.15s" }}
                        />
                        <span
                          className="sparkle-dot w-1.5 h-1.5 rounded-full bg-[#22d3ee]"
                          style={{ animationDelay: "0.3s" }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </main>

        {/* INPUT AREA */}
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="absolute inset-0 bg-gradient-to-t from-[#020310] via-[#020310]/90 to-transparent h-32 pointer-events-none" />

          <div className="relative max-w-4xl mx-auto px-4 pb-5">
            <div className="input-glow flex items-center gap-2 p-2 rounded-2xl bg-black/50 backdrop-blur-2xl border border-[#f4d78a]/30">
              <VoiceButton onResult={(text) => setInput(text)} />

              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={loading}
                placeholder="Speak your wish..."
                className="flex-1 min-w-0 bg-transparent outline-none text-white placeholder:text-gray-500 text-sm sm:text-base px-2 disabled:opacity-50"
              />

              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#f4d78a] via-[#e0ac4f] to-[#c9962e] font-display font-semibold tracking-wide text-sm sm:text-base text-[#2b1c02] shadow-[0_0_20px_rgba(244,215,138,0.4)] hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100"
              >
                {loading ? "..." : "Send"}
              </button>
            </div>

            <p className="text-center text-[11px] text-gray-500 mt-2">
              Chat Genie provides general wellness guidance, not medical diagnosis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

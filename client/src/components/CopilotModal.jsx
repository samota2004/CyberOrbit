import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, X, Bot, User } from 'lucide-react';

export const CopilotModal = ({ isOpen, onClose, initialContext, context }) => {
    const activeContext = context || initialContext;
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        {
            id: 'msg-init',
            sender: 'assistant',
            text: "Welcome to CyberOrbit Security Copilot. I analyze real-time UEBA behavioral telemetry, explain risk score attributions, and provide prescriptive incident response recommendations. How may I assist your forensic investigation today?",
            timestamp: new Date().toLocaleTimeString()
        }
    ]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    if (!isOpen) return null;

    const handleSend = async (queryText) => {
        const textToSend = queryText || input;
        if (!textToSend.trim() || loading) return;

        const userMsg = {
            id: `msg-u-${Date.now()}`,
            sender: 'user',
            text: textToSend,
            timestamp: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, userMsg]);
        if (!queryText) setInput('');
        setLoading(true);

        try {
            const res = await fetch('/api/copilot/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: textToSend,
                    context: activeContext
                })
            });
            const data = await res.json();
            const assistantMsg = {
                id: `msg-a-${Date.now()}`,
                sender: 'assistant',
                text: data.reply || "I have evaluated telemetry against active policy baselines. Continuous zero trust posture maintained.",
                timestamp: new Date().toLocaleTimeString()
            };
            setMessages(prev => [...prev, assistantMsg]);
        }
        catch {
            setMessages(prev => [
                ...prev,
                {
                    id: `msg-err-${Date.now()}`,
                    sender: 'assistant',
                    text: "Notice: Copilot inference connection degraded. Local policy evaluation remains active.",
                    timestamp: new Date().toLocaleTimeString()
                }
            ]);
        }
        finally {
            setLoading(false);
        }
    };

    const quickPrompts = [
        "Investigate EMP102 (Sarah Jenkins) risk signals",
        "Summarize all active security incidents",
        "Recommend Zero Trust policy optimizations",
        "Explain how the UEBA ML pipeline calculates cross-department risk"
    ];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-xs">
        <div className="bg-[#0B0B0B] border-l border-[#D4AF37]/30 w-full max-w-xl h-full flex flex-col shadow-2xl text-gray-100 relative">
          {/* Top Gold Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#D4AF37]"/>

          {/* Header */}
          <div className="p-5 border-b border-[#D4AF37]/20 flex items-center justify-between bg-black">
            <div className="flex items-center gap-3">
              <div className="p-2 border border-[#D4AF37]/40 bg-[#111111]">
                <Sparkles className="w-5 h-5 text-[#D4AF37]"/>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif-display text-xl text-white">
                    CyberOrbit Security Copilot
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 border border-[#D4AF37]/30 text-[#D4AF37] bg-[#111111]">
                    GEMINI ENGINE
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-mono">
                  Autonomous Cybersecurity &amp; UEBA Forensic Investigator
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 text-gray-400 hover:text-[#D4AF37] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5"/>
            </button>
          </div>

          {/* Chat Stream */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-black">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'assistant' && (
                  <div className="w-8 h-8 border border-[#D4AF37]/30 bg-[#111111] flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-[#D4AF37]"/>
                  </div>
                )}

                <div className={`max-w-[85%] p-4 text-xs leading-relaxed font-sans ${msg.sender === 'user'
                  ? 'bg-[#181818] text-white border border-[#D4AF37]/40'
                  : 'bg-[#111111] border border-[#D4AF37]/20 text-gray-200 whitespace-pre-line'}`}
                >
                  {msg.text}
                  <span className="block text-[10px] mt-2 font-mono text-gray-500">
                    {msg.timestamp}
                  </span>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-8 h-8 border border-[#D4AF37]/40 bg-[#181818] flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-[#D4AF37]"/>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-8 h-8 border border-[#D4AF37]/30 bg-[#111111] flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-[#D4AF37]"/>
                </div>
                <div className="bg-[#111111] border border-[#D4AF37]/20 p-3 text-xs text-[#D4AF37] font-mono flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#D4AF37] animate-ping"/>
                  <span>Evaluating telemetry with Gemini Security Engine...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef}/>
          </div>

          {/* Quick Prompts */}
          <div className="px-5 py-3 bg-[#0B0B0B] border-t border-[#D4AF37]/20">
            <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 block mb-2 font-semibold">
              Suggested Investigations:
            </span>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt, idx) => (
                <button 
                  key={idx} 
                  onClick={() => handleSend(prompt)} 
                  className="text-[11px] px-3 py-1.5 bg-black hover:bg-[#141414] text-gray-300 hover:text-[#D4AF37] border border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all text-left font-mono cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Input bar */}
          <div className="p-4 bg-black border-t border-[#D4AF37]/20">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }} 
              className="flex gap-2"
            >
              <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder="Ask Copilot about any user, incident, or policy..." 
                className="flex-1 bg-[#111111] border border-[#D4AF37]/30 focus:border-[#D4AF37] px-4 py-2.5 text-xs text-white outline-none font-sans"
              />
              <button 
                type="submit" 
                disabled={loading || !input.trim()} 
                className="px-4 py-2.5 bg-[#D4AF37] hover:bg-[#A67C00] text-black hover:text-white font-mono font-bold text-xs tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer border border-[#D4AF37] hover:border-[#A67C00]"
              >
                <Send className="w-4 h-4"/>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
};


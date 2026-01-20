
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, MapPin, Calendar, BookOpen, Navigation, ArrowRight } from 'lucide-react';
import { askCampusAssistant } from '../services/geminiService';
import { Message, Location, CampusEvent } from '../types';

interface ChatAssistantProps {
  onNavigate?: (locationId: string) => void;
  onEventSelect?: (event: CampusEvent, location: Location) => void;
  onBotResponse?: (text: string) => void;
  accessibilityMode?: boolean;
  locations: Location[];
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ onNavigate, onEventSelect, onBotResponse, accessibilityMode = false, locations }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I'm Titan-1, your campus guide. How can I help you navigate Titan University today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickActions = [
    { label: "Where is the Gym?", icon: <MapPin size={12} />, prompt: "Take me to the Gym" },
    { label: "Events today?", icon: <Calendar size={12} />, prompt: "What events are happening today?" },
    { label: "Calculus room?", icon: <BookOpen size={12} />, prompt: "Where is the Calculus classroom?" },
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = async (e?: React.FormEvent, customPrompt?: string) => {
    e?.preventDefault();
    const promptToUse = customPrompt || input;
    if (!promptToUse.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: promptToUse };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const result = await askCampusAssistant(promptToUse, messages, locations, accessibilityMode);
    
    let activeNavId: string | undefined;
    let activeEventId: string | undefined;

    if (result.functionCalls && result.functionCalls.length > 0) {
      for (const fc of result.functionCalls) {
        if (fc.name === 'navigateToLocation' && fc.args.locationId) {
          activeNavId = fc.args.locationId as string;
          activeEventId = fc.args.eventId as string;
          
          if (activeEventId) {
            const loc = locations.find(l => l.id === activeNavId);
            const event = loc?.events?.find(e => e.id === activeEventId);
            if (event && loc) {
              onEventSelect?.(event, loc);
            }
          } else {
            onNavigate?.(activeNavId);
          }
        }
      }
    }

    const botMessage: Message = { 
      role: 'assistant', 
      content: result.text,
      navigationId: activeNavId,
      eventId: activeEventId
    };
    
    setMessages(prev => [...prev, botMessage]);
    setIsLoading(false);
    
    if (onBotResponse) {
      onBotResponse(result.text);
    }
  };

  const getTargetName = (locId: string, evtId?: string) => {
    const loc = locations.find(l => l.id === locId);
    if (evtId) {
      const evt = loc?.events?.find(e => e.id === evtId);
      return evt?.title || "Event";
    }
    return loc?.name || "Target";
  };

  const textClass = accessibilityMode ? 'text-lg font-bold' : 'text-sm font-medium';

  return (
    <div className={`flex flex-col h-full overflow-hidden ${accessibilityMode ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
      >
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-4 rounded-2xl shadow-sm ${msg.role === 'user' ? (accessibilityMode ? 'bg-yellow-400 text-black border-2 border-white' : 'bg-blue-600 text-white rounded-tr-none') : (accessibilityMode ? 'bg-slate-900 text-white border-2 border-yellow-400 rounded-tl-none' : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none')}`}>
                <p className={`${textClass} leading-relaxed whitespace-pre-wrap`}>{msg.content}</p>
              </div>
              
              {msg.navigationId && (
                <button 
                  onClick={() => {
                    if (msg.eventId) {
                       const loc = locations.find(l => l.id === msg.navigationId);
                       const event = loc?.events?.find(e => e.id === msg.eventId);
                       if (event && loc) onEventSelect?.(event, loc);
                    } else {
                      onNavigate?.(msg.navigationId!);
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all active:scale-95 group shadow-sm ${accessibilityMode ? 'bg-yellow-400 border-white text-black font-black' : 'bg-white border-blue-500 text-blue-600 hover:bg-blue-50 text-[11px] font-black uppercase tracking-wider'}`}
                >
                  {msg.eventId ? <Calendar size={14} /> : <Navigation size={14} className="group-hover:rotate-12 transition-transform" />}
                  {msg.eventId ? `View ${getTargetName(msg.navigationId, msg.eventId)}` : `Go to ${getTargetName(msg.navigationId)}`}
                  <ArrowRight size={12} className="ml-1 opacity-50" />
                </button>
              )}
            </div>

            <div className={`p-2 rounded-xl flex-shrink-0 ${msg.role === 'user' ? (accessibilityMode ? 'bg-yellow-400 text-black' : 'bg-blue-100 text-blue-600') : (accessibilityMode ? 'bg-slate-900 text-yellow-400 border border-yellow-400' : 'bg-white border border-slate-100 text-slate-600 shadow-sm')}`}>
              {msg.role === 'user' ? <User size={accessibilityMode ? 20 : 16} /> : <Bot size={accessibilityMode ? 20 : 16} />}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-center gap-3 p-2 animate-pulse">
            <div className={`p-2 rounded-xl shadow-sm border ${accessibilityMode ? 'bg-slate-900 border-yellow-400' : 'bg-white border-slate-100'}`}>
              <Loader2 className={`animate-spin ${accessibilityMode ? 'text-yellow-400' : 'text-blue-500'}`} size={16} />
            </div>
            <span className={`font-black uppercase tracking-widest ${accessibilityMode ? 'text-yellow-400 text-xs' : 'text-slate-400 text-[10px]'}`}>Checking Schedule...</span>
          </div>
        )}
      </div>

      {!isLoading && messages.length < 15 && (
        <div className="px-6 pb-2 flex gap-2 overflow-x-auto no-scrollbar pb-4">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => handleSubmit(undefined, action.prompt)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 ${accessibilityMode ? 'bg-black border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-500 hover:text-blue-600 shadow-sm'}`}
            >
              {action.icon} {action.label}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className={`p-6 border-t flex gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] ${accessibilityMode ? 'bg-black border-yellow-400' : 'bg-white border-slate-100'}`}>
        <div className="relative flex-1">
           <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell me about the Football game..."
            className={`w-full rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-4 transition-all placeholder:text-slate-400 font-bold ${accessibilityMode ? 'bg-slate-900 border-2 border-yellow-400 text-white focus:ring-yellow-400/20 text-lg' : 'bg-slate-50 border border-slate-200 focus:ring-blue-500/10 focus:border-blue-500 text-sm'}`}
          />
          <div className={`absolute right-4 top-1/2 -translate-y-1/2 opacity-30 ${accessibilityMode ? 'text-yellow-400' : 'text-blue-600'}`}>
            <Sparkles size={16} />
          </div>
        </div>
        <button 
          type="submit"
          disabled={isLoading || !input.trim()}
          className={`p-3.5 rounded-2xl shadow-lg transition-all active:scale-90 disabled:opacity-50 ${accessibilityMode ? 'bg-yellow-400 text-black hover:bg-yellow-500' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100'}`}
        >
          <Send size={accessibilityMode ? 24 : 20} />
        </button>
      </form>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default ChatAssistant;

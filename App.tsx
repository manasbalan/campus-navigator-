
import React, { useState, useRef, useEffect } from 'react';
import CampusMap from './components/CampusMap';
import BuildingDetails from './components/BuildingDetails';
import ChatAssistant from './components/ChatAssistant';
import AddEventModal from './components/AddEventModal';
import { Location, CampusEvent, NarrationStep } from './types';
import { GraduationCap, Map as MapIcon, Compass, Info, Volume2, VolumeX, Calendar, Clock, ArrowRight, Play, Square, Navigation, MessageSquare, Bot, X, Layers, Users, BookOpen, Trophy, Utensils, AlertTriangle, Plus, Accessibility } from 'lucide-react';
import { narrateBuilding, narrateEvent, decodeBase64, decodeAudioData, generateAudioForText } from './services/geminiService';
import { CAMPUS_LOCATIONS } from './constants';

export type MapView = '2d' | 'sat' | 'guide';

const App: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>(CAMPUS_LOCATIONS);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<MapView>('2d');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [isQuotaLimited, setIsQuotaLimited] = useState(false);
  
  // UI State for Pop-ups
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isEventsOpen, setIsEventsOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  
  // Narration State
  const [narrationQueue, setNarrationQueue] = useState<NarrationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const stopAudio = () => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) {}
      currentSourceRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setNarrationQueue([]);
    setCurrentStepIndex(-1);
  };

  const speakWithBrowserFallback = (text: string) => {
    if (!window.speechSynthesis) return;
    
    stopAudio();
    setIsSpeaking(true);
    setCurrentStepIndex(0);
    setNarrationQueue([{ text, audioBase64: '' }]);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = accessibilityMode ? 0.9 : 1.1; // Slower for accessibility
    utterance.pitch = 1.0;
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentStepIndex(-1);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setCurrentStepIndex(-1);
    };

    window.speechSynthesis.speak(utterance);
  };

  const playStep = async (index: number, queue: NarrationStep[]) => {
    if (index >= queue.length) {
      setIsSpeaking(false);
      setCurrentStepIndex(-1);
      return;
    }

    const step = queue[index];
    if (!step.audioBase64) {
      speakWithBrowserFallback(step.text);
      return;
    }

    setCurrentStepIndex(index);
    setIsSpeaking(true);

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    } else if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    
    const ctx = audioContextRef.current;
    
    try {
      const audioBytes = decodeBase64(step.audioBase64);
      const audioBuffer = await decodeAudioData(audioBytes, ctx);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        setTimeout(() => {
          playStep(index + 1, queue);
        }, 400);
      };
      
      source.start();
      currentSourceRef.current = source;
    } catch (err) {
      speakWithBrowserFallback(step.text);
    }
  };

  const handleLocationSelect = async (loc: Location | null) => {
    setSelectedLocation(loc);
    setSelectedEventId(null);
    stopAudio();

    if (loc && voiceEnabled) {
       setIsSpeaking(true);
       try {
         const steps = await narrateBuilding(loc.name, loc.description, accessibilityMode);
         if (steps.length > 0) {
            setNarrationQueue(steps);
            playStep(0, steps);
         } else {
            setIsSpeaking(false);
         }
       } catch (err) {
         setIsSpeaking(false);
       }
    }
  };

  const handleBotNavigate = (locationId: string) => {
    const loc = locations.find(l => l.id === locationId);
    if (loc) {
      handleLocationSelect(loc);
    }
  };

  const handleBotResponseNarrate = async (text: string) => {
    if (!voiceEnabled) return;
    stopAudio();
    setIsSpeaking(true);
    try {
      const audioSteps = await generateAudioForText(text);
      if (audioSteps.length > 0) {
        setNarrationQueue(audioSteps);
        playStep(0, audioSteps);
      } else {
        speakWithBrowserFallback(text);
      }
    } catch (e) {
      speakWithBrowserFallback(text);
    }
  };

  const handleEventSelect = async (event: CampusEvent, loc: Location) => {
    setSelectedLocation(loc);
    setSelectedEventId(event.id);
    setIsEventsOpen(false); 
    stopAudio();

    if (voiceEnabled) {
      setIsSpeaking(true);
      try {
        const steps = await narrateEvent(event.title, loc.name, loc.description, accessibilityMode);
        if (steps.length > 0) {
          if (steps[0].text && !steps[0].audioBase64) {
            setIsQuotaLimited(true);
            setTimeout(() => setIsQuotaLimited(false), 5000);
            speakWithBrowserFallback(steps[0].text);
          } else {
            setNarrationQueue(steps);
            playStep(0, steps);
          }
        } else {
          setIsSpeaking(false);
        }
      } catch (err) {
        setIsSpeaking(false);
      }
    }
  };

  const handleAddEvent = (locationId: string, event: CampusEvent) => {
    setLocations(prev => prev.map(loc => {
      if (loc.id === locationId) {
        return {
          ...loc,
          events: [...(loc.events || []), event]
        };
      }
      return loc;
    }));
    setIsAddEventOpen(false);
  };

  const allEvents = locations.flatMap(loc => 
    (loc.events || []).map(event => ({ ...event, location: loc }))
  );

  const getBuildingIcon = (type: string) => {
    switch (type) {
      case 'academic': return <BookOpen size={16} />;
      case 'sports': return <Trophy size={16} />;
      case 'dining': return <Utensils size={16} />;
      default: return <Compass size={16} />;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-blue-100 overflow-x-hidden transition-colors duration-500 ${accessibilityMode ? 'bg-black text-white' : 'bg-[#f8fafc] text-slate-900'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 border-b px-8 py-4 shadow-sm transition-colors duration-500 ${accessibilityMode ? 'bg-black border-yellow-400' : 'bg-white/80 backdrop-blur-md border-slate-200/60'}`}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-default">
            <div className={`p-2 rounded-2xl shadow-lg transition-all rotate-3 group-hover:rotate-0 ${accessibilityMode ? 'bg-yellow-400 text-black shadow-yellow-400/20' : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-blue-200'}`}>
              <GraduationCap size={24} />
            </div>
            <div>
              <h1 className={`text-xl font-black tracking-tight leading-none ${accessibilityMode ? 'text-yellow-400' : 'text-slate-900'}`}>Titan <span className={accessibilityMode ? 'text-white' : 'text-blue-600'}>University</span></h1>
              <p className={`text-[9px] font-extrabold uppercase tracking-[0.2em] mt-1 flex items-center gap-1 ${accessibilityMode ? 'text-yellow-400/70' : 'text-slate-400'}`}>
                <Compass size={9} className={accessibilityMode ? 'text-yellow-400' : 'text-blue-500'} /> Smart Campus Navigator
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsAddEventOpen(true)}
              className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-full transition-all text-[10px] font-black uppercase tracking-widest border shadow-sm active:scale-95 group overflow-hidden relative ${accessibilityMode ? 'bg-yellow-400 border-white text-black' : 'bg-blue-600 border-blue-700 text-white hover:bg-blue-700'}`}
              title="Create New Event"
            >
              <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" /> New Event
            </button>

            <button 
              onClick={() => setAccessibilityMode(!accessibilityMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-[10px] font-bold border ${accessibilityMode ? 'bg-yellow-400 border-white text-black shadow-lg scale-110' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
              title="Toggle Accessibility Mode"
            >
              <Accessibility size={14} />
              <span className="hidden sm:inline">{accessibilityMode ? 'Accessibility ON' : 'Accessibility OFF'}</span>
            </button>

            <button 
              onClick={() => {
                const newState = !voiceEnabled;
                setVoiceEnabled(newState);
                if (!newState) stopAudio();
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-[10px] font-bold border ${voiceEnabled ? (accessibilityMode ? 'bg-slate-900 border-yellow-400 text-yellow-400' : 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm') : (accessibilityMode ? 'bg-black border-slate-800 text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-400')}`}
            >
              {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span className="hidden sm:inline">{voiceEnabled ? 'Voice On' : 'Voice Off'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full p-4 lg:p-6 relative">
        <div className="flex flex-col lg:flex-row gap-6 items-stretch min-h-[calc(100vh-160px)]">
          
          {/* Left Column: Map Container */}
          <div className="lg:flex-[7] flex flex-col space-y-4">
            <section className={`relative rounded-[2rem] p-4 border shadow-xl flex-1 flex flex-col transition-colors duration-500 ${accessibilityMode ? 'bg-slate-900 border-yellow-400 shadow-yellow-400/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4 px-2">
                <div>
                  <h2 className={`text-lg font-black tracking-tight ${accessibilityMode ? 'text-yellow-400' : 'text-slate-800'}`}>Interactive Campus Map</h2>
                  <p className={`text-xs font-medium ${accessibilityMode ? 'text-white/70' : 'text-slate-500'}`}>Explore the grounds in {currentView} mode.</p>
                </div>
                <div className={`flex gap-1 p-1 rounded-xl ${accessibilityMode ? 'bg-black' : 'bg-slate-100'}`}>
                  {(['2d', 'sat', 'guide'] as MapView[]).map((tab) => (
                    <button 
                      key={tab} 
                      onClick={() => setCurrentView(tab)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider ${currentView === tab ? (accessibilityMode ? 'bg-yellow-400 text-black shadow-sm' : 'bg-white shadow-sm text-blue-600') : (accessibilityMode ? 'text-slate-500 hover:text-yellow-400' : 'text-slate-400 hover:text-slate-600')}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className={`relative flex-1 rounded-[1.5rem] overflow-hidden border ${accessibilityMode ? 'border-yellow-400/20' : 'border-slate-100'}`}>
                <CampusMap 
                  onLocationSelect={handleLocationSelect} 
                  selectedId={selectedLocation?.id || null} 
                  view={currentView}
                  accessibilityMode={accessibilityMode}
                />

                {isSpeaking && currentStepIndex !== -1 && narrationQueue[currentStepIndex] && (
                  <div className="absolute bottom-4 left-4 right-4 z-40 animate-in slide-in-from-bottom-2 duration-300">
                    <div className={`backdrop-blur-md border p-3 rounded-xl shadow-2xl flex items-center gap-3 max-w-lg mx-auto ${accessibilityMode ? 'bg-black border-yellow-400' : 'bg-slate-900/95 border-white/10'}`}>
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${accessibilityMode ? 'bg-yellow-400 text-black' : 'bg-blue-500 text-white'}`}>
                        <MessageSquare size={16} className="animate-pulse" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className={`font-bold leading-tight line-clamp-2 ${accessibilityMode ? 'text-yellow-400 text-sm' : 'text-white text-[11px]'}`}>
                          "{narrationQueue[currentStepIndex].text}"
                        </p>
                      </div>
                      <button 
                        onClick={stopAudio}
                        className={`p-2 rounded-lg transition-colors ${accessibilityMode ? 'bg-yellow-400 text-black hover:bg-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                      >
                        <Square size={12} fill="currentColor" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Discovery / Details Panel */}
          <div className="lg:flex-[3] flex flex-col min-h-[400px]">
            {selectedLocation ? (
              <BuildingDetails 
                location={selectedLocation} 
                onClose={() => handleLocationSelect(null)} 
                onAddEventClick={() => setIsAddEventOpen(true)}
                onListenAgain={() => {
                  if (selectedEventId) {
                    const event = selectedLocation.events?.find(e => e.id === selectedEventId);
                    if (event) handleEventSelect(event, selectedLocation);
                  } else {
                    handleLocationSelect(selectedLocation);
                  }
                }}
                onEventSelect={(event) => handleEventSelect(event, selectedLocation)}
                selectedEventId={selectedEventId}
                isSpeaking={isSpeaking}
                accessibilityMode={accessibilityMode}
              />
            ) : (
              <div className={`border rounded-[2rem] shadow-xl h-full flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 transition-colors ${accessibilityMode ? 'bg-slate-900 border-yellow-400' : 'bg-white border-slate-200'}`}>
                {/* Header Section */}
                <div className={`p-8 border-b ${accessibilityMode ? 'bg-black border-yellow-400/20' : 'bg-slate-50/50 border-slate-100'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-sm ring-4 ${accessibilityMode ? 'bg-yellow-400 text-black ring-yellow-400/10' : 'bg-blue-100 text-blue-600 ring-blue-50'}`}>
                    <Layers size={22} />
                  </div>
                  <h3 className={`text-2xl font-black tracking-tight mb-2 ${accessibilityMode ? 'text-yellow-400' : 'text-slate-900'}`}>Immersive Discovery</h3>
                  <p className={`text-sm font-medium leading-relaxed ${accessibilityMode ? 'text-white/70' : 'text-slate-500'}`}>
                    {accessibilityMode ? 'Enhanced navigation mode is active. High-contrast elements and detailed audio descriptions are available.' : 'Welcome to Titan\'s digital twin. Explore building details below.'}
                  </p>
                </div>

                {/* Campus Snapshot / Stats */}
                <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                  <section>
                    <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${accessibilityMode ? 'text-yellow-400/50' : 'text-slate-400'}`}>Campus Snapshot</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`p-4 rounded-2xl border transition-all ${accessibilityMode ? 'bg-black border-yellow-400/30' : 'bg-slate-50 border-slate-100'}`}>
                        <div className={accessibilityMode ? 'text-yellow-400 mb-1' : 'text-blue-600 mb-1'}><Users size={18} /></div>
                        <div className={`text-lg font-black ${accessibilityMode ? 'text-white' : 'text-slate-800'}`}>12.4k</div>
                        <div className={`text-[9px] font-bold uppercase tracking-wider ${accessibilityMode ? 'text-yellow-400' : 'text-slate-500'}`}>Students</div>
                      </div>
                      <div className={`p-4 rounded-2xl border transition-all ${accessibilityMode ? 'bg-black border-yellow-400/30' : 'bg-slate-50 border-slate-100'}`}>
                        <div className={accessibilityMode ? 'text-yellow-400 mb-1' : 'text-emerald-600 mb-1'}><Calendar size={18} /></div>
                        <div className={`text-lg font-black ${accessibilityMode ? 'text-white' : 'text-slate-800'}`}>{allEvents.length}</div>
                        <div className={`text-[9px] font-bold uppercase tracking-wider ${accessibilityMode ? 'text-yellow-400' : 'text-slate-500'}`}>Active Events</div>
                      </div>
                    </div>
                  </section>

                  {/* Top Destinations */}
                  <section>
                    <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${accessibilityMode ? 'text-yellow-400/50' : 'text-slate-400'}`}>Top Destinations</h4>
                    <div className="space-y-3">
                      {locations.filter(l => l.id !== 'main-entrance').slice(0, 4).map((loc) => (
                        <button 
                          key={loc.id}
                          onClick={() => handleLocationSelect(loc)}
                          className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${accessibilityMode ? 'bg-black border-yellow-400/50 hover:bg-slate-800' : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md'}`}
                        >
                          <div className={`p-2 rounded-xl transition-colors ${accessibilityMode ? 'bg-slate-900 text-yellow-400 group-hover:bg-yellow-400 group-hover:text-black' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
                            {getBuildingIcon(loc.type)}
                          </div>
                          <div className="flex-1">
                            <h5 className={`font-black leading-tight transition-colors ${accessibilityMode ? 'text-white text-base group-hover:text-yellow-400' : 'text-sm text-slate-800 group-hover:text-blue-600'}`}>{loc.name}</h5>
                            <p className={`font-bold uppercase tracking-wider mt-0.5 ${accessibilityMode ? 'text-yellow-400 text-[11px]' : 'text-slate-500 text-[10px]'}`}>{loc.rooms?.length || 0} Classrooms</p>
                          </div>
                          <ArrowRight size={14} className={accessibilityMode ? 'text-yellow-400' : 'text-slate-300'} />
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating Action Menu */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
        {/* New Create Event FAB */}
        <button 
          onClick={() => setIsAddEventOpen(true)}
          className={`flex items-center justify-center w-12 h-12 border rounded-xl shadow-lg transition-all active:scale-95 group ${accessibilityMode ? 'bg-black border-yellow-400 text-yellow-400' : 'bg-white border-slate-200 text-blue-600 hover:shadow-xl hover:bg-blue-50'}`}
          title="Create New Event"
        >
          <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>

        <button 
          onClick={() => setIsEventsOpen(true)}
          className={`group relative flex items-center justify-center w-12 h-12 border rounded-xl shadow-lg transition-all active:scale-95 ${accessibilityMode ? 'bg-black border-yellow-400 text-yellow-400' : 'bg-white border-slate-200 text-slate-700 hover:shadow-xl'}`}
          title="Discover Activities"
        >
          <Calendar size={20} />
          <div className={`absolute -top-1 -right-1 w-3 h-3 border-2 rounded-full animate-pulse ${accessibilityMode ? 'bg-white border-black' : 'bg-blue-500 border-white'}`}></div>
        </button>

        <button 
          onClick={() => setIsChatOpen(true)}
          className={`group relative flex items-center justify-center w-14 h-14 rounded-2xl shadow-lg transition-all active:scale-95 ${accessibilityMode ? 'bg-yellow-400 text-black shadow-yellow-400/20 hover:scale-105' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'}`}
          title="Campus Assistant"
        >
          <Bot size={24} />
        </button>
      </div>

      {/* Overlays */}
      {isChatOpen && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:justify-end p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsChatOpen(false)}></div>
          <div className={`relative w-full max-md:max-w-full max-w-md h-[550px] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border animate-in slide-in-from-right-4 zoom-in-95 duration-400 ${accessibilityMode ? 'bg-black border-yellow-400' : 'bg-white border-white/20'}`}>
            <div className={`p-5 flex items-center justify-between ${accessibilityMode ? 'bg-yellow-400 text-black' : 'bg-blue-600 text-white'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${accessibilityMode ? 'bg-black/10' : 'bg-white/20'}`}>
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-black text-base leading-tight">Titan-1 AI</h3>
                  <p className={`text-[9px] font-bold uppercase tracking-widest ${accessibilityMode ? 'text-black/60' : 'text-blue-100'}`}>Smart Campus Assistant</p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatAssistant 
                onNavigate={handleBotNavigate} 
                onEventSelect={handleEventSelect}
                onBotResponse={handleBotResponseNarrate}
                accessibilityMode={accessibilityMode} 
                locations={locations} 
              />
            </div>
          </div>
        </div>
      )}

      {isEventsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEventsOpen(false)}></div>
          <div className={`relative w-full max-w-2xl rounded-[2rem] shadow-2xl border overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-400 flex flex-col max-h-[80vh] transition-colors ${accessibilityMode ? 'bg-black border-yellow-400' : 'bg-white border-slate-200'}`}>
            <div className={`p-6 border-b flex items-center justify-between sticky top-0 backdrop-blur-md z-10 ${accessibilityMode ? 'bg-black/90 border-yellow-400/20' : 'bg-white/95 border-slate-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${accessibilityMode ? 'bg-yellow-400 text-black' : 'bg-blue-50 text-blue-600'}`}>
                  <Calendar size={24} />
                </div>
                <div>
                  <h3 className={`text-xl font-black tracking-tight ${accessibilityMode ? 'text-yellow-400' : 'text-slate-900'}`}>Campus Feed</h3>
                  <p className={`text-xs font-medium ${accessibilityMode ? 'text-white/70' : 'text-slate-500'}`}>Live campus activities</p>
                </div>
              </div>
              <button onClick={() => setIsEventsOpen(false)} className={`p-2.5 rounded-xl transition-all active:scale-90 ${accessibilityMode ? 'bg-slate-900 text-yellow-400 hover:text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allEvents.map((event) => (
                  <button 
                    key={event.id} 
                    onClick={() => handleEventSelect(event, event.location)}
                    className={`w-full text-left p-5 rounded-2xl transition-all group border-2 ${accessibilityMode ? 'bg-black border-yellow-400 hover:bg-slate-900 hover:border-white' : 'bg-slate-50/50 border-slate-100 hover:bg-white hover:border-blue-200 hover:shadow-lg'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${accessibilityMode ? 'bg-yellow-400 text-black text-[10px]' : 'text-blue-500 bg-blue-50 text-[9px]'}`}>
                        {event.location.name}
                      </span>
                    </div>
                    <h5 className={`font-black transition-colors mb-1 ${accessibilityMode ? 'text-white text-lg group-hover:text-yellow-400' : 'text-base text-slate-800 group-hover:text-blue-600'}`}>
                      {event.title}
                    </h5>
                    <p className={`font-medium line-clamp-2 mb-3 ${accessibilityMode ? 'text-white/80 text-sm' : 'text-[11px] text-slate-500'}`}>
                      {event.description}
                    </p>
                    <div className={`flex items-center gap-1 font-black uppercase tracking-widest ${accessibilityMode ? 'text-yellow-400 text-xs' : 'text-blue-600 text-[9px]'}`}>
                      Navigate <ArrowRight size={10} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddEventOpen && (
        <AddEventModal 
          locations={locations} 
          onClose={() => setIsAddEventOpen(false)} 
          onSubmit={handleAddEvent}
        />
      )}

      <footer className={`border-t py-8 px-8 transition-colors ${accessibilityMode ? 'bg-black border-yellow-400/20' : 'bg-white border-slate-200/60'}`}>
        <div className="max-w-[1600px] mx-auto text-center md:flex md:justify-between md:items-center">
          <p className={`text-[10px] font-bold uppercase tracking-widest ${accessibilityMode ? 'text-yellow-400/50' : 'text-slate-400'}`}>
            &copy; 2024 Titan University • Digital Navigator
          </p>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${accessibilityMode ? '#FACC15' : '#e2e8f0'}; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${accessibilityMode ? '#FFF' : '#cbd5e1'}; }
      `}</style>
    </div>
  );
};

export default App;

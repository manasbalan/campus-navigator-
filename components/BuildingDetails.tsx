
import React, { useState, useMemo } from 'react';
import { Location, CampusEvent } from '../types';
import { MapPin, List, CheckCircle2, Search, XCircle, Volume2, Loader2, Calendar, Clock, Navigation2, Accessibility, Plus } from 'lucide-react';

interface BuildingDetailsProps {
  location: Location | null;
  onClose: () => void;
  onAddEventClick?: () => void;
  onListenAgain?: () => void;
  onEventSelect?: (event: CampusEvent) => void;
  selectedEventId?: string | null;
  isSpeaking?: boolean;
  accessibilityMode?: boolean;
}

const BuildingDetails: React.FC<BuildingDetailsProps> = ({ 
  location, 
  onClose, 
  onAddEventClick,
  onListenAgain, 
  onEventSelect,
  selectedEventId,
  isSpeaking,
  accessibilityMode = false
}) => {
  const [roomSearch, setRoomSearch] = useState('');

  useMemo(() => {
    setRoomSearch('');
  }, [location?.id]);

  if (!location) return null;

  const filteredRooms = location.rooms?.filter(room =>
    room.toLowerCase().includes(roomSearch.toLowerCase())
  );

  const getCategoryColor = (category: CampusEvent['category']) => {
    if (accessibilityMode) return 'bg-slate-900 text-yellow-400 border-yellow-400';
    switch (category) {
      case 'academic': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'social': return 'bg-purple-100 text-purple-600 border-purple-200';
      case 'sports': return 'bg-rose-100 text-rose-600 border-rose-200';
      case 'workshop': return 'bg-amber-100 text-amber-600 border-amber-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const textBase = accessibilityMode ? 'text-lg font-bold' : 'text-sm font-medium';
  const headingBase = accessibilityMode ? 'text-2xl font-black' : 'text-sm font-black';

  return (
    <div className={`rounded-[2rem] shadow-2xl p-8 border-2 animate-in fade-in slide-in-from-bottom-6 duration-500 h-full flex flex-col ${accessibilityMode ? 'bg-black border-yellow-400 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${accessibilityMode ? 'bg-yellow-400 text-black' : 'bg-blue-50 text-blue-600'}`}>
              <MapPin size={accessibilityMode ? 24 : 20} />
            </div>
            <h2 className={`${accessibilityMode ? 'text-3xl' : 'text-2xl'} font-black tracking-tight`}>
              {location.name}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-extrabold uppercase tracking-[0.2em] px-2 py-0.5 rounded-md ${accessibilityMode ? 'bg-yellow-400 text-black text-xs' : 'text-blue-500 bg-blue-50 text-[10px]'}`}>
              {location.type}
            </span>
            {onListenAgain && selectedEventId && (
              <button 
                onClick={onListenAgain}
                disabled={isSpeaking}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold uppercase tracking-wider transition-all border ${accessibilityMode ? 'bg-yellow-400 text-black border-white text-xs' : isSpeaking ? 'bg-blue-500 text-white border-blue-600 text-[10px]' : 'bg-white text-slate-400 border-slate-200 hover:text-blue-500 hover:border-blue-200 text-[10px]'}`}
              >
                {isSpeaking ? <Loader2 size={12} className="animate-spin" /> : <Volume2 size={12} />}
                {isSpeaking ? 'Speaking...' : 'Listen Details'}
              </button>
            )}
          </div>
        </div>
        <button 
          onClick={onClose}
          className={`p-2 rounded-xl transition-all active:scale-90 ${accessibilityMode ? 'bg-slate-900 text-yellow-400 hover:bg-slate-800' : 'bg-slate-50 text-slate-400 hover:text-slate-600'}`}
        >
          <XCircle size={accessibilityMode ? 24 : 20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
        <section>
          <p className={`${textBase} leading-relaxed mb-4 ${accessibilityMode ? 'text-white' : 'text-slate-500'}`}>
            {location.description}
          </p>
          {accessibilityMode && (
             <div className="flex items-center gap-2 p-3 bg-yellow-400/10 border border-yellow-400/30 rounded-xl mb-6">
                <Accessibility size={20} className="text-yellow-400" />
                <span className="text-sm font-bold text-yellow-400 uppercase tracking-widest">Accessibility Mode Enabled</span>
             </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`${headingBase} uppercase tracking-widest flex items-center gap-2.5 ${accessibilityMode ? 'text-yellow-400' : 'text-slate-800'}`}>
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${accessibilityMode ? 'bg-yellow-400 text-black' : 'bg-purple-50 text-purple-500'}`}>
                <Calendar size={14} /> 
              </div>
              Events
            </h3>
            <button 
              onClick={onAddEventClick}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black uppercase tracking-widest transition-all border ${accessibilityMode ? 'bg-slate-900 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black text-xs' : 'bg-white border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-100 text-[10px]'}`}
            >
              <Plus size={12} /> Add
            </button>
          </div>
          
          <div className="space-y-4">
            {location.events && location.events.length > 0 ? (
              location.events.map((event) => (
                <div 
                  key={event.id} 
                  className={`group p-5 rounded-2xl border-2 transition-all ${selectedEventId === event.id ? (accessibilityMode ? 'bg-slate-900 border-white' : 'bg-white border-purple-300 shadow-lg ring-1 ring-purple-100') : (accessibilityMode ? 'bg-black border-yellow-400' : 'bg-slate-50 border-slate-100')}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${getCategoryColor(event.category)}`}>
                      {event.category}
                    </span>
                    <div className={`flex items-center gap-1.5 ${accessibilityMode ? 'text-yellow-400' : 'text-slate-400'}`}>
                      <Clock size={12} />
                      <span className="text-[10px] font-bold">{event.time}</span>
                    </div>
                  </div>
                  <h4 className={`${accessibilityMode ? 'text-xl' : 'text-sm'} font-black transition-colors ${selectedEventId === event.id ? (accessibilityMode ? 'text-white' : 'text-purple-600') : (accessibilityMode ? 'text-yellow-400' : 'text-slate-800')}`}>{event.title}</h4>
                  <p className={`${accessibilityMode ? 'text-base' : 'text-xs'} font-medium mt-1 mb-4 ${accessibilityMode ? 'text-white' : 'text-slate-500'}`}>{event.description}</p>
                  
                  <button 
                    onClick={() => onEventSelect?.(event)}
                    className={`w-full py-3 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${selectedEventId === event.id ? (accessibilityMode ? 'bg-white text-black' : 'bg-purple-600 text-white') : (accessibilityMode ? 'bg-yellow-400 text-black' : 'bg-white border border-slate-200 text-slate-500')} ${accessibilityMode ? 'text-sm' : 'text-[10px]'}`}
                  >
                    <Navigation2 size={16} fill={selectedEventId === event.id ? (accessibilityMode ? 'black' : 'white') : 'none'} />
                    {selectedEventId === event.id ? 'Navigating...' : 'Get Info'}
                  </button>
                </div>
              ))
            ) : (
              <div className={`py-8 text-center rounded-2xl border-2 border-dashed ${accessibilityMode ? 'bg-black border-yellow-400/30 text-yellow-400/50' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest">No scheduled events</p>
              </div>
            )}
          </div>
        </section>

        {location.rooms && (
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <h3 className={`${headingBase} uppercase tracking-widest flex items-center gap-2.5 ${accessibilityMode ? 'text-yellow-400' : 'text-slate-800'}`}>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${accessibilityMode ? 'bg-yellow-400 text-black' : 'bg-slate-100 text-slate-500'}`}>
                  <List size={14} /> 
                </div>
                Directory
              </h3>
              <div className="relative flex-1 max-w-xs group">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${accessibilityMode ? 'text-yellow-400' : 'text-slate-300'}`} size={14} />
                <input
                  type="text"
                  placeholder="Search rooms..."
                  className={`w-full rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-4 transition-all ${accessibilityMode ? 'bg-slate-900 border-2 border-yellow-400 text-white focus:ring-yellow-400/20 text-sm' : 'bg-slate-50 border border-slate-200 text-xs focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400'}`}
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                />
              </div>
            </div>

            {filteredRooms && filteredRooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredRooms.map((room, i) => (
                  <div key={i} className={`group flex items-center gap-3 font-bold px-4 py-3 rounded-xl border-2 transition-all ${accessibilityMode ? 'bg-slate-900 text-white border-yellow-400 text-sm' : 'bg-slate-50 text-slate-600 text-xs border-slate-100 hover:border-blue-200 hover:shadow-md'}`}>
                    <div className={`w-2 h-2 rounded-full ${accessibilityMode ? 'bg-yellow-400' : 'bg-slate-300 group-hover:bg-blue-500'}`}></div>
                    {room}
                  </div>
                ))}
              </div>
            ) : (
              <div className={`py-10 text-center rounded-2xl border-2 border-dashed ${accessibilityMode ? 'bg-black border-yellow-400/50' : 'bg-slate-50/50 border-slate-200'}`}>
                <p className={`font-bold ${accessibilityMode ? 'text-yellow-400 text-sm' : 'text-slate-400 text-xs'}`}>No rooms found for "{roomSearch}"</p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default BuildingDetails;

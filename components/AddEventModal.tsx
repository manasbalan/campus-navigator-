
import React, { useState } from 'react';
import { Location, CampusEvent } from '../types';
import { X, Calendar, Clock, MapPin, Tag, Type, AlignLeft, Send, Plus, ChevronDown } from 'lucide-react';

interface AddEventModalProps {
  locations: Location[];
  onClose: () => void;
  onSubmit: (locationId: string, event: CampusEvent) => void;
}

const AddEventModal: React.FC<AddEventModalProps> = ({ locations, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    locationId: locations[0]?.id || '',
    title: '',
    time: '',
    description: '',
    category: 'social' as CampusEvent['category']
  });

  const categories: CampusEvent['category'][] = ['academic', 'social', 'sports', 'workshop'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.time || !formData.description) return;

    const newEvent: CampusEvent = {
      id: `custom-${Date.now()}`,
      title: formData.title,
      time: formData.time,
      description: formData.description,
      category: formData.category
    };

    onSubmit(formData.locationId, newEvent);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
        
        {/* Header */}
        <div className="p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Calendar size={28} />
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <h2 className="text-3xl font-black tracking-tight leading-tight">Create Campus Event</h2>
          <p className="text-blue-100/80 text-sm font-medium mt-1 uppercase tracking-widest text-[10px]">Publish to the Digital Twin</p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          
          {/* Location Picker */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
              <MapPin size={12} /> Hosting Venue
            </label>
            <div className="relative group">
              <select 
                value={formData.locationId}
                onChange={(e) => setFormData({...formData, locationId: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-700 appearance-none focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer"
              >
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 pointer-events-none transition-colors" size={18} />
            </div>
          </div>

          {/* Event Title */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
              <Type size={12} /> Event Title
            </label>
            <input 
              type="text"
              required
              placeholder="e.g. Midnight Hackathon 2024"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>

          {/* Grid: Time & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <Clock size={12} /> Date & Time
              </label>
              <input 
                type="text"
                required
                placeholder="e.g. Tomorrow, 10:00 PM"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                value={formData.time}
                onChange={(e) => setFormData({...formData, time: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <Tag size={12} /> Category
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormData({...formData, category: cat})}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${formData.category === cat ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-blue-200 hover:text-blue-500'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
              <AlignLeft size={12} /> Brief Description
            </label>
            <textarea 
              required
              rows={3}
              placeholder="Tell us what's happening..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
        </form>

        {/* Action Footer */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[10px] font-bold text-slate-400 max-w-[200px] leading-tight">
            Once published, this event will appear in the campus activity feed.
          </p>
          <button 
            onClick={handleSubmit}
            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-[1.03] active:scale-[0.97] transition-all"
          >
            Publish Event <Send size={18} />
          </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default AddEventModal;

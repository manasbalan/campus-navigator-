
import React, { useState, useRef, useEffect } from 'react';
import { CAMPUS_LOCATIONS } from '../constants';
import { Location } from '../types';
import { MapView } from '../App';
import { ZoomIn, ZoomOut, Maximize, Ruler, Info, Calendar, Clock, X } from 'lucide-react';

interface CampusMapProps {
  onLocationSelect: (location: Location) => void;
  selectedId: string | null;
  view: MapView;
  accessibilityMode: boolean;
}

const SCALE_FACTOR = 1.25; // 1 unit = 1.25 meters

const CampusMap: React.FC<CampusMapProps> = ({ onLocationSelect, selectedId, view, accessibilityMode }) => {
  const [zoom, setZoom] = useState(0.65);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredLoc, setHoveredLoc] = useState<Location | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Measurement Tool State
  const [isMeasureMode, setIsMeasureMode] = useState(false);
  const [measureA, setMeasureA] = useState<Location | null>(null);
  const [measureB, setMeasureB] = useState<Location | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const entrance = CAMPUS_LOCATIONS.find(l => l.id === 'main-entrance')!;
  const selectedLoc = CAMPUS_LOCATIONS.find(l => l.id === selectedId);

  const getCenter = (loc: Location) => ({
    x: loc.coordinates.x + loc.coordinates.width / 2,
    y: loc.coordinates.y + loc.coordinates.height / 2
  });

  const entCenter = getCenter(entrance);
  const targetCenter = selectedLoc ? getCenter(selectedLoc) : null;

  const isSat = view === 'sat';
  const isGuide = view === 'guide';

  const baseW = 800;
  const baseH = 600;
  
  useEffect(() => {
    if (selectedId && selectedLoc && selectedId !== 'main-entrance' && !isMeasureMode) {
      const target = getCenter(selectedLoc);
      setOffset({
        x: target.x - baseW / 2,
        y: target.y - baseH / 2
      });
      setZoom(1.2);
    }
  }, [selectedId, isMeasureMode]);

  const viewW = baseW / zoom;
  const viewH = baseH / zoom;
  const viewBoxX = (baseW - viewW) / 2 + offset.x;
  const viewBoxY = (baseH - viewH) / 2 + offset.y;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 4));
  const handleZoomOut = () => {
    setZoom(prev => {
      const next = Math.max(prev - 0.2, 0.4);
      if (next <= 0.65) setOffset({ x: 0, y: 0 });
      return next;
    });
  };
  const handleReset = () => {
    setZoom(0.65);
    setOffset({ x: 0, y: 0 });
    setIsMeasureMode(false);
    setMeasureA(null);
    setMeasureB(null);
  };

  const calculateDistance = (loc1: Location, loc2: Location) => {
    const c1 = getCenter(loc1);
    const c2 = getCenter(loc2);
    const dx = c2.x - c1.x;
    const dy = c2.y - c1.y;
    return Math.sqrt(dx * dx + dy * dy) * SCALE_FACTOR;
  };

  const onMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (zoom <= 0.65) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX, y: clientY });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({ x: clientX - rect.left, y: clientY - rect.top });
    }

    if (!isDragging || zoom <= 0.65) return;
    
    const dx = (dragStart.x - clientX) * (viewW / (containerRef.current?.clientWidth || 800));
    const dy = (dragStart.y - clientY) * (viewH / (containerRef.current?.clientHeight || 600));

    setOffset(prev => ({
      x: Math.max(Math.min(prev.x + dx, baseW / 2), -baseW / 2),
      y: Math.max(Math.min(prev.y + dy, baseH / 2), -baseH / 2)
    }));
    setDragStart({ x: clientX, y: clientY });
  };

  const handleLocationClick = (loc: Location) => {
    if (isMeasureMode) {
      if (!measureA) {
        setMeasureA(loc);
      } else if (!measureB && loc.id !== measureA.id) {
        setMeasureB(loc);
      } else {
        setMeasureA(loc);
        setMeasureB(null);
      }
    } else {
      onLocationSelect(loc);
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) handleZoomIn();
      else handleZoomOut();
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const getMapBg = () => {
    if (accessibilityMode) return 'bg-black';
    if (isSat) return 'bg-[#1a2f1a]';
    return 'bg-[#fdfbf7]';
  };

  const measureDist = measureA && measureB ? calculateDistance(measureA, measureB) : null;
  const walkTime = measureDist ? Math.ceil(measureDist / 80) : null;

  return (
    <div 
      ref={containerRef}
      className={`relative w-full aspect-[4/5] sm:aspect-[4/3] md:aspect-[16/10] rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 overflow-hidden shadow-2xl transition-all duration-700 ${getMapBg()} ${zoom > 0.65 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
      onMouseDown={onMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => {
        setIsDragging(false);
        setHoveredLoc(null);
      }}
      onTouchStart={onMouseDown}
      onTouchMove={handleMouseMove}
      onTouchEnd={() => setIsDragging(false)}
    >
      <style>{`
        @keyframes dash { to { stroke-dashoffset: -40; } }
        .nav-path { stroke-dasharray: 8, 8; animation: dash 1.5s linear infinite; }
        .measure-line { stroke-dasharray: 4, 4; animation: dash 1s linear infinite; }
        .building-group { transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .building-group:hover { transform: translateY(-5px); }
        .sat-texture { background-image: url('https://www.transparenttextures.com/patterns/dark-wood.png'); mix-blend-mode: multiply; opacity: 0.15; }
        .map-label { font-size: ${accessibilityMode ? '18px' : '14px'}; paint-order: stroke; stroke: ${accessibilityMode ? '#000000' : '#ffffff80'}; stroke-width: 4px; font-weight: 900; }
        @media (min-width: 768px) { .map-label { font-size: ${accessibilityMode ? '22px' : '16px'}; } }
        .map-svg { transition: view-box 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>
      
      {isSat && !accessibilityMode && <div className="absolute inset-0 sat-texture pointer-events-none z-10" />}
      
      {!isSat && !accessibilityMode && (
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(#000 0.8px, transparent 0.8px)', backgroundSize: '32px 32px' }} />
      )}

      {/* Floating Measurement Indicator */}
      {measureA && measureB && !isDragging && (
        <div 
          className="absolute z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-300"
          style={{ 
            left: '50%', 
            top: '20px',
            transform: 'translateX(-50%)'
          }}
        >
          <div className={`${accessibilityMode ? 'bg-black text-yellow-400 border-yellow-400' : 'bg-slate-900/90 text-white border-white/20'} backdrop-blur-md border-2 shadow-2xl rounded-2xl px-6 py-3 flex items-center gap-6 ring-4 ring-black/10`}>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Distance</span>
              <span className="text-xl font-black">{Math.round(measureDist!)}m</span>
            </div>
            <div className={`w-px h-8 ${accessibilityMode ? 'bg-yellow-400/30' : 'bg-white/10'}`}></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Walk Time</span>
              <div className="flex items-center gap-2">
                <Clock size={14} />
                <span className="text-xl font-black">{walkTime} min</span>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setMeasureA(null);
                setMeasureB(null);
              }}
              className="pointer-events-auto p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {hoveredLoc && !isDragging && !isMeasureMode && (
        <div 
          className="absolute z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-200"
          style={{ 
            left: mousePos.x, 
            top: mousePos.y - 12,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className={`${accessibilityMode ? 'bg-black text-white border-yellow-400' : 'bg-white/95 text-slate-900 border-indigo-100'} backdrop-blur-md border-2 shadow-2xl rounded-2xl p-4 min-w-[240px] ring-1 ring-black/5`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${accessibilityMode ? 'bg-yellow-400 text-black' : 'bg-indigo-50 text-indigo-600'}`}>
                <Info size={14} />
              </div>
              <div>
                <h4 className={`text-xs font-black leading-none ${accessibilityMode ? 'text-yellow-400' : 'text-slate-900'}`}>{hoveredLoc.name}</h4>
                <span className={`text-[8px] font-black uppercase tracking-widest mt-1 block ${accessibilityMode ? 'text-white' : 'text-indigo-500'}`}>
                  {hoveredLoc.type}
                </span>
              </div>
            </div>

            {hoveredLoc.events && hoveredLoc.events.length > 0 && (
              <div className={`mt-3 pt-3 border-t ${accessibilityMode ? 'border-yellow-400/30' : 'border-slate-100'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={10} className={accessibilityMode ? 'text-yellow-400' : 'text-indigo-400'} />
                  <h5 className={`text-[8px] font-black uppercase tracking-[0.15em] ${accessibilityMode ? 'text-yellow-400/70' : 'text-slate-400'}`}>
                    Upcoming Events
                  </h5>
                </div>
                <div className="space-y-2.5">
                  {hoveredLoc.events.slice(0, 3).map(event => (
                    <div key={event.id} className="flex flex-col group/event">
                      <span className={`text-[10px] font-black leading-tight ${accessibilityMode ? 'text-white' : 'text-slate-700'}`}>
                        {event.title}
                      </span>
                      <span className={`text-[8px] font-bold mt-0.5 ${accessibilityMode ? 'text-yellow-400/90' : 'text-indigo-500'}`}>
                        {event.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={`absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 border-b border-r rotate-45 ${accessibilityMode ? 'bg-black border-yellow-400' : 'bg-white border-indigo-100'}`}></div>
          </div>
        </div>
      )}

      <svg 
        viewBox={`${viewBoxX} ${viewBoxY} ${viewW} ${viewH}`} 
        preserveAspectRatio="xMidYMid slice" 
        className="map-svg w-full h-full pointer-events-auto select-none transition-all duration-300 ease-out"
      >
        <rect width="800" height="600" fill="transparent" onClick={() => onLocationSelect(null as any)} />

        <ellipse cx="680" cy="450" rx="70" ry="45" className={`transition-colors duration-700 ${accessibilityMode ? 'fill-blue-600 stroke-blue-400' : isSat ? 'fill-blue-900/50 stroke-blue-700' : 'fill-blue-100/60 stroke-blue-200'}`} strokeWidth="2" />
        
        <g stroke={accessibilityMode ? "#ffffff" : isSat ? "#2d3748" : "#f1f5f9"} strokeWidth={accessibilityMode ? "32" : "28"} fill="none" strokeLinejoin="round" strokeLinecap="round" className="transition-colors duration-700">
          <path d="M400,100 L400,550" /><path d="M100,250 L700,250" /><path d="M400,300 L200,380" /><path d="M400,300 L600,380" />
        </g>
        
        {/* Distance Measurement Line */}
        {measureA && measureB && (
          <g>
            <line 
              x1={getCenter(measureA).x} y1={getCenter(measureA).y} 
              x2={getCenter(measureB).x} y2={getCenter(measureB).y} 
              stroke={accessibilityMode ? "#FFFF00" : "#fbbf24"} 
              strokeWidth="4" 
              className="measure-line"
              filter="drop-shadow(0 0 4px rgba(251, 191, 36, 0.4))"
            />
            <circle cx={getCenter(measureA).x} cy={getCenter(measureA).y} r="8" fill="#fbbf24" stroke="white" strokeWidth="2" />
            <circle cx={getCenter(measureB).x} cy={getCenter(measureB).y} r="8" fill="#fbbf24" stroke="white" strokeWidth="2" />
          </g>
        )}

        {targetCenter && selectedId !== 'main-entrance' && !isMeasureMode && (
          <path d={`M ${entCenter.x} ${entCenter.y} L ${entCenter.x} ${targetCenter.y} L ${targetCenter.x} ${targetCenter.y}`} fill="none" stroke={accessibilityMode ? "#FFFF00" : isGuide ? "#8b5cf6" : "#3b82f6"} strokeWidth={accessibilityMode ? "10" : "7"} strokeLinecap="round" className="nav-path" />
        )}

        {CAMPUS_LOCATIONS.map((loc) => {
          const isSelected = selectedId === loc.id;
          const isInMeasure = measureA?.id === loc.id || measureB?.id === loc.id;
          const locCenter = getCenter(loc);
          
          let colorClass = loc.color;
          if (accessibilityMode) {
             colorClass = isSelected || isInMeasure ? 'fill-yellow-400 stroke-white' : 'fill-slate-800 stroke-yellow-400';
          } else if (isMeasureMode) {
             colorClass = isInMeasure ? 'fill-amber-400 stroke-amber-600' : 'fill-slate-100 stroke-slate-200';
          }

          return (
            <g 
              key={loc.id} 
              className={`cursor-pointer building-group ${isMeasureMode && !isInMeasure ? 'opacity-40' : 'opacity-100'}`} 
              onClick={(e) => { e.stopPropagation(); handleLocationClick(loc); }}
              onMouseEnter={() => setHoveredLoc(loc)}
              onMouseLeave={() => setHoveredLoc(null)}
            >
              <rect x={loc.coordinates.x} y={loc.coordinates.y} width={loc.coordinates.width} height={loc.coordinates.height} rx="12" className={`transition-all duration-500 ${colorClass} ${isSelected || isInMeasure ? 'stroke-[6px]' : 'stroke-4'} ${isSat && !accessibilityMode ? 'filter saturate-[0.5] brightness-[0.7]' : ''}`} />
              <text x={locCenter.x} y={locCenter.y} textAnchor="middle" alignmentBaseline="middle" className={`map-label transition-colors duration-700 pointer-events-none ${accessibilityMode ? 'fill-yellow-400' : isSat ? 'fill-slate-100' : 'fill-slate-900'}`}>
                {loc.name.split(' ').map((word, i) => <tspan key={i} x={locCenter.x} dy={i === 0 ? 0 : '1.1em'}>{word}</tspan>)}
              </text>
            </g>
          );
        })}

        <g transform={`translate(${entCenter.x},${entCenter.y})`} className="pointer-events-none">
          <circle r="15" fill={accessibilityMode ? "#FFFF00" : isGuide ? "#8b5cf6" : "#3b82f6"} opacity="0.3"><animate attributeName="r" from="12" to="24" dur="2s" repeatCount="indefinite" /></circle>
          <circle r="10" className={`${accessibilityMode ? 'fill-white stroke-black' : 'fill-amber-500 stroke-white'}`} strokeWidth="3" />
        </g>
      </svg>

      <div className="absolute top-1/2 -translate-y-1/2 right-4 sm:right-6 flex flex-col gap-2 z-30">
        <button 
          onClick={() => setIsMeasureMode(!isMeasureMode)} 
          className={`p-3 rounded-xl shadow-lg border transition-all active:scale-90 ${isMeasureMode ? (accessibilityMode ? 'bg-yellow-400 text-black border-white' : 'bg-amber-500 text-white border-amber-600') : (accessibilityMode ? 'bg-black text-yellow-400 border-yellow-400' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50')}`}
          title="Measure Tool"
        >
          <Ruler size={18} />
        </button>
        <button onClick={handleZoomIn} className={`p-3 rounded-xl shadow-lg border transition-all active:scale-90 ${accessibilityMode ? 'bg-black text-yellow-400 border-yellow-400' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}><ZoomIn size={18} /></button>
        <button onClick={handleZoomOut} className={`p-3 rounded-xl shadow-lg border transition-all active:scale-90 ${accessibilityMode ? 'bg-black text-yellow-400 border-yellow-400' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}><ZoomOut size={18} /></button>
        <button onClick={handleReset} className={`p-3 rounded-xl shadow-lg border transition-all active:scale-90 ${accessibilityMode ? 'bg-black text-yellow-400 border-yellow-400' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}><Maximize size={18} /></button>
      </div>

      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-20 flex gap-2">
        {isMeasureMode && (
          <div className={`px-4 py-1.5 rounded-full border shadow-lg font-black uppercase tracking-widest text-[10px] animate-pulse ${accessibilityMode ? 'bg-yellow-400 border-black text-black' : 'bg-amber-500 border-amber-600 text-white'}`}>
            Measure Mode: Select 2 Places
          </div>
        )}
        <div className={`transition-all duration-700 px-3 py-1.5 rounded-full border shadow-sm text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${accessibilityMode ? 'bg-yellow-400 border-black text-black' : isSat ? 'bg-slate-800 border-slate-700 text-blue-400' : 'bg-white/90 border-slate-200 text-blue-600 backdrop-blur-md'}`}>
          ● {accessibilityMode ? 'HIGH CONTRAST' : view.toUpperCase()}
        </div>
      </div>
    </div>
  );
};

export default CampusMap;

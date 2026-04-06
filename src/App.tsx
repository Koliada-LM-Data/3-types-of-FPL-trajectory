import React, { useState, useRef } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plane, 
  Activity, 
  Layers, 
  ChevronRight,
  Navigation,
  Wind,
  ShieldAlert
} from 'lucide-react';
import { cn } from './lib/utils';
import { Point, Sector, Flight, ProhibitedZone } from './types';

// --- Mock Data ---
const SECTORS: Sector[] = [
  { id: 'SEC-A', label: 'ACC NORTH', points: [{x: 0, y: 0}, {x: 400, y: 0}, {x: 350, y: 300}, {x: 0, y: 250}] },
  { id: 'SEC-B', label: 'ACC EAST', points: [{x: 400, y: 0}, {x: 800, y: 0}, {x: 800, y: 400}, {x: 350, y: 300}] },
  { id: 'SEC-C', label: 'ACC SOUTH', points: [{x: 0, y: 250}, {x: 350, y: 300}, {x: 400, y: 600}, {x: 0, y: 600}] },
  { id: 'SEC-D', label: 'ACC CENTRAL', points: [{x: 350, y: 300}, {x: 800, y: 400}, {x: 800, y: 600}, {x: 400, y: 600}] },
];

const TRAINING_ZONE: ProhibitedZone = {
  id: 'TZ-42',
  label: 'TRAINING ZONE DELTA (ACTIVE)',
  active: true,
  points: [
    {x: 450, y: 150},
    {x: 650, y: 150},
    {x: 600, y: 350},
    {x: 400, y: 300}
  ]
};

const FLIGHT_DATA: Flight = {
  id: 'FL-1024',
  callsign: 'BAW452',
  type: 'A320',
  level: 360,
  speed: 450,
  trajectories: {
    original: [
      {x: 50, y: 50},
      {x: 250, y: 150},
      {x: 550, y: 250}, // Crosses TZ-42
      {x: 750, y: 550}
    ],
    preActivation: [
      {x: 50, y: 50},
      {x: 250, y: 150},
      {x: 400, y: 100}, // Diverts north of TZ-42
      {x: 680, y: 120}, // Additional point to maintain clearance north of the zone
      {x: 700, y: 300},
      {x: 750, y: 550}
    ],
    actual: [
      {x: 50, y: 50},
      {x: 400, y: 310}, // Direct-To (DCT) point passing just south of TZ-42
      {x: 750, y: 550}
    ]
  }
};

// --- Components ---

const TrajectoryLine = ({ points, color, visible, dashed = false }: { 
  points: Point[], 
  color: string, 
  visible: boolean,
  dashed?: boolean 
}) => {
  const lineGenerator = d3.line<Point>()
    .x(d => d.x)
    .y(d => d.y)
    .curve(d3.curveMonotoneX);

  const pathData = lineGenerator(points);

  return (
    <AnimatePresence>
      {visible && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        >
          <path
            d={pathData || ''}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeDasharray={dashed ? "5,5" : "none"}
            className="drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]"
          />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
          ))}
        </motion.g>
      )}
    </AnimatePresence>
  );
};

export default function App() {
  const [showOriginal, setShowOriginal] = useState(true);
  const [showPreActivation, setShowPreActivation] = useState(true);
  const [showActual, setShowActual] = useState(true);
  const [activeFlight] = useState<Flight>(FLIGHT_DATA);

  const radarRef = useRef<SVGSVGElement>(null);

  return (
    <div className="flex h-screen w-screen bg-[#0a0a0c] overflow-hidden font-mono">
      {/* Sidebar Controls */}
      <aside className="w-80 border-r border-white/10 bg-[#111114] flex flex-col z-20 shadow-2xl">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white">SKYCONTROL</h1>
          </div>
          <p className="text-xs text-white/40 uppercase tracking-widest">ATM Interface v4.2</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Flight Info */}
          <section>
            <div className="flex items-center gap-2 mb-4 text-white/60">
              <Plane className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Active Flight</span>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-emerald-400 leading-none">{activeFlight.callsign}</h2>
                  <p className="text-[10px] text-white/40 mt-1">{activeFlight.type} • IFR • ENROUTE</p>
                </div>
                <div className="px-2 py-1 bg-emerald-500/20 rounded text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  ACT
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-white/40 uppercase">Altitude</p>
                  <p className="text-sm font-bold text-white">FL{activeFlight.level}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/40 uppercase">Ground Speed</p>
                  <p className="text-sm font-bold text-white">{activeFlight.speed} KT</p>
                </div>
              </div>
            </div>
          </section>

          {/* Trajectory Toggles */}
          <section>
            <div className="flex items-center gap-2 mb-4 text-white/60">
              <Layers className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Trajectory Layers</span>
            </div>
            <div className="space-y-3">
              <button 
                onClick={() => setShowOriginal(!showOriginal)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg border transition-all",
                  showOriginal ? "bg-amber-500/10 border-amber-500/30" : "bg-white/5 border-white/10 opacity-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  <span className="text-xs font-medium text-white">Original FPL</span>
                </div>
                <ChevronRight className={cn("w-4 h-4 text-white/40 transition-transform", showOriginal && "rotate-90")} />
              </button>

              <button 
                onClick={() => setShowPreActivation(!showPreActivation)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg border transition-all",
                  showPreActivation ? "bg-blue-500/10 border-blue-500/30" : "bg-white/5 border-white/10 opacity-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  <span className="text-xs font-medium text-white">Actual Flown</span>
                </div>
                <ChevronRight className={cn("w-4 h-4 text-white/40 transition-transform", showPreActivation && "rotate-90")} />
              </button>

              <button 
                onClick={() => setShowActual(!showActual)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg border transition-all",
                  showActual ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white/5 border-white/10 opacity-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-xs font-medium text-white">Pre-Activation</span>
                </div>
                <ChevronRight className={cn("w-4 h-4 text-white/40 transition-transform", showActual && "rotate-90")} />
              </button>
            </div>
          </section>

          {/* Legend/Alerts */}
          <section className="mt-auto">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span className="text-xs font-bold text-red-400 uppercase">Conflict Alert</span>
              </div>
              <p className="text-[10px] text-red-400/80 leading-relaxed">
                Original FPL trajectory intersects with active Training Zone TZ-42. Pre-activation reroute confirmed.
              </p>
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-white/10 bg-black/20">
          <div className="flex items-center justify-between text-[10px] text-white/40">
            <span>LAT: 51.4700° N</span>
            <span>LON: 0.4543° W</span>
          </div>
        </div>
      </aside>

      {/* Main Radar Display */}
      <main className="flex-1 relative bg-[#0a0a0c] radar-grid overflow-hidden">
        {/* Scan Line Overlay */}
        <div className="absolute inset-0 scan-line pointer-events-none z-10" />

        {/* Radar UI Overlays */}
        <div className="absolute top-6 right-6 flex flex-col gap-3 z-20">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg p-3 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-white/60" />
              <span className="text-[10px] text-white/80">HDG: 285°</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-white/60" />
              <span className="text-[10px] text-white/80">WIND: 12KT / 090°</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-6 z-20">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg p-3 flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-white/60 uppercase tracking-tighter">Radar Online</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/60 uppercase tracking-tighter">Zoom: 1.5x</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/60 uppercase tracking-tighter">UTC: {new Date().toISOString().split('T')[1].split('.')[0]}</span>
            </div>
          </div>
        </div>

        {/* SVG Radar Map */}
        <svg 
          ref={radarRef}
          viewBox="0 0 800 600" 
          className="w-full h-full cursor-crosshair"
        >
          {/* Sectors */}
          <g className="sectors">
            {SECTORS.map(sector => (
              <g key={sector.id}>
                <polygon
                  points={sector.points.map(p => `${p.x},${p.y}`).join(' ')}
                  className="fill-white/[0.02] stroke-white/10 stroke-1"
                />
                <text
                  x={d3.polygonCentroid(sector.points.map(p => [p.x, p.y] as [number, number]))[0]}
                  y={d3.polygonCentroid(sector.points.map(p => [p.x, p.y] as [number, number]))[1]}
                  className="fill-white/20 text-[10px] font-bold pointer-events-none select-none"
                  textAnchor="middle"
                >
                  {sector.label}
                </text>
              </g>
            ))}
          </g>

          {/* Prohibited Zone */}
          <g className="prohibited-zones">
            <polygon
              points={TRAINING_ZONE.points.map(p => `${p.x},${p.y}`).join(' ')}
              className="fill-red-500/10 stroke-red-500/40 stroke-2"
              strokeDasharray="4,4"
            />
            <text
              x={d3.polygonCentroid(TRAINING_ZONE.points.map(p => [p.x, p.y] as [number, number]))[0]}
              y={d3.polygonCentroid(TRAINING_ZONE.points.map(p => [p.x, p.y] as [number, number]))[1]}
              className="fill-red-400 text-[8px] font-bold pointer-events-none select-none"
              textAnchor="middle"
            >
              {TRAINING_ZONE.label}
            </text>
          </g>

          {/* Trajectories */}
          <TrajectoryLine 
            points={activeFlight.trajectories.original} 
            color="#f59e0b" 
            visible={showOriginal} 
            dashed
          />
          <TrajectoryLine 
            points={activeFlight.trajectories.preActivation} 
            color="#3b82f6" 
            visible={showPreActivation} 
          />
          <TrajectoryLine 
            points={activeFlight.trajectories.actual} 
            color="#10b981" 
            visible={showActual} 
          />

          {/* Aircraft Icon (Current Position - end of actual trajectory) */}
          {showActual && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="aircraft"
            >
              <g transform={`translate(${activeFlight.trajectories.actual[activeFlight.trajectories.actual.length - 1].x}, ${activeFlight.trajectories.actual[activeFlight.trajectories.actual.length - 1].y})`}>
                <circle r="12" className="fill-emerald-500/20 stroke-emerald-500 stroke-1" />
                <Plane className="w-4 h-4 text-emerald-400 -translate-x-2 -translate-y-2 rotate-[135deg]" />
                
                {/* Flight Data Block (FDB) */}
                <g transform="translate(20, -20)">
                  <rect x="0" y="0" width="80" height="40" className="fill-black/80 stroke-emerald-500/50 stroke-1" rx="4" />
                  <text x="8" y="15" className="fill-emerald-400 text-[10px] font-bold">{activeFlight.callsign}</text>
                  <text x="8" y="30" className="fill-white/60 text-[8px]">{activeFlight.level}C {activeFlight.speed}</text>
                  <line x1="-20" y1="20" x2="0" y2="0" className="stroke-emerald-500/50 stroke-1" />
                </g>
              </g>
            </motion.g>
          )}
        </svg>
      </main>
    </div>
  );
}

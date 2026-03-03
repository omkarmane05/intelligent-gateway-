import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Zap, Activity, Cpu, ArrowRight, User, Database, Terminal } from 'lucide-react';

interface Stage {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const STAGES: Stage[] = [
  { id: 'ingress', name: 'Ingress', icon: <ArrowRight className="w-4 h-4" />, description: 'Packet arrives at TCP Port', color: 'text-blue-400' },
  { id: 'security', name: 'Security', icon: <Shield className="w-4 h-4" />, description: 'Anomaly detection & Blacklist check', color: 'text-purple-400' },
  { id: 'qos', name: 'QoS Engine', icon: <Zap className="w-4 h-4" />, description: 'Traffic prioritization & Shaping', color: 'text-yellow-400' },
  { id: 'metrics', name: 'Metrics', icon: <Activity className="w-4 h-4" />, description: 'Latency & Throughput recording', color: 'text-emerald-400' },
  { id: 'egress', name: 'Egress', icon: <Database className="w-4 h-4" />, description: 'Forwarded to internal handler', color: 'text-blue-400' },
];

export function PacketVisualizer() {
  const [activePacket, setActivePacket] = useState<number | null>(null);
  const [currentStage, setCurrentStage] = useState(-1);
  const [latency, setLatency] = useState<number | null>(null);

  const startAnimation = () => {
    if (activePacket !== null) return;
    
    const startTime = performance.now();
    setActivePacket(Date.now());
    setCurrentStage(0);
    setLatency(null);

    const interval = setInterval(() => {
      setCurrentStage(prev => {
        if (prev >= STAGES.length - 1) {
          clearInterval(interval);
          setLatency(performance.now() - startTime);
          setTimeout(() => {
            setActivePacket(null);
            setCurrentStage(-1);
          }, 1000);
          return prev;
        }
        return prev + 1;
      });
    }, 800);
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-500" />
            PACKET LIFECYCLE VISUALIZATION
          </h2>
          <p className="text-zinc-500 text-sm mt-1 font-mono">Tracing a single TCP packet through the intelligent layers</p>
        </div>
        <button 
          onClick={startAnimation}
          disabled={activePacket !== null}
          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 px-4 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-2"
        >
          <PlayIcon className="w-4 h-4" />
          SEND TEST PACKET
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-10">
        <div className="lg:col-span-3 relative flex justify-between items-start pt-10">
          {/* Connection Lines */}
          <div className="absolute top-16 left-0 w-full h-0.5 bg-zinc-800 -z-0" />
          
          <div className="relative z-10 flex flex-col items-center w-16">
            <div className="w-12 h-12 rounded-full bg-zinc-950 border-2 border-zinc-800 flex items-center justify-center text-zinc-600">
              <User className="w-5 h-5" />
            </div>
            <div className="mt-4 text-[9px] font-bold uppercase tracking-widest text-zinc-500">Client</div>
          </div>

          {STAGES.map((stage, index) => (
            <div key={stage.id} className="relative z-10 flex flex-col items-center w-24">
              <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all duration-500 ${
                currentStage === index 
                  ? `bg-zinc-800 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-110` 
                  : currentStage > index 
                    ? 'bg-zinc-900 border-zinc-700 opacity-50' 
                    : 'bg-zinc-950 border-zinc-800'
              }`}>
                <div className={currentStage === index ? 'text-emerald-500' : 'text-zinc-600'}>
                  {stage.icon}
                </div>
              </div>
              
              <div className="mt-4 text-center">
                <div className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${currentStage === index ? 'text-emerald-500' : 'text-zinc-500'}`}>
                  {stage.name}
                </div>
              </div>

              {/* Packet Animation */}
              <AnimatePresence>
                {currentStage === index && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute -top-2 w-4 h-4 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"
                  />
                )}
              </AnimatePresence>
            </div>
          ))}

          <div className="relative z-10 flex flex-col items-center w-16">
            <div className="w-12 h-12 rounded-full bg-zinc-950 border-2 border-zinc-800 flex items-center justify-center text-zinc-600">
              <Database className="w-5 h-5" />
            </div>
            <div className="mt-4 text-[9px] font-bold uppercase tracking-widest text-zinc-500">Target</div>
          </div>
        </div>

        <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4 flex flex-col gap-3">
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Terminal className="w-3 h-3" />
            Processing Logic
          </h3>
          <div className="space-y-3">
            <LogicStep 
              num="01" 
              title="Ingress Timestamp" 
              desc="The moment a packet hits the TCP stack, a high-resolution timestamp (T_ingress) is recorded." 
            />
            <LogicStep 
              num="02" 
              title="Layer Traversal" 
              desc="Packet passes through Security (filtering), QoS (queuing), and Optimization (compression) layers." 
            />
            <LogicStep 
              num="03" 
              title="Egress Calculation" 
              desc="After processing, a second timestamp (T_egress) is taken. The difference is the true system latency." 
            />
          </div>
        </div>
      </div>

      {latency && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 pt-6 border-t border-zinc-800 flex justify-center"
        >
          <div className="bg-emerald-500/5 border border-emerald-500/20 px-6 py-3 rounded-xl flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Calculated Latency</span>
              <span className="text-2xl font-mono font-bold text-emerald-500">{latency.toFixed(2)}ms</span>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Latency Calculation</span>
              <span className="text-[10px] text-zinc-400 font-mono">T_egress - T_ingress</span>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Status</span>
              <span className="text-xs font-bold text-white flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-500" />
                PROCESSED SUCCESSFULLY
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function LogicStep({ num, title, desc }: { num: string, title: string, desc: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-[10px] font-mono text-emerald-500/50 mt-0.5">{num}</span>
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-zinc-300">{title}</span>
        <span className="text-[9px] text-zinc-500 leading-relaxed">{desc}</span>
      </div>
    </div>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
    </svg>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

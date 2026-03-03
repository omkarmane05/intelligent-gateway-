import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Shield, 
  Cpu, 
  Users, 
  Zap, 
  AlertTriangle,
  Server,
  Terminal,
  RefreshCw,
  CheckCircle2,
  Play
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { PacketVisualizer } from './components/PacketVisualizer.js';

interface Client {
  id: string;
  packetsPerSecond: number;
  avgLatency: number;
  avgMessageSize: number;
  queueSize: number;
  status: string;
}

interface Status {
  global: {
    totalConnections: number;
    activeConnections: number;
    totalPackets: number;
    avgSystemLatency: number;
  };
  clients: Client[];
  tcpPort?: number;
}

export default function App() {
  const [status, setStatus] = useState<Status | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initial fetch to get the current state
    fetch(`${window.location.origin}/api/status`)
      .then(res => res.json())
      .then(data => {
        setStatus(data);
        setLoading(false);
      })
      .catch(err => console.error("Initial fetch failed", err));

    // Socket.io connection for real-time updates
    const socket = io(window.location.origin);
    socketRef.current = socket;

    socket.on('metrics', (data: Status) => {
      setStatus(data);
      setHistory(prev => {
        const newEntry = {
          time: new Date().toLocaleTimeString(),
          latency: data.global.avgSystemLatency,
          connections: data.global.activeConnections,
          packets: data.clients.reduce((sum: number, c: Client) => sum + c.packetsPerSecond, 0)
        };
        return [...prev.slice(-20), newEntry];
      });
      
      // Add a log entry for activity
      if (data.global.activeConnections > 0) {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] Traffic detected: ${data.global.totalPackets} total packets`, ...prev.slice(0, 50)]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const triggerSimulation = async () => {
    setIsSimulating(true);
    try {
      await fetch('/api/simulate/load', { method: 'POST' });
      setLogs(prev => [`[${new Date().toLocaleTimeString()}] Simulation triggered`, ...prev]);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsSimulating(false), 5000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
          <p className="text-emerald-500 animate-pulse">INITIALIZING REAL-TIME GATEWAY...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter flex items-center gap-3">
            <Server className="w-10 h-10 text-emerald-500" />
            INTELLIGENT GATEWAY <span className="text-emerald-500 font-mono text-sm border border-emerald-500/30 px-2 py-0.5 rounded ml-2 uppercase">Real-Time</span>
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-zinc-500 font-mono text-sm">Self-Optimizing Multi-Client TCP Infrastructure</p>
            {status?.tcpPort && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono text-emerald-500 font-bold uppercase tracking-wider">
                  TCP LISTENING: PORT {status.tcpPort}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={triggerSimulation}
            disabled={isSimulating}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black px-6 py-2 rounded-full font-bold transition-all disabled:opacity-50 active:scale-95"
          >
            {isSimulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            TRIGGER STRESS TEST
          </button>
        </div>
      </header>

      {/* Global Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <StatCard 
          icon={<Users className="text-blue-500" />} 
          label="ACTIVE NODES" 
          value={status?.global.activeConnections || 0} 
          sub="Concurrent TCP Streams"
        />
        <StatCard 
          icon={<Activity className="text-emerald-500" />} 
          label="AVG LATENCY" 
          value={`${(status?.global.avgSystemLatency || 0).toFixed(2)}ms`} 
          sub="System-wide RTT"
        />
        <StatCard 
          icon={<Zap className="text-yellow-500" />} 
          label="THROUGHPUT" 
          value={status?.clients.reduce((sum, c) => sum + c.packetsPerSecond, 0) || 0} 
          sub="Packets Per Second"
        />
        <StatCard 
          icon={<Shield className="text-red-500" />} 
          label="THREAT LEVEL" 
          value={status?.clients.some(c => c.status !== 'NORMAL') ? 'ELEVATED' : 'STABLE'} 
          sub="Anomaly Detection Engine"
        />
      </div>

      {/* Packet Flow Visualization */}
      <div className="mb-12">
        <PacketVisualizer />
      </div>

      <div className="grid grid-cols-12 gap-8 mb-12">
        {/* Charts Section */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          <div className="card">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              SYSTEM LATENCY (REAL-TIME)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="time" hide />
                  <YAxis stroke="#525252" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#141414', border: '1px solid #262626' }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <Area type="monotone" dataKey="latency" stroke="#10b981" fillOpacity={1} fill="url(#colorLatency)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Real-time Terminal */}
        <div className="col-span-12 lg:col-span-4">
          <div className="card h-full flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-500" />
                LIVE DATA FEED
              </h3>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                <div className="w-2 h-2 rounded-full bg-green-500/50" />
              </div>
            </div>
            <div className="flex-1 font-mono text-[10px] overflow-y-auto space-y-1 custom-scrollbar max-h-[250px]">
              {logs.length === 0 ? (
                <p className="text-zinc-700 italic">Waiting for traffic...</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-emerald-500/50 shrink-0">➜</span>
                    <span className={i === 0 ? "text-emerald-400" : "text-zinc-400"}>{log}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Client Registry */}
      <div className="card">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            CONNECTION REGISTRY
          </h3>
          <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            {status?.clients.length || 0} Nodes Connected
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-xs font-mono uppercase">
                <th className="pb-4 font-medium">Node ID</th>
                <th className="pb-4 font-medium text-center">Status</th>
                <th className="pb-4 font-medium text-right">PPS</th>
                <th className="pb-4 font-medium text-right">Latency</th>
                <th className="pb-4 font-medium text-right">Payload</th>
                <th className="pb-4 font-medium text-right">QoS Mode</th>
              </tr>
            </thead>
            <tbody className="text-sm font-mono">
              <AnimatePresence>
                {status?.clients.map((client) => (
                  <motion.tr 
                    key={client.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="border-b border-zinc-900/50 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 text-zinc-400 truncate max-w-[120px]">{client.id}</td>
                    <td className="py-4 text-center">
                      <span className={`status-badge ${
                        client.status === 'NORMAL' || client.status === 'CONNECTED' ? 'status-normal' : 
                        client.status === 'SUSPICIOUS' ? 'status-suspicious' : 'status-jailed'
                      }`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="py-4 text-right text-yellow-500">{client.packetsPerSecond}</td>
                    <td className="py-4 text-right text-emerald-500">{client.avgLatency.toFixed(1)}ms</td>
                    <td className="py-4 text-right text-zinc-500">{client.avgMessageSize}B</td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-1">
                        {client.avgLatency > 100 ? (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        )}
                        <span className="text-[10px] text-zinc-600">
                          {client.avgLatency > 100 ? 'THROTTLED' : 'OPTIMAL'}
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {(!status || status.clients.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-600 italic">
                    Waiting for incoming TCP connections...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer / Info */}
      <footer className="mt-12 pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            QoS MANAGER: ACTIVE
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            ANOMALY DETECTION: K-MEANS
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            TRAFFIC CONTROL: DYNAMIC
          </div>
        </div>
        <div className="text-xs text-zinc-700 font-mono">
          REAL-TIME GATEWAY INFRASTRUCTURE
        </div>
      </footer>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode, label: string, value: string | number, sub: string }) {
  return (
    <div className="card group hover:border-emerald-500/30 transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
          {icon}
        </div>
        <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">{label}</span>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-[10px] text-zinc-600 font-mono uppercase">{sub}</div>
    </div>
  );
}

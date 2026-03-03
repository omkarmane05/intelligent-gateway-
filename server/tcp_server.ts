import net from 'node:net';
import { MetricsCollector } from './metrics_collector.js';
import { QoSManager } from './qos_manager.js';
import { AnomalyDetector } from './anomaly_detector.js';
import { TrafficController } from './traffic_controller.js';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';

export class IntelligentChatServer extends EventEmitter {
  private server: net.Server;
  private clients: Map<string, net.Socket> = new Map();
  private metrics = new MetricsCollector();
  private qos = new QoSManager();
  private anomaly = new AnomalyDetector();
  private traffic: TrafficController;

  constructor(port: number) {
    super();
    this.traffic = new TrafficController(this.metrics, this.qos, this.anomaly);
    
    this.server = net.createServer((socket) => {
      this.handleConnection(socket);
    });

    this.server.listen(port, '0.0.0.0', () => {
      console.log(`[TCP] Intelligent Chat Server listening on port ${port}`);
    });

    // Background optimization loop
    setInterval(() => this.optimize(), 5000);
  }

  private handleConnection(socket: net.Socket) {
    const id = crypto.randomUUID();
    this.clients.set(id, socket);
    this.metrics.updateClient(id, { id, status: 'CONNECTED' });

    console.log(`[TCP] Client connected: ${id}`);

    socket.on('data', (data) => {
      const startTime = Date.now();
      const processed = this.traffic.handleIncoming(id, data);
      
      if (processed) {
        this.broadcast(id, processed);
        const latency = Date.now() - startTime;
        
        // Update metrics
        const m = this.metrics.getClientMetrics(id);
        this.metrics.updateClient(id, {
          packetsPerSecond: (m?.packetsPerSecond || 0) + 1,
          avgLatency: ((m?.avgLatency || 0) + latency) / 2,
          avgMessageSize: data.length
        });
      }
    });

    socket.on('end', () => this.disconnect(id));
    socket.on('error', () => this.disconnect(id));
  }

  private broadcast(senderId: string, data: Buffer) {
    for (const [id, socket] of this.clients) {
      if (id !== senderId) {
        socket.write(data);
      }
    }
  }

  private disconnect(id: string) {
    this.clients.delete(id);
    this.metrics.removeClient(id);
    console.log(`[TCP] Client disconnected: ${id}`);
  }

  private optimize() {
    const clientData = new Map();
    for (const m of this.metrics.getAllMetrics()) {
      clientData.set(m.id, {
        packetsPerSecond: m.packetsPerSecond,
        connectionDuration: (Date.now() - m.lastSeen) / 1000,
        messageFrequency: m.packetsPerSecond / 5, // 5 sec interval
        avgPayloadSize: m.avgMessageSize
      });
      
      // Reset PPS for next interval
      this.metrics.updateClient(m.id, { packetsPerSecond: 0 });
    }

    this.traffic.updateSecurity(clientData);
    this.emit('statusUpdate', this.getStatus());
  }

  public getStatus() {
    return {
      global: this.metrics.getGlobalStats(),
      clients: this.metrics.getAllMetrics()
    };
  }

  public getPort(): number {
    const addr = this.server.address();
    return typeof addr === 'object' && addr ? addr.port : 0;
  }
}

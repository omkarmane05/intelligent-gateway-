import net from 'node:net';
import { MetricsCollector } from './metrics_collector.js';
import { QoSManager, CongestionLevel } from './qos_manager.js';
import { AnomalyDetector, ClientStatus } from './anomaly_detector.js';
import zlib from 'node:zlib';

export class TrafficController {
  private blacklist: Set<string> = new Set();
  private rateLimits: Map<string, number> = new Map(); // tokens per client

  constructor(
    private metrics: MetricsCollector,
    private qos: QoSManager,
    private anomaly: AnomalyDetector
  ) {}

  public handleIncoming(clientId: string, data: Buffer): Buffer | null {
    if (this.blacklist.has(clientId)) return null;

    const clientMetrics = this.metrics.getClientMetrics(clientId);
    if (!clientMetrics) return data;

    // Dynamic Rate Limiting (Token Bucket simplified)
    const level = this.qos.predict(
      clientMetrics.avgLatency,
      clientMetrics.packetsPerSecond,
      clientMetrics.queueSize
    );

    const config = this.qos.getAction(level);

    // Apply Throttling
    if (Math.random() > config.throttleRate) {
      return null; // Drop packet
    }

    // Apply Compression if needed
    if (config.compression && data.length > 128) {
      return zlib.gzipSync(data);
    }

    return data;
  }

  public updateSecurity(clients: Map<string, any>) {
    const statusMap = this.anomaly.analyze(clients);
    for (const [id, status] of statusMap) {
      if (status === ClientStatus.SUSPICIOUS) {
        console.warn(`[SECURITY] Client ${id} flagged as SUSPICIOUS`);
        // Apply stricter rate limits
        this.rateLimits.set(id, 5); // 5 msgs/sec
      }
    }
  }

  public blacklistClient(id: string) {
    this.blacklist.add(id);
  }
}

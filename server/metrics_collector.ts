export interface ClientMetrics {
  id: string;
  packetsPerSecond: number;
  avgLatency: number;
  avgMessageSize: number;
  queueSize: number;
  lastSeen: number;
  totalMessages: number;
  status: string;
}

export class MetricsCollector {
  private metrics: Map<string, ClientMetrics> = new Map();
  private globalMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    totalPackets: 0,
    avgSystemLatency: 0
  };

  public updateClient(id: string, data: Partial<ClientMetrics>) {
    const current = this.metrics.get(id) || {
      id,
      packetsPerSecond: 0,
      avgLatency: 0,
      avgMessageSize: 0,
      queueSize: 0,
      lastSeen: Date.now(),
      totalMessages: 0,
      status: 'NORMAL'
    };

    this.metrics.set(id, { ...current, ...data, lastSeen: Date.now() });
  }

  public getClientMetrics(id: string) {
    return this.metrics.get(id);
  }

  public getAllMetrics() {
    return Array.from(this.metrics.values());
  }

  public getGlobalStats() {
    const all = this.getAllMetrics();
    return {
      ...this.globalMetrics,
      activeConnections: all.length,
      avgSystemLatency: all.reduce((sum, m) => sum + m.avgLatency, 0) / (all.length || 1)
    };
  }

  public removeClient(id: string) {
    this.metrics.delete(id);
  }
}

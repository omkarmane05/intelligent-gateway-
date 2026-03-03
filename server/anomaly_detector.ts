import { kmeans } from 'ml-kmeans';

export interface ClientFeatures {
  packetsPerSecond: number;
  connectionDuration: number;
  messageFrequency: number;
  avgPayloadSize: number;
}

export enum ClientStatus {
  NORMAL = 'NORMAL',
  SUSPICIOUS = 'SUSPICIOUS',
  JAILED = 'JAILED'
}

export class AnomalyDetector {
  private history: number[][] = [];
  private readonly MAX_HISTORY = 1000;

  public analyze(clients: Map<string, ClientFeatures>): Map<string, ClientStatus> {
    const clientIds = Array.from(clients.keys());
    const data = clientIds.map(id => {
      const f = clients.get(id)!;
      return [f.packetsPerSecond, f.connectionDuration, f.messageFrequency, f.avgPayloadSize];
    });

    if (data.length < 5) {
      // Not enough data for clustering, use simple thresholds
      const results = new Map<string, ClientStatus>();
      for (const [id, f] of clients) {
        if (f.packetsPerSecond > 50 || f.messageFrequency > 20) {
          results.set(id, ClientStatus.SUSPICIOUS);
        } else {
          results.set(id, ClientStatus.NORMAL);
        }
      }
      return results;
    }

    // Perform K-Means clustering (k=2: Normal vs Anomalous)
    const result = kmeans(data, 2, {});
    const clusters = result.clusters;
    
    // Identify which cluster is "suspicious" (usually the one with higher pps/frequency)
    const clusterStats = [0, 1].map(c => {
      const indices = clusters.map((val, i) => val === c ? i : -1).filter(i => i !== -1);
      const avgPps = indices.reduce((sum, i) => sum + data[i][0], 0) / (indices.length || 1);
      return { cluster: c, avgPps };
    });

    const suspiciousCluster = clusterStats[0].avgPps > clusterStats[1].avgPps ? 0 : 1;

    const finalStatus = new Map<string, ClientStatus>();
    clientIds.forEach((id, idx) => {
      finalStatus.set(id, clusters[idx] === suspiciousCluster ? ClientStatus.SUSPICIOUS : ClientStatus.NORMAL);
    });

    return finalStatus;
  }
}

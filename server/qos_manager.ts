import { Matrix } from 'ml-matrix';

export enum CongestionLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

/**
 * A simple Feedforward Neural Network for Congestion Prediction.
 * Features: [latency, packet_rate, queue_size]
 * Output: Congestion Level
 */
export class QoSManager {
  private weights1: Matrix;
  private weights2: Matrix;
  private bias1: Matrix;
  private bias2: Matrix;

  constructor() {
    // Initialize with random weights for the prototype
    this.weights1 = Matrix.rand(3, 8);
    this.weights2 = Matrix.rand(8, 3);
    this.bias1 = Matrix.zeros(1, 8);
    this.bias2 = Matrix.zeros(1, 3);
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private softmax(arr: number[]): number[] {
    const max = Math.max(...arr);
    const exps = arr.map(v => Math.exp(v - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(v => v / sum);
  }

  public predict(latency: number, packetRate: number, queueSize: number): CongestionLevel {
    // Normalize inputs (rough estimates for normalization)
    const input = new Matrix([[
      latency / 500,
      packetRate / 100,
      queueSize / 50
    ]]);

    // Forward pass
    const hidden = input.mmul(this.weights1).add(this.bias1);
    const hiddenActivated = new Matrix(hidden.to2DArray().map(row => row.map(this.sigmoid)));
    
    const output = hiddenActivated.mmul(this.weights2).add(this.bias2);
    const probabilities = this.softmax(output.to2DArray()[0]);

    const maxIdx = probabilities.indexOf(Math.max(...probabilities));
    
    if (maxIdx === 0) return CongestionLevel.LOW;
    if (maxIdx === 1) return CongestionLevel.MEDIUM;
    return CongestionLevel.HIGH;
  }

  /**
   * Simple "Self-Healing" logic to adjust thresholds
   */
  public getAction(level: CongestionLevel) {
    switch (level) {
      case CongestionLevel.HIGH:
        return {
          bufferSize: 1024,
          compression: true,
          throttleRate: 0.5
        };
      case CongestionLevel.MEDIUM:
        return {
          bufferSize: 4096,
          compression: false,
          throttleRate: 0.8
        };
      default:
        return {
          bufferSize: 8192,
          compression: false,
          throttleRate: 1.0
        };
    }
  }
}

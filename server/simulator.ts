import net from 'net';

export class ClientSimulator {
  private clients: net.Socket[] = [];

  async spawnClient(id: string, behavior: 'normal' | 'aggressive' | 'ddos') {
    return new Promise((resolve) => {
      const client = net.createConnection({ port: 3001, host: '127.0.0.1' }, () => {
        console.log(`[SIM] Client ${id} connected (${behavior})`);
        
        let interval = 2000;
        if (behavior === 'aggressive') interval = 200;
        if (behavior === 'ddos') interval = 10;

        const timer = setInterval(() => {
          if (client.destroyed) {
            clearInterval(timer);
            return;
          }
          const msg = `Message from ${id}: ${Math.random().toString(36).substring(7)}`;
          client.write(msg);
        }, interval);

        this.clients.push(client);
        resolve(true);
      });

      client.on('error', () => {});
    });
  }

  stopAll() {
    this.clients.forEach(c => c.destroy());
    this.clients = [];
  }
}

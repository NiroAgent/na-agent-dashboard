import * as os from 'os';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SystemMetrics {
  cpu: number;
  cpuCores: number;
  cpuHistory: number[];
  memory: number;
  memoryUsed: number;
  memoryTotal: number;
  memoryHistory: number[];
  disk: {
    usage: number;
    used: number;
    free: number;
    total: number;
  };
  platform: string;
  arch: string;
  uptime: number;
  loadAvg: number[];
  processes: number;
}

export class SystemMonitor {
  private cpuHistory: number[] = [];
  private memoryHistory: number[] = [];
  private maxHistoryLength = 60; // Keep last 60 data points
  private lastCpuInfo: any = null;

  constructor() {
    // Start monitoring
    this.startMonitoring();
  }

  private startMonitoring() {
    setInterval(() => {
      this.collectMetrics();
    }, 1000);
  }

  private async collectMetrics() {
    // Collect CPU usage
    const cpuUsage = await this.getCpuUsage();
    this.cpuHistory.push(cpuUsage);
    if (this.cpuHistory.length > this.maxHistoryLength) {
      this.cpuHistory.shift();
    }

    // Collect memory usage
    const memoryUsage = this.getMemoryUsage();
    this.memoryHistory.push(memoryUsage.percentage);
    if (this.memoryHistory.length > this.maxHistoryLength) {
      this.memoryHistory.shift();
    }
  }

  private async getCpuUsage(): Promise<number> {
    const cpus = os.cpus();
    
    if (!this.lastCpuInfo) {
      this.lastCpuInfo = cpus;
      return 0;
    }

    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu, index) => {
      const lastCpu = this.lastCpuInfo[index];
      
      // Calculate differences
      const idle = cpu.times.idle - lastCpu.times.idle;
      const user = cpu.times.user - lastCpu.times.user;
      const nice = cpu.times.nice - lastCpu.times.nice;
      const sys = cpu.times.sys - lastCpu.times.sys;
      const irq = cpu.times.irq - lastCpu.times.irq;
      
      const total = user + nice + sys + idle + irq;
      
      totalIdle += idle;
      totalTick += total;
    });

    this.lastCpuInfo = cpus;

    const usage = 100 - ~~(100 * totalIdle / totalTick);
    return Math.max(0, Math.min(100, usage));
  }

  private getMemoryUsage() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const percentage = (usedMem / totalMem) * 100;

    return {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      percentage: Math.round(percentage)
    };
  }

  private async getDiskUsage(): Promise<any> {
    try {
      if (process.platform === 'win32') {
        // Windows: Try to use basic fs.statSync first, fallback to wmic
        try {
          const stats = fs.statSync('C:\\');
          // Basic fallback data for Windows
          return {
            total: 1024 * 1024 * 1024 * 100, // 100GB mock
            free: 1024 * 1024 * 1024 * 50,   // 50GB mock
            used: 1024 * 1024 * 1024 * 50,   // 50GB mock
            usage: 50
          };
        } catch (fsError) {
          // If fs fails, try wmic with timeout
          const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption', { timeout: 3000 });
          const lines = stdout.trim().split('\n').slice(1); // Skip header
          
          let totalSize = 0;
          let totalFree = 0;
          
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3 && parts[0] === 'C:') {
              const free = parseInt(parts[1]) || 0;
              const size = parseInt(parts[2]) || 0;
              totalSize += size;
              totalFree += free;
            }
          }
          
          const used = totalSize - totalFree;
          const usage = totalSize > 0 ? (used / totalSize) * 100 : 0;
          
          return {
            total: totalSize,
            free: totalFree,
            used: used,
            usage: Math.round(usage)
          };
        }
      } else {
        // Unix/Linux: Use df command
        const { stdout } = await execAsync('df -k /');
        const lines = stdout.trim().split('\n');
        const data = lines[1].split(/\s+/);
        
        const total = parseInt(data[1]) * 1024;
        const used = parseInt(data[2]) * 1024;
        const free = parseInt(data[3]) * 1024;
        const usage = parseInt(data[4]);
        
        return {
          total,
          free,
          used,
          usage
        };
      }
    } catch (error) {
      console.error('Error getting disk usage:', error);
      return {
        total: 0,
        free: 0,
        used: 0,
        usage: 0
      };
    }
  }

  private async getProcessCount(): Promise<number> {
    try {
      if (process.platform === 'win32') {
        // Windows: Use fallback estimate to avoid WMIC issues
        console.log('Windows process count: Using fallback estimate (avoiding WMIC)');
        return 150; // Reasonable estimate for Windows to avoid buffer overflow
      } else {
        const { stdout } = await execAsync('ps aux | wc -l');
        return parseInt(stdout.trim()) - 1; // Subtract header line
      }
    } catch (error) {
      console.warn('Error getting process count, using fallback:', error instanceof Error ? error.message : String(error));
      return 100; // Basic fallback
    }
  }

  async getMetrics(): Promise<SystemMetrics> {
    const memUsage = this.getMemoryUsage();
    const diskUsage = await this.getDiskUsage();
    const processCount = await this.getProcessCount();
    const currentCpu = this.cpuHistory[this.cpuHistory.length - 1] || 0;

    return {
      cpu: currentCpu,
      cpuCores: os.cpus().length,
      cpuHistory: [...this.cpuHistory],
      memory: memUsage.percentage,
      memoryUsed: memUsage.used,
      memoryTotal: memUsage.total,
      memoryHistory: [...this.memoryHistory],
      disk: diskUsage,
      platform: os.platform(),
      arch: os.arch(),
      uptime: os.uptime(),
      loadAvg: os.loadavg(),
      processes: processCount
    };
  }

  getStatus() {
    const memUsage = this.getMemoryUsage();
    const currentCpu = this.cpuHistory[this.cpuHistory.length - 1] || 0;
    
    return {
      healthy: currentCpu < 90 && memUsage.percentage < 90,
      cpu: currentCpu,
      memory: memUsage.percentage
    };
  }

  async getDetailedMetrics() {
    const metrics = await this.getMetrics();
    
    // Add network interfaces
    const networkInterfaces = os.networkInterfaces();
    const interfaces = Object.entries(networkInterfaces).map(([name, addresses]) => ({
      name,
      addresses: addresses?.filter(addr => !addr.internal) || []
    }));

    // Add CPU model info
    const cpuInfo = os.cpus()[0];
    
    return {
      ...metrics,
      hostname: os.hostname(),
      release: os.release(),
      cpuModel: cpuInfo?.model,
      cpuSpeed: cpuInfo?.speed,
      networkInterfaces: interfaces,
      user: os.userInfo().username,
      homeDir: os.homedir(),
      tmpDir: os.tmpdir()
    };
  }
}
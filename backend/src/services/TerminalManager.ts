import { Server, Socket } from 'socket.io';
import { ChildProcess } from 'child_process';
import { AgentManager } from './AgentManager';

interface TerminalSession {
  agentId: string;
  buffer: string[];
  maxBufferSize: number;
  subscribers: Set<string>;
}

export class TerminalManager {
  private io: Server;
  private sessions: Map<string, TerminalSession> = new Map();
  private agentManager: AgentManager | null = null;

  constructor(io: Server) {
    this.io = io;
  }

  setAgentManager(agentManager: AgentManager) {
    this.agentManager = agentManager;
  }

  private getOrCreateSession(agentId: string): TerminalSession {
    if (!this.sessions.has(agentId)) {
      this.sessions.set(agentId, {
        agentId,
        buffer: [],
        maxBufferSize: 1000,
        subscribers: new Set()
      });
    }
    return this.sessions.get(agentId)!;
  }

  subscribe(socket: Socket, agentId: string) {
    const session = this.getOrCreateSession(agentId);
    session.subscribers.add(socket.id);

    // Send buffer history to new subscriber
    if (session.buffer.length > 0) {
      socket.emit('terminal:history', {
        agentId,
        data: session.buffer.join('')
      });
    }

    // Attach to process output if agent is running
    if (this.agentManager) {
      const process = this.agentManager.getProcess(agentId);
      if (process) {
        this.attachToProcess(agentId, process);
      }
    }

    console.log(`Socket ${socket.id} subscribed to terminal ${agentId}`);
  }

  unsubscribe(socket: Socket, agentId: string) {
    const session = this.sessions.get(agentId);
    if (session) {
      session.subscribers.delete(socket.id);
      console.log(`Socket ${socket.id} unsubscribed from terminal ${agentId}`);
      
      // Clean up session if no subscribers
      if (session.subscribers.size === 0) {
        // Keep buffer for a while in case someone reconnects
        setTimeout(() => {
          if (session.subscribers.size === 0) {
            this.sessions.delete(agentId);
          }
        }, 60000); // Clean up after 1 minute
      }
    }
  }

  unsubscribeAll(socket: Socket) {
    this.sessions.forEach((session) => {
      session.subscribers.delete(socket.id);
    });
  }

  attachToProcess(agentId: string, process: ChildProcess) {
    const session = this.getOrCreateSession(agentId);

    // Handle stdout
    if (process.stdout) {
      process.stdout.on('data', (data: Buffer) => {
        const text = data.toString();
        this.addToBuffer(session, text);
        this.broadcast(agentId, text);
      });
    }

    // Handle stderr
    if (process.stderr) {
      process.stderr.on('data', (data: Buffer) => {
        const text = `\x1b[31m${data.toString()}\x1b[0m`; // Red color for errors
        this.addToBuffer(session, text);
        this.broadcast(agentId, text);
      });
    }

    // Handle process exit
    process.on('exit', (code) => {
      const exitMessage = `\n\x1b[33m[Process exited with code ${code}]\x1b[0m\n`;
      this.addToBuffer(session, exitMessage);
      this.broadcast(agentId, exitMessage);
    });

    // Send initial message
    const startMessage = `\x1b[32m[Agent ${agentId} started - PID: ${process.pid}]\x1b[0m\n`;
    this.addToBuffer(session, startMessage);
    this.broadcast(agentId, startMessage);
  }

  private addToBuffer(session: TerminalSession, data: string) {
    session.buffer.push(data);
    
    // Limit buffer size
    const totalLength = session.buffer.join('').length;
    if (totalLength > session.maxBufferSize * 100) {
      // Remove old data from beginning
      while (session.buffer.length > 0 && session.buffer.join('').length > session.maxBufferSize * 80) {
        session.buffer.shift();
      }
    }
  }

  private broadcast(agentId: string, data: string) {
    const session = this.sessions.get(agentId);
    if (!session) return;

    session.subscribers.forEach(socketId => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('terminal:data', {
          agentId,
          data,
          timestamp: new Date()
        });
      }
    });
  }

  sendInput(agentId: string, data: string) {
    if (!this.agentManager) return;
    
    const process = this.agentManager.getProcess(agentId);
    if (process && process.stdin) {
      process.stdin.write(data);
      
      // Echo input to terminal (if not already echoed by the process)
      const echoData = `\x1b[36m${data}\x1b[0m`; // Cyan color for input
      const session = this.getOrCreateSession(agentId);
      this.addToBuffer(session, echoData);
      this.broadcast(agentId, echoData);
    }
  }

  clearTerminal(agentId: string) {
    const session = this.sessions.get(agentId);
    if (session) {
      session.buffer = [];
      this.broadcast(agentId, '\x1b[2J\x1b[H'); // Clear screen ANSI escape code
    }
  }

  getSessionInfo(agentId: string) {
    const session = this.sessions.get(agentId);
    if (!session) return null;
    
    return {
      agentId: session.agentId,
      subscriberCount: session.subscribers.size,
      bufferSize: session.buffer.join('').length,
      hasProcess: this.agentManager ? !!this.agentManager.getProcess(agentId) : false
    };
  }

  getAllSessions() {
    return Array.from(this.sessions.keys()).map(agentId => this.getSessionInfo(agentId));
  }
}
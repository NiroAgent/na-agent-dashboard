import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

const SOCKET_URL = (import.meta as any).env?.VITE_SOCKET_URL || 'http://localhost:7778';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Auto-detect API endpoint for socket connection
    const hostname = window.location.hostname;
    let socketUrl = SOCKET_URL;
    
    if (hostname.includes('niro-agent-dashboard-dev') || hostname.includes('s3-website')) {
      // Production uses Lambda API without WebSocket support
      console.log('Production environment detected - WebSocket disabled (Lambda API)');
      return;
    }

    // Create socket connection
    const socketInstance = io(socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection events
    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
      toast.success('Connected to server', {
        duration: 2000,
        position: 'bottom-right',
        style: {
          background: '#1a1a1a',
          color: '#00ff88',
          border: '1px solid #00ff88'
        }
      });
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
      toast.error('Disconnected from server', {
        duration: 3000,
        position: 'bottom-right',
        style: {
          background: '#1a1a1a',
          color: '#ff4444',
          border: '1px solid #ff4444'
        }
      });
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      toast.error('Connection error', {
        duration: 3000,
        position: 'bottom-right',
        style: {
          background: '#1a1a1a',
          color: '#ff4444',
          border: '1px solid #ff4444'
        }
      });
    });

    // Agent events
    socketInstance.on('agent:started', (result) => {
      if (result.success) {
        toast.success(result.message, {
          duration: 3000,
          position: 'bottom-right',
          style: {
            background: '#1a1a1a',
            color: '#00ff88',
            border: '1px solid #00ff88'
          }
        });
      } else {
        toast.error(result.message, {
          duration: 4000,
          position: 'bottom-right',
          style: {
            background: '#1a1a1a',
            color: '#ff4444',
            border: '1px solid #ff4444'
          }
        });
      }
    });

    socketInstance.on('agent:stopped', (result) => {
      if (result.success) {
        toast.success(result.message, {
          duration: 3000,
          position: 'bottom-right',
          style: {
            background: '#1a1a1a',
            color: '#ffaa00',
            border: '1px solid #ffaa00'
          }
        });
      }
    });

    socketInstance.on('agent:error', (data) => {
      toast.error(`Agent Error: ${data.message}`, {
        duration: 5000,
        position: 'bottom-right',
        style: {
          background: '#1a1a1a',
          color: '#ff4444',
          border: '1px solid #ff4444'
        }
      });
    });

    setSocket(socketInstance);

    // Cleanup
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return socket;
};

export const useSocketEvent = (socket: Socket | null, event: string, handler: (...args: any[]) => void) => {
  useEffect(() => {
    if (!socket) return;

    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler]);
};
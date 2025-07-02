import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketConfig {
  url: string;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
}

interface WebSocketState {
  socket: Socket | null;
  isConnected: boolean;
  reconnectCount: number;
  lastHeartbeat: number | null;
}

export function useResilientWebSocket(config: WebSocketConfig) {
  const {
    url,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    heartbeatInterval = 30000
  } = config;

  const [state, setState] = useState<WebSocketState>({
    socket: null,
    isConnected: false,
    reconnectCount: 0,
    lastHeartbeat: null
  });

  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectCountRef = useRef(0);

  const startHeartbeat = (socket: Socket) => {
    const sendHeartbeat = () => {
      if (socket.connected) {
        socket.emit('heartbeat', { timestamp: Date.now() });
        setState(prev => ({ ...prev, lastHeartbeat: Date.now() }));
        
        heartbeatTimeoutRef.current = setTimeout(sendHeartbeat, heartbeatInterval);
      }
    };
    
    sendHeartbeat();
  };

  const stopHeartbeat = () => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }
  };

  const connectSocket = () => {
    if (state.socket?.connected) {
      return;
    }

    console.log(`Attempting WebSocket connection to ${url}...`);
    
    const newSocket = io(url, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true,
      autoConnect: true
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected successfully');
      reconnectCountRef.current = 0;
      setState(prev => ({
        ...prev,
        socket: newSocket,
        isConnected: true,
        reconnectCount: 0
      }));
      
      startHeartbeat(newSocket);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      stopHeartbeat();
      setState(prev => ({
        ...prev,
        isConnected: false,
        lastHeartbeat: null
      }));
      
      // Auto-reconnect unless it was a manual disconnect
      if (reason !== 'io client disconnect') {
        attemptReconnect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setState(prev => ({ ...prev, isConnected: false }));
      attemptReconnect();
    });

    newSocket.on('heartbeat_response', () => {
      setState(prev => ({ ...prev, lastHeartbeat: Date.now() }));
    });

    setState(prev => ({ ...prev, socket: newSocket }));
  };

  const attemptReconnect = () => {
    if (reconnectCountRef.current >= reconnectAttempts) {
      console.error(`Max reconnection attempts (${reconnectAttempts}) reached`);
      return;
    }

    reconnectCountRef.current++;
    const backoffDelay = reconnectInterval * Math.pow(1.5, reconnectCountRef.current - 1);
    
    console.log(`Reconnecting in ${backoffDelay}ms (attempt ${reconnectCountRef.current}/${reconnectAttempts})`);
    
    setState(prev => ({ ...prev, reconnectCount: reconnectCountRef.current }));

    reconnectTimeoutRef.current = setTimeout(() => {
      connectSocket();
    }, backoffDelay);
  };

  const manualReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectCountRef.current = 0;
    setState(prev => ({ ...prev, reconnectCount: 0 }));
    
    if (state.socket) {
      state.socket.disconnect();
    }
    
    setTimeout(connectSocket, 1000);
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    stopHeartbeat();
    
    if (state.socket) {
      state.socket.disconnect();
    }
    
    setState(prev => ({
      ...prev,
      socket: null,
      isConnected: false,
      reconnectCount: 0,
      lastHeartbeat: null
    }));
  };

  useEffect(() => {
    connectSocket();

    return () => {
      disconnect();
    };
  }, [url]);

  return {
    socket: state.socket,
    isConnected: state.isConnected,
    reconnectCount: state.reconnectCount,
    lastHeartbeat: state.lastHeartbeat,
    manualReconnect,
    disconnect
  };
}
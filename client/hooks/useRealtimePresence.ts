'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';

export interface UserPresence {
  id: string;
  socketId: string;
  name: string;
  color: string;
  avatar?: string;
  position: { x: number; y: number; z: number };
  rotation: number;
  selectedRackId: string | null;
  selectedBoxId: string | null;
  currentAction?: 'viewing' | 'editing' | 'moving' | 'scanning';
  lastSeen: Date;
}

export interface WarehouseAction {
  type: 'rack_add' | 'rack_remove' | 'rack_move' | 'box_add' | 'box_remove' | 'box_move';
  payload: Record<string, unknown>;
  userId: string;
  timestamp: Date;
}

interface UseRealtimePresenceProps {
  enabled: boolean;
  userName?: string;
  userAvatar?: string;
  selectedRackId: string | null;
  selectedBoxId?: string | null;
  warehouseId?: string;
}

interface UseRealtimePresenceReturn {
  isConnected: boolean;
  users: UserPresence[];
  currentUserId: string | null;
  onlineCount: number;
  updatePosition: (position: { x: number; y: number; z: number }, rotation?: number) => void;
  updateSelection: (rackId: string | null, boxId?: string | null) => void;
  updateAction: (action: UserPresence['currentAction']) => void;
  broadcastAction: (action: Omit<WarehouseAction, 'userId' | 'timestamp'>) => void;
  disconnect: () => void;
}

const PRESENCE_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f43f5e', // rose
];

const MOCK_USERS: Omit<UserPresence, 'socketId'>[] = [
  {
    id: 'mock-user-1',
    name: 'Quản lý A',
    color: '#3b82f6',
    position: { x: 2, y: 0, z: 3 },
    rotation: 0,
    selectedRackId: null,
    selectedBoxId: null,
    currentAction: 'viewing',
    lastSeen: new Date(),
  },
  {
    id: 'mock-user-2', 
    name: 'Nhân viên B',
    color: '#22c55e',
    position: { x: -3, y: 0, z: 1 },
    rotation: 45,
    selectedRackId: null,
    selectedBoxId: null,
    currentAction: 'scanning',
    lastSeen: new Date(),
  },
  {
    id: 'mock-user-3',
    name: 'Nhân viên C',
    color: '#f97316',
    position: { x: 0, y: 0, z: -4 },
    rotation: 180,
    selectedRackId: null,
    selectedBoxId: null,
    currentAction: 'moving',
    lastSeen: new Date(),
  },
];

const generateUserId = () => `user-${Math.random().toString(36).substring(2, 9)}`;
const getRandomColor = () => PRESENCE_COLORS[Math.floor(Math.random() * PRESENCE_COLORS.length)];
const getRandomName = () => {
  const names = ['Nhân viên A', 'Nhân viên B', 'Nhân viên C', 'Quản lý', 'Kho 1', 'Kho 2'];
  return names[Math.floor(Math.random() * names.length)];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const useRealtimePresence = ({
  enabled,
  userName,
  userAvatar,
  selectedRackId,
  selectedBoxId,
  warehouseId = 'default-warehouse',
}: UseRealtimePresenceProps): UseRealtimePresenceReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [currentUserId] = useState(() => generateUserId());
  
  const socketRef = useRef<Socket | null>(null);
  const positionRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const rotationRef = useRef<number>(0);
  
  const userInfoRef = useRef({
    id: currentUserId,
    name: userName || getRandomName(),
    color: getRandomColor(),
    avatar: userAvatar,
  });

  // Memoize online count
  const onlineCount = useMemo(() => users.length + 1, [users.length]);

  // Try to connect to WebSocket server
  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      setUsers([]);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Attempt WebSocket connection
    const socket = io(`${API_URL}/warehouse`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 5000,
      query: {
        warehouseId,
        userId: currentUserId,
      },
    });

    socket.on('connect', () => {
      console.log('[RealtimePresence] Connected to warehouse room');
      setIsConnected(true);
      
      // Emit join event with user info
      socket.emit('warehouse:join', {
        warehouseId,
        user: {
          id: userInfoRef.current.id,
          name: userInfoRef.current.name,
          color: userInfoRef.current.color,
          avatar: userInfoRef.current.avatar,
          position: positionRef.current,
          rotation: rotationRef.current,
          selectedRackId,
          selectedBoxId,
        },
      });
    });

    // Handle user list update
    socket.on('warehouse:users', (data: { users: UserPresence[] }) => {
      setUsers(data.users.filter(u => u.id !== currentUserId));
    });

    // Handle user joined
    socket.on('warehouse:userJoined', (user: UserPresence) => {
      if (user.id !== currentUserId) {
        setUsers(prev => {
          const exists = prev.some(u => u.id === user.id);
          if (exists) return prev;
          return [...prev, user];
        });
      }
    });

    // Handle user left
    socket.on('warehouse:userLeft', (data: { userId: string }) => {
      setUsers(prev => prev.filter(u => u.id !== data.userId));
    });

    // Handle user position update
    socket.on('warehouse:userMove', (data: { 
      userId: string; 
      position: { x: number; y: number; z: number }; 
      rotation: number 
    }) => {
      if (data.userId !== currentUserId) {
        setUsers(prev => prev.map(u => 
          u.id === data.userId 
            ? { ...u, position: data.position, rotation: data.rotation, lastSeen: new Date() }
            : u
        ));
      }
    });

    // Handle user selection update
    socket.on('warehouse:userSelect', (data: { 
      userId: string; 
      selectedRackId: string | null; 
      selectedBoxId: string | null 
    }) => {
      if (data.userId !== currentUserId) {
        setUsers(prev => prev.map(u => 
          u.id === data.userId 
            ? { ...u, selectedRackId: data.selectedRackId, selectedBoxId: data.selectedBoxId, lastSeen: new Date() }
            : u
        ));
      }
    });

    // Handle user action update
    socket.on('warehouse:userAction', (data: { 
      userId: string; 
      action: UserPresence['currentAction'] 
    }) => {
      if (data.userId !== currentUserId) {
        setUsers(prev => prev.map(u => 
          u.id === data.userId 
            ? { ...u, currentAction: data.action, lastSeen: new Date() }
            : u
        ));
      }
    });

    // Handle warehouse action broadcast (rack/box changes)
    socket.on('warehouse:action', (action: WarehouseAction) => {
      console.log('[RealtimePresence] Received action:', action);
      // This would trigger state updates in the warehouse hook
      // For now, just log it - integration with useWarehouse would happen separately
    });

    socket.on('connect_error', (error) => {
      console.warn('[RealtimePresence] Connection error:', error.message);
      // Don't show fake users - only show real connected users
      setIsConnected(false);
      setUsers([]);
    });

    socket.on('disconnect', (reason) => {
      console.log('[RealtimePresence] Disconnected:', reason);
      setIsConnected(false);
    });

    socketRef.current = socket;

    // Cleanup
    return () => {
      if (socket) {
        socket.emit('warehouse:leave', { warehouseId, userId: currentUserId });
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [enabled, warehouseId, currentUserId, selectedRackId, selectedBoxId]);

  // Update position (throttled in the 3D scene)
  const updatePosition = useCallback((
    position: { x: number; y: number; z: number }, 
    rotation = 0
  ) => {
    positionRef.current = position;
    rotationRef.current = rotation;
    
    if (socketRef.current?.connected) {
      socketRef.current.emit('warehouse:move', {
        warehouseId,
        userId: currentUserId,
        position,
        rotation,
      });
    }
  }, [warehouseId, currentUserId]);

  // Update selection
  const updateSelection = useCallback((rackId: string | null, boxId?: string | null) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('warehouse:select', {
        warehouseId,
        userId: currentUserId,
        selectedRackId: rackId,
        selectedBoxId: boxId ?? null,
      });
    }
  }, [warehouseId, currentUserId]);

  // Update current action
  const updateAction = useCallback((action: UserPresence['currentAction']) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('warehouse:action', {
        warehouseId,
        userId: currentUserId,
        action,
      });
    }
  }, [warehouseId, currentUserId]);

  // Broadcast warehouse action (add/remove/move rack or box)
  const broadcastAction = useCallback((action: Omit<WarehouseAction, 'userId' | 'timestamp'>) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('warehouse:broadcast', {
        warehouseId,
        ...action,
        userId: currentUserId,
        timestamp: new Date(),
      });
    }
  }, [warehouseId, currentUserId]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('warehouse:leave', { warehouseId, userId: currentUserId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setUsers([]);
  }, [warehouseId, currentUserId]);

  return {
    isConnected,
    users,
    currentUserId,
    onlineCount,
    updatePosition,
    updateSelection,
    updateAction,
    broadcastAction,
    disconnect,
  };
};

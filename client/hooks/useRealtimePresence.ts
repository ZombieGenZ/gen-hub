'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UserPresence {
  id: string;
  name: string;
  color: string;
  cursorPosition: { x: number; y: number } | null;
  selectedRackId: string | null;
  lastSeen: Date;
}

interface UseRealtimePresenceProps {
  enabled: boolean;
  userName?: string;
  selectedRackId: string | null;
}

interface UseRealtimePresenceReturn {
  isConnected: boolean;
  users: UserPresence[];
  currentUserId: string | null;
  updateCursor: (x: number, y: number) => void;
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
];

const generateUserId = () => `user-${Math.random().toString(36).substring(2, 9)}`;
const getRandomColor = () => PRESENCE_COLORS[Math.floor(Math.random() * PRESENCE_COLORS.length)];
const getRandomName = () => {
  const names = ['Nhân viên A', 'Nhân viên B', 'Nhân viên C', 'Quản lý', 'Kho 1', 'Kho 2'];
  return names[Math.floor(Math.random() * names.length)];
};

export const useRealtimePresence = ({
  enabled,
  userName,
  selectedRackId,
}: UseRealtimePresenceProps): UseRealtimePresenceReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [currentUserId] = useState(() => generateUserId());
  
  const channelRef = useRef<any>(null);
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  const userInfoRef = useRef({
    id: currentUserId,
    name: userName || getRandomName(),
    color: getRandomColor(),
  });

  // Setup realtime channel (mock implementation - can be replaced with actual Supabase)
  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      setUsers([]);
      return;
    }

    // Mock connection for demo purposes
    // In production, replace with actual Supabase realtime channel
    const connectTimeout = setTimeout(() => {
      setIsConnected(true);
      console.log('Realtime presence connected (mock)');
    }, 500);

    return () => {
      clearTimeout(connectTimeout);
      setIsConnected(false);
    };
  }, [enabled, currentUserId]);

  // Update presence when selectedRackId changes
  useEffect(() => {
    if (isConnected) {
      // In production, send update to realtime channel
      console.log('Selected rack updated:', selectedRackId);
    }
  }, [selectedRackId, isConnected]);

  // Throttled cursor update
  const updateCursor = useCallback((x: number, y: number) => {
    cursorRef.current = { x, y };

    if (isConnected) {
      // In production, send cursor position to realtime channel
      // Throttle updates to avoid overwhelming the server
    }
  }, [isConnected]);

  return {
    isConnected,
    users,
    currentUserId,
    updateCursor,
  };
};

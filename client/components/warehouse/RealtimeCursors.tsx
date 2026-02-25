'use client';

import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { MousePointer2 } from 'lucide-react';

interface UserPresence {
  id: string;
  name: string;
  color: string;
  cursorPosition?: { x: number; y: number } | null;
  selectedRackId: string | null;
  lastSeen: Date;
}

interface RealtimeCursorsProps {
  users: UserPresence[];
  containerRef?: React.RefObject<HTMLDivElement>;
}

const RealtimeCursors = memo(({ users, containerRef }: RealtimeCursorsProps) => {
  return (
    <>
      {users.map((user) => {
        if (!user.cursorPosition) return null;

        return (
          <div
            key={user.id}
            className="fixed pointer-events-none z-50 transition-all duration-100"
            style={{
              left: user.cursorPosition.x,
              top: user.cursorPosition.y,
              transform: 'translate(-2px, -2px)',
            }}
          >
            {/* Cursor icon */}
            <MousePointer2
              className="w-5 h-5 drop-shadow-lg"
              style={{ color: user.color, fill: user.color }}
            />

            {/* User label */}
            <div
              className="absolute left-4 top-4 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap shadow-lg"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </div>
          </div>
        );
      })}
    </>
  );
});

RealtimeCursors.displayName = 'RealtimeCursors';

interface RealtimeUsersListProps {
  users: UserPresence[];
  isConnected: boolean;
}

export const RealtimeUsersList = memo(({ users, isConnected }: RealtimeUsersListProps) => {
  if (!isConnected) return null;

  return (
    <div className="absolute top-16 right-4 z-20 flex items-center gap-2 bg-card/90 backdrop-blur-md border border-border rounded-lg p-2 shadow-lg">
      <span className="text-xs text-muted-foreground">Đang online:</span>
      <div className="flex items-center -space-x-2">
        {users.slice(0, 5).map((user) => (
          <div
            key={user.id}
            className="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: user.color }}
            title={user.name}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        ))}
        {users.length > 5 && (
          <div className="w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold">
            +{users.length - 5}
          </div>
        )}
      </div>
      {users.length === 0 && (
        <Badge variant="secondary" className="text-xs">
          Chỉ bạn online
        </Badge>
      )}
    </div>
  );
});

RealtimeUsersList.displayName = 'RealtimeUsersList';

export default RealtimeCursors;

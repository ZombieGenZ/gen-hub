'use client';

import { useState, useMemo } from 'react';
import { 
  Users, 
  ChevronDown, 
  ChevronRight,
  Circle,
  Wifi,
  WifiOff,
  Eye,
  Edit2,
  Package,
  Smartphone,
  LucideIcon,
} from 'lucide-react';
import { UserPresence } from '@/hooks/useRealtimePresence';
import { cn } from '@/lib/utils';

interface OnlineUsersListProps {
  users: UserPresence[];
  currentUserId: string | null;
  isConnected: boolean;
  onlineCount: number;
}

const ACTION_LABELS: Record<string, { label: string; icon: LucideIcon }> = {
  viewing: { label: 'Đang xem', icon: Eye },
  editing: { label: 'Đang chỉnh sửa', icon: Edit2 },
  moving: { label: 'Đang di chuyển', icon: Package },
  scanning: { label: 'Đang quét', icon: Smartphone },
};

export const OnlineUsersList = ({ 
  users, 
  currentUserId, 
  isConnected,
  onlineCount,
}: OnlineUsersListProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Group users by action
  const groupedUsers = useMemo(() => {
    const groups: Record<string, UserPresence[]> = {};
    users.forEach(user => {
      const action = user.currentAction || 'viewing';
      if (!groups[action]) groups[action] = [];
      groups[action].push(user);
    });
    return groups;
  }, [users]);

  return (
    <div className="absolute top-20 right-4 z-30 w-64">
      <div 
        className="rounded-xl overflow-hidden"
        style={{
          background: '#f8fafb',
          border: '1px solid #e0ede8',
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        }}
      >
        {/* Header */}
        <button
          onClick={() => setIsExpanded(prev => !prev)}
          className="w-full flex items-center justify-between p-3 hover:bg-[#e0ede8]/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <Users className="h-4 w-4 text-[#2ea87e]" />
              {isConnected && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
            <span className="font-medium text-sm" style={{ color: '#1a2e25' }}>
              Người dùng online
            </span>
            <span 
              className="px-1.5 py-0.5 rounded-full text-xs font-medium"
              style={{ 
                background: isConnected ? '#dcfce7' : '#fee2e2',
                color: isConnected ? '#166534' : '#991b1b',
              }}
            >
              {onlineCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-red-500" />
            )}
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-[#4a5568]" />
            ) : (
              <ChevronRight className="h-4 w-4 text-[#4a5568]" />
            )}
          </div>
        </button>

        {/* User list */}
        {isExpanded && (
          <div className="border-t border-[#e0ede8] max-h-80 overflow-y-auto">
            {/* Current user (You) */}
            <div className="px-3 py-2 bg-[#2ea87e]/10 border-b border-[#e0ede8]">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div 
                    className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-medium"
                    style={{ background: '#2ea87e' }}
                  >
                    Bạn
                  </div>
                  <Circle className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 fill-green-500 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#1a2e25' }}>
                    Bạn
                  </p>
                  <p className="text-xs" style={{ color: '#4a5568' }}>
                    Đang hoạt động
                  </p>
                </div>
              </div>
            </div>

            {/* Other users by action group */}
            {users.length > 0 ? (
              <div className="divide-y divide-[#e0ede8]">
                {Object.entries(groupedUsers).map(([action, actionUsers]) => {
                  const actionInfo = ACTION_LABELS[action] || ACTION_LABELS.viewing;
                  const ActionIcon = actionInfo.icon;

                  return (
                    <div key={action}>
                      {/* Action group header */}
                      <div className="px-3 py-1.5 bg-[#f8fafb] flex items-center gap-1.5">
                        {ActionIcon && <ActionIcon className="h-3 w-3" style={{ color: '#4a5568' }} />}
                        <span className="text-xs font-medium" style={{ color: '#4a5568' }}>
                          {actionInfo.label} ({actionUsers.length})
                        </span>
                      </div>
                      
                      {/* Users in this group */}
                      {actionUsers.map(user => (
                        <UserItem key={user.id} user={user} />
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-3 py-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-[#e0ede8]" />
                <p className="text-sm" style={{ color: '#4a5568' }}>
                  Không có người dùng khác online
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Individual user item
const UserItem = ({ user }: { user: UserPresence }) => {
  const initials = useMemo(() => {
    return user.name
      .split(' ')
      .map(w => w.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [user.name]);

  const lastSeenText = useMemo(() => {
    const diffMs = Date.now() - new Date(user.lastSeen).getTime();
    if (diffMs < 60000) return 'Vừa xong';
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)} phút trước`;
    return 'Lâu rồi';
  }, [user.lastSeen]);

  return (
    <div className="px-3 py-2 hover:bg-[#e0ede8]/30 transition-colors">
      <div className="flex items-center gap-2">
        <div className="relative">
          <div 
            className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-medium"
            style={{ background: user.color }}
          >
            {initials}
          </div>
          <Circle 
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5",
              "fill-green-500 text-green-500"  
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: '#1a2e25' }}>
            {user.name}
          </p>
          <div className="flex items-center gap-1.5">
            {user.selectedRackId && (
              <span 
                className="text-xs px-1 py-0.5 rounded"
                style={{ background: '#e0ede8', color: '#2ea87e' }}
              >
                Kệ {user.selectedRackId.slice(-4)}
              </span>
            )}
            <span className="text-xs" style={{ color: '#4a5568' }}>
              {lastSeenText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnlineUsersList;

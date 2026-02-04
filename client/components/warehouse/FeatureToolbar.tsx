'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Bell, BarChart3, History, RefreshCw
} from 'lucide-react';

interface FeatureToolbarProps {
  alertCount: number;
  onToggleSearch: () => void;
  onToggleAlerts: () => void;
  onToggleStats: () => void;
  onToggleTransactions: () => void;
  onRefreshAlerts: () => void;
  searchOpen: boolean;
  alertsOpen: boolean;
  statsOpen: boolean;
  transactionsOpen: boolean;
}

const FeatureToolbar = ({
  alertCount,
  onToggleSearch,
  onToggleAlerts,
  onToggleStats,
  onToggleTransactions,
  onRefreshAlerts,
  searchOpen,
  alertsOpen,
  statsOpen,
  transactionsOpen,
}: FeatureToolbarProps) => {
  return (
    <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-card/90 backdrop-blur-md border border-border rounded-lg p-1.5 shadow-lg">
      {/* Search */}
      <Button
        variant={searchOpen ? "default" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onToggleSearch}
      >
        <Search className="w-4 h-4" />
      </Button>

      {/* Alerts */}
      <Button
        variant={alertsOpen ? "default" : "ghost"}
        size="sm"
        className="h-8 px-2 relative"
        onClick={onToggleAlerts}
      >
        <Bell className="w-4 h-4" />
        {alertCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
          >
            {alertCount > 9 ? '9+' : alertCount}
          </Badge>
        )}
      </Button>

      <div className="w-px h-5 bg-border" />

      {/* Stats Dashboard */}
      <Button
        variant={statsOpen ? "default" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onToggleStats}
      >
        <BarChart3 className="w-4 h-4" />
      </Button>

      {/* Transaction History */}
      <Button
        variant={transactionsOpen ? "default" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onToggleTransactions}
      >
        <History className="w-4 h-4" />
      </Button>

      <div className="w-px h-5 bg-border" />

      {/* Refresh Alerts */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onRefreshAlerts}
      >
        <RefreshCw className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default FeatureToolbar;

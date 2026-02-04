'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, AlertCircle, Info, X, Bell, 
  ChevronDown, ChevronUp, Trash2, Eye
} from 'lucide-react';
import { WarehouseAlert } from '@/types/inventory';

interface AlertsPanelProps {
  alerts: WarehouseAlert[];
  alertsBySeverity: {
    danger: WarehouseAlert[];
    warning: WarehouseAlert[];
    info: WarehouseAlert[];
  };
  onDismiss: (alertId: string) => void;
  onClearDismissed: () => void;
  onViewRack?: (rackId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const severityConfig = {
  danger: {
    icon: AlertTriangle,
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/30',
    textColor: 'text-destructive',
    badgeClass: 'bg-destructive text-destructive-foreground',
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    textColor: 'text-yellow-600 dark:text-yellow-400',
    badgeClass: 'bg-yellow-500 text-yellow-950',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-600 dark:text-blue-400',
    badgeClass: 'bg-blue-500 text-white',
  },
};

const AlertsPanel = ({
  alerts,
  alertsBySeverity,
  onDismiss,
  onClearDismissed,
  onViewRack,
  isOpen,
  onClose,
}: AlertsPanelProps) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    danger: true,
    warning: true,
    info: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (!isOpen) return null;

  const totalAlerts = alerts.length;
  const dangerCount = alertsBySeverity.danger.length;
  const warningCount = alertsBySeverity.warning.length;
  const infoCount = alertsBySeverity.info.length;

  const renderAlertGroup = (
    severity: 'danger' | 'warning' | 'info',
    alertList: WarehouseAlert[],
    label: string
  ) => {
    if (alertList.length === 0) return null;
    
    const config = severityConfig[severity];
    const Icon = config.icon;
    const isExpanded = expandedSections[severity];

    return (
      <div className="mb-3">
        <button
          className={`w-full flex items-center justify-between p-2 rounded-lg ${config.bgColor} ${config.borderColor} border`}
          onClick={() => toggleSection(severity)}
        >
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${config.textColor}`} />
            <span className={`text-sm font-medium ${config.textColor}`}>{label}</span>
            <Badge className={`${config.badgeClass} text-xs h-5`}>
              {alertList.length}
            </Badge>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        
        {isExpanded && (
          <div className="mt-2 space-y-2">
            {alertList.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg ${config.bgColor} border ${config.borderColor} animate-fade-in`}
              >
                <div className="flex items-start gap-2">
                  <Icon className={`w-4 h-4 ${config.textColor} mt-0.5 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-medium ${config.textColor}`}>
                        {alert.title}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 flex-shrink-0"
                        onClick={() => onDismiss(alert.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                    
                    {alert.rackId && onViewRack && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs mt-2 px-2"
                        onClick={() => onViewRack(alert.rackId!)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Xem {alert.rackName}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="absolute top-16 right-4 z-20 w-80 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl overflow-hidden animate-scale-in">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Cảnh báo</h3>
          {totalAlerts > 0 && (
            <Badge variant="destructive" className="text-xs">
              {totalAlerts}
            </Badge>
          )}
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Summary badges */}
        <div className="flex gap-2 mt-3">
          {dangerCount > 0 && (
            <Badge className={severityConfig.danger.badgeClass}>
              {dangerCount} nguy hiểm
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge className={severityConfig.warning.badgeClass}>
              {warningCount} cảnh báo
            </Badge>
          )}
          {infoCount > 0 && (
            <Badge className={severityConfig.info.badgeClass}>
              {infoCount} thông tin
            </Badge>
          )}
        </div>
      </div>

      {/* Alerts List */}
      <ScrollArea className="max-h-96 p-3">
        {totalAlerts === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Không có cảnh báo nào</p>
            <p className="text-xs mt-1">Hệ thống hoạt động bình thường</p>
          </div>
        ) : (
          <>
            {renderAlertGroup('danger', alertsBySeverity.danger, 'Nguy hiểm')}
            {renderAlertGroup('warning', alertsBySeverity.warning, 'Cảnh báo')}
            {renderAlertGroup('info', alertsBySeverity.info, 'Thông tin')}
          </>
        )}
      </ScrollArea>

      {/* Footer */}
      {totalAlerts > 0 && (
        <div className="p-3 border-t border-border bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={onClearDismissed}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Xóa tất cả đã ẩn
          </Button>
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;

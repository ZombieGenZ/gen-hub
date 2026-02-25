'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowDownRight, ArrowUpRight, X, History, Package,
  Search, Calendar, Filter
} from 'lucide-react';
import { InventoryTransaction } from '@/types/inventory';
import { categoryLabels, categoryColors, BoxCategory } from '@/types/warehouse';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface TransactionPanelProps {
  transactions: InventoryTransaction[];
  isOpen: boolean;
  onClose: () => void;
}

const TransactionPanel = ({
  transactions,
  isOpen,
  onClose,
}: TransactionPanelProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'in' | 'out'>('all');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = searchQuery === '' || 
        t.boxName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.rackName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || t.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [transactions, searchQuery, filterType]);

  const summary = useMemo(() => {
    const totalIn = transactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.quantity, 0);
    const totalOut = transactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.quantity, 0);
    return { totalIn, totalOut, net: totalIn - totalOut };
  }, [transactions]);

  if (!isOpen) return null;

  return (
    <div 
      className="absolute top-16 right-4 z-20 w-full max-w-[380px] max-h-[70vh] overflow-hidden animate-in slide-in-from-right-5 duration-300"
      style={{
        backgroundColor: '#f8fafb',
        border: '1px solid #e0ede8',
        borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      }}
    >
      {/* Header */}
      <div className="p-4" style={{ borderBottom: '1px solid #e0ede8' }}>
        <div className="flex items-center gap-2 mb-3">
          <History className="w-5 h-5" style={{ color: '#2ea87e' }} />
          <h3 className="font-semibold" style={{ color: '#1a2e25' }}>Lịch sử Xuất/Nhập</h3>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" style={{ color: '#4a5568' }} />
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="p-2 rounded-lg text-center" style={{ backgroundColor: '#dcfce7' }}>
            <ArrowDownRight className="w-4 h-4 mx-auto mb-1" style={{ color: '#22c55e' }} />
            <div className="text-lg font-bold" style={{ color: '#16a34a' }}>{summary.totalIn}</div>
            <div className="text-[10px]" style={{ color: '#4a5568' }}>Nhập</div>
          </div>
          <div className="p-2 rounded-lg text-center" style={{ backgroundColor: '#fed7aa' }}>
            <ArrowUpRight className="w-4 h-4 mx-auto mb-1" style={{ color: '#f97316' }} />
            <div className="text-lg font-bold" style={{ color: '#ea580c' }}>{summary.totalOut}</div>
            <div className="text-[10px]" style={{ color: '#4a5568' }}>Xuất</div>
          </div>
          <div className="p-2 rounded-lg text-center" style={{ backgroundColor: '#e0ede8' }}>
            <Package className="w-4 h-4 mx-auto mb-1" style={{ color: '#2ea87e' }} />
            <div className="text-lg font-bold" style={{ color: '#1a2e25' }}>{summary.net}</div>
            <div className="text-[10px]" style={{ color: '#4a5568' }}>Ròng</div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: '#4a5568' }} />
            <Input
              placeholder="Tìm theo tên, kệ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-8 text-xs"
              style={{ backgroundColor: '#ffffff', border: '1px solid #e0ede8' }}
            />
          </div>
          <Tabs value={filterType} onValueChange={(v) => setFilterType(v as 'all' | 'in' | 'out')}>
            <TabsList className="h-8" style={{ backgroundColor: '#e0ede8' }}>
              <TabsTrigger value="all" className="text-xs h-6 px-2">Tất cả</TabsTrigger>
              <TabsTrigger value="in" className="text-xs h-6 px-2">Nhập</TabsTrigger>
              <TabsTrigger value="out" className="text-xs h-6 px-2">Xuất</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Transaction List */}
      <ScrollArea className="max-h-[calc(70vh-200px)] overflow-y-auto">
        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <History className="w-12 h-12 mx-auto mb-2" style={{ color: '#4a5568', opacity: 0.3 }} />
            <p className="text-sm" style={{ color: '#4a5568' }}>Chưa có giao dịch nào</p>
            <p className="text-xs mt-1" style={{ color: '#4a5568' }}>Các giao dịch xuất/nhập sẽ hiển thị ở đây</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="p-3 rounded-lg transition-colors"
                style={{ backgroundColor: '#ffffff', border: '1px solid #e0ede8' }}
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="p-1.5 rounded-lg"
                    style={{ backgroundColor: transaction.type === 'in' ? '#dcfce7' : '#fed7aa' }}
                  >
                    {transaction.type === 'in' ? (
                      <ArrowDownRight className="w-4 h-4" style={{ color: '#22c55e' }} />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" style={{ color: '#f97316' }} />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-medium text-sm">{transaction.boxName}</span>
                      <Badge 
                        variant="outline" 
                        className="text-[10px] h-4"
                        style={{ 
                          borderColor: categoryColors[transaction.category as BoxCategory],
                          color: categoryColors[transaction.category as BoxCategory]
                        }}
                      >
                        {categoryLabels[transaction.category as BoxCategory]}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs" style={{ color: '#4a5568' }}>
                      <span>Kệ: {transaction.rackName}</span>
                      <span>SL: {transaction.quantity}</span>
                      {transaction.weight && <span>{transaction.weight}kg</span>}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 text-[10px]" style={{ color: '#4a5568' }}>
                      <Calendar className="w-3 h-3" />
                      {format(new Date(transaction.timestamp), 'HH:mm dd/MM/yyyy', { locale: vi })}
                      {transaction.operator && (
                        <span className="ml-2">• {transaction.operator}</span>
                      )}
                    </div>
                    
                    {transaction.note && (
                      <p className="text-xs mt-1 italic" style={{ color: '#4a5568' }}>
                        &quot;{transaction.note}&quot;
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div 
        className="p-2 text-xs text-center"
        style={{ borderTop: '1px solid #e0ede8', backgroundColor: '#f8fafb', color: '#4a5568' }}
      >
        {filteredTransactions.length} giao dịch
      </div>
    </div>
  );
};

export default TransactionPanel;

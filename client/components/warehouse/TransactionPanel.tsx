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
    <div className="absolute top-16 right-4 z-20 w-96 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl overflow-hidden animate-scale-in">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Lịch sử Xuất/Nhập</h3>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="p-2 rounded-lg bg-green-500/10 text-center">
            <ArrowDownRight className="w-4 h-4 text-green-500 mx-auto mb-1" />
            <div className="text-lg font-bold text-green-600 dark:text-green-400">{summary.totalIn}</div>
            <div className="text-[10px] text-muted-foreground">Nhập</div>
          </div>
          <div className="p-2 rounded-lg bg-orange-500/10 text-center">
            <ArrowUpRight className="w-4 h-4 text-orange-500 mx-auto mb-1" />
            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{summary.totalOut}</div>
            <div className="text-[10px] text-muted-foreground">Xuất</div>
          </div>
          <div className="p-2 rounded-lg bg-primary/10 text-center">
            <Package className="w-4 h-4 text-primary mx-auto mb-1" />
            <div className="text-lg font-bold text-foreground">{summary.net}</div>
            <div className="text-[10px] text-muted-foreground">Ròng</div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên, kệ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-8 text-xs"
            />
          </div>
          <Tabs value={filterType} onValueChange={(v) => setFilterType(v as 'all' | 'in' | 'out')}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs h-6 px-2">Tất cả</TabsTrigger>
              <TabsTrigger value="in" className="text-xs h-6 px-2">Nhập</TabsTrigger>
              <TabsTrigger value="out" className="text-xs h-6 px-2">Xuất</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Transaction List */}
      <ScrollArea className="max-h-80">
        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Chưa có giao dịch nào</p>
            <p className="text-xs mt-1">Các giao dịch xuất/nhập sẽ hiển thị ở đây</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg ${
                    transaction.type === 'in' 
                      ? 'bg-green-500/20' 
                      : 'bg-orange-500/20'
                  }`}>
                    {transaction.type === 'in' ? (
                      <ArrowDownRight className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-orange-500" />
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
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Kệ: {transaction.rackName}</span>
                      <span>SL: {transaction.quantity}</span>
                      {transaction.weight && <span>{transaction.weight}kg</span>}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(transaction.timestamp), 'HH:mm dd/MM/yyyy', { locale: vi })}
                      {transaction.operator && (
                        <span className="ml-2">• {transaction.operator}</span>
                      )}
                    </div>
                    
                    {transaction.note && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
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
      <div className="p-2 border-t border-border bg-muted/30 text-xs text-muted-foreground text-center">
        {filteredTransactions.length} giao dịch
      </div>
    </div>
  );
};

export default TransactionPanel;

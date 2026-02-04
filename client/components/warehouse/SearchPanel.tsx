'use client';

import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, MapPin, Package, X, Navigation, Layers,
  ArrowRight, Target
} from 'lucide-react';
import { SearchResult } from '@/types/inventory';
import { categoryLabels, categoryColors, BoxCategory } from '@/types/warehouse';

interface SearchPanelProps {
  onSearch: (query: string) => SearchResult[];
  onLocate: (result: SearchResult) => void;
  onHighlight: (boxId: string | null) => void;
  isOpen: boolean;
  onClose: () => void;
}

const SearchPanel = ({ 
  onSearch, 
  onLocate, 
  onHighlight,
  isOpen, 
  onClose 
}: SearchPanelProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (value.length >= 2) {
      const searchResults = onSearch(value);
      setResults(searchResults);
      setSelectedIndex(null);
      onHighlight(null);
    } else {
      setResults([]);
      onHighlight(null);
    }
  }, [onSearch, onHighlight]);

  const handleSelect = useCallback((result: SearchResult, index: number) => {
    setSelectedIndex(index);
    onHighlight(result.boxId);
  }, [onHighlight]);

  const handleLocate = useCallback((result: SearchResult) => {
    onLocate(result);
  }, [onLocate]);

  const handleClose = useCallback(() => {
    setQuery('');
    setResults([]);
    setSelectedIndex(null);
    onHighlight(null);
    onClose();
  }, [onHighlight, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowDown' && results.length > 0) {
        e.preventDefault();
        const newIndex = selectedIndex === null ? 0 : Math.min(selectedIndex + 1, results.length - 1);
        setSelectedIndex(newIndex);
        onHighlight(results[newIndex].boxId);
      } else if (e.key === 'ArrowUp' && results.length > 0) {
        e.preventDefault();
        const newIndex = selectedIndex === null ? results.length - 1 : Math.max(selectedIndex - 1, 0);
        setSelectedIndex(newIndex);
        onHighlight(results[newIndex].boxId);
      } else if (e.key === 'Enter' && selectedIndex !== null) {
        handleLocate(results[selectedIndex]);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, handleClose, handleLocate, onHighlight]);

  if (!isOpen) return null;

  return (
    <div className="absolute top-16 left-4 z-20 w-96 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl overflow-hidden animate-scale-in">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Tìm kiếm & Định vị</h3>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Nhập tên hoặc mã thùng hàng..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 h-10"
            autoFocus
          />
          {query && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => handleSearch('')}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="max-h-80">
        {results.length === 0 && query.length >= 2 && (
          <div className="p-8 text-center text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Không tìm thấy kết quả</p>
          </div>
        )}
        
        {results.length === 0 && query.length < 2 && query.length > 0 && (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Nhập ít nhất 2 ký tự để tìm kiếm
          </div>
        )}
        
        {results.length > 0 && (
          <div className="p-2">
            <div className="text-xs text-muted-foreground px-2 py-1 mb-1">
              Tìm thấy {results.length} kết quả
            </div>
            
            {results.map((result, index) => (
              <div
                key={result.boxId}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedIndex === index 
                    ? 'bg-primary/20 border border-primary/50' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => handleSelect(result, index)}
                onDoubleClick={() => handleLocate(result)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: categoryColors[result.category as BoxCategory] }}
                  />
                  <span className="font-mono font-medium text-sm">{result.boxName}</span>
                  <Badge variant="outline" className="text-[10px] h-5">
                    {categoryLabels[result.category as BoxCategory]}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {result.rackName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    Tầng {result.level + 1}
                  </span>
                  {result.weight && (
                    <span>{result.weight}kg</span>
                  )}
                </div>
                
                {selectedIndex === index && (
                  <div className="flex items-center gap-2 mt-2">
                    <Button 
                      size="sm" 
                      className="h-7 text-xs flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLocate(result);
                      }}
                    >
                      <Navigation className="w-3 h-3 mr-1" />
                      Định vị 3D
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Could add more actions here
                      }}
                    >
                      <Target className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer hint */}
      <div className="p-2 border-t border-border bg-muted/30 text-xs text-muted-foreground flex items-center gap-4">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd>
          Di chuyển
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd>
          Định vị
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd>
          Đóng
        </span>
      </div>
    </div>
  );
};

export default SearchPanel;

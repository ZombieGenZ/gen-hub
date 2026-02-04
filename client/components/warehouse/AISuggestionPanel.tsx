'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, X, Loader2, MapPin, Lightbulb, ArrowRight } from 'lucide-react';
import { BoxCategory, categoryColors, RackConfig, BoxItem } from '@/types/warehouse';

interface AISuggestionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  racks: RackConfig[];
  boxes: BoxItem[];
  onHighlightRack?: (rackId: string) => void;
  onSelectRack?: (rackId: string) => void;
}

interface AISuggestion {
  recommendedRack: string;
  reason: string;
  alternatives: string[];
  tips: string;
}

const AISuggestionPanel = ({
  isOpen,
  onClose,
  racks,
  boxes,
  onHighlightRack,
  onSelectRack,
}: AISuggestionPanelProps) => {
  const [boxName, setBoxName] = useState('');
  const [boxCategory, setBoxCategory] = useState<BoxCategory>('electronics');
  const [boxWeight, setBoxWeight] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getRackInfo = () => {
    return racks.map(rack => {
      const rackBoxes = boxes.filter(b => b.rackId === rack.id);
      const categories = [...new Set(rackBoxes.map(b => b.category))];
      const totalWeight = rackBoxes.reduce((sum, b) => sum + (b.weight || 0), 0);
      const capacity = rack.rows * rack.columns * rack.levels;
      const fillRate = rackBoxes.length / capacity;

      return {
        id: rack.id,
        name: rack.name,
        fillRate,
        position: { x: rack.position.x, z: rack.position.z },
        categories,
        totalWeight,
        boxCount: rackBoxes.length,
      };
    });
  };

  const handleGetSuggestion = async () => {
    if (!boxName.trim()) {
      setError('Vui lòng nhập tên hàng');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const rackInfo = getRackInfo();
      
      // Mock AI suggestion for now - can be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Find best rack based on fill rate and category
      const availableRacks = rackInfo
        .filter(r => r.fillRate < 1)
        .sort((a, b) => a.fillRate - b.fillRate);

      if (availableRacks.length === 0) {
        setError('Tất cả các kệ đều đã đầy');
        return;
      }

      const recommended = availableRacks[0];
      const alternatives = availableRacks.slice(1, 4).map(r => r.name);

      const mockSuggestion: AISuggestion = {
        recommendedRack: recommended.name,
        reason: `${recommended.name} có tỷ lệ lấp đầy thấp nhất (${Math.round(recommended.fillRate * 100)}%) và phù hợp với loại hàng ${boxCategory}`,
        alternatives,
        tips: `Đặt hàng nặng ở tầng thấp để đảm bảo an toàn. Cân nhắc nhóm các sản phẩm cùng loại lại với nhau.`,
      };

      setSuggestion(mockSuggestion);
      
      // Auto highlight recommended rack
      const recommendedRack = racks.find(r => 
        r.name.toLowerCase().includes(mockSuggestion.recommendedRack?.toLowerCase())
      );
      if (recommendedRack) {
        onHighlightRack?.(recommendedRack.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi kết nối AI');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRack = (rackName: string) => {
    const rack = racks.find(r => 
      r.name.toLowerCase().includes(rackName.toLowerCase())
    );
    if (rack) {
      onSelectRack?.(rack.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-4 top-20 z-30 w-80 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl animate-in slide-in-from-right-5 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold">AI Đề xuất sắp xếp</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Tên hàng hóa</Label>
          <Input
            placeholder="VD: Laptop Dell XPS 15"
            value={boxName}
            onChange={(e) => setBoxName(e.target.value)}
            className="h-9 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Phân loại</Label>
            <Select value={boxCategory} onValueChange={(v) => setBoxCategory(v as BoxCategory)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categoryColors).map(([key, color]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      {key}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Trọng lượng (kg)</Label>
            <Input
              type="number"
              value={boxWeight}
              onChange={(e) => setBoxWeight(Number(e.target.value))}
              className="h-9 text-sm"
              min={0}
            />
          </div>
        </div>

        <Button 
          className="w-full" 
          onClick={handleGetSuggestion}
          disabled={isLoading || racks.length === 0}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Đang phân tích...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Nhận đề xuất AI
            </>
          )}
        </Button>

        {racks.length === 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Cần có ít nhất 1 kệ để AI đề xuất
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Suggestion Result */}
        {suggestion && (
          <div className="space-y-3 pt-2 border-t border-border">
            {/* Main recommendation */}
            <div 
              className="p-3 bg-primary/10 border border-primary/20 rounded-lg cursor-pointer hover:bg-primary/20 transition-colors"
              onClick={() => handleSelectRack(suggestion.recommendedRack)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">Vị trí đề xuất</span>
                </div>
                <Badge variant="default" className="text-xs">
                  {suggestion.recommendedRack}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
            </div>

            {/* Alternatives */}
            {suggestion.alternatives?.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">Phương án thay thế:</span>
                <div className="flex flex-wrap gap-2">
                  {suggestion.alternatives.map((alt, i) => (
                    <Badge 
                      key={i} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => handleSelectRack(alt)}
                    >
                      {alt}
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            {suggestion.tips && (
              <div className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded-lg">
                <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">{suggestion.tips}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AISuggestionPanel;

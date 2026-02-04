import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar, X } from 'lucide-react';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onApply: () => void;
  onClear?: () => void;
}

export default function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApply,
  onClear,
}: DateRangeFilterProps) {
  const handleClear = () => {
    onStartDateChange('');
    onEndDateChange('');
    if (onClear) {
      onClear();
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3 p-4 bg-slate-50 rounded-lg border">
      <div className="flex items-center gap-2 text-slate-600">
        <Calendar className="h-4 w-4" />
        <span className="text-sm font-medium">Date Range:</span>
      </div>
      <div className="space-y-1">
        <Label htmlFor="startDate" className="text-xs text-slate-500">From</Label>
        <Input
          id="startDate"
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="w-36 h-9"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="endDate" className="text-xs text-slate-500">To</Label>
        <Input
          id="endDate"
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="w-36 h-9"
        />
      </div>
      <Button 
        onClick={onApply} 
        size="sm"
        className="bg-blue-600 hover:bg-blue-700"
      >
        Apply
      </Button>
      {(startDate || endDate) && (
        <Button 
          onClick={handleClear} 
          variant="ghost" 
          size="sm"
          className="text-slate-500"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}

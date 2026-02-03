import { useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, ZoomIn, ZoomOut } from 'lucide-react';

interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string;
  title?: string;
}

export default function PhotoModal({ isOpen, onClose, photoUrl, title }: PhotoModalProps) {
  const [zoom, setZoom] = useState(1);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = title ? `${title.replace(/[^a-z0-9]/gi, '_')}.jpg` : 'photo.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download photo:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleZoomIn = () => {
    setZoom(z => Math.min(z + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(z => Math.max(z - 0.25, 0.5));
  };

  const handleClose = () => {
    setZoom(1);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b bg-slate-50">
            <h3 className="font-semibold text-slate-800">{title || 'Photo'}</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-slate-600 min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={downloading}
              >
                <Download className="h-4 w-4 mr-1" />
                {downloading ? 'Downloading...' : 'Download'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center min-h-[400px]">
            <img
              src={photoUrl}
              alt={title || 'Photo'}
              style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s ease' }}
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="%23f1f5f9" width="200" height="200"/><text fill="%2394a3b8" x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="sans-serif">No Image</text></svg>';
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

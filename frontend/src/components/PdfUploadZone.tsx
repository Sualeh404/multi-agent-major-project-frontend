import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { uploadPapers } from '@/services/api';
import { useToastStore } from '@/stores/toastStore';
import { cn } from '@/utils/cn';

interface Props {
  uploadId: string | null;
  onUploaded: (uploadId: string, fileNames: string[]) => void;
  onCleared: () => void;
  disabled?: boolean;
}

const MAX_FILES = 5;
const MAX_BYTES = 15 * 1024 * 1024;

export function PdfUploadZone({ uploadId, onUploaded, onCleared, disabled }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const addToast = useToastStore((s) => s.addToast);

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    if (arr.length > MAX_FILES) {
      addToast(`Max ${MAX_FILES} PDFs at once`, 'error');
      return;
    }
    for (const f of arr) {
      if (!f.name.toLowerCase().endsWith('.pdf')) {
        addToast(`${f.name}: only .pdf files accepted`, 'error');
        return;
      }
      if (f.size > MAX_BYTES) {
        addToast(`${f.name}: exceeds 15 MB`, 'error');
        return;
      }
    }
    setUploading(true);
    try {
      const res = await uploadPapers(arr);
      setFileNames(arr.map((f) => f.name));
      onUploaded(res.upload_id, arr.map((f) => f.name));
      addToast(`Uploaded ${arr.length} paper${arr.length > 1 ? 's' : ''}`, 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    handleFiles(e.dataTransfer.files);
  };

  const clear = () => {
    setFileNames([]);
    onCleared();
  };

  return (
    <AnimatePresence initial={false}>
      {uploadId ? (
        <motion.div
          key="uploaded"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="mt-3 p-3 rounded-lg border border-primary/30 bg-primary/5 flex items-start gap-3">
            <FileText className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Using {fileNames.length} uploaded paper{fileNames.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {fileNames.join(', ')}
              </p>
            </div>
            <button
              onClick={clear}
              disabled={disabled}
              className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-secondary"
              title="Remove uploads"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="zone"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div
            onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => !disabled && !uploading && inputRef.current?.click()}
            className={cn(
              'mt-3 p-4 rounded-lg border-2 border-dashed transition-colors cursor-pointer',
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40',
              (disabled || uploading) && 'opacity-50 cursor-not-allowed',
            )}
          >
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              {uploading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Parsing PDFs...</>
                : <><Upload className="w-4 h-4" /> Drag PDFs or click to upload (skip arXiv search)</>
              }
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              multiple
              hidden
              disabled={disabled || uploading}
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

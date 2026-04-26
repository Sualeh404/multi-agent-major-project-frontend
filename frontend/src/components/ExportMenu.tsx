import { useEffect, useRef, useState } from 'react';
import { Download, FileText, FileJson, FileCode, Table as TableIcon, FileType, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToastStore } from '@/stores/toastStore';
import { buildExportUrl } from '@/services/api';
import { cn } from '@/utils/cn';

type Fmt = 'markdown' | 'json' | 'bibtex' | 'ris' | 'latex' | 'csv' | 'pdf';

const ITEMS: { id: Fmt; label: string; icon: typeof FileText; hint: string }[] = [
  { id: 'pdf', label: 'PDF Report', icon: FileType, hint: 'Branded PDF with table + essay + sources' },
  { id: 'markdown', label: 'Markdown', icon: FileText, hint: 'Plain Markdown synthesis' },
  { id: 'latex', label: 'LaTeX', icon: FileCode, hint: '.tex with \\cite{} tags + bibliography' },
  { id: 'csv', label: 'CSV', icon: TableIcon, hint: 'Comparison matrix as spreadsheet' },
  { id: 'bibtex', label: 'BibTeX', icon: FileCode, hint: '.bib for Overleaf / LaTeX' },
  { id: 'ris', label: 'RIS', icon: FileCode, hint: 'For Zotero / Mendeley / EndNote' },
  { id: 'json', label: 'JSON', icon: FileJson, hint: 'Raw structured data' },
];

export function ExportMenu({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handle = (id: Fmt, label: string) => {
    window.open(buildExportUrl(sessionId, id), '_blank');
    addToast(`Downloading ${label}`, 'success');
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        className="gap-1.5 text-muted-foreground"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Export</span>
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </Button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-72 z-30 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
          <ul className="py-1">
            {ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handle(item.id, item.label)}
                    className="w-full text-left px-3 py-2 hover:bg-secondary/70 transition-colors flex items-start gap-2.5"
                  >
                    <Icon className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">{item.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{item.hint}</div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

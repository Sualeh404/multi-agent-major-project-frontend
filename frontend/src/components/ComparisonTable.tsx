import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { getArxivUrl } from '@/utils/arxiv';
import type { ComparisonRow } from '@/types';

type SortKey = keyof ComparisonRow;
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string; widthClass?: string }[] = [
  { key: 'paper_id', label: 'Paper', widthClass: 'w-32' },
  { key: 'methodology', label: 'Methodology' },
  { key: 'limitations', label: 'Limitations' },
  { key: 'key_finding', label: 'Key Finding' },
  { key: 'equations', label: 'Equations' },
];

export function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('paper_id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = (a[sortKey] || '').toString().toLowerCase();
      const bv = (b[sortKey] || '').toString().toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">Paper Comparison</h3>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border">
                {COLUMNS.map((col) => {
                  const active = col.key === sortKey;
                  const Icon = !active ? ChevronsUpDown : sortDir === 'asc' ? ChevronUp : ChevronDown;
                  return (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className={cn(
                        'text-left font-medium text-muted-foreground py-2 px-2 select-none cursor-pointer hover:text-foreground transition-colors',
                        col.widthClass,
                      )}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        <Icon className={cn('w-3 h-3', active ? 'text-primary' : 'opacity-40')} />
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.paper_id} className="border-b border-border/50 align-top">
                  <td className="py-2 px-2 font-mono">
                    <a
                      href={getArxivUrl(row.paper_id)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {row.paper_id.length > 14 ? `${row.paper_id.slice(0, 14)}…` : row.paper_id}
                    </a>
                  </td>
                  <td className="py-2 px-2 text-foreground/90">{row.methodology || '—'}</td>
                  <td className="py-2 px-2 text-foreground/90">{row.limitations || '—'}</td>
                  <td className="py-2 px-2 text-foreground/90">{row.key_finding || '—'}</td>
                  <td className="py-2 px-2 font-mono text-foreground/90">{row.equations || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

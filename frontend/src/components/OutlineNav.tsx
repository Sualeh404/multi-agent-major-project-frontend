import { useEffect, useMemo, useState } from 'react';
import { List, ChevronUp } from 'lucide-react';
import { cn } from '@/utils/cn';

// Build a slug from heading text — matches the slug react-markdown's
// rehype-slug would produce, but since we don't use that plugin we
// generate matching slugs ourselves by walking the rendered markdown's
// heading elements (queryselectAll after render).

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

interface Heading {
  id: string;
  text: string;
  level: number;
}

export function OutlineNav({ outline, synthesis }: { outline: string[]; synthesis: string }) {
  // Source of truth: parse markdown for headings so the nav reflects what
  // the user actually sees, not just what the LLM returned in `outline`.
  const headings = useMemo<Heading[]>(() => {
    if (!synthesis) return [];
    const out: Heading[] = [];
    const seen = new Map<string, number>();
    for (const line of synthesis.split('\n')) {
      const m = line.match(/^(#{1,3})\s+(.+?)\s*$/);
      if (!m) continue;
      const level = m[1].length;
      const text = m[2].replace(/\[[^\]]*\]/g, '').trim();
      let id = slugify(text);
      const n = (seen.get(id) || 0) + 1;
      seen.set(id, n);
      if (n > 1) id = `${id}-${n}`;
      out.push({ id, text, level });
    }
    return out;
  }, [synthesis]);

  const [activeId, setActiveId] = useState<string | null>(null);

  // After render, tag each heading in the DOM with the matching id so
  // we can scroll to it.
  useEffect(() => {
    if (headings.length === 0) return;
    const els = document.querySelectorAll('.synthesis-essay h1, .synthesis-essay h2, .synthesis-essay h3');
    let idx = 0;
    els.forEach((el) => {
      const h = headings[idx];
      if (h) {
        el.setAttribute('id', h.id);
        idx += 1;
      }
    });
  }, [headings]);

  // Scroll-spy: pick the heading whose top is closest above the viewport top
  useEffect(() => {
    if (headings.length === 0) return;
    const onScroll = () => {
      let current: string | null = headings[0]?.id ?? null;
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= 120) current = h.id;
        else break;
      }
      setActiveId(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [headings]);

  if (headings.length === 0) {
    // Fallback to LLM-provided outline if we couldn't parse headings
    if (!outline.length) return null;
    return (
      <aside className="hidden lg:block sticky top-20 self-start text-xs space-y-1.5">
        <p className="font-semibold text-foreground flex items-center gap-1.5">
          <List className="w-3.5 h-3.5" /> Outline
        </p>
        <ul className="space-y-1 text-muted-foreground">
          {outline.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </aside>
    );
  }

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <aside className="hidden lg:block sticky top-20 self-start w-48 text-xs space-y-1.5">
      <p className="font-semibold text-foreground flex items-center gap-1.5 px-2">
        <List className="w-3.5 h-3.5" /> On this page
      </p>
      <ul className="space-y-0.5 border-l border-border">
        {headings.map((h) => (
          <li key={h.id}>
            <button
              onClick={() => scrollTo(h.id)}
              className={cn(
                'block w-full text-left pl-3 pr-2 py-1 -ml-px border-l-2 transition-colors',
                h.level === 1 && 'font-semibold',
                h.level === 3 && 'pl-6',
                activeId === h.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40',
              )}
            >
              {h.text}
            </button>
          </li>
        ))}
        <li>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="mt-2 flex items-center gap-1.5 pl-3 text-muted-foreground hover:text-foreground"
          >
            <ChevronUp className="w-3 h-3" /> Top
          </button>
        </li>
      </ul>
    </aside>
  );
}

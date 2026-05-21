import { useEffect, useState, useCallback } from 'react';

// Lightweight pathname-based router. Avoids pulling react-router for a
// two-page app. Listens to `popstate` (back/forward) and a synthetic
// `routechange` event we fire on push.

const ROUTE_EVENT = 'routechange';

function readRoute(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname || '/';
}

export function useRoute(): [string, (path: string) => void] {
  const [path, setPath] = useState<string>(readRoute());

  useEffect(() => {
    const onChange = () => setPath(readRoute());
    window.addEventListener('popstate', onChange);
    window.addEventListener(ROUTE_EVENT, onChange);
    return () => {
      window.removeEventListener('popstate', onChange);
      window.removeEventListener(ROUTE_EVENT, onChange);
    };
  }, []);

  const navigate = useCallback((next: string) => {
    if (next === window.location.pathname + window.location.search) return;
    window.history.pushState({}, '', next);
    window.dispatchEvent(new Event(ROUTE_EVENT));
  }, []);

  return [path, navigate];
}

export function getQueryParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
}

export function setQueryParam(name: string, value: string | null) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (value == null) params.delete(name);
  else params.set(name, value);
  const search = params.toString();
  const next = window.location.pathname + (search ? `?${search}` : '');
  window.history.replaceState({}, '', next);
}

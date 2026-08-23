'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Top-of-viewport horizontal progress bar shown during client-side navigation.
 * Server-rendered pages (members, bills, committees) can take a second or more;
 * without this the browser looks frozen after a link click. Zero-dep: hook
 * anchor-click delegation to start, pathname/search change to finish.
 */
export default function TopProgressBar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const started = useRef(false);

  const clearTimers = () => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  };

  const start = () => {
    if (started.current) return;
    started.current = true;
    clearTimers();
    setVisible(true);
    setProgress(10);
    timers.current.push(setTimeout(() => setProgress(35), 150));
    timers.current.push(setTimeout(() => setProgress(60), 500));
    timers.current.push(setTimeout(() => setProgress(80), 1200));
    timers.current.push(setTimeout(() => setProgress(90), 2500));
  };

  const finish = () => {
    if (!started.current) return;
    clearTimers();
    setProgress(100);
    timers.current.push(
      setTimeout(() => {
        setVisible(false);
        started.current = false;
        timers.current.push(setTimeout(() => setProgress(0), 200));
      }, 220),
    );
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as Element | null;
      const anchor = target?.closest('a') as HTMLAnchorElement | null;
      if (!anchor || !anchor.href) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;
      if (anchor.getAttribute('rel')?.includes('external')) return;
      let url: URL;
      try {
        url = new URL(anchor.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      const samePath =
        url.pathname === window.location.pathname && url.search === window.location.search;
      if (samePath) return;
      start();
    };

    const onPopState = () => start();
    const onPageHide = () => {
      clearTimers();
      setVisible(false);
      started.current = false;
    };

    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('pagehide', onPageHide);
      clearTimers();
    };
  }, []);

  useEffect(() => {
    finish();
  }, [pathname, search]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 5,
        zIndex: 2000,
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 200ms ease-out',
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, var(--primary-dark) 0%, var(--primary) 60%, var(--primary-light) 100%)',
          // rgba mirrors --primary-light (#2563EB) — box-shadow color can't reference a CSS var for alpha blending here.
          boxShadow: '0 0 12px rgba(37,99,235,0.85), 0 0 4px rgba(37,99,235,0.7)',
          transition: 'width 300ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      />
    </div>
  );
}

'use client';

import { useEffect, useRef } from 'react';

/** Re-mounts on every navigation: page-enter animation + scroll-reveal for that page's sections. */
export default function Template({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    const root = ref.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((x) => {
          if (x.isIntersecting) {
            x.target.classList.add('in');
            io.unobserve(x.target);
          }
        }),
      { threshold: 0.12 },
    );
    const watch = () => root.querySelectorAll('.reveal:not(.in)').forEach((el) => io.observe(el));
    watch();
    // pick up sections that mount later (tabs, accordions)
    const mo = new MutationObserver(watch);
    mo.observe(root, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);

  return <div ref={ref} className="page-enter">{children}</div>;
}

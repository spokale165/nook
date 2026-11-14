'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/discover', label: 'Discover', icon: 'M12 3l9 8h-2v9h-5v-6H10v6H5v-9H3z' },
  { href: '/matches', label: 'Matches', icon: 'M12 20s-7-4.3-9.3-8.6C1.1 8.2 2.7 5 6 5c1.9 0 3.2 1 3.9 2M12 20s7-4.3 9.3-8.6C22.9 8.2 21.3 5 18 5c-1.9 0-3.2 1-3.9 2' },
  { href: '/profile', label: 'Profile', icon: null },
];

export default function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabbar">
      {TABS.map((t) => {
        const on = path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`tab ${on ? 'on' : ''}`}>
            {t.label === 'Profile' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d={t.icon} />
              </svg>
            )}
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

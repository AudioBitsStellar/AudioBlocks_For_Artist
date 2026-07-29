'use client';

import { Music, Calendar, Tag, Settings as SettingsIcon, Star, Home, X, BarChart3, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { getTotalUnreadCount } from '@/services/messageService';

const navItems = [
  { name: 'Overview', icon: Home, href: '/dashboard/overview' },
  { name: 'My Music', icon: Music, href: '/dashboard/my-music' },
  { name: 'Analytics', icon: BarChart3, href: '/dashboard/analytics' },
  { name: 'Events', icon: Calendar, href: '/dashboard/events' },
  { name: 'Merches', icon: Tag, href: '/dashboard/merches' },
  { name: 'Messages', icon: MessageSquare, href: '/dashboard/messages' },
  { name: 'Premium', icon: Star, href: '/dashboard/premium' },
  { name: 'Settings', icon: SettingsIcon, href: '/dashboard/settings/notifications' },
];

const legalLinks = [
  { name: 'Privacy Center', href: '/privacy-center' },
  { name: 'Privacy Policy', href: '/privacy-policy' },
  { name: 'Cookies', href: '/cookies' },
];

export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const navItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const handleNavKeyDown = (event: React.KeyboardEvent<HTMLElement>, index: number) => {
    const total = navItems.length;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = (index + 1) % total;
      navItemRefs.current[next]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const previous = (index - 1 + total) % total;
      navItemRefs.current[previous]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      navItemRefs.current[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      navItemRefs.current[total - 1]?.focus();
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 md:hidden ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        id="sidebar-nav"
        role={open ? 'dialog' : 'navigation'}
        aria-modal={open ? true : undefined}
        aria-label="Sidebar navigation"
        className={`fixed left-0 top-0 z-50 flex h-full w-64 transform flex-col border-r border-transparent bg-surface transition-transform duration-300 ease-in-out dark:border-border-subtle dark:bg-background md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-6 md:hidden">
          <Image
            src="/logo.png"
            alt="AudioBlocks Logo"
            width={90}
            height={50}
          />
          <button
            type="button"
            className="cursor-pointer rounded-lg p-2 text-white hover:text-pink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X className="text-white" aria-hidden="true" />
          </button>
        </div>

        <div className="hidden p-9 md:flex">
          <Link
            href="/"
            className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            aria-label="AudioBlocks Home"
          >
            <Image
              src="/logo.png"
              alt="AudioBlocks Logo"
              width={99}
              height={54}
            />
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Main navigation">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const unread = item.href === '/dashboard/messages' ? getTotalUnreadCount() : 0;

            return (
              <Link
                key={item.name}
                href={item.href}
                ref={(element) => {
                  navItemRefs.current[index] = element;
                }}
                onClick={onClose}
                onKeyDown={(event) => handleNavKeyDown(event, index)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                  isActive
                    ? 'bg-pink-500/10 font-semibold text-pink-500'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white dark:text-gray-400'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={20} aria-hidden="true" />
                <span className={`flex-1 ${isActive ? 'font-medium' : ''}`}>
                  {item.name}
                </span>
                {unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D2045B] px-1 text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 p-4" aria-label="Legal links">
          {legalLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={onClose}
              className="block rounded-lg px-4 py-1 text-xs text-gray-400 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            >
              {link.name}
            </Link>
          ))}
        </div>
      </aside>
    </>
  );
}

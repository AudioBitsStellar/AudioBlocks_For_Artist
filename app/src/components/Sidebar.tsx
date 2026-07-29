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

  // Prevent body scroll while mobile drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Arrow key navigation between sidebar links
  const handleNavKeyDown = (e: React.KeyboardEvent<HTMLElement>, index: number) => {
    const total = navItems.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (index + 1) % total;
      navItemRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (index - 1 + total) % total;
      navItemRefs.current[prev]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      navItemRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      navItemRefs.current[total - 1]?.focus();
    }
  };

  return (
    <>
      {/* Mobile Dark Overlay */}
      {open && (
        <div
          onClick={onClose}
          aria-hidden="true"
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        role={open ? 'dialog' : 'navigation'}
        aria-modal={open ? true : undefined}
        aria-label="Sidebar navigation"
        className={`
          fixed top-0 left-0 h-full w-64 bg-surface dark:bg-background flex flex-col
          border-r border-transparent dark:border-border-subtle
          transform transition-transform duration-300 ease-in-out
          z-50

          ${open ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        {/* Mobile Header */}
        <div className="p-6 flex items-center justify-between md:hidden">
          <Image
            src="/logo.png"
            alt="AudioBlocks Logo"
            width={90}
            height={50}
          />
          <button
            className="cursor-pointer text-white hover:text-pink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-lg p-1"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X className="text-white" aria-hidden="true" />
          </button>
        </div>

        {/* Desktop Logo */}
        <div className="hidden md:flex p-9">
          <Link
            href="/"
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-lg"
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

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1" aria-label="Main navigation" role="navigation">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + '/');
            const unread = item.href === '/dashboard/messages' ? getTotalUnreadCount() : 0;

            return (
              <Link
                key={item.name}
                href={item.href}
                ref={(el) => { navItemRefs.current[index] = el; }}
                onClick={onClose}
                onKeyDown={(e) => handleNavKeyDown(e, index)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black
                  ${
                    isActive
                      ? 'text-pink-500 font-semibold bg-pink-500/10'
                      : 'text-gray-300 dark:text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={20} aria-hidden="true" />
                <span className={`flex-1 ${isActive ? 'font-medium' : ''}`}>
                  {item.name}
                </span>
                {unread > 0 && (
                  <span className="h-5 min-w-5 rounded-full bg-[#D2045B] flex items-center justify-center text-[10px] font-bold text-white px-1">
                    {unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Legal */}
        <div className="p-4" role="navigation" aria-label="Legal links">
          <h3 className="text-gray-400 dark:text-gray-500 text-sm font-semibold mb-2">
            Legal
          </h3>
          {legalLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={onClose}
              className="block text-gray-400 dark:text-gray-500 text-sm hover:text-white py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              {link.name}
            </Link>
          ))}
        </div>
      </aside>
    </>
  );
}
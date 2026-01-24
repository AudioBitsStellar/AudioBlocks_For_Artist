'use client';

import { Music, Calendar, Tag, Star, Home, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const navItems = [
  { name: 'Overview', icon: Home, href: '/dashboard/overview' },
  { name: 'My Music', icon: Music, href: '/dashboard/my-music' },
  { name: 'Events', icon: Calendar, href: '/dashboard/events' },
  { name: 'Merches', icon: Tag, href: '/dashboard/merches' },
  { name: 'Premium', icon: Star, href: '/dashboard/premium' },
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

  return (
    <>
      {/* Mobile Dark Overlay */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-full w-64 bg-[#161616] flex flex-col
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
          <button className='cursor-pointer' onClick={onClose}>
            <X className="text-white" />
          </button>
        </div>

        {/* Desktop Logo */}
        <div className="hidden md:flex p-9">
          <Link href="/">
            <Image
              src="/logo.png"
              alt="AudioBlocks Logo"
              width={99}
              height={54}
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose} // 👈 closes sidebar on mobile
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${
                    isActive
                      ? 'text-pink-500'
                      : 'text-gray-300 hover:text-white'
                  }`}
              >
                <Icon size={20} />
                <span className={isActive ? 'font-medium' : ''}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Legal */}
        <div className="p-4">
          <h3 className="text-gray-400 text-sm font-semibold mb-2">
            Legal
          </h3>
          {legalLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={onClose}
              className="block text-gray-400 text-sm hover:text-white py-1"
            >
              {link.name}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

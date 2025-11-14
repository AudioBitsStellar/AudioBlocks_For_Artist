'use client';

import { Music, Calendar, Tag, Star, Home } from 'lucide-react';
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

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-[#161616] flex flex-col">
      {/* Logo */}
      <div className="p-9 flex flex-col">
        <Link href="/" className="flex ">
          <Image src="/logo.png" alt="AudioBlocks Logo" width={99} height={54} className="object-contain" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'text-pink-500'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Icon 
                size={20} 
                className={isActive ? 'text-pink-500' : 'text-gray-300'}
              />
              <span className={isActive ? 'text-pink-500 font-medium' : ''}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Legal Section */}
      <div className="p-4 #151918 ">
        <h3 className="text-gray-400 text-sm font-semibold mb-2">Legal</h3>
        <div className="space-y-1">
          {legalLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="block text-gray-400 text-sm hover:text-white transition-colors py-1"
            >
              {link.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}


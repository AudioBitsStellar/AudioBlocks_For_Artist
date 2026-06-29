'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ReactNode } from 'react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  action?: ReactNode;
}

export default function Breadcrumb({ items, action }: BreadcrumbProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        {items.map((item, index) => (
          <span key={index} className="flex items-center gap-2">
            {index > 0 && <ChevronRight size={16} className="text-gray-400" aria-hidden="true" />}
            {item.href ? (
              <Link href={item.href} className="text-gray-400 hover:text-white transition-colors">
                {item.label}
              </Link>
            ) : item.onClick ? (
              <button
                onClick={item.onClick}
                className={`transition-colors ${
                  item.isActive ? 'text-white font-medium' : 'text-gray-400 hover:text-white'
                }`}
                aria-current={item.isActive ? 'page' : undefined}
              >
                {item.label}
              </button>
            ) : (
              <span className={item.isActive ? 'text-white font-medium' : 'text-gray-400'} aria-current={item.isActive ? 'page' : undefined}>
                {item.label}
              </span>
            )}
          </span>
        ))}
      </nav>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
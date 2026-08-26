"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ReactNode } from "react";

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
    <div className="flex min-w-0 items-center justify-between gap-4">
      <nav aria-label="Breadcrumb" className="min-w-0 max-w-full overflow-x-auto">
        <ol className="flex min-w-max items-center gap-2 text-sm">
          {items.map((item, index) => (
            <li key={`${item.label}-${index}`} className="flex shrink-0 items-center gap-2">
              {index > 0 && (
                <ChevronRight size={16} className="shrink-0 text-gray-400" aria-hidden="true" />
              )}
              {item.href ? (
                <Link
                  href={item.href}
                  className="max-w-[8rem] truncate text-gray-400 transition-colors hover:text-white sm:max-w-none"
                >
                  {item.label}
                </Link>
              ) : item.onClick ? (
                <button
                  onClick={item.onClick}
                  className={`max-w-[8rem] truncate transition-colors sm:max-w-none ${
                    item.isActive ? "font-medium text-white" : "text-gray-400 hover:text-white"
                  }`}
                  aria-current={item.isActive ? "page" : undefined}
                >
                  {item.label}
                </button>
              ) : (
                <span
                  className={`max-w-[8rem] truncate sm:max-w-none ${
                    item.isActive ? "font-medium text-white" : "text-gray-400"
                  }`}
                  aria-current={item.isActive ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export { Breadcrumb };

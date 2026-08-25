'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  className?: string;
  contentClassName?: string;
  overlayClassName?: string;
  closeAriaLabel?: string;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

/**
 * Reusable Modal component built on Radix UI Dialog
 * Provides consistent styling and behavior across the application
 */
export default function Modal({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  size = 'md',
  showCloseButton = true,
  className = '',
  contentClassName = '',
  overlayClassName = '',
  closeAriaLabel = 'Close dialog',
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal>
      <Dialog.Portal>
        <Dialog.Overlay
          className={`fixed inset-0 bg-black/70 backdrop-blur-sm ${overlayClassName}`}
          style={{ zIndex: 100000 }}
        />
        <Dialog.Content
          className={`fixed inset-0 flex items-center justify-center p-4 overflow-y-auto ${className}`}
          style={{ zIndex: 100001 }}
        >
          <div
            className={`w-full ${sizeClasses[size]} rounded-3xl border border-[#2A2A2A] bg-[#0F0F0F] p-8 shadow-2xl my-8 ${contentClassName}`}
          >
            {/* Header */}
            {(title || subtitle || showCloseButton) && (
              <div className="mb-6 flex items-center justify-between">
                {(title || subtitle) && (
                  <div>
                    {subtitle && (
                      <p className="text-xs uppercase tracking-[0.3em] text-[#A3A3A3]">{subtitle}</p>
                    )}
                    {title && (
                      <Dialog.Title className={`${subtitle ? 'mt-2' : ''} text-2xl font-semibold text-white`}>
                        {title}
                      </Dialog.Title>
                    )}
                  </div>
                )}
                {showCloseButton && (
                  <Dialog.Close asChild>
                    <button
                      aria-label={closeAriaLabel}
                      className="flex items-center justify-center min-w-11 min-h-11 rounded-full text-gray-400 transition hover:bg-white/5 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </Dialog.Close>
                )}
              </div>
            )}

            {/* Content */}
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

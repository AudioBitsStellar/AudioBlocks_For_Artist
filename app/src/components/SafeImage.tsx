'use client';

import { useState } from 'react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /** Custom fallback image URL. When omitted an inline SVG placeholder is used. */
  fallbackSrc?: string;
  /** Extra class names applied to the placeholder element. */
  placeholderClassName?: string;
}

/**
 * Wraps <img> with onError handling — closes #164.
 *
 * - Shows a styled placeholder when the image fails to load.
 * - Logs the failing URL to the console for debugging / monitoring.
 * - Accepts an optional fallbackSrc; otherwise renders an inline SVG.
 */
export default function SafeImage({
  src,
  alt,
  fallbackSrc,
  className,
  placeholderClassName,
  ...props
}: SafeImageProps) {
  const [errored, setErrored] = useState(false);

  const handleError = () => {
    console.warn(`[SafeImage] Failed to load image: ${src}`);
    setErrored(true);
  };

  if (errored) {
    if (fallbackSrc) {
      return (
        <img
          src={fallbackSrc}
          alt={alt}
          className={className}
          {...props}
        />
      );
    }

    return (
      <div
        role="img"
        aria-label={alt}
        data-testid="safe-image-placeholder"
        className={[
          'flex items-center justify-center bg-gray-800 text-gray-500',
          className ?? '',
          placeholderClassName ?? '',
        ]
          .join(' ')
          .trim()}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="w-1/3 h-1/3 min-w-[24px] min-h-[24px] opacity-40"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={handleError}
      {...props}
    />
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /** Custom fallback image URL. When omitted an inline SVG placeholder is used. */
  fallbackSrc?: string;
  /** Extra class names applied to the placeholder element. */
  placeholderClassName?: string;
}

/**
 * Wraps <img> with onError handling, native loading="lazy", IntersectionObserver fallback,
 * and low-quality placeholder/blur-up state.
 */
export default function SafeImage({
  src,
  alt,
  fallbackSrc,
  className,
  placeholderClassName,
  loading = 'lazy',
  width = 192,
  height = 192,
  ...props
}: SafeImageProps) {
  const [errored, setErrored] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setShouldLoad(true);
      return;
    }

    // Use native lazy loading if supported
    if ('loading' in HTMLImageElement.prototype) {
      setShouldLoad(true);
      return;
    }

    // Fallback to IntersectionObserver for legacy browsers
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleError = () => {
    console.warn(`[SafeImage] Failed to load image: ${src}`);
    setErrored(true);
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  if (errored) {
    if (fallbackSrc) {
      return (
        <img
          src={fallbackSrc}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
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
          'flex items-center justify-center bg-gray-800 text-gray-500 rounded-lg aspect-square',
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
    <div ref={containerRef} className="relative w-full h-full overflow-hidden aspect-square rounded-lg bg-gray-800">
      {!isLoaded && (
        <div
          data-testid="image-skeleton-placeholder"
          className="absolute inset-0 bg-gray-800 animate-pulse rounded-lg flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="w-8 h-8 text-gray-700 opacity-50"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
        </div>
      )}
      {shouldLoad && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          onLoad={handleLoad}
          onError={handleError}
          className={`${className ?? ''} transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          {...props}
        />
      )}
    </div>
  );
}

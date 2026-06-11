'use client';
import { useEffect, useState } from 'react';
import brand from '@/config/brand';

interface LogoProps {
  /** 'icon' = chỉ logo/emoji · 'full' = logo + tên + tagline · 'name' = logo + tên */
  variant?: 'icon' | 'name' | 'full';
  /** Cỡ logo icon (px) */
  size?: number;
  /** Màu chữ tên (Tailwind class) */
  nameClass?: string;
  /** Màu chữ tagline (Tailwind class) */
  taglineClass?: string;
}

// cache trong bộ nhớ session để tránh fetch lại mỗi render
let _cachedUrl: string | null | undefined = undefined;

export default function Logo({
  variant = 'full',
  size = 40,
  nameClass = 'text-indigo-400',
  taglineClass = 'text-gray-400',
}: LogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(
    _cachedUrl !== undefined ? _cachedUrl : (brand.logoImage ?? null)
  );

  useEffect(() => {
    if (_cachedUrl !== undefined) return; // đã có cache
    fetch('/api/brand/upload')
      .then((r) => r.json())
      .then((d) => {
        _cachedUrl = d.url ?? null;
        setLogoUrl(_cachedUrl as string | null);
      })
      .catch(() => {
        _cachedUrl = null;
      });
  }, []);

  const icon = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={brand.name}
      width={size}
      height={size}
      className="rounded-lg object-contain flex-shrink-0"
      style={{ width: size, height: size }}
      onError={() => setLogoUrl(null)}
    />
  ) : (
    <span style={{ fontSize: size * 0.7 }} className="flex-shrink-0 leading-none select-none">
      {brand.emoji}
    </span>
  );

  if (variant === 'icon') return <>{icon}</>;

  return (
    <div className="flex items-center gap-2.5">
      {icon}
      <div className="min-w-0">
        <div className={`font-bold leading-tight truncate ${nameClass}`} style={{ fontSize: size * 0.4 }}>
          {brand.name}
        </div>
        {variant === 'full' && (
          <div className={`text-xs leading-tight truncate ${taglineClass}`}>
            {brand.tagline}
          </div>
        )}
      </div>
    </div>
  );
}

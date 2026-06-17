'use client';
import { useEffect, useState } from 'react';
import brand from '@/config/brand';

interface LogoProps {
  variant?: 'icon' | 'name' | 'full';
  size?: number;
  nameClass?: string;
  taglineClass?: string;
}

interface BrandConfig {
  name: string;
  tagline: string;
  emoji: string;
}

let _cachedLogo: string | null | undefined = undefined;
let _cachedConfig: BrandConfig | undefined = undefined;

export default function Logo({
  variant = 'full',
  size = 40,
  nameClass = 'text-indigo-400',
  taglineClass = 'text-gray-400',
}: LogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(
    _cachedLogo !== undefined ? _cachedLogo : (brand.logoImage ?? null)
  );
  const [config, setConfig] = useState<BrandConfig>(
    _cachedConfig ?? { name: brand.name, tagline: brand.tagline, emoji: brand.emoji }
  );

  useEffect(() => {
    if (_cachedLogo === undefined) {
      fetch('/api/brand/upload')
        .then((r) => r.json())
        .then((d) => {
          _cachedLogo = d.url ?? null;
          setLogoUrl(_cachedLogo as string | null);
        })
        .catch(() => { _cachedLogo = null; });
    }

    if (_cachedConfig === undefined) {
      fetch('/api/brand/config')
        .then((r) => r.json())
        .then((d: BrandConfig) => {
          _cachedConfig = d;
          setConfig(d);
        })
        .catch(() => {});
    }
  }, []);

  const icon = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={config.name}
      width={size}
      height={size}
      className="rounded-lg object-contain flex-shrink-0"
      style={{ width: size, height: size }}
      onError={() => setLogoUrl(null)}
    />
  ) : (
    <span style={{ fontSize: size * 0.7 }} className="flex-shrink-0 leading-none select-none">
      {config.emoji}
    </span>
  );

  if (variant === 'icon') return <>{icon}</>;

  return (
    <div className="flex items-center gap-2.5">
      {icon}
      <div className="min-w-0">
        <div className={`font-bold leading-tight truncate ${nameClass}`} style={{ fontSize: size * 0.4 }}>
          {config.name}
        </div>
        {variant === 'full' && (
          <div className={`text-xs leading-tight truncate ${taglineClass}`}>
            {config.tagline}
          </div>
        )}
      </div>
    </div>
  );
}

// Expose cache bust helper (gọi sau khi save để refresh logo mà không reload page)
export function bustBrandCache() {
  _cachedLogo = undefined;
  _cachedConfig = undefined;
}

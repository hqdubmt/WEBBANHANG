import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';

const BRAND_DIR = path.join(process.cwd(), 'public', 'brand');
const CONFIG_PATH = path.join(BRAND_DIR, 'brand.json');

interface BrandConfig {
  name?: string;
  tagline?: string;
  emoji?: string;
  primaryColor?: string;
  // Thông tin liên hệ & hỗ trợ
  hotline?: string;
  email?: string;
  address?: string;
  workingHours?: string;
  facebook?: string;
  zalo?: string;
  telegram?: string;
  copyright?: string;
}

const DEFAULTS: Required<BrandConfig> = {
  name: 'AI Commerce OS',
  tagline: 'V3 · 16 AI Agents · Multi-channel',
  emoji: '🚀',
  primaryColor: 'indigo',
  hotline: '',
  email: '',
  address: '',
  workingHours: '8:00 – 22:00 hàng ngày',
  facebook: '',
  zalo: '',
  telegram: '',
  copyright: '',
};

const ALLOWED_KEYS = Object.keys(DEFAULTS);

async function readConfig(): Promise<Required<BrandConfig>> {
  if (!fs.existsSync(CONFIG_PATH)) return DEFAULTS;
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export async function GET() {
  const config = await readConfig();
  return NextResponse.json(config);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as BrandConfig;

  const update: Partial<BrandConfig> = {};
  for (const key of ALLOWED_KEYS) {
    if (key in body && typeof body[key as keyof BrandConfig] === 'string') {
      (update as Record<string, string>)[key] = (body as Record<string, string>)[key].trim();
    }
  }

  if (!fs.existsSync(BRAND_DIR)) {
    fs.mkdirSync(BRAND_DIR, { recursive: true });
  }

  const current = await readConfig();
  const merged = { ...current, ...update };
  await writeFile(CONFIG_PATH, JSON.stringify(merged, null, 2));

  return NextResponse.json(merged);
}

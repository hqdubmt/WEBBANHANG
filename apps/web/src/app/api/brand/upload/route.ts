import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import fs from 'fs';

const BRAND_DIR = path.join(process.cwd(), 'public', 'brand');
const LOGO_PATH = path.join(BRAND_DIR, 'logo.png');

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'Không có file' }, { status: 400 });
  }

  const mime = file.type;
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(mime)) {
    return NextResponse.json({ error: 'Chỉ hỗ trợ PNG, JPG, WEBP, SVG' }, { status: 400 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'File tối đa 2MB' }, { status: 400 });
  }

  if (!fs.existsSync(BRAND_DIR)) {
    fs.mkdirSync(BRAND_DIR, { recursive: true });
  }

  const ext = mime === 'image/svg+xml' ? 'svg' : mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png';
  const savePath = path.join(BRAND_DIR, `logo.${ext}`);

  // xóa logo cũ nếu khác định dạng
  for (const e of ['png', 'jpg', 'webp', 'svg']) {
    const old = path.join(BRAND_DIR, `logo.${e}`);
    if (old !== savePath && fs.existsSync(old)) {
      await unlink(old).catch(() => {});
    }
  }

  const bytes = await file.arrayBuffer();
  await writeFile(savePath, Buffer.from(bytes));

  return NextResponse.json({ url: `/brand/logo.${ext}?t=${Date.now()}` });
}

export async function DELETE() {
  for (const e of ['png', 'jpg', 'webp', 'svg']) {
    const p = path.join(BRAND_DIR, `logo.${e}`);
    if (fs.existsSync(p)) await unlink(p).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  for (const e of ['png', 'jpg', 'webp', 'svg']) {
    const p = path.join(BRAND_DIR, `logo.${e}`);
    if (fs.existsSync(p)) {
      return NextResponse.json({ url: `/brand/logo.${e}?t=${Date.now()}` });
    }
  }
  return NextResponse.json({ url: null });
}

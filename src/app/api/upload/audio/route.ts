import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const ALLOWED_TYPES = [
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/mp4',
  'audio/ogg',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
];

export async function POST(request: Request): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    // Normalize: `audio/webm;codecs=opus` → `audio/webm` for the check
    const baseType = file.type.split(';')[0].trim();
    if (!ALLOWED_TYPES.some(t => t.startsWith(baseType))) {
      return NextResponse.json({ error: 'Invalid audio type' }, { status: 400 });
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 400 });
    }

    const blob = await put(`chat/audio/${userId}-${Date.now()}-${file.name}`, file, {
      access: 'public',
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

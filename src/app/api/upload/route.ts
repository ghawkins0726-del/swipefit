import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { withAuth, apiError } from '@/lib/api-helpers';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 10 * 1024 * 1024;

export const POST = withAuth(async (request) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) return apiError.badRequest('No file provided');
    if (!ALLOWED_TYPES.includes(file.type)) return apiError.badRequest('Invalid file type');
    if (file.size > MAX_BYTES) return apiError.badRequest('File too large (max 10 MB)');

    const folder = (formData.get('folder') as string | null) === 'chat' ? 'chat' : 'items';
    // Sanitize filename — strip path traversal chars, limit length
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    const blob = await put(`${folder}/${Date.now()}-${safeName}`, file, { access: 'public' });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    // Never expose internal error details to the client
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
});

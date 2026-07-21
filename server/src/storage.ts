import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Re-hosts generated images.
 *
 * kie.ai deletes generated images after 14 days, so storing their URL as a
 * recipe's photoUrl would mean every picture silently disappearing within a
 * fortnight. We copy the bytes to storage we control and serve our own URL.
 *
 * This writes to local disk, which is fine for development and single-server
 * deployments. Swap the body of `storeImage` for S3/R2/Supabase when you deploy
 * somewhere with an ephemeral filesystem — the signature stays the same.
 */

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

export async function storeImage(sourceUrl: string, publicBaseUrl: string): Promise<string> {
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`Could not download image (${response.status})`);

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') ?? '';
  const ext = contentType.includes('jpeg') ? 'jpg' : contentType.includes('webp') ? 'webp' : 'png';

  const name = `${createHash('sha256').update(buffer).digest('hex').slice(0, 32)}.${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), buffer);

  return `${publicBaseUrl.replace(/\/$/, '')}/uploads/${name}`;
}

export const uploadDir = UPLOAD_DIR;

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

async function writeToUploads(buffer: Buffer, ext: string, publicBaseUrl: string): Promise<string> {
  const name = `${createHash('sha256').update(buffer).digest('hex').slice(0, 32)}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), buffer);
  return `${publicBaseUrl.replace(/\/$/, '')}/uploads/${name}`;
}

export async function storeImage(sourceUrl: string, publicBaseUrl: string): Promise<string> {
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`Could not download image (${response.status})`);

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') ?? '';
  const ext = contentType.includes('jpeg') ? 'jpg' : contentType.includes('webp') ? 'webp' : 'png';

  return writeToUploads(buffer, ext, publicBaseUrl);
}

/**
 * Same idea, but for a photo the phone uploaded directly as a base64 data URL
 * (a scanned recipe card, a screenshot) rather than something we fetched.
 */
export async function storeImageFromDataUrl(dataUrl: string, publicBaseUrl: string): Promise<string> {
  const match = dataUrl.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/i);
  if (!match) throw new Error('Not a recognised image data URL');

  const ext = match[1].toLowerCase() === 'jpg' ? 'jpg' : match[1].toLowerCase();
  const buffer = Buffer.from(match[2], 'base64');

  return writeToUploads(buffer, ext, publicBaseUrl);
}

export const uploadDir = UPLOAD_DIR;

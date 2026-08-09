import { createHash } from 'node:crypto';

import { supabaseAdmin } from './supabase-admin.js';

/**
 * Re-hosts generated images.
 *
 * kie.ai deletes generated images after 14 days, so storing their URL as a
 * recipe's photoUrl would mean every picture silently disappearing within a
 * fortnight. We copy the bytes into the `recipe-photos` Supabase Storage
 * bucket (already set up for user-uploaded photos — see
 * supabase/migrations/0001_init.sql) and serve that public URL instead.
 *
 * Deliberately not local disk: most hosts (Render included) run an ephemeral
 * filesystem that's wiped on every restart or redeploy, which would silently
 * delete every photo the app has ever shown. Uses the service_role key (via
 * supabase-admin.ts) since these uploads aren't owned by a specific
 * signed-in user at generation time — the recipe doesn't get a user_id until
 * it's actually saved.
 */

const BUCKET = 'recipe-photos';

async function uploadToBucket(buffer: Buffer, ext: string, contentType: string): Promise<string> {
  const name = `generated/${createHash('sha256').update(buffer).digest('hex').slice(0, 32)}.${ext}`;

  const { error } = await supabaseAdmin()
    .storage.from(BUCKET)
    .upload(name, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Could not store image: ${error.message}`);

  const { data } = supabaseAdmin().storage.from(BUCKET).getPublicUrl(name);
  return data.publicUrl;
}

export async function storeImage(sourceUrl: string): Promise<string> {
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`Could not download image (${response.status})`);

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') ?? 'image/png';
  const ext = contentType.includes('jpeg') ? 'jpg' : contentType.includes('webp') ? 'webp' : 'png';

  return uploadToBucket(buffer, ext, contentType);
}

/**
 * Same idea, but for a photo the phone uploaded directly as a base64 data URL
 * (a scanned recipe card, a screenshot) rather than something we fetched.
 */
export async function storeImageFromDataUrl(dataUrl: string): Promise<string> {
  const match = dataUrl.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/i);
  if (!match) throw new Error('Not a recognised image data URL');

  const ext = match[1].toLowerCase() === 'jpg' ? 'jpg' : match[1].toLowerCase();
  const contentType = `image/${match[1].toLowerCase() === 'jpg' ? 'jpeg' : match[1].toLowerCase()}`;
  const buffer = Buffer.from(match[2], 'base64');

  return uploadToBucket(buffer, ext, contentType);
}

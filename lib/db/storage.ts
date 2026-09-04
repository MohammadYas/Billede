import { randomBytes } from 'node:crypto';
import { CONFIG } from '@/lib/config';
import { supabaseAdmin } from './supabase';

export const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'genfundet-private';

/** Unguessable object path: orders/<orderId>/<kind>-<24 hex>.jpg */
export function objectPath(orderId: string, kind: 'upload' | 'original' | 'restored' | 'preview' | 'colourised' | 'mockup' | 'final' | 'candidate'): string {
  return `orders/${orderId}/${kind}-${randomBytes(12).toString('hex')}.jpg`;
}

export async function putObject(path: string, body: Buffer, contentType = 'image/jpeg'): Promise<string> {
  const { error } = await supabaseAdmin().storage.from(BUCKET).upload(path, body, { contentType, upsert: false, cacheControl: '0' });
  if (error) throw new Error(`storage upload failed: ${error.message}`);
  return path;
}

export async function getObject(path: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(`storage download failed: ${error?.message ?? 'no data'}`);
  return Buffer.from(await data.arrayBuffer());
}

/** Short-lived signed URL (≤ 15 min). */
export async function signedUrl(path: string, seconds = CONFIG.signedUrlSeconds): Promise<string> {
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).createSignedUrl(path, Math.min(seconds, CONFIG.signedUrlSeconds));
  if (error || !data) throw new Error(`signed url failed: ${error?.message ?? 'no data'}`);
  return data.signedUrl;
}

export async function removeObjects(paths: string[]): Promise<void> {
  const real = paths.filter(Boolean);
  if (!real.length) return;
  const { error } = await supabaseAdmin().storage.from(BUCKET).remove(real);
  if (error) throw new Error(`storage remove failed: ${error.message}`);
}

/** One-time signed URL the browser PUTs the raw photo to (bypasses any function body limit). */
export async function createSignedUpload(path: string): Promise<{ signedUrl: string; token: string }> {
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`createSignedUpload: ${error?.message ?? 'no data'}`);
  return { signedUrl: data.signedUrl, token: data.token };
}

export async function objectExists(path: string): Promise<boolean> {
  const i = path.lastIndexOf('/');
  const folder = path.slice(0, i), name = path.slice(i + 1);
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).list(folder, { search: name, limit: 5 });
  if (error) return false;
  return (data ?? []).some((f) => f.name === name);
}

/** Every object under orders/<id>/ — deletion must not depend on the paths recorded on the row. */
export async function removeOrderObjects(orderId: string): Promise<string[]> {
  const folder = `orders/${orderId}`;
  const { data } = await supabaseAdmin().storage.from(BUCKET).list(folder, { limit: 200 });
  const paths = (data ?? []).map((f) => `${folder}/${f.name}`);
  if (paths.length) await supabaseAdmin().storage.from(BUCKET).remove(paths);
  return paths;
}

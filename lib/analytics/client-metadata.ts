/** Product-only metadata for the public event endpoint. Never persist arbitrary browser input. */
export function clientMetadata(input: unknown): Record<string, unknown> | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const m = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const enums: Record<string, readonly string[]> = {
    cta: ['A', 'B', 'C'], currency: ['DKK'], content_type: ['product'],
    content_name: ['Restaureret og indrammet familiebillede', 'preview', 'ekstra_eksemplar', 'hero'],
    type: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', ''],
  };
  for (const [key, values] of Object.entries(enums)) if (typeof m[key] === 'string' && values.includes(m[key])) out[key] = m[key];
  for (const [key, max] of Object.entries({ value: 100000, num_items: 10, bytes: 25 * 1024 * 1024 })) {
    const value = m[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max) out[key] = value;
  }
  if (Array.isArray(m.content_ids)) {
    const ids = m.content_ids.filter(v => typeof v === 'string' && ['20x30', '30x40', '40x50', '50x70'].includes(v));
    if (ids.length) out.content_ids = [...new Set(ids)];
  }
  return Object.keys(out).length ? out : undefined;
}

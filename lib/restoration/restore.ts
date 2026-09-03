import OpenAI, { toFile } from 'openai';
import { CONFIG } from '@/lib/config';
import { COLOURISATION_PROMPT, LIKENESS_PROMPT, RESTORATION_PROMPT } from './prompts';
import { chromaStats, dimensionsOf, ensureLongEdge, ensureMinimumSize, fitLongEdge, normaliseToJpeg, ssimLuma, trimScannerBorder } from './image-utils';

/**
 * Restoration pipeline.
 *
 * Verified against the live API on 2026-09-03:
 * - `gpt-image-2` keeps the input aspect ratio with `size: "auto"` and does not
 *   accept `input_fidelity`. `gpt-image-1.5` accepts `input_fidelity` but
 *   snaps to 1536×1024 / 1024×1536 and reframes the photograph. We use gpt-image-2.
 * - n=2 at quality "medium" ≈ 33 s, quality "high" ≈ 85–100 s. The customer
 *   preview therefore runs "medium"; the print final re-runs "high" asynchronously.
 */

export const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-2';
export const VISION_MODEL = process.env.OPENAI_VISION_MODEL ?? 'gpt-5.5';
export type ImageQuality = 'low' | 'medium' | 'high';

export type LikenessResult = {
  same_people: boolean;
  likeness: number;
  invented_details: boolean;
  removed_content: boolean;
  over_processed: boolean;
  face_count_a: number;
  face_count_b: number;
  notes: string;
};

export type RestoreOptions = {
  /** "medium" for the customer preview, "high" for the print final. */
  quality?: ImageQuality;
  /** Number of restoration candidates. Default 2. */
  candidates?: number;
  /** Run the colourisation pass in this call (default false — see DECISIONS.md). */
  colourise?: boolean;
  /** Run the vision likeness check (default true). */
  likenessCheck?: boolean;
  /** Minimum long edge of the returned restored buffer. Default 2400. */
  minLongEdge?: number;
  /** Hard end-to-end limit in ms. Default CONFIG.previewTimeoutMs. */
  timeoutMs?: number;
  /** Requested output size for the image model; "auto" keeps the aspect. */
  size?: string;
};

export type RestoreMetadata = {
  model: string;
  visionModel: string;
  quality: ImageQuality;
  durationMs: number;
  restorationMs: number;
  likenessMs?: number;
  colourisationMs?: number;
  candidateId: number;
  candidateSsim: number[];
  ssim: number;
  chroma: { meanChroma: number; chromaStd: number; isMonochrome: boolean };
  input: { width: number; height: number; trimmed: boolean; upscaled: boolean };
  output: { width: number; height: number };
  usage: { imageTokens: number; visionTokens: number };
  faceCheck: { original: number; restored: number; ok: boolean } | null;
  likeness: LikenessResult | null;
  needsManualReview: boolean;
  reviewReasons: string[];
};

export type RestoreResult = {
  original: Buffer;
  restored: Buffer;
  candidates: Buffer[];
  colourised: Buffer | null;
  isMonochrome: boolean;
  meta: RestoreMetadata;
};

export class RestoreError extends Error {
  constructor(public code: 'timeout' | 'unsupported_image' | 'too_small' | 'provider_error' | 'unknown', message: string) {
    super(message);
  }
}

let client: OpenAI | null = null;
function openai(): OpenAI {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) throw new RestoreError('provider_error', 'OPENAI_API_KEY missing');
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 120_000, maxRetries: 0 });
  }
  return client;
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => { t = setTimeout(() => reject(new RestoreError('timeout', `${label} exceeded ${ms} ms`)), ms); });
  try { return await Promise.race([p, timeout]); } finally { if (t) clearTimeout(t); }
}

type EditResponse = { data?: { b64_json?: string }[]; usage?: { total_tokens?: number } };

async function imageEdit(input: Buffer, prompt: string, n: number, quality: ImageQuality, size: string, signal?: AbortSignal): Promise<{ images: Buffer[]; tokens: number }> {
  const file = await toFile(input, 'input.jpg', { type: 'image/jpeg' });
  let res: EditResponse | undefined;
  // The org limit observed on 2026-09-03 is 5 input images / minute for gpt-image-2.
  // On 429 we wait what the API asks for (capped) and retry, up to 3 attempts.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // output_format is accepted by the API; cast because SDK typings lag the model.
      res = (await openai().images.edit(
        { model: IMAGE_MODEL, image: file, prompt, n, quality, size: size as never, output_format: 'jpeg' } as never,
        { signal },
      )) as EditResponse;
      break;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const is429 = /429|rate limit/i.test(msg);
      if (!is429 || attempt === 2 || signal?.aborted) throw new RestoreError('provider_error', msg);
      const wait = Math.min(30, Number(msg.match(/try again in (\d+(?:\.\d+)?)s/i)?.[1] ?? 15) + 1);
      await new Promise((r) => setTimeout(r, wait * 1000));
    }
  }
  if (!res) throw new RestoreError('provider_error', 'no response');
  const images = (res.data ?? []).map((d) => Buffer.from(d.b64_json ?? '', 'base64')).filter((b) => b.length > 0);
  if (!images.length) throw new RestoreError('provider_error', 'no image returned');
  return { images, tokens: res.usage?.total_tokens ?? 0 };
}

/** Vision likeness + face-count check. Returns null when the model output cannot be parsed. */
export async function likenessCheck(original: Buffer, restored: Buffer, signal?: AbortSignal): Promise<{ result: LikenessResult | null; tokens: number }> {
  // 1024 px is plenty for a likeness judgement and keeps vision tokens low.
  const [a, b] = (await Promise.all([fitLongEdge(original, 1024), fitLongEdge(restored, 1024)])).map((x) => x.toString('base64'));
  const res = await openai().responses.create(
    {
      model: VISION_MODEL,
      reasoning: { effort: 'low' },
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: LIKENESS_PROMPT },
            { type: 'input_text', text: 'Image A (original):' },
            { type: 'input_image', image_url: `data:image/jpeg;base64,${a}`, detail: 'high' },
            { type: 'input_text', text: 'Image B (restoration):' },
            { type: 'input_image', image_url: `data:image/jpeg;base64,${b}`, detail: 'high' },
          ],
        },
      ],
      text: { format: { type: 'json_object' } },
    },
    { signal },
  );
  const tokens = res.usage?.total_tokens ?? 0;
  try {
    const parsed = JSON.parse(res.output_text) as Partial<LikenessResult>;
    return {
      tokens,
      result: {
        same_people: Boolean(parsed.same_people),
        likeness: Number(parsed.likeness ?? 0),
        invented_details: Boolean(parsed.invented_details),
        removed_content: Boolean(parsed.removed_content),
        over_processed: Boolean(parsed.over_processed),
        face_count_a: Number(parsed.face_count_a ?? 0),
        face_count_b: Number(parsed.face_count_b ?? 0),
        notes: String(parsed.notes ?? ''),
      },
    };
  } catch {
    return { result: null, tokens };
  }
}

/** Colourisation pass on an already restored image. */
export async function colourise(restored: Buffer, quality: ImageQuality = 'medium', signal?: AbortSignal): Promise<{ image: Buffer; tokens: number; ms: number }> {
  const t0 = Date.now();
  const { images, tokens } = await imageEdit(restored, COLOURISATION_PROMPT, 1, quality, 'auto', signal);
  return { image: images[0], tokens, ms: Date.now() - t0 };
}

/**
 * Full restoration: pre-process → 2 candidates → SSIM selection → (optional colour)
 * → vision likeness + face-count check → upscale to print size.
 */
export async function restore(input: Buffer, opts: RestoreOptions = {}): Promise<RestoreResult> {
  const t0 = Date.now();
  const quality = opts.quality ?? 'medium';
  const candidates = opts.candidates ?? 2;
  const minLongEdge = opts.minLongEdge ?? 2400;
  const timeoutMs = opts.timeoutMs ?? CONFIG.previewTimeoutMs;
  const controller = new AbortController();
  const killer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await withTimeout((async () => {
      // 1. Pre-process
      const norm = await normaliseToJpeg(input);
      if (Math.max(norm.dims.width, norm.dims.height) < 400) throw new RestoreError('too_small', 'image under 400 px');
      const trimmed = await trimScannerBorder(norm.jpeg, norm.dims);
      const sized = await ensureMinimumSize(trimmed.jpeg, trimmed.dims, 1200);
      const original = sized.jpeg;
      const chroma = await chromaStats(original);

      // 2. Restoration candidates
      const tr = Date.now();
      const { images, tokens: imageTokens } = await imageEdit(original, RESTORATION_PROMPT, candidates, quality, opts.size ?? 'auto', controller.signal);
      const restorationMs = Date.now() - tr;

      // 3. Selection: smallest structural change vs original
      const ssims = await Promise.all(images.map((img) => ssimLuma(original, img)));
      let candidateId = 0;
      for (let i = 1; i < ssims.length; i++) if (ssims[i] > ssims[candidateId]) candidateId = i;
      const selected = images[candidateId];

      // 4 + 5/6. Colour (optional) and likeness/face check run concurrently
      const wantColour = Boolean(opts.colourise) && chroma.isMonochrome;
      const [colour, like] = await Promise.all([
        wantColour ? colourise(selected, quality, controller.signal) : Promise.resolve(null),
        opts.likenessCheck === false ? Promise.resolve(null) : (async () => { const t = Date.now(); const r = await likenessCheck(original, selected, controller.signal); return { ...r, ms: Date.now() - t }; })(),
      ]);

      const reasons: string[] = [];
      let faceCheck: RestoreMetadata['faceCheck'] = null;
      if (like?.result) {
        const { face_count_a, face_count_b } = like.result;
        const ok = face_count_a === face_count_b && !(face_count_a > 0 && face_count_b === 0);
        faceCheck = { original: face_count_a, restored: face_count_b, ok };
        if (!ok) reasons.push('face_count_mismatch');
        if (!like.result.same_people) reasons.push('not_same_people');
        if (like.result.likeness < 4) reasons.push(`likeness_${like.result.likeness}`);
        if (like.result.invented_details) reasons.push('invented_details');
      } else if (opts.likenessCheck !== false) {
        reasons.push('likeness_unparseable');
      }

      // 7. Print-size output
      const restored = await ensureLongEdge(selected, minLongEdge);
      const outDims = await dimensionsOf(restored);

      return {
        original,
        restored,
        candidates: images,
        colourised: colour ? await ensureLongEdge(colour.image, minLongEdge) : null,
        isMonochrome: chroma.isMonochrome,
        meta: {
          model: IMAGE_MODEL,
          visionModel: VISION_MODEL,
          quality,
          durationMs: Date.now() - t0,
          restorationMs,
          likenessMs: like?.ms,
          colourisationMs: colour?.ms,
          candidateId,
          candidateSsim: ssims,
          ssim: ssims[candidateId],
          chroma,
          input: { ...sized.dims, trimmed: trimmed.trimmed, upscaled: sized.upscaled },
          output: outDims,
          usage: { imageTokens: imageTokens + (colour?.tokens ?? 0), visionTokens: like?.tokens ?? 0 },
          faceCheck,
          likeness: like?.result ?? null,
          needsManualReview: reasons.length > 0,
          reviewReasons: reasons,
        },
      };
    })(), timeoutMs, 'restoration');
  } catch (e) {
    if (e instanceof RestoreError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    if (/abort/i.test(msg)) throw new RestoreError('timeout', msg);
    throw new RestoreError('unknown', msg);
  } finally {
    clearTimeout(killer);
  }
}

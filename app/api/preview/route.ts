import { NextRequest } from 'next/server';
import { readSessionId, readUtm } from '@/lib/session';
import { runPreview } from '@/lib/preview-service';
import { CONFIG } from '@/lib/config';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/** NDJSON stream: {"stage":…} lines from real pipeline stages, then one {"done":true,…} line. */
export async function POST(req: NextRequest) {
  const [sessionId, utm] = await Promise.all([readSessionId(), readUtm()]);
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(JSON.stringify(o) + '\n'));
      try {
        if (!(file instanceof File)) { send({ done: true, fallback: true, orderId: null, reason: 'no_file' }); return; }
        if (file.size > CONFIG.maxUploadBytes) { send({ done: true, fallback: true, orderId: null, reason: 'too_large' }); return; }
        const buf = Buffer.from(await file.arrayBuffer());
        const result = await runPreview(buf, { sessionId, utm }, (stage) => send({ stage }));
        if ('fallback' in result) send({ done: true, fallback: true, orderId: result.orderId, reason: result.reason });
        else send({ done: true, ...result.payload });
      } catch (e) {
        console.error(e);
        send({ done: true, fallback: true, orderId: null, reason: 'error' });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no' } });
}

/**
 * Redraws the watermarked preview and the wall mockups of existing orders with the current mark and wall.
 *   npx tsx scripts/redraw-order.mts <orderId> [<orderId> …]     (needs .env.local in the environment)
 */
import { redrawDerived } from '@/lib/preview-service';
for (const id of process.argv.slice(2)) {
  const r = await redrawDerived(id);
  console.log(id.slice(0, 8), 'preview + ' + r.mockups + ' mockups');
}

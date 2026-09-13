/**
 * Puts a rendered creative into the live ad account through Meta's Marketing API, instead of clicking.
 *
 *   node scripts/ads/publish.mjs inspect            what the account has now; changes nothing
 *   node scripts/ads/publish.mjs upload <key>       upload work/ads/final/<key>-{4x5,1x1,9x16}.jpg
 *   node scripts/ads/publish.mjs create <key> <name>   clone FINAL_COLD_04's creative shape with the new
 *                                                      images and the price-qualified copy, make the ad PAUSED
 *   node scripts/ads/publish.mjs golive <name> …    activate the named ads, pause every other ad, and
 *                                                      un-pause the campaign
 *
 * Needs META_ADS_TOKEN in .env.local with ads_management on act_2034135650633821. Nothing here prints the
 * token. Every write says out loud what it did, and `create` always lands PAUSED so a human sees it first.
 */
import { readFileSync } from 'node:fs';

const ROOT = 'C:/Users/mo/Desktop/Billede/';
const env = Object.fromEntries(
  readFileSync(ROOT + '.env.local', 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }),
);
const TOKEN = env.META_ADS_TOKEN;
const ACT = 'act_2034135650633821';
const ADSET = '120249864995960069';
const CAMPAIGN = '120249864995970069';
const MODEL_AD = 'FINAL_COLD_04';   // the ad whose placement structure we copy
const API = 'https://graph.facebook.com/v21.0/';

if (!TOKEN) {
  console.error('META_ADS_TOKEN missing from .env.local.');
  console.error('Business settings -> System users -> add the ad account as an asset with "Manage campaigns",');
  console.error('then generate a token with ads_management and paste it in as META_ADS_TOKEN=');
  process.exit(1);
}

const COPY = {
  body: [
    'Har du også et billede, du kun har set i gråt?',
    '',
    'Tag et foto af det med mobilen, så restaurerer vi det. Vil du se det i farver, laver vi også den version – farverne er et kvalificeret gæt, og du vælger selv sort-hvid eller farve.',
    '',
    'Kan du lide det, sender vi det hjem i ramme fra 599 kr. inkl. fragt. Du ser resultatet, før du bestiller.',
  ].join('\n'),
  title: 'Gammelt billede i ramme · fra 599 kr.',
  description: 'Se resultatet, før du bestiller. Fri fragt.',
};

async function get(path, params = {}) {
  const q = new URLSearchParams({ ...params, access_token: TOKEN });
  const r = await fetch(`${API}${path}?${q}`);
  const j = await r.json();
  if (j.error) throw new Error(`GET ${path}: ${j.error.code} ${j.error.message}`);
  return j;
}

async function post(path, body) {
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) form.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  form.set('access_token', TOKEN);
  const r = await fetch(`${API}${path}`, { method: 'POST', body: form });
  const j = await r.json();
  if (j.error) throw new Error(`POST ${path}: ${j.error.code} ${j.error.message}`);
  return j;
}

/** Upload one image, return its hash. */
async function uploadImage(file) {
  const bytes = readFileSync(file);
  const form = new FormData();
  form.set('access_token', TOKEN);
  form.set('filename', new Blob([bytes], { type: 'image/jpeg' }), file.split(/[\\/]/).pop());
  const r = await fetch(`${API}${ACT}/adimages`, { method: 'POST', body: form });
  const j = await r.json();
  if (j.error) throw new Error(`upload ${file}: ${j.error.code} ${j.error.message}`);
  const images = j.images ?? {};
  const first = Object.values(images)[0];
  if (!first?.hash) throw new Error(`upload ${file}: no hash back`);
  return first.hash;
}

const RATIOS = ['4x5', '1x1', '9x16'];
const fileFor = (key, ratio) => `${ROOT}work/ads/final/${key}-${ratio}.jpg`;

async function cmdInspect() {
  const me = await get('me', { fields: 'id,name' });
  console.log('key belongs to :', me.id, me.name ?? '');
  const acct = await get(ACT, { fields: 'name,account_status,currency,amount_spent,balance' });
  console.log('ad account     :', acct.name, '| status', acct.account_status, '|', acct.currency, '| spent', acct.amount_spent);
  const camp = await get(CAMPAIGN, { fields: 'name,status,effective_status,daily_budget,spend_cap' });
  console.log('campaign       :', camp.name, '|', camp.status, '/', camp.effective_status);
  const ads = await get(`${ADSET}/ads`, { fields: 'name,status,effective_status,creative{id}', limit: '25' });
  console.log('\nads in the set:');
  for (const a of ads.data ?? []) console.log(' ', a.id, (a.name ?? '').padEnd(26), a.status, '/', a.effective_status, '| creative', a.creative?.id ?? '-');
  const model = (ads.data ?? []).find((a) => a.name === MODEL_AD);
  if (model?.creative?.id) {
    const c = await get(model.creative.id, { fields: 'name,object_story_spec,asset_feed_spec,url_tags,degrees_of_freedom_spec' });
    console.log(`\n${MODEL_AD} creative shape (this is what "create" clones):`);
    console.log(JSON.stringify(c, null, 1).slice(0, 4000));
  }
}

async function cmdUpload(key) {
  if (!key) throw new Error('usage: upload <key>');
  const hashes = {};
  for (const r of RATIOS) {
    const h = await uploadImage(fileFor(key, r));
    hashes[r] = h;
    console.log(`${key}-${r}.jpg -> ${h}`);
  }
  console.log('\nhashes:', JSON.stringify(hashes));
  return hashes;
}

async function cmdCreate(key, name) {
  if (!key || !name) throw new Error('usage: create <key> <adName>');
  const ads = await get(`${ADSET}/ads`, { fields: 'name,creative{id}', limit: '25' });
  const model = (ads.data ?? []).find((a) => a.name === MODEL_AD);
  if (!model?.creative?.id) throw new Error(`cannot find ${MODEL_AD} to copy the placement structure from`);
  const shape = await get(model.creative.id, { fields: 'object_story_spec,asset_feed_spec,url_tags,degrees_of_freedom_spec' });

  console.log('uploading images…');
  const hashes = await cmdUpload(key);

  // Rebuild the model's structure with the new pictures and the new words. Everything else — page id,
  // link, url_tags, placement rules — is carried over untouched, so tracking and identity cannot drift.
  const spec = JSON.parse(JSON.stringify(shape.asset_feed_spec ?? null));
  const story = JSON.parse(JSON.stringify(shape.object_story_spec ?? null));
  const payload = { name: `${name}_creative`, url_tags: shape.url_tags };

  if (spec) {
    // placement-customised creative: swap each image hash, keep the labels and the rules
    const byLabel = { '4x5': hashes['4x5'], '1x1': hashes['1x1'], '9x16': hashes['9x16'] };
    const guess = (i) => (i.adlabels?.[0]?.name && byLabel[i.adlabels[0].name]) || hashes['4x5'];
    spec.images = (spec.images ?? []).map((i) => ({ ...i, hash: guess(i) }));
    if (spec.bodies) spec.bodies = [{ text: COPY.body }];
    if (spec.titles) spec.titles = [{ text: COPY.title }];
    if (spec.descriptions) spec.descriptions = [{ text: COPY.description }];
    payload.asset_feed_spec = spec;
    if (story?.page_id) payload.object_story_spec = { page_id: story.page_id, instagram_actor_id: story.instagram_actor_id };
  } else if (story?.link_data) {
    story.link_data.image_hash = hashes['4x5'];
    story.link_data.message = COPY.body;
    story.link_data.name = COPY.title;
    story.link_data.description = COPY.description;
    payload.object_story_spec = story;
  } else {
    throw new Error('could not read a usable creative shape from ' + MODEL_AD);
  }

  const creative = await post(`${ACT}/adcreatives`, payload);
  console.log('creative created:', creative.id);
  const ad = await post(`${ACT}/ads`, { name, adset_id: ADSET, creative: { creative_id: creative.id }, status: 'PAUSED' });
  console.log('ad created (PAUSED):', ad.id, name);
  console.log('\nlook at it in Ads Manager, then: node scripts/ads/publish.mjs golive', name);
}

async function cmdGolive(names) {
  if (!names.length) throw new Error('usage: golive <adName> [adName …]');
  const ads = await get(`${ADSET}/ads`, { fields: 'name,status', limit: '50' });
  const all = ads.data ?? [];
  const keep = all.filter((a) => names.includes(a.name));
  if (keep.length !== names.length) throw new Error(`not found: ${names.filter((n) => !all.some((a) => a.name === n)).join(', ')}`);

  for (const a of all) {
    const want = names.includes(a.name) ? 'ACTIVE' : 'PAUSED';
    if (a.status === want) { console.log(`${a.name.padEnd(26)} already ${want}`); continue; }
    await post(a.id, { status: want });
    console.log(`${a.name.padEnd(26)} ${a.status} -> ${want}`);
  }
  await post(CAMPAIGN, { status: 'ACTIVE' });
  console.log('\ncampaign ACTIVE');
  const camp = await get(CAMPAIGN, { fields: 'name,status,effective_status' });
  console.log('now:', camp.name, camp.status, '/', camp.effective_status);
}

const [cmd, ...rest] = process.argv.slice(2);
const run = { inspect: () => cmdInspect(), upload: () => cmdUpload(rest[0]), create: () => cmdCreate(rest[0], rest[1]), golive: () => cmdGolive(rest) }[cmd];
if (!run) { console.error('commands: inspect | upload <key> | create <key> <adName> | golive <adName …>'); process.exit(1); }
run().catch((e) => { console.error('\n' + e.message); process.exit(1); });

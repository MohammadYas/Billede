// A link to an order in a mail must survive the login.
//   node tests/admin-login.browser.mjs [base]
// Reads nothing and changes nothing: it only follows redirects and reads the login form. No password needed.
const BASE = process.argv[2] ?? 'http://localhost:3000';
const ORDER = '/admin/orders/00000000-0000-4000-8000-000000000000';   // never resolved: the guard runs first
let pass = 0, fail = 0;
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  OK   ', n, d); } else { fail++; console.log('  FAIL ', n, d); } };
const nextField = (html) => (html.match(/name="next"\s+value="([^"]*)"/) ?? [])[1];

const r1 = await fetch(BASE + ORDER, { redirect: 'manual' });
const loc = r1.headers.get('location') ?? '';
ok('deep link sends you to the login', r1.status >= 300 && r1.status < 400, String(r1.status));
ok('and it remembers where you were going', decodeURIComponent(loc).includes(ORDER), loc.slice(0, 70));

const good = await (await fetch(`${BASE}/admin?next=${encodeURIComponent(ORDER)}`)).text();
ok('the order page survives into the form', nextField(good) === ORDER, nextField(good));
ok('and the form says so', good.includes('sendes videre'));

for (const [label, evil] of [
  ['an absolute URL', 'https://evil.example/x'],
  ['a protocol-relative URL', '//evil.example/x'],
  ['a backslash trick', '/admin\\@evil.example'],
  ['a path outside admin', '/tak?x=1'],
  ['a newline injection', '/admin/orders/1\nLocation: https://evil.example'],
]) {
  const h = await (await fetch(`${BASE}/admin?next=${encodeURIComponent(evil)}`)).text();
  ok(`${label} is thrown away`, nextField(h) === '/admin', String(nextField(h)).slice(0, 40));
}

// the messages pages keep their destination too
for (const p of ['/admin/beskeder', '/admin/beskeder/hej%40billedearv.dk']) {
  const r = await fetch(BASE + p, { redirect: 'manual' });
  const back = new URL(r.headers.get('location') ?? '', BASE).searchParams.get('next') ?? '';
  ok(`${p} comes back to itself`, back === p, back);
}

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

/** Supplementary browser regressions; all network effects intercepted, no deployed test routes. */
import { chromium } from 'playwright';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = 'http://localhost:3000';
const out = `docs/audit-2026-09-07/${process.argv[2] ?? 'after'}`;
await fs.mkdir(out, { recursive: true });
const css = await fs.readFile('app/globals.css', 'utf8');
const result = await build({ stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
 import React, {useState, StrictMode} from 'react'; import {createRoot} from 'react-dom/client';
 import Consent from './components/Consent'; import PixelBoot from './components/PixelBoot'; import PreviewPending from './components/PreviewPending';
 function App(){const [show,setShow]=useState(false);const mode=new URLSearchParams(location.search).get('case');
 if(mode==='pending')return <main className="wrap"><div className="container"><PreviewPending pending={true} email="audit@example.invalid"/></div></main>;
 return <main className="container" style={{minHeight:2000}}><button className="btn" style={{position:'fixed',top:10}} onClick={()=>setShow(true)}>Vis cookies</button>{show&&<Consent text="Cookies til statistik" accept="Accepter" decline="Afvis"/>}<PixelBoot/></main>}
 createRoot(document.getElementById('root')).render(<StrictMode><App/></StrictMode>);` }, bundle: true, write: false, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"', 'process.env.NEXT_PUBLIC_META_PIXEL_ID': '"synthetic-audit-pixel"' }, plugins: [{ name: 'router-fixture', setup(b) { b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'router', namespace: 'fixture' })); b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `import {useSyncExternalStore} from 'react'; const router={refresh(){window.__refreshes=(window.__refreshes||0)+1}}; export const useRouter=()=>router; export const usePathname=()=>useSyncExternalStore(cb=>{window.addEventListener('popstate',cb);return()=>window.removeEventListener('popstate',cb)},()=>location.pathname,()=>location.pathname);`, loader: 'js', resolveDir: process.cwd() })); } }] });
const html = `<!doctype html><html lang="da"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="root"></div><script>${result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')}</script></html>`;
const browser = await chromium.launch();
const checks: string[] = [];
const screenshots: string[] = [];
try {
 for (const width of [390,1440]) {
  const ctx = await browser.newContext({ viewport: { width, height: width===390?844:900 }, reducedMotion:'reduce' });
  let saveOk = false, cancels = 0, checkouts = 0;
  const id = '00000000-0000-4000-8000-000000000001';
  await ctx.route('**/*', async route => {
   const req=route.request(), url=new URL(req.url());
   if (url.origin!==base) return route.abort();
   if (url.pathname==='/audit-interactions') return route.fulfill({contentType:'text/html',body:html});
   if (url.pathname==='/api/track') return route.fulfill({status:204});
   if (url.pathname==='/api/preview/start') return route.fulfill({json:{orderId:id,token:'synthetic-token',uploadUrl:base+'/audit-upload'}});
   if (url.pathname==='/audit-upload'||url.pathname.endsWith('/run')) return route.fulfill({json:{ok:true}});
   if (url.pathname.endsWith('/cancel')) {cancels++;return route.fulfill({json:{ok:true}});}
   if (url.pathname.endsWith('/save')) return route.fulfill({status:saveOk?200:503,json:{ok:saveOk}});
   if (url.pathname===`/api/preview/${id}`) return route.fulfill({json:{status:'NEW',token:'synthetic-token',job:{kind:'restore',state:'running'},payload:null}});
   if (url.pathname==='/api/checkout') {checkouts++;return route.fulfill({status:503,json:{error:'synthetic'}});}
   if (req.method()!=='GET') return route.fulfill({status:503,json:{error:'synthetic'}});
   return route.continue();
  });
  const page=await ctx.newPage(); const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  const shot=async(name:string)=>{await page.evaluate(()=>document.fonts.ready);const f=`${name}-${width}.png`;await page.screenshot({path:`${out}/${f}`,fullPage:false});if(!screenshots.includes(f))screenshots.push(f);};
  await page.goto(base+'/audit-interactions?case=consent',{waitUntil:'networkidle'});
  await page.evaluate(()=>scrollTo(0,200));
  await page.getByRole('button',{name:'Vis cookies'}).click();
  await page.getByRole('dialog',{name:'Cookies'}).waitFor();
  assert.deepEqual(errors,[],'consent after restored scroll must not access an uninitialized timer');
  await shot('consent-restored-scroll');
  await page.getByRole('button',{name:'Accepter',exact:true}).click();
  const views=()=>page.evaluate(()=>((window as any).fbq?.queue??[]).filter((e:unknown[])=>e[1]==='PageView').length);
  assert.equal(await views(),1);
  await page.evaluate(()=>{history.pushState({},'','/audit-next');dispatchEvent(new PopStateEvent('popstate'));});
  await page.waitForTimeout(100);
  assert.equal(await views(),2,'one new PageView for client navigation');
  checks.push(`${width}: cookies after scroll, one arrival view and one navigation view`);
  await ctx.clearCookies();
  await page.goto(base+'/audit-interactions?case=consent',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Vis cookies'}).click();
  await page.getByRole('dialog',{name:'Cookies'}).waitFor();
  await page.getByRole('button',{name:'Afvis',exact:true}).click();
  assert.equal(await views(),0);checks.push(`${width}: declining cookies emits no pixel events`);
  await page.goto(base+'/audit-interactions?case=pending',{waitUntil:'networkidle'});
  await shot('pending-preview');
  await page.getByRole('button',{name:'Opdater status'}).click();
  assert.equal(await page.evaluate(()=>(window as any).__refreshes),1);
  checks.push(`${width}: pending preview offers refresh and contact`);
  await page.goto(base,{waitUntil:'networkidle'});
  const faq=page.locator('details.q');
  for(let i=0;i<await faq.count();i++){await faq.nth(i).locator('summary').click();assert.equal(await faq.nth(i).getAttribute('open'),'');}
  await page.getByRole('heading',{name:'Ofte stillede spørgsmål',exact:true}).scrollIntoViewIfNeeded();await shot('faq-expanded');
  checks.push(`${width}: all ${await faq.count()} FAQ items open`);
  await page.getByRole('link',{name:'Handelsbetingelser',exact:true}).click();await page.waitForURL('**/handelsbetingelser');
  await page.getByRole('contentinfo').getByRole('link',{name:'Privatliv',exact:true}).click();await page.waitForURL('**/privatliv');
  await page.getByRole('link',{name:'Billedearv – til forsiden',exact:true}).first().click();await page.waitForURL(base+'/');
  checks.push(`${width}: footer terms/privacy and home links navigated`);
  const begin=async()=>{
   await page.getByRole('button',{name:'Se hvad mit billede kan blive til',exact:true}).first().click();
   await page.locator('input[type=file]').first().setInputFiles({name:'too-big.jpg',mimeType:'image/jpeg',buffer:Buffer.alloc(26*1024*1024)});
   assert.ok(await page.locator('.sheet [role=alert]').count());
   await shot('upload-size-error');
   await page.locator('input[type=file]').first().setInputFiles({name:'synthetic.jpg',mimeType:'image/jpeg',buffer:await fs.readFile('public/examples/bryllup-1954-after-800.jpg')});
   await page.getByRole('button',{name:'Vis mig resultatet',exact:true}).click();await page.locator('#keep-email').waitFor();
   await page.locator('#keep-email').fill('audit@example.invalid');saveOk=true;
   await page.locator('.sheet form button[type=submit]').click();await page.locator('.sheet [role=status]').waitFor();
  };
  await begin();await shot('keep-success');
  const beforeClose=cancels;await page.keyboard.press('Escape');await page.waitForTimeout(100);
  assert.equal(cancels,beforeClose,'dismissing after saving must retain the job');
  await begin();const beforeCancel=cancels;await page.getByRole('button',{name:'Afbryd (billedet slettes)',exact:true}).click();await page.waitForTimeout(100);
  assert.equal(cancels,beforeCancel+1,'explicit cancel must still request deletion');
  checks.push(`${width}: upload limit, saved-link success, safe dismissal and explicit cancel`);
  assert.deepEqual(errors,[]);
  await ctx.close();
 }
} finally {await browser.close();await fs.writeFile(`${out}/supplementary.json`,JSON.stringify({checks,screenshots},null,2));await fs.writeFile(`${out}/supplementary.md`,'# Supplerende efterkontrol\n\nSyntetiske API-svar; cookie- og ventekomponenter i isoleret fixture. Ingen ekstern afsendelse.\n\n'+checks.map(c=>`- ${c}`).join('\n')+'\n\n'+screenshots.map(f=>`- [${f}](${f})`).join('\n'));console.log(checks.join('\n'));}

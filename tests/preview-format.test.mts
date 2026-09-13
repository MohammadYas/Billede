import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { load } from './_bundle.mts';

const { default: Panel } = await load('components/PreviewPanel.tsx', {});
const { copy } = await load('lib/copy.ts', {});

test('a resumed loose-print size cannot leave the framed picker unselected or its mockup empty', () => {
  const html = renderToStaticMarkup(createElement(Panel, {
    c: copy(), paid:false, cancelled:true,
    offers:{print:{enabled:true,priceDkk:250},digital:{enabled:true,priceDkk:99}},
    data:{orderId:'fixture',product:'framed',format:'20x30',addons:{frame:'sort',extraPrints:0},
      original:'/before.jpg',preview:'/after.jpg',mockup:'/fallback.jpg',colour:null,
      mockups:{'30x40:sort':'/frame-30x40.jpg'},width:800,height:1000,isMonochrome:false},
  }));
  const selected = html.match(/<input[^>]+name="stoerrelse"[^>]*checked=""[^>]*>/g) ?? [];
  assert.equal(selected.length, 1, 'exactly one framed size must be marked');
  assert.match(selected[0], /value="30x40"/);
  assert.match(html, /<img[^>]*src="\/frame-30x40.jpg"[^>]*class="on"/);
});

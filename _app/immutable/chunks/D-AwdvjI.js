import{ft as e}from"./BWfwRt8T.js";import{n as t}from"./DfoX0S7l.js";async function n(e,t){let n=new Blob([e]).stream().pipeThrough(t);return new Uint8Array(await new Response(n).arrayBuffer())}async function r(e){let t=await n(new TextEncoder().encode(e),new CompressionStream(`deflate-raw`)),r=Array.from(t,e=>String.fromCharCode(e)).join(``);return btoa(r).replace(/\+/g,`-`).replace(/\//g,`_`).replace(/=+$/,``)}async function i(e){let t=atob(e.replace(/-/g,`+`).replace(/_/g,`/`)),r=Uint8Array.from(t,e=>e.charCodeAt(0));return new TextDecoder().decode(await n(r,new DecompressionStream(`deflate-raw`)))}function a({fold:e,focus:t}){return[e?.length&&`fold=${e.join(`,`)}`,t&&`focus=${t}`].filter(Boolean).join(`&`)}function o(e){return{fold:e.get(`fold`)?.split(`,`).filter(Boolean)??[],focus:e.get(`focus`)??void 0}}async function s(e,t,n){let i=[`m=${await r(t)}`,a(n)].filter(Boolean).join(`&`);return`${window.location.origin}${e}#${i}`}var c=[`zoom-in`,`zoom-out`,`fit`,`expand-all`,`fold-level`];function l(e){let t=(e.get(`tools`)??``).split(`,`).filter(e=>c.includes(e)),n=e.get(`theme`);return{toolbar:e.get(`toolbar`)===`0`?!1:t.length?t:[...c],theme:n===`dark`||n===`light`?n:void 0}}var u=8e3;async function d(e,t,{toolbar:n=!0}={}){let r=(await s(n?`/full`:`/full?toolbar=0`,e,t)).replace(/&/g,`&amp;`);return{code:`<iframe src="${r}" title="Mind map" width="100%" height="480" style="border:0" loading="lazy" allowfullscreen></iframe>`,tooLong:r.length>u}}var f=class t{constructor(n,r){e(this,`type`,void 0),e(this,`data`,void 0),e(this,`desc`,void 0),this.type=n,this.data=r,this.desc=t.descriptions[n]||`Unknown`}asUrl(){switch(this.type){case`gist`:{let[e,t]=this.data.split(`:`);return`https://gist.githubusercontent.com/raw/${e}/${t||`markmap.md`}`}case`github`:{let[e,t]=this.data.split(`:`),[n,r]=e.split(`@`);return`https://raw.githubusercontent.com/${n}/${r||`main`}/${t||`README.md`}`}default:return this.data}}asData(){switch(this.type){case`gist`:case`github`:return`${this.type}:${this.data}`;default:return this.data}}async load(){let e=this.asUrl(),t=await fetch(e);return m(t),t.text()}static parse(e){if(e instanceof t)return e;let n,r=``;for(let t of[`gist`,`github`])if(e.startsWith(`${t}:`)){n=t,r=e.slice(t.length+1);break}if(!n){let t=new URL(e);if(t.origin===`https://raw.githubusercontent.com`){let[,e,i,a,...o]=t.pathname.split(`/`);n=`github`,r=[`${e}/${i}`,a&&`@${a}`,o.length&&`:${o.join(`/`)}`].filter(Boolean).join(``)}else if(t.origin===`https://gist.githubusercontent.com`||t.origin===`https://gist.github.com`){let{pathname:e}=t,i,a;e.startsWith(`/raw/`)?([,,i,...a]=t.pathname.split(`/`),a[0]===`raw`&&a.shift()):[,,i,,...a]=t.pathname.split(`/`),n=`gist`,r=[i,a.length&&`${a.join(`/`)}`].filter(Boolean).join(`:`)}}return n||(n=`url`,r=e),new t(n,r)}};e(f,`descriptions`,{gist:`GitHub Gist`,github:`GitHub Raw`,url:`URL`});function p(e){return e.replace(/[<&]/g,e=>e===`<`?`&lt;`:`&amp;`)}function m(e){if(!e.ok)throw TypeError(`Failed to fetch, got response "${e.status} ${e.statusText}"`);return e}function h(e){return f.parse(e).load()}function g(e){let n=0;async function r(){n+=1;let r=n,a=new URLSearchParams(window.location.hash.slice(1)),s=o(a),c=a.get(`gist`),l=a.get(`d`),u=a.get(`m`);if(c&&!l)c.includes(`:`)||(c=`gist:${c}`),await Promise.resolve(),window.location.hash=`#?d=${c}`;else try{let t;u?t=await i(u):l&&(t=await h(l)),r===n&&e({...s,text:t})}catch(i){if(r!==n)return;e(s),t({title:u?`This link is damaged`:`Failed to fetch`,html:[`<div class="mt-1">${u?`Its Markdown could not be read.`:`Please check your network and resource.`}</div>`,l&&`<div class="mt-1 text-xs opacity-70">${p(l||`the link`)}</div>`].filter(Boolean).join(``)}),console.error(i)}}return r}function _(e){let t=g(e);return window.addEventListener(`hashchange`,t),t(),{check:t,dispose:()=>window.removeEventListener(`hashchange`,t)}}var v=`---
markmap:
  layout: two-sided
  wrapWidth: 240
---

# markmap

## Write Markdown

- Headings and lists become **branches**
- \`code\`, ~~strikes~~, ==highlights== and [links](https://markmap.js.org)
- [x] Task lists
- [ ] Images <img src="/favicon.png" width="20" height="20" alt="Logo">
- Math like $e^{i\\pi} + 1 = 0$

## Keep the details

- Other text becomes a note

  Click the dot beside this label. Paragraphs, tables and code stay out of the map until you need them.

  | Block | Shown in    |
  | ----- | ----------- |
  | Table | the popover |

  \`\`\`js
  const { root } = parse(markdown);
  Markmap.create(svg, root);
  \`\`\`

## Shape it

- Layouts
  - Tree
  - Two-sided
  - Org chart
- Themes
  - Classic
  - Cards
  - Minimal
- Set them in the frontmatter, or with the controls above

## Explore <!-- markmap: fold -->

- Click a circle to fold a branch
- Double-click a node to jump to its Markdown
- Move the cursor to find it on the map

## Share

- Links carry the whole document
- Export as SVG, PNG or HTML
`;export{d as a,s as c,_ as i,a as l,f as n,c as o,h as r,l as s,v as t};
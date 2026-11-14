import{t as e}from"./DclECHGd.js";import{dt as t}from"./CiPllD0G.js";import{n}from"./DxQFveJC.js";var r=(()=>{try{return new CompressionStream(`deflate-raw`),!0}catch{return!1}})();async function i(e,t){let n=new Blob([e]).stream().pipeThrough(t);return new Uint8Array(await new Response(n).arrayBuffer())}async function a(t){return r?i(t,new CompressionStream(`deflate-raw`)):(await e(async()=>{let{deflateSync:e}=await import(`./DOq4Zl0q.js`);return{deflateSync:e}},[],import.meta.url)).deflateSync(t)}async function o(t){return r?i(t,new DecompressionStream(`deflate-raw`)):(await e(async()=>{let{inflateSync:e}=await import(`./DOq4Zl0q.js`);return{inflateSync:e}},[],import.meta.url)).inflateSync(t)}async function s(e){let t=await a(new TextEncoder().encode(e)),n=Array.from(t,e=>String.fromCharCode(e)).join(``);return btoa(n).replace(/\+/g,`-`).replace(/\//g,`_`).replace(/=+$/,``)}async function c(e){let t=atob(e.replace(/-/g,`+`).replace(/_/g,`/`)),n=Uint8Array.from(t,e=>e.charCodeAt(0));return new TextDecoder().decode(await o(n))}function l({fold:e,focus:t}){return[e?.length&&`fold=${e.join(`,`)}`,t&&`focus=${t}`].filter(Boolean).join(`&`)}function u(e){return{fold:e.get(`fold`)?.split(`,`).filter(Boolean)??[],focus:e.get(`focus`)??void 0}}async function d(e,t,n){let r=[`m=${await s(t)}`,l(n)].filter(Boolean).join(`&`);return`${window.location.origin}${e}#${r}`}var f=[`zoom-in`,`zoom-out`,`fit`,`expand-all`,`fold-level`];function p(e){let t=(e.get(`tools`)??``).split(`,`).filter(e=>f.includes(e)),n=e.get(`theme`);return{toolbar:e.get(`toolbar`)===`0`?!1:t.length?t:[...f],theme:n===`dark`||n===`light`?n:void 0}}var m=8e3;async function h(e,t,{toolbar:n=!0}={}){let r=(await d(n?`/full`:`/full?toolbar=0`,e,t)).replace(/&/g,`&amp;`);return{code:`<iframe src="${r}" title="Mind map" width="100%" height="480" style="border:0" loading="lazy" allowfullscreen></iframe>`,tooLong:r.length>m}}var g=class e{constructor(n,r){t(this,`type`,void 0),t(this,`data`,void 0),t(this,`desc`,void 0),this.type=n,this.data=r,this.desc=e.descriptions[n]||`Unknown`}asUrl(){switch(this.type){case`gist`:{let[e,t]=this.data.split(`:`);return`https://gist.githubusercontent.com/raw/${e}/${t||`markmap.md`}`}case`github`:{let[e,t]=this.data.split(`:`),[n,r]=e.split(`@`);return`https://raw.githubusercontent.com/${n}/${r||`main`}/${t||`README.md`}`}default:return this.data}}asData(){switch(this.type){case`gist`:case`github`:return`${this.type}:${this.data}`;default:return this.data}}async load(){let e=this.asUrl(),t=await fetch(e);return v(t),t.text()}static parse(t){if(t instanceof e)return t;let n,r=``;for(let e of[`gist`,`github`])if(t.startsWith(`${e}:`)){n=e,r=t.slice(e.length+1);break}if(!n){let e=new URL(t);if(e.origin===`https://raw.githubusercontent.com`){let[,t,i,a,...o]=e.pathname.split(`/`);n=`github`,r=[`${t}/${i}`,a&&`@${a}`,o.length&&`:${o.join(`/`)}`].filter(Boolean).join(``)}else if(e.origin===`https://gist.githubusercontent.com`||e.origin===`https://gist.github.com`){let{pathname:t}=e,i,a;t.startsWith(`/raw/`)?([,,i,...a]=e.pathname.split(`/`),a[0]===`raw`&&a.shift()):[,,i,,...a]=e.pathname.split(`/`),n=`gist`,r=[i,a.length&&`${a.join(`/`)}`].filter(Boolean).join(`:`)}}return n||(n=`url`,r=t),new e(n,r)}};t(g,`descriptions`,{gist:`GitHub Gist`,github:`GitHub Raw`,url:`URL`});function _(e){return e.replace(/[<&]/g,e=>e===`<`?`&lt;`:`&amp;`)}function v(e){if(!e.ok)throw TypeError(`Failed to fetch, got response "${e.status} ${e.statusText}"`);return e}function y(e){return g.parse(e).load()}function b(e){let t=0;async function r(){t+=1;let r=t,i=new URLSearchParams(window.location.hash.slice(1)),a=u(i),o=i.get(`gist`),s=i.get(`d`),l=i.get(`m`);if(o&&!s)o.includes(`:`)||(o=`gist:${o}`),await Promise.resolve(),window.location.hash=`#?d=${o}`;else try{let n;l?n=await c(l):s&&(n=await y(s)),r===t&&e({...a,text:n})}catch(i){if(r!==t)return;e(a),n({title:l?`This link is damaged`:`Failed to fetch`,html:[`<div class="mt-1">${l?`Its Markdown could not be read.`:`Please check your network and resource.`}</div>`,s&&`<div class="mt-1 text-xs opacity-70">${_(s||`the link`)}</div>`].filter(Boolean).join(``)}),console.error(i)}}return r}function x(e){let t=b(e);return window.addEventListener(`hashchange`,t),t(),{check:t,dispose:()=>window.removeEventListener(`hashchange`,t)}}var S=`---
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
- Ctrl or Cmd + click to fold or unfold everything below it
- Double-click a node to jump to its Markdown
- Move the cursor to find it on the map

## Share

- Links carry the whole document
- Export as SVG, PNG or HTML
`;export{h as a,d as c,x as i,l,g as n,f as o,y as r,p as s,S as t};
import{$ as e,C as t,G as n,H as r,J as i,L as a,Q as o,S as s,U as c,X as l,Z as u,j as d,k as f,n as p,o as m,ot as h,q as g,r as _,rt as v,st as y,u as b,ut as x,v as S}from"../chunks/CiPllD0G.js";import{n as C,r as w}from"../chunks/ePLls4BW.js";import{i as T,l as E,o as D,s as O}from"../chunks/DAlusaL4.js";import{t as k}from"../chunks/DYeB3B_K.js";var A=d(`<meta name="Description" content="Show a markmap in full page view."/> <meta name="color-scheme"/>`,1),j=d(`<a class="corner-link" target="_blank" rel="noopener"><img src="/favicon.png" width="16" height="16" alt=""/> Open in markmap</a>`),M=d(`<main class="full"><!> <!></main>`);function N(d,N){y(N,!0);let P=()=>_(C,`$isDarkMode`,F),[F,I]=p(),L=e(void 0),R=e(u({toolbar:[...D]})),z=e(!1),B=e(!0),V=e(`/full`),H=v(()=>a(z)?{label:`Open in markmap`,image:`/favicon.png`,onClick(){window.open(a(V),`_blank`,`noopener`)}}:{label:`markmap`,image:`/favicon.png`,onClick(){location.assign(`/`)}}),U=[{label:`Edit this map`,icon:`M3 13l1-3 7-7 2 2-7 7z`,onClick(){location.assign(`/editor`+window.location.hash)}},{label:`Toggle dark mode`,icon:`M13.5 10A6 6 0 0 1 6 2.5a6 6 0 1 0 7.5 7.5z`,onClick:w}];function W(e){e.addEventListener(`fold`,e=>{let{detail:t}=e,n=new URLSearchParams(window.location.hash.replace(/^#\??/,``)),r=[...[`m`,`d`].filter(e=>n.has(e)).map(e=>`${e}=${n.get(e)}`),E({fold:[...t]})].filter(Boolean).join(`&`),{pathname:i,search:a}=window.location;history.replaceState(history.state,``,r?`#${r}`:i+a)})}t(()=>{let e=new URLSearchParams(window.location.search);o(R,O(e),!0),o(z,window.self!==window.top),o(B,!a(z)&&!e.has(`tools`),!0),a(R).theme&&C.set(a(R).theme===`dark`);let{dispose:t}=T(({text:e,fold:t,focus:n})=>{o(V,window.location.origin+`/full`+window.location.hash),a(L)?.show(e??`---
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
`,{fold:t,focus:n})});return t});var G=M();S(`1355dui`,e=>{var t=A(),a=l(i(t),2);c(()=>b(a,`content`,P()?`dark`:`light`)),r(()=>{n.title=`markmap in full page view`}),f(e,t)});var K=g(G);{let e=v(()=>a(R).toolbar!==!1),t=v(()=>a(R).toolbar?[a(H),...a(R).toolbar]:[]),n=v(()=>a(B)?U:[]);m(k(K,{get toolbar(){return a(e)},get items(){return a(t)},get tools(){return a(n)},onReady:W}),e=>o(L,e,!0),()=>a(L))}var q=l(K,2),J=e=>{var t=j();c(()=>b(t,`href`,a(V))),f(e,t)};s(q,e=>{a(R).toolbar===!1&&e(J)}),x(G),f(d,G),h(),I()}export{N as component};
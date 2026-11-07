import{$ as e,A as t,C as n,J as r,K as i,M as a,Q as o,R as s,U as c,W as l,Y as u,Z as d,ct as f,d as p,dt as m,et as h,i as g,it as _,r as v,s as y,st as b,w as x,y as S}from"../chunks/BWfwRt8T.js";import{n as C,r as w}from"../chunks/CcQkqR-D.js";import{i as T,l as E,o as D,s as O}from"../chunks/D-AwdvjI.js";import{t as k}from"../chunks/DpqOcUqs.js";var A=a(`<meta name="Description" content="Show a markmap in full page view."/> <meta name="color-scheme"/>`,1),j=a(`<a class="corner-link" target="_blank" rel="noopener"><img src="/favicon.png" width="16" height="16" alt=""/> Open in markmap</a>`),M=a(`<main class="full"><!> <!></main>`);function N(a,N){f(N,!0);let P=()=>g(C,`$isDarkMode`,F),[F,I]=v(),L=h(void 0),R=h(o({toolbar:[...D]})),z=h(!1),B=h(!0),V=h(`/full`),H=_(()=>s(z)?{label:`Open in markmap`,image:`/favicon.png`,onClick(){window.open(s(V),`_blank`,`noopener`)}}:{label:`markmap`,image:`/favicon.png`,onClick(){location.assign(`/`)}}),U=[{label:`Edit this map`,icon:`M3 13l1-3 7-7 2 2-7 7z`,onClick(){location.assign(`/editor`+window.location.hash)}},{label:`Toggle dark mode`,icon:`M13.5 10A6 6 0 0 1 6 2.5a6 6 0 1 0 7.5 7.5z`,onClick:w}];function W(e){e.addEventListener(`fold`,e=>{let{detail:t}=e,n=new URLSearchParams(window.location.hash.replace(/^#\??/,``)),r=[...[`m`,`d`].filter(e=>n.has(e)).map(e=>`${e}=${n.get(e)}`),E({fold:[...t]})].filter(Boolean).join(`&`),{pathname:i,search:a}=window.location;history.replaceState(null,``,r?`#${r}`:i+a)})}x(()=>{let t=new URLSearchParams(window.location.search);e(R,O(t),!0),e(z,window.self!==window.top),e(B,!s(z)&&!t.has(`tools`),!0),s(R).theme&&C.set(s(R).theme===`dark`);let{dispose:n}=T(({text:t,fold:n,focus:r})=>{e(V,window.location.origin+`/full`+window.location.hash),s(L)?.show(t??`---
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
`,{fold:n,focus:r})});return n});var G=M();S(`1355dui`,e=>{var n=A(),r=d(u(n),2);l(()=>p(r,`content`,P()?`dark`:`light`)),c(()=>{i.title=`markmap in full page view`}),t(e,n)});var K=r(G);{let t=_(()=>s(R).toolbar!==!1),n=_(()=>s(R).toolbar?[s(H),...s(R).toolbar]:[]),r=_(()=>s(B)?U:[]);y(k(K,{get toolbar(){return s(t)},get items(){return s(n)},get tools(){return s(r)},onReady:W}),t=>e(L,t,!0),()=>s(L))}var q=d(K,2),J=e=>{var n=j();l(()=>p(n,`href`,s(V))),t(e,n)};n(q,e=>{s(R).toolbar===!1&&e(J)}),m(G),t(a,G),b(),I()}export{N as component};
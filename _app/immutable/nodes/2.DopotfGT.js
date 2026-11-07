import{$ as e,A as t,J as n,K as r,M as i,O as a,R as o,S as s,U as c,W as l,X as u,Y as d,Z as f,ct as p,d as m,dt as h,et as g,it as _,l as ee,ot as v,st as y,ut as b,y as te}from"../chunks/BWfwRt8T.js";import{t as x}from"../chunks/DbxXIcY3.js";import{t as S}from"../chunks/DpqOcUqs.js";import{t as C}from"../chunks/NxNgMwvc.js";var ne=i(`<meta name="Description" content="Turn Markdown into interactive mind maps. Edit in the browser, choose a layout and theme, then share a link or export SVG and PNG."/>`),re=i(`<figure><!> <figcaption><strong> </strong> </figcaption></figure>`),ie=i(`<div><h3> </h3> <p> </p></div>`),w=i(`<main class="home"><section class="hero"><h1>Markdown in.<br/><em>Mind map out.</em></h1> <p class="lead">Write an outline the way you already do. Markmap turns it into an interactive map you can
			fold, zoom, share and export.</p> <div class="actions"><a class="btn primary" href="/editor" data-ga-label="heroEditor">Open the editor</a> <a class="btn" href="/docs">Read the docs</a> <a class="btn" target="_blank" rel="noreferrer noopener" data-ga-label="markmapVSCodeFromIndex">Get it for VS Code</a></div></section> <section class="hero-demo" aria-label="Live example"><label class="hero-source"><span class="pane-label">Try it: edit the Markdown</span> <textarea spellcheck="false"></textarea></label> <!></section> <section><div class="section-head"><div><h2>One outline, any shape</h2> <p>Every layout works with every theme, in light and dark.</p></div> <!></div> <div class="gallery"></div></section> <section><h2>Built for real documents</h2> <div class="features"></div></section> <section><h2>Use it where you work</h2> <div class="uses"><div><h3>On a web page</h3> <p>One script turns each block into a map as it scrolls into view.</p> <pre><code> </code></pre> <a href="/docs/packages/autoloader">Autoloader</a></div> <div><h3>In an app</h3> <p>A web component that works with any framework.</p> <pre><code></code></pre> <a href="/docs/packages/element">Web component</a></div> <div><h3>From the command line</h3> <p>One offline HTML file, or an image for scripts and CI.</p> <pre><code></code></pre> <a href="/docs/packages/cli">Command line</a></div></div></section></main> <!>`,1);function T(i,T){p(T,!0);let E={zoom:!1},D=g(`# Plan a trip

## Before

- Book **flights**
- Pack
  - Passport
  - \`charger\`

## During

- See the sights
- ==Eat well==

## After

- Share the photos
`),O=[{name:`tree`,title:`Tree`,text:`The classic mind map, growing to the right.`},{name:`two-sided`,title:`Two-sided`,text:`Branches on both sides of the root.`},{name:`org-chart`,title:`Org chart`,text:`Top-down, for hierarchies and plans.`}],ae=[{value:`classic`,label:`Classic`},{value:`cards`,label:`Cards`},{value:`minimal`,label:`Minimal`}],k=g(`classic`),A=[{title:`Rich labels`,text:`Bold, links, code, highlights, task lists, images and math, all drawn on the map.`},{title:`Notes`,text:`Paragraphs, tables and code stay with their branch and open in a popover.`},{title:`Export anywhere`,text:`Clean SVG and PNG that open in any viewer, plus one offline HTML file.`},{title:`Very large maps`,text:`Switch to the canvas renderer to keep thousands of nodes smooth.`},{title:`Links that carry it all`,text:`A share link holds the document and the view, so nothing is stored on a server.`},{title:`Options in the document`,text:`Frontmatter sets the layout and theme, and a comment folds a branch.`}];var j=w();te(`1uha8ag`,e=>{var n=ne();c(()=>{r.title=`markmap - Markdown as mind maps`}),t(e,n)});var M=d(j),N=n(M),P=f(n(N),4),oe=f(n(P),4);m(oe,`href`,`https://marketplace.visualstudio.com/items?itemName=gera2ld.markmap-vscode`),h(P),h(N);var F=f(N,2),I=n(F),L=f(n(I),2);v(L),h(I);var R=f(I,2);S(R,{class:`hero-map`,get markdown(){return o(D)},get options(){return E},toolbar:!0}),h(F);var z=f(F,2),B=n(z),V=f(n(B),2);C(V,{label:`Theme`,get value(){return o(k)},get options(){return ae},onChange:t=>e(k,t,!0)}),h(B);var H=f(B,2);s(H,21,()=>O,e=>e.name,(e,r)=>{var i=re(),s=n(i);{let e=_(()=>`${o(r).title} layout`);S(s,{markdown:`# Product

## Discover

- Interviews
- Surveys

## Build

- Design
- Code

## Launch

- Docs
- Announce
`,get layout(){return o(r).name},get theme(){return o(k)},get options(){return E},get label(){return o(e)}})}var c=f(s,2),d=n(c),p=u(d),m=f(d);h(c),h(i),l(()=>{a(p,`${o(r).title??``}.`),a(m,` ${o(r).text??``}`)}),t(e,i)}),h(H),h(z);var U=f(z,2),W=f(n(U),2);s(W,21,()=>A,e=>e.title,(e,r)=>{var i=ie(),s=n(i),c=u(s,!0),d=f(s,2),p=u(d,!0);h(i),l(()=>{a(c,o(r).title),a(p,o(r).text)}),t(e,i)}),h(W),h(U);var G=f(U,2),K=f(n(G),2),q=n(K),J=f(n(q),4),Y=n(J),se=u(Y,!0);h(J),b(2),h(q);var X=f(q,2),Z=f(n(X),4),ce=n(Z);ce.textContent=`import '@markmap/element';

<markmap-view
  src="./notes.md"
  theme="cards"
  layout="two-sided"
  toolbar
></markmap-view>`,h(Z),b(2),h(X);var Q=f(X,2),$=f(n(Q),4),le=n($);le.textContent=`markmap notes.md
markmap notes.md --svg
markmap notes.md --png`,h($),b(2),h(Q),h(K),h(G),h(M);var ue=f(M,2);x(ue,{}),l(()=>a(se,`<script type="module"
  src="https://cdn.jsdelivr.net/npm/@markmap/autoloader@1/+esm">
<\/script>

<div class="markmap" data-theme="cards">
  <script type="text/markdown">
    # Trip
    ## Before
    ## During
  <\/script>
</div>`)),ee(L,()=>o(D),t=>e(D,t)),t(i,j),y()}export{T as component};
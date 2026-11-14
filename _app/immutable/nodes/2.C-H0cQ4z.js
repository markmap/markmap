import{$ as e,D as t,G as n,H as r,J as i,L as a,Q as o,U as s,X as c,Y as l,at as u,c as d,j as f,k as p,lt as m,ot as ee,q as h,rt as g,st as _,u as v,ut as y,v as b,x}from"../chunks/CiPllD0G.js";import{t as S}from"../chunks/Py-SyYMi.js";import{t as C}from"../chunks/DYeB3B_K.js";import{t as te}from"../chunks/CkhMwUgs.js";var ne=f(`<meta name="Description" content="Turn Markdown into interactive mind maps. Edit in the browser, choose a layout and theme, then share a link or export SVG and PNG."/>`),re=f(`<figure><!> <figcaption><strong> </strong> </figcaption></figure>`),ie=f(`<div><h3> </h3> <p> </p></div>`),ae=f(`<main class="home"><section class="hero"><h1>Markdown in.<br/><em>Mind map out.</em></h1> <p class="lead">Write an outline the way you already do. Markmap turns it into an interactive map you can
			fold, zoom, share and export.</p> <div class="actions"><a class="btn primary" href="/editor" data-ga-label="heroEditor">Open the editor</a> <a class="btn" href="/docs">Read the docs</a> <a class="btn" target="_blank" rel="noreferrer noopener" data-ga-label="markmapVSCodeFromIndex">Get it for VS Code</a></div></section> <section class="hero-demo" aria-label="Live example"><label class="hero-source"><span class="pane-label">Try it: edit the Markdown</span> <textarea spellcheck="false"></textarea></label> <!></section> <section><div class="section-head"><div><h2>One outline, any shape</h2> <p>Every layout works with every theme, in light and dark.</p></div> <!></div> <div class="gallery"></div></section> <section><h2>Built for real documents</h2> <div class="features"></div></section> <section><h2>Use it where you work</h2> <div class="uses"><div><h3>On a web page</h3> <p>One script turns each block into a map as it scrolls into view.</p> <pre><code> </code></pre> <a href="/docs/packages/autoloader">Autoloader</a></div> <div><h3>In an app</h3> <p>A web component that works with any framework.</p> <pre><code></code></pre> <a href="/docs/packages/element">Web component</a></div> <div><h3>From the command line</h3> <p>One offline HTML file, or an image for scripts and CI.</p> <pre><code></code></pre> <a href="/docs/packages/cli">Command line</a></div></div></section></main> <!>`,1);function w(f,w){_(w,!0);let T={zoom:!1},E=e(`# Plan a trip

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
`),D=[{name:`tree`,title:`Tree`,text:`The classic mind map, growing to the right.`},{name:`two-sided`,title:`Two-sided`,text:`Branches on both sides of the root.`},{name:`org-chart`,title:`Org chart`,text:`Top-down, for hierarchies and plans.`}],O=[{value:`classic`,label:`Classic`},{value:`cards`,label:`Cards`},{value:`minimal`,label:`Minimal`}],k=e(`classic`),A=[{title:`Rich labels`,text:`Bold, links, code, highlights, task lists, images and math, all drawn on the map.`},{title:`Notes`,text:`Paragraphs, tables and code stay with their branch and open in a popover.`},{title:`Export anywhere`,text:`Clean SVG and PNG that open in any viewer, plus one offline HTML file.`},{title:`Very large maps`,text:`Switch to the canvas renderer to keep thousands of nodes smooth.`},{title:`Links that carry it all`,text:`A share link holds the document and the view, so nothing is stored on a server.`},{title:`Options in the document`,text:`Frontmatter sets the layout and theme, and a comment folds a branch.`}];var j=ae();b(`1uha8ag`,e=>{var t=ne();r(()=>{n.title=`markmap - Markdown as mind maps`}),p(e,t)});var M=i(j),N=h(M),P=c(h(N),4),oe=c(h(P),4);v(oe,`href`,`https://marketplace.visualstudio.com/items?itemName=gera2ld.markmap-vscode`),y(P),y(N);var F=c(N,2),I=h(F),L=c(h(I),2);u(L),y(I);var R=c(I,2);C(R,{class:`hero-map`,get markdown(){return a(E)},get options(){return T},toolbar:!0}),y(F);var z=c(F,2),B=h(z),V=c(h(B),2);te(V,{label:`Theme`,get value(){return a(k)},get options(){return O},onChange:e=>o(k,e,!0)}),y(B);var H=c(B,2);x(H,21,()=>D,e=>e.name,(e,n)=>{var r=re(),i=h(r);{let e=g(()=>`${a(n).title} layout`);C(i,{markdown:`# Product

## Discover

- Interviews
- Surveys

## Build

- Design
- Code

## Launch

- Docs
- Announce
`,get layout(){return a(n).name},get theme(){return a(k)},get options(){return T},get label(){return a(e)}})}var o=c(i,2),u=h(o),d=l(u),f=c(u);y(o),y(r),s(()=>{t(d,`${a(n).title??``}.`),t(f,` ${a(n).text??``}`)}),p(e,r)}),y(H),y(z);var U=c(z,2),W=c(h(U),2);x(W,21,()=>A,e=>e.title,(e,n)=>{var r=ie(),i=h(r),o=l(i,!0),u=c(i,2),d=l(u,!0);y(r),s(()=>{t(o,a(n).title),t(d,a(n).text)}),p(e,r)}),y(W),y(U);var G=c(U,2),K=c(h(G),2),q=h(K),J=c(h(q),4),se=h(J),Y=l(se,!0);y(J),m(2),y(q);var X=c(q,2),Z=c(h(X),4),ce=h(Z);ce.textContent=`import '@markmap/element';

<markmap-view
  src="./notes.md"
  theme="cards"
  layout="two-sided"
  toolbar
></markmap-view>`,y(Z),m(2),y(X);var Q=c(X,2),$=c(h(Q),4),le=h($);le.textContent=`markmap notes.md
markmap notes.md --svg
markmap notes.md --png`,y($),m(2),y(Q),y(K),y(G),y(M);var ue=c(M,2);S(ue,{}),s(()=>t(Y,`<script type="module"
  src="https://cdn.jsdelivr.net/npm/@markmap/autoloader@1/+esm">
<\/script>

<div class="markmap" data-theme="cards">
  <script type="text/markdown">
    # Trip
    ## Before
    ## During
  <\/script>
</div>`)),d(L,()=>a(E),e=>o(E,e)),p(f,j),ee()}export{w as component};
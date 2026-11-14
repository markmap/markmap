var e=`http://www.w3.org/2000/svg`,t={"zoom-in":{label:`Zoom in`,icon:`M8 3v10M3 8h10`,disabled:e=>!e.result||i(e.transform.k,e.scaleLimits[1]),onClick:e=>{e.zoomIn()}},"zoom-out":{label:`Zoom out`,icon:`M3 8h10`,disabled:e=>!e.result||i(e.transform.k,e.scaleLimits[0]),onClick:e=>{e.zoomOut()}},fit:{label:`Fit to view`,icon:`M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4`,disabled:e=>!e.result,onClick:e=>{e.fit()}},"expand-all":{label:`Expand all`,icon:`M4 6l4-4 4 4M4 10l4 4 4-4`,disabled:e=>!e.foldedIds.size,onClick:e=>{e.expandAll()}}},n=[`zoom-in`,`zoom-out`,`fit`,`expand-all`,`fold-level`],r=`
.markmap-toolbar {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid color-mix(in srgb, var(--mm-text, #333) 20%, transparent);
  border-radius: 6px;
  background: var(--mm-bg, #fff);
  color: var(--mm-text, #333);
  font: 13px system-ui, sans-serif;
}
.markmap-toolbar button, .markmap-toolbar select {
  height: 26px;
  border: 0;
  border-radius: 4px;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.markmap-toolbar button { min-width: 26px; padding: 0 5px; }
.markmap-toolbar button:hover:enabled, .markmap-toolbar select:hover:enabled {
  background: color-mix(in srgb, var(--mm-text, #333) 12%, transparent);
}
.markmap-toolbar button:disabled, .markmap-toolbar select:disabled { opacity: 0.35; cursor: default; }
.markmap-toolbar :focus-visible { outline: 2px solid var(--mm-link, #0097e6); outline-offset: -2px; }
.markmap-toolbar option { background: Canvas; color: CanvasText; }
.markmap-toolbar img { display: block; margin: auto; width: 16px; height: 16px; }
.markmap-toolbar svg { display: block; margin: auto; width: 16px; height: 16px; }
.markmap-toolbar path { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
`,i=(e,t)=>Math.abs(e/t-1)<1e-6;function a(t,n){let r=t.createElementNS(e,`svg`);r.setAttribute(`viewBox`,`0 0 16 16`),r.setAttribute(`aria-hidden`,`true`);let i=t.createElementNS(e,`path`);return i.setAttribute(`d`,n),r.append(i),r}function o(e,t){let n=e.createElement(`img`);return n.src=t,n.alt=``,n}function s(e,t=0){return e?.children.length?Math.max(t,...e.children.map(e=>s(e,t+1))):0}function c(e,i={}){let c=e.element.ownerDocument,l=c.createElement(`div`);l.className=`markmap-toolbar ${e.themeClass}`,l.setAttribute(`role`,`toolbar`),l.setAttribute(`aria-label`,`Map controls`),l.setAttribute(`part`,`toolbar`);let u=c.createElement(`style`);u.textContent=r,l.append(u);let d=[],f,p=()=>{for(let{el:t,item:n}of d)t.disabled=n.disabled?.(e)??!1},m=()=>{if(!f)return;let t=s(e.tree);if(f.disabled=!t,f.options.length===t+1)return;let n=Array.from({length:t+1},(e,t)=>{let n=c.createElement(`option`);return n.value=t?`${t}`:``,n.textContent=t?`${t}`:`Level`,n});f.replaceChildren(...n)},h=()=>{p(),m()};for(let r of i.items??n){if(r===`fold-level`){let t=c.createElement(`select`);t.title=`Fold to level`,t.setAttribute(`aria-label`,t.title),t.addEventListener(`change`,()=>{t.value&&e.foldToLevel(Number(t.value)),t.value=``}),f=t,l.append(t);continue}let n=typeof r==`string`?t[r]:r,i=c.createElement(`button`);i.type=`button`,i.title=n.label,i.setAttribute(`aria-label`,n.label),n.image?i.append(o(c,n.image)):n.icon?i.append(a(c,n.icon)):i.textContent=n.label,i.addEventListener(`click`,()=>{n.onClick(e),h()}),d.push({el:i,item:n}),l.append(i)}let g=[e.on(`zoom`,p),e.on(`fold`,p),e.on(`render`,h)];return h(),{element:l,update:h,destroy(){for(let e of g)e();l.remove()}}}export{n,c as t};
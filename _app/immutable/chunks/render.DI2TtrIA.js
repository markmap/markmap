import{a4 as g,x as b,A as D,q as H,H as m,B as h,w as R,k as I,o as _,a5 as L,v as O,a6 as V,a7 as Y,a8 as j,a9 as k,y as C,l as M,p as $,j as w,Q as q,a as B,Z as P}from"./utils.DFTM5cE0.js";import{a as Q,r as A,h as v}from"./if.CnkSTwZ2.js";import{r as W}from"./svelte-head.BRMrjwOS.js";import{b as Z}from"./template.BXSVluzr.js";const z=["touchstart","touchmove"];function F(t){return z.includes(t)}function x(t,e){var n=e==null?"":typeof e=="object"?e+"":e;n!==(t.__t??(t.__t=t.nodeValue))&&(t.__t=n,t.nodeValue=n==null?"":n+"")}function G(t,e){return N(t,e)}function ee(t,e){g(),e.intro=e.intro??!1;const n=e.target,u=w,l=_;try{for(var a=b(n);a&&(a.nodeType!==8||a.data!==D);)a=H(a);if(!a)throw m;h(!0),R(a),I();const d=N(t,{...e,anchor:a});if(_===null||_.nodeType!==8||_.data!==L)throw O(),m;return h(!1),d}catch(d){if(d===m)return e.recover===!1&&V(),g(),Y(n),h(!1),G(t,e);throw d}finally{h(u),R(l),W()}}const i=new Map;function N(t,{target:e,anchor:n,props:u={},events:l,context:a,intro:d=!0}){g();var y=new Set,p=o=>{for(var r=0;r<o.length;r++){var s=o[r];if(!y.has(s)){y.add(s);var f=F(s);e.addEventListener(s,v,{passive:f});var T=i.get(s);T===void 0?(document.addEventListener(s,v,{passive:f}),i.set(s,1)):i.set(s,T+1)}}};p(j(Q)),A.add(p);var c=void 0,S=k(()=>{var o=n??e.appendChild(C());return M(()=>{if(a){$({});var r=P;r.c=a}l&&(u.$$events=l),w&&Z(o,null),c=t(o,u)||{},w&&(q.nodes_end=_),a&&B()}),()=>{var f;for(var r of y){e.removeEventListener(r,v);var s=i.get(r);--s===0?(document.removeEventListener(r,v),i.delete(r)):i.set(r,s)}A.delete(p),E.delete(c),o!==n&&((f=o.parentNode)==null||f.removeChild(o))}});return E.set(c,S),c}let E=new WeakMap;function te(t){const e=E.get(t);e&&e()}export{ee as h,G as m,x as s,te as u};

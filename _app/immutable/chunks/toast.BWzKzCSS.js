import"./disclose-version.Bg9kRutz.js";import"./legacy.CYTRe4WA.js";import{p as g,a as w,c as p,r as o,s as x,g as n,t as $}from"./utils.DFTM5cE0.js";import{s as b}from"./render.DI2TtrIA.js";import{e as y}from"./common.CZzrYGnM.js";import{h as O}from"./html.D5bgdAl6.js";import{a as f,t as u}from"./template.BXSVluzr.js";import{i as j}from"./lifecycle.D1rYOL4B.js";import{s as k,a as q}from"./store.BgZ6CRHU.js";import{w as z}from"./index.B8-Hwz92.js";const d=z([]);let l=0;function N(a){l+=1;const t={time:3e3,...a,id:l};d.update(s=>[...s,t]),setTimeout(()=>A(t),t.time)}function A(a){d.update(t=>{const s=t.indexOf(a);return s>=0&&t.splice(s,1),t})}var B=u('<div class="toast"><div class="toast-title"> </div> <div class="toast-body"><!></div></div>'),C=u('<div class="toast-wrapper"></div>');function P(a,t){g(t,!1);const s=k(),h=()=>q(d,"$toasts",s);j();var i=C();y(i,5,h,e=>e.id,(e,v)=>{var r=B(),m=p(r),_=p(m,!0);o(m);var c=x(m,2),T=p(c);O(T,()=>n(v).html),o(c),o(r),$(()=>b(_,n(v).title)),f(e,r)}),o(i),f(a,i),w()}export{P as T,N as s};

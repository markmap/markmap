import{V as c,U as f,W as o,X as b,g as a,d as l}from"./utils.DFTM5cE0.js";let n=!1;function g(e,u,r){const s=r[u]??(r[u]={store:null,source:f(void 0),unsubscribe:o});if(s.store!==e)if(s.unsubscribe(),s.store=e??null,e==null)s.source.v=void 0,s.unsubscribe=o;else{var i=!0;s.unsubscribe=b(e,t=>{i?s.source.v=t:l(s.source,t)}),i=!1}return a(s.source)}function p(){const e={};return c(()=>{for(var u in e)e[u].unsubscribe()}),e}function _(e){var u=n;try{return n=!1,[e(),n]}finally{n=u}}export{g as a,_ as c,p as s};
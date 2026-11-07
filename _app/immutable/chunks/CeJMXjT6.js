var e={title:`Use with Node.js`},t=`<p>Everything but the interactive view runs without a browser.</p>
<h2 id="render-a-png">Render a PNG</h2>
<p><code>renderPNG</code> needs <a href="https://github.com/Brooooooklyn/canvas"><code>@napi-rs/canvas</code></a>:</p>
<pre><code class="hljs language-sh">npm install @markmap/parse @markmap/canvas @markmap/render @napi-rs/canvas</code></pre><pre><code class="hljs language-ts"><span class="hljs-keyword">import</span> { renderPNG } <span class="hljs-keyword">from</span> <span class="hljs-string">&#x27;@markmap/canvas/node&#x27;</span>;
<span class="hljs-keyword">import</span> { parse } <span class="hljs-keyword">from</span> <span class="hljs-string">&#x27;@markmap/parse&#x27;</span>;
<span class="hljs-keyword">import</span> { resolveRenderOptions } <span class="hljs-keyword">from</span> <span class="hljs-string">&#x27;@markmap/render&#x27;</span>;
<span class="hljs-keyword">import</span> { readFile, writeFile } <span class="hljs-keyword">from</span> <span class="hljs-string">&#x27;node:fs/promises&#x27;</span>;

<span class="hljs-keyword">async</span> <span class="hljs-keyword">function</span> <span class="hljs-title function_">renderMarkmap</span>(<span class="hljs-params"><span class="hljs-attr">file</span>: <span class="hljs-built_in">string</span>, <span class="hljs-attr">outFile</span>: <span class="hljs-built_in">string</span></span>) {
  <span class="hljs-keyword">const</span> { root, frontmatter } = <span class="hljs-title function_">parse</span>(<span class="hljs-keyword">await</span> <span class="hljs-title function_">readFile</span>(file, <span class="hljs-string">&#x27;utf8&#x27;</span>));
  <span class="hljs-keyword">const</span> { options } = <span class="hljs-title function_">resolveRenderOptions</span>({}, frontmatter.<span class="hljs-property">markmap</span>);
  <span class="hljs-keyword">const</span> png = <span class="hljs-keyword">await</span> <span class="hljs-title function_">renderPNG</span>(root, { ...options, <span class="hljs-attr">baseDir</span>: <span class="hljs-string">&#x27;.&#x27;</span> });
  <span class="hljs-keyword">await</span> <span class="hljs-title function_">writeFile</span>(outFile, png);
}

<span class="hljs-keyword">await</span> <span class="hljs-title function_">renderMarkmap</span>(<span class="hljs-string">&#x27;notes.md&#x27;</span>, <span class="hljs-string">&#x27;notes.png&#x27;</span>);</code></pre><p>Local images are read only from <code>baseDir</code>, and remote ones are fetched only if <code>allow</code> returns <code>true</code>, so Markdown from someone else cannot read this machine or reach the network unless you say so.</p>
<h2 id="render-an-svg">Render an SVG</h2>
<pre><code class="hljs language-sh">npm install @markmap/parse @markmap/render</code></pre><pre><code class="hljs language-ts"><span class="hljs-keyword">import</span> { parse } <span class="hljs-keyword">from</span> <span class="hljs-string">&#x27;@markmap/parse&#x27;</span>;
<span class="hljs-keyword">import</span> { approximateMeasurer, renderTreeAsync, toSVGString } <span class="hljs-keyword">from</span> <span class="hljs-string">&#x27;@markmap/render&#x27;</span>;

<span class="hljs-keyword">const</span> { root } = <span class="hljs-title function_">parse</span>(markdown);
<span class="hljs-keyword">const</span> result = <span class="hljs-keyword">await</span> <span class="hljs-title function_">renderTreeAsync</span>(root, { <span class="hljs-attr">measurer</span>: approximateMeasurer });
<span class="hljs-keyword">const</span> svg = <span class="hljs-title function_">toSVGString</span>(result);</code></pre><h2 id="from-a-script">From a script</h2>
<p>The <a href="../packages/cli">CLI</a> does all of this in one line, including math and local images:</p>
<pre><code class="hljs language-sh">markmap notes.md --png --no-open</code></pre>`;export{e as frontmatter,t as html};
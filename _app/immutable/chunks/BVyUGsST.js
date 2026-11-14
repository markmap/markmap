var e={title:`@markmap/autoloader`},t=`<p>One script that turns each <code>.markmap</code> block on a page into a map as it scrolls into view. The script is small, and the map code loads only when a map gets close.</p>
<h2 id="usage">Usage</h2>
<pre><code class="hljs language-html"><span class="hljs-tag">&lt;<span class="hljs-name">script</span> <span class="hljs-attr">type</span>=<span class="hljs-string">&quot;module&quot;</span> <span class="hljs-attr">src</span>=<span class="hljs-string">&quot;https://cdn.jsdelivr.net/npm/@markmap/autoloader@1/+esm&quot;</span>&gt;</span><span class="hljs-tag">&lt;/<span class="hljs-name">script</span>&gt;</span>

<span class="hljs-tag">&lt;<span class="hljs-name">div</span> <span class="hljs-attr">class</span>=<span class="hljs-string">&quot;markmap&quot;</span> <span class="hljs-attr">data-theme</span>=<span class="hljs-string">&quot;cards&quot;</span> <span class="hljs-attr">data-toolbar</span>&gt;</span>
  <span class="hljs-tag">&lt;<span class="hljs-name">script</span> <span class="hljs-attr">type</span>=<span class="hljs-string">&quot;text/markdown&quot;</span>&gt;</span><span class="language-javascript">
    # <span class="hljs-title class_">Trip</span>

    ## <span class="hljs-title class_">Before</span>

    ## <span class="hljs-title class_">During</span>
  </span><span class="hljs-tag">&lt;/<span class="hljs-name">script</span>&gt;</span>
<span class="hljs-tag">&lt;/<span class="hljs-name">div</span>&gt;</span></code></pre><p>Blocks may also hold the Markdown as plain text, or point to it with <code>data-src</code>. A block keeps its <code>id</code>, classes and styles, and is 400px high unless your CSS says otherwise.</p>
<h2 id="block-attributes">Block attributes</h2>
<table>
<thead>
<tr>
<th>Attribute</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td><code>data-src</code></td>
<td>URL of a Markdown file</td>
</tr>
<tr>
<td><code>data-theme</code></td>
<td><code>classic</code>, <code>cards</code> or <code>minimal</code></td>
</tr>
<tr>
<td><code>data-layout</code></td>
<td><code>tree</code>, <code>two-sided</code> or <code>org-chart</code></td>
</tr>
<tr>
<td><code>data-color-scheme</code></td>
<td><code>light</code>, <code>dark</code> or <code>auto</code></td>
</tr>
<tr>
<td><code>data-renderer</code></td>
<td><code>svg</code> or <code>canvas</code></td>
</tr>
<tr>
<td><code>data-toolbar</code></td>
<td>Show the toolbar</td>
</tr>
<tr>
<td><code>data-math</code></td>
<td>Load math, which is off because of its size</td>
</tr>
</tbody></table>
<h2 id="set-defaults">Set defaults</h2>
<p>Call <code>configure</code> right after importing:</p>
<pre><code class="hljs language-html"><span class="hljs-tag">&lt;<span class="hljs-name">script</span> <span class="hljs-attr">type</span>=<span class="hljs-string">&quot;module&quot;</span>&gt;</span><span class="language-javascript">
  <span class="hljs-keyword">import</span> { configure } <span class="hljs-keyword">from</span> <span class="hljs-string">&#x27;https://cdn.jsdelivr.net/npm/@markmap/autoloader@1/+esm&#x27;</span>;

  <span class="hljs-title function_">configure</span>({ <span class="hljs-attr">theme</span>: <span class="hljs-string">&#x27;cards&#x27;</span>, <span class="hljs-attr">toolbar</span>: <span class="hljs-literal">true</span>, <span class="hljs-attr">math</span>: <span class="hljs-literal">true</span> });
</span><span class="hljs-tag">&lt;/<span class="hljs-name">script</span>&gt;</span></code></pre><p>It takes <code>theme</code>, <code>layout</code>, <code>colorScheme</code>, <code>renderer</code>, <code>toolbar</code> and <code>math</code>, and <code>options</code> for <a href="view#options"><code>ViewOptions</code></a>. A block&#39;s attributes win over these.</p>
<h2 id="content-added-later">Content added later</h2>
<p><code>renderAll</code> shows every block now, including ones added since the page loaded:</p>
<pre><code class="hljs language-js"><span class="hljs-keyword">import</span> { renderAll } <span class="hljs-keyword">from</span> <span class="hljs-string">&#x27;https://cdn.jsdelivr.net/npm/@markmap/autoloader@1/+esm&#x27;</span>;

<span class="hljs-keyword">await</span> <span class="hljs-title function_">renderAll</span>();</code></pre>`;export{e as frontmatter,t as html};
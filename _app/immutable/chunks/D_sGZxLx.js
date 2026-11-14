var e={title:`@markmap/element`},t=`<p>The <code>&lt;markmap-view&gt;</code> web component: the easiest way to add a map to an app, with any framework or none.</p>
<h2 id="installation">Installation</h2>
<pre><code class="hljs language-sh">npm install @markmap/element</code></pre><pre><code class="hljs language-js"><span class="hljs-keyword">import</span> <span class="hljs-string">&#x27;@markmap/element&#x27;</span>;</code></pre><p>Importing it on a server does nothing, so frameworks can prerender pages that use it.</p>
<h2 id="usage">Usage</h2>
<p>Markdown can come from a script inside the element, a <code>src</code> URL or the <code>markdown</code> property. The property wins over <code>src</code>, and <code>src</code> wins over a script:</p>
<pre><code class="hljs language-html"><span class="hljs-tag">&lt;<span class="hljs-name">markmap-view</span> <span class="hljs-attr">src</span>=<span class="hljs-string">&quot;./notes.md&quot;</span> <span class="hljs-attr">theme</span>=<span class="hljs-string">&quot;cards&quot;</span> <span class="hljs-attr">toolbar</span>&gt;</span><span class="hljs-tag">&lt;/<span class="hljs-name">markmap-view</span>&gt;</span>

<span class="hljs-tag">&lt;<span class="hljs-name">markmap-view</span> <span class="hljs-attr">layout</span>=<span class="hljs-string">&quot;two-sided&quot;</span>&gt;</span>
  <span class="hljs-tag">&lt;<span class="hljs-name">script</span> <span class="hljs-attr">type</span>=<span class="hljs-string">&quot;text/markdown&quot;</span>&gt;</span><span class="language-javascript">
    # <span class="hljs-title class_">Trip</span>

    ## <span class="hljs-title class_">Before</span>

    ## <span class="hljs-title class_">During</span>
  </span><span class="hljs-tag">&lt;/<span class="hljs-name">script</span>&gt;</span>
<span class="hljs-tag">&lt;/<span class="hljs-name">markmap-view</span>&gt;</span></code></pre><pre><code class="hljs language-js"><span class="hljs-variable language_">document</span>.<span class="hljs-title function_">querySelector</span>(<span class="hljs-string">&#x27;markmap-view&#x27;</span>).<span class="hljs-property">markdown</span> = <span class="hljs-string">&#x27;# Trip&#x27;</span>;</code></pre><p>The element is 400px high by default. Set <code>height</code> in CSS to change it.</p>
<h2 id="attributes">Attributes</h2>
<p>These update the map live, and win over the document&#39;s frontmatter.</p>
<table>
<thead>
<tr>
<th>Attribute</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td><code>src</code></td>
<td>URL of a Markdown file</td>
</tr>
<tr>
<td><code>theme</code></td>
<td><code>classic</code>, <code>cards</code> or <code>minimal</code></td>
</tr>
<tr>
<td><code>layout</code></td>
<td><code>tree</code>, <code>two-sided</code> or <code>org-chart</code></td>
</tr>
<tr>
<td><code>color-scheme</code></td>
<td><code>light</code>, <code>dark</code> or <code>auto</code></td>
</tr>
<tr>
<td><code>renderer</code></td>
<td><code>svg</code> (default) or <code>canvas</code></td>
</tr>
<tr>
<td><code>toolbar</code></td>
<td>Show the <a href="view#toolbar">toolbar</a></td>
</tr>
</tbody></table>
<h2 id="properties">Properties</h2>
<table>
<thead>
<tr>
<th>Property</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td><code>markdown</code></td>
<td>Markdown to show, ahead of <code>src</code> and inline Markdown</td>
</tr>
<tr>
<td><code>options</code></td>
<td><code>ViewOptions</code>, for what attributes cannot express, such as <code>plugins</code></td>
</tr>
<tr>
<td><code>parseOptions</code></td>
<td>Options for <code>parse</code>, such as <code>plugins</code></td>
</tr>
<tr>
<td><code>toolbarItems</code></td>
<td>What the toolbar shows</td>
</tr>
<tr>
<td><code>mm</code></td>
<td>The <a href="view"><code>Markmap</code></a> while the element is on the page</td>
</tr>
<tr>
<td><code>warnings</code></td>
<td>Options that were ignored in the last update</td>
</tr>
</tbody></table>
<h2 id="events">Events</h2>
<p><code>render</code> and <code>fold</code> carry the view event&#39;s value as <code>detail</code>. <code>error</code> fires when <code>src</code> cannot be loaded. <code>gfmfallback</code> fires after an update when the browser could not run GFM, so tables, task lists, strikethrough and bare links show as plain text.</p>
<pre><code class="hljs language-js">view.<span class="hljs-title function_">addEventListener</span>(<span class="hljs-string">&#x27;fold&#x27;</span>, <span class="hljs-function">(<span class="hljs-params">event</span>) =&gt;</span> {
  <span class="hljs-variable language_">console</span>.<span class="hljs-title function_">log</span>([...event.<span class="hljs-property">detail</span>]);
});</code></pre><h2 id="styling">Styling</h2>
<p>The map lives in a shadow root, so page CSS stays out. Set <code>--mm-*</code> properties on the element to <a href="../guide/themes-and-layouts#change-colors-with-css">override colors</a>, and use <code>::part(toolbar)</code> to move the toolbar.</p>
<pre><code class="hljs language-css">markmap-view {
  <span class="hljs-attribute">height</span>: <span class="hljs-number">600px</span>;
  <span class="hljs-attr">--mm-bg</span>: <span class="hljs-number">#fffdf5</span>;
}

markmap-view<span class="hljs-selector-pseudo">::part</span>(toolbar) {
  <span class="hljs-attribute">top</span>: <span class="hljs-number">8px</span>;
  <span class="hljs-attribute">bottom</span>: auto;
}</code></pre>`;export{e as frontmatter,t as html};
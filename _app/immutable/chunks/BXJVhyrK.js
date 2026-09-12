const e={title:"JSON Options"},o=`<p><a href="https://markmap.js.org/api/interfaces/markmap-view.IMarkmapJSONOptions.html">JSON options</a> are a group of options that can be serialized as JSON and embedded in Markdown.</p>
<h2 id="usage">Usage</h2>
<h3 id="markdown-frontmatter">Markdown Frontmatter</h3>
<p>JSON options can be added to the frontmatter of your Markdown file as the value of <code>markmap</code>.</p>
<p>For example:</p>
<pre><code class="language-md">---
markmap:
  color:
    - blue
  # other options
---

Markdown content here
</code></pre>
<h3 id="markmap-for-vscode">Markmap for VSCode</h3>
<p>JSON options can be set as <em>Default Options</em> in <a href="https://marketplace.visualstudio.com/items?itemName=gera2ld.markmap-vscode">gera2ld.markmap-vscode</a>, so you don&#39;t have to modify frontmatter of each file.</p>
<p>For example:</p>
<pre><code class="language-json">{
	&quot;color&quot;: [&quot;blue&quot;]
}
</code></pre>
<h2 id="option-list">Option List</h2>
<h3 id="color">color</h3>
<p>Type: <code>string | string[]</code>, default: <a href="https://github.com/d3/d3-scale-chromatic#schemeCategory10">d3.schemeCategory10</a></p>
<p>A list of colors to use as the branch and circle colors for each node.</p>
<p>If none is provided, <a href="https://github.com/d3/d3-scale-chromatic#schemeCategory10">d3.schemeCategory10</a> will be used.</p>
<h3 id="colorfreezelevel">colorFreezeLevel</h3>
<p>Type: <code>number</code>, default: <code>0</code></p>
<p>Freeze color at the specified level of branches, i.e. all child branches will use the color of their ancestor node at the freeze level.</p>
<p><code>0</code> for no freezing at all.</p>
<h3 id="duration">duration</h3>
<p>Type: <code>number</code>, default: <code>500</code></p>
<p>The animation duration when folding/unfolding a node.</p>
<h3 id="maxwidth">maxWidth</h3>
<p>Type: <code>number</code>, default: <code>0</code></p>
<p>The max width of each node content. <code>0</code> for no limit.</p>
<h3 id="initialexpandlevel">initialExpandLevel</h3>
<p>Type: <code>number</code>, default: <code>-1</code></p>
<p>The maximum level of nodes to expand on initial render.</p>
<p><code>-1</code> for expanding all levels.</p>
<h3 id="extrajs">extraJs</h3>
<p>Type: <code>string[]</code>, default: none</p>
<p>A list of JavaScript URLs. This is useful to add more features like Katex plugins.</p>
<p>If a URL starts with <code>npm:</code>, it&#39;s treated as an npm package and resolved to a URL of the selected CDN based on the current network conditions.</p>
<h3 id="extracss">extraCss</h3>
<p>Type: <code>string[]</code>, default: none</p>
<p>A list of CSS URLs. This is useful to add more features like Katex plugins.</p>
<p>If a URL starts with <code>npm:</code>, it&#39;s treated as an npm package and resolved to a URL of the selected CDN based on the current network conditions.</p>
<h3 id="zoom">zoom</h3>
<p>Type: <code>boolean</code>, default: <code>true</code></p>
<p>Whether to allow zooming the markmap.</p>
<h3 id="pan">pan</h3>
<p>Type: <code>boolean</code>, default: <code>true</code></p>
<p>Whether to allow panning the markmap.</p>
<h3 id="htmlparser">htmlParser</h3>
<p>Type: <code>{ selector: string }</code></p>
<p>Pass options to the internal HTML parser, for example to override the default selectors for elements to display.</p>
<h3 id="spacinghorizontal">spacingHorizontal</h3>
<p>Type: <code>number</code>, default: <code>80</code></p>
<h3 id="spacingvertical">spacingVertical</h3>
<p>Type: <code>number</code>, default: <code>5</code></p>
<h3 id="activenode">activeNode</h3>
<p>Type: <code>{ placement: &#39;center&#39; | &#39;visible&#39; }</code>, default: <code>{ placement: &#39;visible&#39; }</code></p>
<p><em>Only available in <a href="/">markmap.js.org</a> and <a href="https://marketplace.visualstudio.com/items?itemName=gera2ld.markmap-vscode">gera2ld.markmap-vscode</a>.</em></p>
<ul>
<li><code>placement</code><ul>
<li><code>visible</code> - ensure the active node is in the viewport</li>
<li><code>center</code> - center the active node</li>
</ul>
</li>
</ul>
<h3 id="linewidth">lineWidth</h3>
<p>Type: <code>number</code>, since <code>v0.18.8</code></p>
<p>The stroke width of lines between nodes.</p>
<h2 id="markmap-options">Markmap Options</h2>
<p>The JSON options represent a subset of the low-level options of Markmap as a tradeoff for portability.</p>
<p>If you are a developer and require more flexibility, you may check the low-level <a href="packages--markmap-view#options">Markmap Options</a>.</p>
`;export{e as frontmatter,o as html};

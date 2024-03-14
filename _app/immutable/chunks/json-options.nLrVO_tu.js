const e={title:"JSON Options"},o=`<p>JSON options are a group of options that can be serialized as JSON and embedded in Markdown.</p>
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
<h3 id="extracss">extraCss</h3>
<p>Type: <code>string[]</code>, default: none</p>
<p>A list of CSS URLs. This is useful to add more features like Katex plugins.</p>
<h3 id="zoom">zoom</h3>
<p>Type: <code>boolean</code>, default: <code>true</code></p>
<p>Whether to allow zooming the markmap.</p>
<h3 id="pan">pan</h3>
<p>Type: <code>boolean</code>, default: <code>true</code></p>
<p>Whether to allow panning the markmap.</p>
<h3 id="htmlparser">htmlParser</h3>
<p>Type: <code>object</code></p>
<p>Pass options to the internal HTML parser, for example to override the default selectors for elements to display.</p>
<h2 id="why">Why?</h2>
<p>If you are not a developer, you may skip this part.</p>
<p>Markmap has its own options which can either be passed on create or afterwards.</p>
<pre><code class="language-ts">Markmap.create(svg, markmapOptions, data);
</code></pre>
<p>However, <code>markmapOptions</code> is a low-level object including complicated logic that can hardly be serialized, so it is not portable.</p>
<p><code>jsonOptions</code> is introduced for portability but as a tradeoff it can only stand for a subset of <code>markmapOptions</code>.</p>
<p><code>jsonOptions</code> can be converted to <code>markmapOptions</code> with a single function call:</p>
<pre><code class="language-ts">import { deriveOptions } from &#39;markmap-view&#39;;

const markmapOptions = deriveOptions(jsonOptions);
</code></pre>
`;export{e as frontmatter,o as html};

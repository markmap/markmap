var e={title:`Writing maps`},t=`<p>Markmap reads ordinary Markdown, with <a href="https://github.github.com/gfm/">GFM</a> extensions, so a document you already have is usually a map already.</p>
<h2 id="branches">Branches</h2>
<p>Only headings and list items become nodes. A single <code># Heading</code> becomes the root. Otherwise the root comes from <code>title</code> in the frontmatter, or stays empty.</p>
<pre><code class="hljs language-md">---
<span class="hljs-section">title: Used when there is no single H1
---</span>

<span class="hljs-section">## A heading is a branch</span>

<span class="hljs-bullet">-</span> So is a list item
<span class="hljs-bullet">  -</span> Nest them as deep as you like</code></pre><h2 id="labels">Labels</h2>
<p>A label can hold:</p>
<table>
<thead>
<tr>
<th>Syntax</th>
<th>Shows</th>
</tr>
</thead>
<tbody><tr>
<td><code>**bold**</code>, <code>*italic*</code></td>
<td>Bold, italic</td>
</tr>
<tr>
<td><code>~~strike~~</code></td>
<td>Strikethrough</td>
</tr>
<tr>
<td><code>==highlight==</code></td>
<td>Highlight</td>
</tr>
<tr>
<td><code>\`code\`</code></td>
<td>Inline code</td>
</tr>
<tr>
<td><code>[text](url)</code></td>
<td>A link</td>
</tr>
<tr>
<td><code>- [x] done</code>, <code>- [ ] open</code></td>
<td>A task list checkbox</td>
</tr>
<tr>
<td><code>![alt](url)</code></td>
<td>An image</td>
</tr>
<tr>
<td><code>$e^{i\\pi}$</code></td>
<td>Math, with <a href="../packages/view#math">plugin-math</a></td>
</tr>
</tbody></table>
<p>Raw HTML is dropped, with two exceptions: <a href="magic-comments">magic comments</a> and a single <code>&lt;img&gt;</code> tag, described below.</p>
<h2 id="notes">Notes</h2>
<p>Anything else, such as paragraphs, code blocks, tables and quotes, becomes a <strong>note</strong> on the node that owns it. A note is a small dot beside the label. Click it to read the note in a popover.</p>
<ul>
<li>A paragraph under a heading belongs to that heading.</li>
<li>In a list item with several paragraphs, the first is the label and the rest are notes.</li>
<li>Blocks before the first heading belong to the root.</li>
</ul>
<figure class="demo">
<pre><code class="hljs language-markdown"><span class="hljs-section"># Release</span>

<span class="hljs-section">## Checklist</span>

Run these in order, and stop if one fails.

<span class="hljs-bullet">-</span> Tag the version

  <span class="hljs-code">\`\`\`sh
  git tag v1.0.0
  \`\`\`</span>

<span class="hljs-bullet">-</span> Tell people
</code></pre>
<markmap-view ><script type="text/markdown"># Release

## Checklist

Run these in order, and stop if one fails.

- Tag the version

  \`\`\`sh
  git tag v1.0.0
  \`\`\`

- Tell people
<\/script></markmap-view>
</figure><p>Notes keep the map small and leave your document whole. Code in a note is highlighted, and exported images keep the dot but not the note&#39;s content.</p>
<h2 id="images">Images</h2>
<p><code>![alt](url)</code> loads the image to find its size. To lay it out at once, give the size with an <code>&lt;img&gt;</code> tag:</p>
<pre><code class="hljs language-md"><span class="hljs-bullet">-</span> Logo <span class="language-xml"><span class="hljs-tag">&lt;<span class="hljs-name">img</span> <span class="hljs-attr">src</span>=<span class="hljs-string">&quot;logo.png&quot;</span> <span class="hljs-attr">width</span>=<span class="hljs-string">&quot;120&quot;</span> <span class="hljs-attr">height</span>=<span class="hljs-string">&quot;80&quot;</span> <span class="hljs-attr">alt</span>=<span class="hljs-string">&quot;Logo&quot;</span>&gt;</span></span></code></pre><p>Only <code>src</code>, <code>alt</code>, <code>width</code> and <code>height</code> are kept. Every image is capped at the wrap width and keeps its aspect ratio. An image that fails to load shows its alt text.</p>
<h2 id="math">Math</h2>
<p>Math works in labels and in notes, on the website and with the <a href="../packages/cli">CLI</a>. In your own code, add <a href="../packages/view#math">@markmap/plugin-math</a>.</p>
<figure class="demo">
<pre><code class="hljs language-markdown"><span class="hljs-section"># Math</span>

<span class="hljs-bullet">-</span> Euler: $e^{i\\pi} + 1 = 0$
<span class="hljs-bullet">-</span> Sum: $\\sum<span class="hljs-emphasis">_{k=1}^{n} k = \\frac{n(n+1)}{2}$</span></code></pre>
<markmap-view ><script type="text/markdown"># Math

- Euler: $e^{i\\pi} + 1 = 0$
- Sum: $\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}$<\/script></markmap-view>
</figure>`;export{e as frontmatter,t as html};
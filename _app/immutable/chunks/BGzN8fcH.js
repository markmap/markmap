var e={title:`Themes and layouts`},t=`<p>A <strong>layout</strong> decides where nodes go, and a <strong>theme</strong> decides how they look. Any layout works with any theme. Set both in the frontmatter:</p>
<pre><code class="hljs language-md">---
markmap:
  layout: two-sided
<span class="hljs-section">  theme: cards
---</span></code></pre><h2 id="layouts">Layouts</h2>
<h3 id="tree">tree</h3>
<p>The default. Children grow to the right of their parent.</p>
<figure class="demo">
<pre><code class="hljs language-markdown"><span class="hljs-section"># Project</span>
<span class="hljs-section">## Plan</span>
<span class="hljs-bullet">-</span> Goals
<span class="hljs-bullet">-</span> Budget
<span class="hljs-section">## Build</span>
<span class="hljs-bullet">-</span> Design
<span class="hljs-bullet">-</span> Code</code></pre>
<markmap-view layout="tree"><script type="text/markdown"># Project
## Plan
- Goals
- Budget
## Build
- Design
- Code<\/script></markmap-view>
</figure><h3 id="two-sided">two-sided</h3>
<p>The root&#39;s first branches go right and the rest go left, split so both sides are about the same size. Folding never moves a branch across.</p>
<figure class="demo">
<pre><code class="hljs language-markdown"><span class="hljs-section"># Project</span>
<span class="hljs-section">## Plan</span>
<span class="hljs-bullet">-</span> Goals
<span class="hljs-bullet">-</span> Budget
<span class="hljs-section">## Build</span>
<span class="hljs-bullet">-</span> Design
<span class="hljs-bullet">-</span> Code
<span class="hljs-section">## Launch</span>
<span class="hljs-bullet">-</span> Docs
<span class="hljs-section">## Review</span>
<span class="hljs-bullet">-</span> Metrics</code></pre>
<markmap-view layout="two-sided"><script type="text/markdown"># Project
## Plan
- Goals
- Budget
## Build
- Design
- Code
## Launch
- Docs
## Review
- Metrics<\/script></markmap-view>
</figure><h3 id="org-chart">org-chart</h3>
<p>Top-down, for hierarchies. <code>levelGap</code> is the gap between levels.</p>
<figure class="demo">
<pre><code class="hljs language-markdown"><span class="hljs-section"># Project</span>
<span class="hljs-section">## Plan</span>
<span class="hljs-bullet">-</span> Goals
<span class="hljs-bullet">-</span> Budget
<span class="hljs-section">## Build</span>
<span class="hljs-bullet">-</span> Design
<span class="hljs-bullet">-</span> Code</code></pre>
<markmap-view layout="org-chart"><script type="text/markdown"># Project
## Plan
- Goals
- Budget
## Build
- Design
- Code<\/script></markmap-view>
</figure><h2 id="themes">Themes</h2>
<h3 id="classic">classic</h3>
<p>Underlined labels, curved edges and fold circles. Takes <code>color</code> and <code>colorDepth</code>.</p>
<figure class="demo">
<pre><code class="hljs language-markdown"><span class="hljs-section"># Project</span>
<span class="hljs-section">## Plan</span>
<span class="hljs-bullet">-</span> Goals
<span class="hljs-section">## Build</span>
<span class="hljs-bullet">-</span> Code</code></pre>
<markmap-view theme="classic"><script type="text/markdown"># Project
## Plan
- Goals
## Build
- Code<\/script></markmap-view>
</figure><h3 id="cards">cards</h3>
<p>Rounded cards with a scale-in animation. Takes <code>color</code> and <code>colorDepth</code>.</p>
<figure class="demo">
<pre><code class="hljs language-markdown"><span class="hljs-section"># Project</span>
<span class="hljs-section">## Plan</span>
<span class="hljs-bullet">-</span> Goals
<span class="hljs-section">## Build</span>
<span class="hljs-bullet">-</span> Code</code></pre>
<markmap-view theme="cards"><script type="text/markdown"># Project
## Plan
- Goals
## Build
- Code<\/script></markmap-view>
</figure><h3 id="minimal">minimal</h3>
<p>Plain text, thin gray edges and fold dots.</p>
<figure class="demo">
<pre><code class="hljs language-markdown"><span class="hljs-section"># Project</span>
<span class="hljs-section">## Plan</span>
<span class="hljs-bullet">-</span> Goals
<span class="hljs-section">## Build</span>
<span class="hljs-bullet">-</span> Code</code></pre>
<markmap-view theme="minimal"><script type="text/markdown"># Project
## Plan
- Goals
## Build
- Code<\/script></markmap-view>
</figure><h2 id="colors">Colors</h2>
<p><code>color</code> sets the branch colors, and one color paints every branch the same. <code>colorDepth</code> makes nodes below a level take their ancestor&#39;s color, where the root is level 1.</p>
<figure class="demo">
<pre><code class="hljs language-markdown">---
markmap:
  color: [&#x27;#2980b9&#x27;, &#x27;#c0392b&#x27;]
<span class="hljs-section">  colorDepth: 2
---</span>

<span class="hljs-section"># Project</span>

<span class="hljs-section">## Plan</span>

<span class="hljs-bullet">-</span> Goals
<span class="hljs-bullet">  -</span> This year

<span class="hljs-section">## Build</span>

<span class="hljs-bullet">-</span> Code
<span class="hljs-bullet">  -</span> Tests</code></pre>
<markmap-view ><script type="text/markdown">---
markmap:
  color: ['#2980b9', '#c0392b']
  colorDepth: 2
---

# Project

## Plan

- Goals
  - This year

## Build

- Code
  - Tests<\/script></markmap-view>
</figure><h2 id="dark-mode">Dark mode</h2>
<p>Each theme has a dark set of colors. <code>colorScheme</code> picks <code>light</code>, <code>dark</code>, or <code>auto</code>, which follows the reader&#39;s system. The default is <code>light</code>, so a map never turns dark on a light page by surprise. On this website, a map follows the site unless its document says otherwise.</p>
<h2 id="change-colors-with-css">Change colors with CSS</h2>
<p>Colors are CSS variables, so a page can override them on the map&#39;s element. Exported SVG keeps them too.</p>
<pre><code class="hljs language-css">markmap-view {
  <span class="hljs-attr">--mm-link</span>: rebeccapurple;
  <span class="hljs-attr">--mm-bg</span>: <span class="hljs-number">#fffdf5</span>;
}</code></pre><table>
<thead>
<tr>
<th>Token</th>
<th>Used for</th>
</tr>
</thead>
<tbody><tr>
<td><code>--mm-text</code>, <code>--mm-bg</code></td>
<td>Text, background</td>
</tr>
<tr>
<td><code>--mm-branch-0</code> and up</td>
<td>Branch colors</td>
</tr>
<tr>
<td><code>--mm-link</code></td>
<td>Links</td>
</tr>
<tr>
<td><code>--mm-code-bg</code>, <code>--mm-code-text</code></td>
<td>Inline code</td>
</tr>
<tr>
<td><code>--mm-mark-bg</code></td>
<td>Highlights</td>
</tr>
<tr>
<td><code>--mm-checkbox</code>, <code>--mm-note-dot</code></td>
<td>Checkboxes, note dots</td>
</tr>
<tr>
<td><code>--mm-toggle-bg</code></td>
<td>Fold circles (classic)</td>
</tr>
<tr>
<td><code>--mm-card-bg</code></td>
<td>Cards (cards)</td>
</tr>
<tr>
<td><code>--mm-syntax-keyword</code>, <code>--mm-syntax-string</code>, <code>--mm-syntax-comment</code>, <code>--mm-syntax-number</code>, <code>--mm-syntax-title</code>, <code>--mm-syntax-attr</code></td>
<td>Code in popovers</td>
</tr>
</tbody></table>
`;export{e as frontmatter,t as html};
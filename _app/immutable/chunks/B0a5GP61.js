var e={title:`Options`},t=`<p>Options go in the frontmatter of your Markdown, under <code>markmap</code>:</p>
<pre><code class="hljs language-md">---
markmap:
  theme: cards
  layout: two-sided
<span class="hljs-section">  foldLevel: 2
---</span>

<span class="hljs-section"># Markdown content here</span></code></pre><p>Values that are invalid or unknown are ignored and reported as warnings. The <a href="/editor">editor</a> lists them below the map. In code, <code>resolveViewOptions</code> returns them.</p>
<h2 id="look">Look</h2>
<h3 id="theme">theme</h3>
<p>Type: <code>string</code>, default: <code>classic</code></p>
<p>One of <code>classic</code>, <code>cards</code> and <code>minimal</code>. See <a href="themes-and-layouts">Themes and layouts</a>.</p>
<h3 id="layout">layout</h3>
<p>Type: <code>string</code>, default: <code>tree</code></p>
<p>One of <code>tree</code>, <code>two-sided</code> and <code>org-chart</code>.</p>
<h3 id="colorscheme">colorScheme</h3>
<p>Type: <code>&#39;light&#39; | &#39;dark&#39; | &#39;auto&#39;</code>, default: <code>light</code></p>
<p><code>auto</code> follows the reader&#39;s system setting.</p>
<h3 id="color">color</h3>
<p>Type: <code>string | string[]</code>, default: the d3 category10 palette</p>
<p>Branch colors, cycled through. One color paints every branch the same. For the <code>classic</code> and <code>cards</code> themes.</p>
<h3 id="colordepth">colorDepth</h3>
<p>Type: <code>number</code>, default: <code>0</code></p>
<p>Nodes deeper than this level take their ancestor&#39;s color, where the root is level 1. <code>0</code> disables this. For the <code>classic</code> and <code>cards</code> themes.</p>
<h2 id="layout-1">Layout</h2>
<h3 id="wrapwidth">wrapWidth</h3>
<p>Type: <code>number</code>, default: <code>0</code></p>
<p>Wrap labels wider than this, in px. <code>0</code> disables wrapping.</p>
<h3 id="levelgap">levelGap</h3>
<p>Type: <code>number</code>, default: <code>80</code></p>
<p>The gap between levels.</p>
<h3 id="siblinggap">siblingGap</h3>
<p>Type: <code>number</code>, default: <code>5</code></p>
<p>The gap between siblings. The org chart keeps siblings three times this far apart.</p>
<h2 id="behavior">Behavior</h2>
<h3 id="foldlevel">foldLevel</h3>
<p>Type: <code>number</code>, default: none</p>
<p>Fold nodes at this depth and deeper when they first appear. The root is depth 0, so <code>1</code> shows only the root&#39;s children. To fold chosen branches instead, see <a href="magic-comments">Magic comments</a>.</p>
<h3 id="duration">duration</h3>
<p>Type: <code>number</code>, default: <code>500</code></p>
<p>Length of fold, update and fit animations, in ms. <code>0</code> disables them, and so does the reader&#39;s <code>prefers-reduced-motion</code> setting.</p>
<h3 id="zoom">zoom</h3>
<p>Type: <code>boolean</code>, default: <code>true</code></p>
<p>Allow zooming with the wheel or a pinch.</p>
<h3 id="pan">pan</h3>
<p>Type: <code>boolean</code>, default: <code>true</code></p>
<p>Allow panning by dragging.</p>
<h3 id="minscale">minScale</h3>
<p>Type: <code>number</code>, default: <code>0.1</code></p>
<p>The smallest scale to zoom out to. <code>fit()</code> may go further to show everything.</p>
<h3 id="maxscale">maxScale</h3>
<p>Type: <code>number</code>, default: <code>8</code></p>
<p>The largest scale to zoom in to.</p>
<h3 id="fitpadding">fitPadding</h3>
<p>Type: <code>number</code>, default: <code>20</code></p>
<p>Space kept around the drawing when fitting it to the view, in px.</p>
<h3 id="fitmaxscale">fitMaxScale</h3>
<p>Type: <code>number</code>, default: <code>2</code></p>
<p>The largest scale <code>fit()</code> zooms in to.</p>
<h2 id="in-code">In code</h2>
<p>The same options, and a few more such as <code>plugins</code>, are <code>ViewOptions</code> in <a href="../packages/view#options">@markmap/view</a>.</p>
`;export{e as frontmatter,t as html};
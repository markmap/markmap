const a={title:"markmap-view"},e=`<p><img src="https://img.shields.io/npm/v/markmap-view.svg" alt="NPM"></p>
<p>Render a markmap from transformed data.</p>
<h2 id="installation">Installation</h2>
<pre><code class="language-bash">$ npm install markmap-view
</code></pre>
<p>Or load from CDN:</p>
<pre><code class="language-html">&lt;script src=&quot;https://cdn.jsdelivr.net/npm/d3@7&quot;&gt;&lt;/script&gt;
&lt;script src=&quot;https://cdn.jsdelivr.net/npm/markmap-view&quot;&gt;&lt;/script&gt;
</code></pre>
<h2 id="usage">Usage</h2>
<p>Create an SVG element with explicit width and height:</p>
<pre><code class="language-html">&lt;svg id=&quot;markmap&quot; style=&quot;width: 800px; height: 800px&quot;&gt;&lt;/svg&gt;
</code></pre>
<p>Assuming we have already got <code>{ root }</code> node and assets <code>{ styles, scripts }</code> from <a href="packages--markmap-lib">markmap-lib</a>.</p>
<p>There are two ways to import <code>markmap-view</code>:</p>
<pre><code class="language-ts">// load with &lt;script&gt;
const { markmap } = window;
const { Markmap, loadCSS, loadJS } = markmap;

// or as ESM
import * as markmap from &#39;markmap-view&#39;;
import { Markmap, loadCSS, loadJS } from &#39;markmap-view&#39;;
</code></pre>
<p>Now we can render a markmap to the SVG element:</p>
<pre><code class="language-ts">// 1. load assets
if (styles) loadCSS(styles);
if (scripts) {
	loadJS(scripts, {
		// For plugins to access the \`markmap\` module
		getMarkmap: () =&gt; markmap,
	});
}

// 2. create markmap
// \`options\` is optional, i.e. \`undefined\` can be passed here
Markmap.create(&#39;#markmap&#39;, options, root); // -&gt; returns a Markmap instance
</code></pre>
<p>The first argument of <code>Markmap.create</code> can also be an actual SVG element, for example:</p>
<pre><code class="language-ts">const svgEl = document.querySelector(&#39;#markmap&#39;);
Markmap.create(svgEl, options, data); // -&gt; returns a Markmap instance
</code></pre>
<h3 id="options">Options</h3>
<p>The Markmap <code>options</code> has a type of <a href="https://markmap.js.org/api/interfaces/markmap-view.IMarkmapOptions.html">IMarkmapOptions</a>. It can be passed to <code>Markmap.create</code> upon Markmap creation or <code>mm.setOptions</code> afterwards.</p>
<p>It is a low-level object with <code>function</code>s, making it difficult to serialize, so it is not portable.</p>
<p>So, I recommend using <a href="json-options">JSON options</a> when possible. The JSON options represent a subset of the low-level options as a tradeoff for portability.</p>
<p>It can be easily converted into the low-level options:</p>
<pre><code class="language-ts">import { deriveOptions } from &#39;markmap-view&#39;;

const options = deriveOptions(jsonOptions);
</code></pre>
`;export{a as frontmatter,e as html};

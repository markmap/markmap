const n={title:"markmap-lib"},r=`<p><img src="https://img.shields.io/npm/v/markmap-lib.svg" alt="NPM"></p>
<p>Transform Markdown to data used by markmap.</p>
<h2 id="installation">Installation</h2>
<pre><code class="language-bash">$ npm install markmap-lib
</code></pre>
<p>Or load from CDN:</p>
<pre><code class="language-html">&lt;script src=&quot;https://cdn.jsdelivr.net/npm/markmap-lib&quot;&gt;&lt;/script&gt;
&lt;script&gt;
	const { Transformer } = window.markmap;
&lt;/script&gt;
</code></pre>
<h2 id="usage">Usage</h2>
<h3 id="importing">Importing</h3>
<p>With built-in plugins:</p>
<pre><code class="language-ts">import { Transformer, builtInPlugins } from &#39;markmap-lib&#39;;

// With default plugins
const transformer = new Transformer();

// With additional plugins
const transformer = new Transformer([...builtInPlugins, myPlugin]);
</code></pre>
<p>Without built-in plugins (since v0.16.0):</p>
<pre><code class="language-ts">import { Transformer } from &#39;markmap-lib/no-plugins&#39;;
import { pluginFrontmatter } from &#39;markmap-lib/plugins&#39;;

// No plugin at all
const transformer = new Transformer();

// With specified plugins
const transformer = new Transformer([pluginFrontmatter]);
</code></pre>
<h3 id="transformation">Transformation</h3>
<p>Parse Markdown and create a node tree, return the root node and a <code>features</code> object containing the active features during parsing.</p>
<p>Transform Markdown to markmap data:</p>
<pre><code class="language-ts">// 1. transform Markdown
const { root, features } = transformer.transform(markdown);

// 2. get assets
// either get assets required by used features
const assets = transformer.getUsedAssets(features);

// or get all possible assets that could be used later
const assets = transformer.getAssets();
</code></pre>
<p>Now we have the data for rendering.</p>
<h3 id="next-steps">Next Steps</h3>
<p>Generate interactive HTML using <a href="packages--markmap-render">markmap-render</a>.</p>
<p>Or use it programmatically with <a href="packages--markmap-view">markmap-view</a>.</p>
`;export{n as frontmatter,r as html};

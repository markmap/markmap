const t={title:"markmap-autoloader"},a=`<p><img src="https://img.shields.io/npm/v/markmap-autoloader.svg" alt="NPM">
<img src="https://img.shields.io/npm/l/markmap-autoloader.svg" alt="License">
<img src="https://img.shields.io/npm/dt/markmap-autoloader.svg" alt="Downloads"></p>
<p>Load markmaps automatically in HTML.</p>
<h2 id="quick-start">Quick Start</h2>
<p>HTML:</p>
<pre><code class="language-html">&lt;!-- Set global styles --&gt;
&lt;style&gt;
	.markmap {
		position: relative;
	}
	.markmap &gt; svg {
		width: 100%;
		height: 300px;
	}
&lt;/style&gt;

&lt;!-- Wrap Markdown source in \`.markmap\` elements --&gt;
&lt;div class=&quot;markmap&quot;&gt;
	&lt;script type=&quot;text/template&quot;&gt;
		- markmap
		  - autoloader
		  - transformer
		  - view
	&lt;/script&gt;
&lt;/div&gt;

&lt;!-- Load markmap --&gt;
&lt;script src=&quot;https://cdn.jsdelivr.net/npm/markmap-autoloader@latest&quot;&gt;&lt;/script&gt;
</code></pre>
<p>All elements matching <code>.markmap</code> will be rendered as markmaps.</p>
<p>Note that <code>&lt;script type=&quot;text/template&quot;&gt;</code> is optional. You may need it for two reasons:</p>
<ul>
<li>For the content inside to be invisible before the markmap is rendered.</li>
<li>Prevent the HTML contents from being parsed by the browser. This is critical when you have raw HTML (e.g. <code>&lt;br&gt;</code>) in your Markdown code.</li>
</ul>
<h2 id="advanced-usage">Advanced Usage</h2>
<p>You may configure <code>markmap-autoloader</code> by setting <code>window.markmap.autoLoader</code> before loading the package. See <a href="https://markmap.js.org/api/interfaces/markmap-autoloader.AutoLoaderOptions.html">AutoLoaderOptions</a> for all possible options.</p>
<pre><code class="language-html">&lt;script&gt;
	window.markmap = {
		/** @type AutoLoaderOptions */
		autoLoader: {
			toolbar: true, // Enable toolbar
		},
	};
&lt;/script&gt;
&lt;script src=&quot;https://cdn.jsdelivr.net/npm/markmap-autoloader@latest&quot;&gt;&lt;/script&gt;
</code></pre>
<h3 id="load-manually">Load manually</h3>
<pre><code class="language-html">&lt;script&gt;
	window.markmap = {
		autoLoader: { manual: true },
	};
&lt;/script&gt;
&lt;script src=&quot;https://cdn.jsdelivr.net/npm/markmap-autoloader@latest&quot;&gt;&lt;/script&gt;
&lt;script&gt;
	// Render in 5s
	setTimeout(() =&gt; {
		markmap.autoLoader.renderAll();
	}, 5000);
&lt;/script&gt;
</code></pre>
<h2 id="api">API</h2>
<p>After loading the package, the module can be accessed from <code>window.markmap.autoLoader</code>. See the <a href="https://markmap.js.org/api/modules/markmap-autoloader.html">API docs</a> for all possible methods and properties.</p>
`;export{t as frontmatter,a as html};

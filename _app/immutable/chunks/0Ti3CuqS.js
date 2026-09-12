const e={title:"markmap-render"},a=`<p><img src="https://img.shields.io/npm/v/markmap-render.svg" alt="NPM"></p>
<p>Render Markmap data into interactive HTML.</p>
<h2 id="installation">Installation</h2>
<pre><code class="language-bash">$ npm install markmap-render
</code></pre>
<h2 id="usage">Usage</h2>
<p>First we need to prepare the data for a Markmap. An easy way is to parse Markdown using <a href="packages--markmap-lib">markmap-lib</a>.</p>
<p>We can generate interactive HTML using <a href="https://markmap.js.org/api/functions/markmap-render.fillTemplate.html">fillTemplate</a>.</p>
<pre><code class="language-ts">import { fillTemplate } from &#39;markmap-render&#39;;

const html = fillTemplate(root, assets, extra);
</code></pre>
<p><code>extra</code> is optional, with following properties:</p>
<ul>
<li><code>extra.jsonOptions</code> - see <a href="json-options">JSON Options</a></li>
<li><code>extra.urlBuilder</code> - a custom <a href="https://github.com/gera2ld/npm2url">UrlBuilder</a> to build URLs for assets</li>
</ul>
`;export{e as frontmatter,a as html};

const a={title:"markmap-toolbar"},e=`<p><img src="https://img.shields.io/npm/v/markmap-toolbar.svg" alt="NPM"></p>
<p>Create a toolbar for a markmap.</p>
<h2 id="installation">Installation</h2>
<pre><code class="language-bash">$ npm install markmap-toolbar
</code></pre>
<h2 id="usage">Usage</h2>
<p>Assume we have created a markmap named <code>mm</code>. See <a href="packages--markmap-view">markmap-view</a> for more details.</p>
<p>There are two ways to import &#39;markmap-toolbar&#39;:</p>
<pre><code class="language-ts">// load with &lt;script&gt;
const { markmap } = window;
const { Toolbar } = markmap;

// or as ESM
import { Toolbar } from &#39;markmap-toolbar&#39;;
</code></pre>
<p>Now create a toolbar and attach it to the markmap:</p>
<pre><code class="language-ts">const { el } = Toolbar.create(mm);
el.style.position = &#39;absolute&#39;;
el.style.bottom = &#39;0.5rem&#39;;
el.style.right = &#39;0.5rem&#39;;

// \`container\` could be the element that contains both the markmap and the toolbar
container.append(el);
</code></pre>
`;export{a as frontmatter,e as html};

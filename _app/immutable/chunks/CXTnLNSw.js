var e={title:`markmap`},t=`<h2 id="what-is-markmap">What is markmap?</h2>
<p>Markmap turns Markdown into an interactive mind map. Headings and list items become branches you can fold, zoom and pan. Other text, such as paragraphs and code, stays with its branch as a note.</p>
<figure class="demo">
<pre><code class="hljs language-markdown"><span class="hljs-section"># Trip</span>

<span class="hljs-section">## Before</span>

<span class="hljs-bullet">-</span> Book flights
<span class="hljs-bullet">-</span> Pack

<span class="hljs-section">## During</span>

<span class="hljs-bullet">-</span> See the sights</code></pre>
<markmap-view ><script type="text/markdown"># Trip

## Before

- Book flights
- Pack

## During

- See the sights<\/script></markmap-view>
</figure><p>The easiest way to try it is the 👉 <a href="/editor">editor</a>. You can also use it in:</p>
<ul>
<li><a href="https://marketplace.visualstudio.com/items?itemName=gera2ld.markmap-vscode">VS Code</a> 🚀</li>
<li>the command line, with <a href="packages/cli">@markmap/cli</a></li>
<li>Vim / Neovim, with <a href="packages/coc-markmap">coc-markmap</a></li>
<li><a href="related-projects">many other tools</a></li>
</ul>
<h2 id="learn-the-basics">Learn the basics</h2>
<ul>
<li><a href="guide/writing">Writing maps</a>: what becomes a branch, a note, or part of a label</li>
<li><a href="guide/themes-and-layouts">Themes and layouts</a>: the looks and shapes a map can take</li>
<li><a href="guide/options">Options</a>: settings you can keep in the document itself</li>
<li><a href="guide/magic-comments">Magic comments</a>: fold chosen branches</li>
</ul>
<h2 id="add-maps-to-your-own-pages">Add maps to your own pages</h2>
<table>
<thead>
<tr>
<th>You want to</th>
<th>Use</th>
</tr>
</thead>
<tbody><tr>
<td>Show maps on a page with a script</td>
<td><a href="packages/autoloader">@markmap/autoloader</a></td>
</tr>
<tr>
<td>Add a map to an app</td>
<td><a href="packages/element">@markmap/element</a></td>
</tr>
<tr>
<td>Control everything from code</td>
<td><a href="packages/view">@markmap/view</a></td>
</tr>
<tr>
<td>Render without a browser</td>
<td><a href="guide/use-with-nodejs">Use with Node.js</a></td>
</tr>
</tbody></table>
<p>Coming from <code>markmap-lib</code> and <code>markmap-view</code>? See <a href="migration">Migrating from 0.18</a>.</p>
<h2 id="support">Support</h2>
<p>See the <a href="faq">FAQ</a> for common questions. If you still need help, feel free to ask in <a href="https://github.com/markmap/markmap/discussions">GitHub Discussions</a>.</p>
<h2 id="credits">Credits</h2>
<p>Originally inspired by <a href="https://github.com/dundalek/markmap">dundalek&#39;s markmap</a>.</p>
`;export{e as frontmatter,t as html};
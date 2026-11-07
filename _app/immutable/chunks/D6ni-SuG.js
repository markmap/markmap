var e={title:`@markmap/cli`},t=`<p>The <code>markmap</code> command writes a map of a Markdown file. It is a one-shot tool for scripts and CI. For live preview, use the <a href="https://marketplace.visualstudio.com/items?itemName=gera2ld.markmap-vscode">VS Code extension</a> or the <a href="/editor">editor</a>.</p>
<h2 id="installation">Installation</h2>
<pre><code class="hljs language-sh">npm install -g @markmap/cli</code></pre><p>Or run it with <code>npx</code>:</p>
<pre><code class="hljs language-sh">npx @markmap/cli notes.md</code></pre><h2 id="usage">Usage</h2>
<pre><code class="hljs language-sh">markmap notes.md</code></pre><p>This writes <code>notes.html</code>, one file that works offline, and opens it. Images in the Markdown file&#39;s folder are built in, and math comes along only when the document uses it.</p>
<pre><code class="hljs language-plaintext">Usage: markmap [options] &lt;file.md&gt;

Options:
  -o, --output &lt;file&gt;  Where to write; - for stdout. Defaults to the input&#x27;s name.
      --svg            Write an SVG image instead
      --png            Write a PNG image instead
      --no-open        Do not open the page in a browser
      --no-toolbar     Leave the toolbar off the page
  -h, --help           Show this help
  -v, --version        Show the version</code></pre><p>Use <code>-</code> as the file to read from stdin. Images honor frontmatter and folds.</p>
<p><code>--png</code> needs <code>@napi-rs/canvas</code>, and <code>--svg</code> measures text better with it:</p>
<pre><code class="hljs language-sh">npm install -g @napi-rs/canvas</code></pre>`;export{e as frontmatter,t as html};
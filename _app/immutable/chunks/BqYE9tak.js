const n={title:"markmap-cli"},a=`<p><img src="https://img.shields.io/npm/v/markmap-cli.svg" alt="NPM"></p>
<p>Use markmap command-line in a local terminal.</p>
<h2 id="installation">Installation</h2>
<pre><code class="language-bash">$ yarn global add markmap-cli
# or
$ npm install -g markmap-cli
</code></pre>
<p>You can also use with <code>npx</code> without installation:</p>
<pre><code class="language-bash">$ npx markmap-cli
</code></pre>
<h2 id="usage">Usage</h2>
<pre><code>Usage: markmap [options] &lt;input&gt;

Create a markmap from a Markdown input file

Options:
  -V, --version          output the version number
  --no-open              do not open the output file after generation
  --no-toolbar           do not show toolbar
  -o, --output &lt;output&gt;  specify filename of the output HTML
  --offline              Inline all assets to allow the generated HTML to work offline
  -w, --watch            watch the input file and update output on the fly, note that this feature is for development only
  -h, --help             display help for command
</code></pre>
<p>Quick start with a <code>markmap.md</code> file:</p>
<pre><code class="language-bash">$ npx markmap-cli markmap.md
</code></pre>
`;export{n as frontmatter,a as html};

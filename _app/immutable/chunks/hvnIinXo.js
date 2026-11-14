var e={title:`Magic comments`},t=`<p>Magic comments set the initial state of a node. They are invisible in other Markdown renderers.</p>
<figure class="demo">
<pre><code class="hljs language-markdown"><span class="hljs-section">## heading 1</span>

<span class="hljs-bullet">-</span> item 1 &lt;!-- markmap: foldAll --&gt;
<span class="hljs-bullet">  -</span> item 1.1
<span class="hljs-bullet">    -</span> item 1.1.1
<span class="hljs-bullet">  -</span> item 1.2
<span class="hljs-bullet">    -</span> item 1.2.1
<span class="hljs-bullet">-</span> item 2

<span class="hljs-section">## heading 2 &lt;!-- markmap: fold --&gt;</span>

<span class="hljs-bullet">-</span> item 3
<span class="hljs-bullet">  -</span> item 3.1
<span class="hljs-bullet">-</span> item 4
<span class="hljs-bullet">  -</span> item 4.1</code></pre>
<markmap-view ><script type="text/markdown">## heading 1

- item 1 <!-- markmap: foldAll -->
  - item 1.1
    - item 1.1.1
  - item 1.2
    - item 1.2.1
- item 2

## heading 2 <!-- markmap: fold -->

- item 3
  - item 3.1
- item 4
  - item 4.1<\/script></markmap-view>
</figure><p>A magic comment starts with <code>markmap:</code> and is followed by an action.</p>
<h2 id="supported-actions">Supported actions</h2>
<h3 id="fold">fold</h3>
<p>Fold the current node only.</p>
<h3 id="foldall">foldAll</h3>
<p>Fold the current node and all its descendants, so unfolding reveals one level at a time.</p>
`;export{e as frontmatter,t as html};
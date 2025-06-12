const n={title:"Magic Comments"},t=`<p>Magic comments can be used to set the initial status of a node.</p>
<p>For example:</p>
<pre><code class="language-md">## heading 1

- item 1 &lt;!-- markmap: foldAll --&gt;
  - item 1.1
    - item 1.1.1
  - item 1.2
    - item 1.2.1
- item 2

## heading 2 &lt;!-- markmap: fold --&gt;

- item 3
  - item 3.1
- item 4
  - item 4.1
</code></pre>
<p>A magic comment starts with <code>markmap:&lt;space&gt;</code> and is followed by an action.</p>
<h2 id="supported-actions">Supported Actions</h2>
<h3 id="fold">fold</h3>
<p>Fold the current node only.</p>
<h3 id="foldall">foldAll</h3>
<p>Fold the current node and all its descendents.</p>
`;export{n as frontmatter,t as html};

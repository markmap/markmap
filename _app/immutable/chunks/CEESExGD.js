var e={title:`FAQ`},t=`<h2 id="why-cant-i-have-more-than-6-levels-of-">Why can&#39;t I have more than 6 levels of <code>#</code>?</h2>
<p>Because this is how Markdown works. If you are new to Markdown, I suggest you go through the <a href="https://www.markdownguide.org/">Markdown Guide</a>.</p>
<p><code>#</code> is used to create headings in Markdown. Either in Markdown or HTML we can have at most 6 levels of headings, aka. <code>&lt;h1&gt;</code> - <code>&lt;h6&gt;</code> in HTML.</p>
<p>In markmap, the concept of headings is weakened, but it is still subject to Markdown syntax. However you can use nested lists to create branches more than 6 levels deep.</p>
<h2 id="why-is-my-paragraph-not-on-the-map">Why is my paragraph not on the map?</h2>
<p>Only headings and list items become nodes. A paragraph becomes a <a href="guide/writing#notes">note</a>: click the dot beside its branch to read it.</p>
<h2 id="why-was-my-html-dropped">Why was my HTML dropped?</h2>
<p>Labels and notes are structured data, not HTML, which is what makes clean SVG and PNG exports possible, and keeps Markdown from strangers safe to show. The exceptions are <a href="guide/magic-comments">magic comments</a> and a single <a href="guide/writing#images"><code>&lt;img&gt;</code> tag</a>.</p>
<h2 id="which-renderer-should-i-use">Which renderer should I use?</h2>
<p>SVG, unless your map is very large. Its text can be selected and read by screen readers, and it exports as vectors. Canvas stays smooth with thousands of nodes, but has no accessibility tree yet, so it is never picked for you. In the <a href="/editor">editor</a> it is under <strong>Options</strong>.</p>
<h2 id="do-share-links-upload-my-document">Do share links upload my document?</h2>
<p>No. The document is compressed into the part of the URL after <code>#</code>, which browsers never send to a server. It also means a long document makes a long link.</p>
`;export{e as frontmatter,t as html};
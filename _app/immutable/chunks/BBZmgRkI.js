const t={title:"Use with Node.js"},n=`<p>We can easily render a Markmap as a PNG image using Node.js by leveraging <a href="https://github.com/frinyvonnick/node-html-to-image">node-html-to-image</a>, which uses Puppeteer under the hood.</p>
<pre><code class="language-ts">import { Transformer } from &#39;markmap-lib&#39;;
import { fillTemplate } from &#39;markmap-render&#39;;
import nodeHtmlToImage from &#39;node-html-to-image&#39;;
import { writeFile } from &#39;node:fs/promises&#39;;

async function renderMarkmap(markdown: string, outFile: string) {
	const transformer = new Transformer();
	const { root, features } = transformer.transform(markdown);
	const assets = transformer.getUsedAssets(features);
	const html =
		fillTemplate(root, assets, {
			jsonOptions: {
				duration: 0,
				maxInitialScale: 5,
			},
		}) +
		\`
&lt;style&gt;
body,
#mindmap {
  width: 2400px;
  height: 1800px;
}
&lt;/style&gt;
\`;
	const image = await nodeHtmlToImage({
		html,
	});
	await writeFile(outFile, image);
}

renderMarkmap(markdown, &#39;markmap.png&#39;);
</code></pre>
<p>Note: Puppeteer may use a lot of memory.</p>
`;export{t as frontmatter,n as html};

/** What a written page needs to show its map. */
export interface PageData {
  markdown: string;
  /** Data URLs of inlined images, by the URL in the Markdown. */
  images: Record<string, string>;
  toolbar: boolean;
}

export interface PageOptions {
  title: string;
  data: PageData;
  /** The bundled client. */
  script: string;
}

const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`);

/** JSON that cannot end the `<script>` it sits in. */
const scriptJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

/** JavaScript that cannot end the `<script>` it sits in. */
const scriptCode = (code: string) => code.replace(/<(?=\/script|!--)/gi, () => '\\x3c');

/** One HTML file holding everything needed to show the map offline. */
export function createPage({ title, data, script }: PageOptions): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
html, body { height: 100%; margin: 0; }
markmap-view { height: 100%; }
</style>
</head>
<body>
<script type="application/json" id="markmap-data">${scriptJson(data)}</script>
<script>${scriptCode(script)}</script>
</body>
</html>
`;
}

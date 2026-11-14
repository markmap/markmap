import { link, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { main } from './main';
import type { PageData } from '@markmap/page';

const PIXEL =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

let dir: string;
let out: string;
let err: string;
const open = vi.fn<(file: string) => void>();

const io = (stdin = '') => ({
  stdin: async () => stdin,
  stdout(data: string | Uint8Array) {
    out += String(data);
  },
  stderr(text: string) {
    err += text;
  },
  client: async (math: boolean) => `/* client ${math ? 'with' : 'without'} math */`,
  open,
});

const run = (args: string[], stdin?: string) => main(args, io(stdin));
const inDir = (name: string) => join(dir, name);

const pageData = (html: string) =>
  JSON.parse(
    /<script type="application\/json" id="markmap-data">(.*?)<\/script>/s.exec(html)![1],
  ) as PageData;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'markmap-cli-'));
  out = '';
  err = '';
  open.mockClear();
});

afterEach(async () => {
  await rm(dir, { recursive: true });
});

describe('markmap', () => {
  it('writes a page beside the input and opens it', async () => {
    await writeFile(inDir('notes.md'), '# Title & more\n\n## A');
    expect(await run([inDir('notes.md')])).toBe(0);
    const html = await readFile(inDir('notes.html'), 'utf8');
    expect(html).toContain('<title>Title &#38; more</title>');
    expect(html).toContain('client without math');
    expect(pageData(html)).toMatchObject({ markdown: '# Title & more\n\n## A', toolbar: true });
    expect(open).toHaveBeenCalledWith(inDir('notes.html'));
  });

  it('prefers the frontmatter title', async () => {
    await writeFile(inDir('a.md'), '---\ntitle: From frontmatter\n---\n\n- Item');
    await run([inDir('a.md'), '--no-open']);
    expect(await readFile(inDir('a.html'), 'utf8')).toContain('<title>From frontmatter</title>');
  });

  it('honors -o, --no-open and --no-toolbar', async () => {
    await writeFile(inDir('a.md'), '# A');
    const target = join(dir, 'new', 'folder', 'map.html');
    expect(await run([inDir('a.md'), '-o', target, '--no-open', '--no-toolbar'])).toBe(0);
    expect(pageData(await readFile(target, 'utf8')).toolbar).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });

  it('reads stdin and writes stdout', async () => {
    expect(await run(['-', '-o', '-'], '# From stdin')).toBe(0);
    expect(out).toContain('<title>From stdin</title>');
    expect(open).not.toHaveBeenCalled();
  });

  it('keeps Markdown from ending its script', async () => {
    await writeFile(inDir('a.md'), '# A\n\n- </script><script>alert(1)</script>');
    await run([inDir('a.md'), '--no-open']);
    const html = await readFile(inDir('a.html'), 'utf8');
    expect(html.match(/<script/g)).toHaveLength(2);
    expect(pageData(html).markdown).toContain('</script>');
  });

  it('keeps the client from ending its script', async () => {
    await writeFile(inDir('a.md'), '# A');
    await main([inDir('a.md'), '--no-open'], {
      ...io(),
      client: async () => 'a("</script>"), b("<!--"), c("$&")',
    });
    const html = await readFile(inDir('a.html'), 'utf8');
    expect(html).toContain(String.raw`a("\x3c/script>"), b("\x3c!--"), c("$&")`);
  });

  it('includes math only for documents that have it', async () => {
    await writeFile(inDir('a.md'), '# A\n\n- $x^2$');
    await writeFile(inDir('b.md'), '# B\n\nNote with\n\n$$\ny\n$$');
    await writeFile(inDir('c.md'), '# C');
    for (const name of ['a', 'b', 'c']) await run([inDir(`${name}.md`), '--no-open']);
    expect(await readFile(inDir('a.html'), 'utf8')).toContain('client with math');
    expect(await readFile(inDir('b.html'), 'utf8')).toContain('client with math');
    expect(await readFile(inDir('c.html'), 'utf8')).toContain('client without math');
  });

  it('inlines local images, and only those', async () => {
    await mkdir(inDir('docs/img'), { recursive: true });
    await writeFile(inDir('docs/img/a b.png'), Buffer.from(PIXEL, 'base64'));
    await writeFile(inDir('secret.png'), 'secret');
    await writeFile(inDir('docs/img/notes.txt'), 'text');
    await symlink(inDir('secret.png'), inDir('docs/link.png'));
    await writeFile(
      inDir('docs/a.md'),
      `# A
- ![ok](img/a%20b.png)
- ![up](../secret.png)
- ![link](link.png)
- ![abs](${inDir('secret.png')})
- ![text](img/notes.txt)
- ![gone](missing.png)
- ![web](https://example.com/a.png)

  ![in a note](img/a%20b.png)
`,
    );
    await run([inDir('docs/a.md'), '--no-open']);
    const { images } = pageData(await readFile(inDir('docs/a.html'), 'utf8'));
    expect(images).toEqual({ 'img/a%20b.png': `data:image/png;base64,${PIXEL}` });
    expect(err).toContain("../secret.png not included: outside the Markdown file's folder");
    expect(err).toContain('link.png not included: outside');
    expect(err).toContain('notes.txt not included: not a supported image type');
    expect(err).toContain('missing.png not included: ENOENT');
    expect(err).not.toContain('example.com');
  });

  it('reads no local images from stdin', async () => {
    await writeFile(inDir('a.png'), Buffer.from(PIXEL, 'base64'));
    await run(['-', '-o', '-'], `# A\n- ![a](${inDir('a.png')})`);
    expect(pageData(out).images).toEqual({});
  });

  it('writes SVG with frontmatter, folds and inlined images', async () => {
    await writeFile(inDir('a.png'), Buffer.from(PIXEL, 'base64'));
    await writeFile(
      inDir('a.md'),
      `---
markmap:
  colorScheme: dark
  bogus: 1
---

# Root
- ![a](a.png)
- Folded <!-- markmap: fold -->
  - Hidden
`,
    );
    expect(await run([inDir('a.md'), '--svg'])).toBe(0);
    const svg = await readFile(inDir('a.svg'), 'utf8');
    expect(svg).toMatch(/^<svg /);
    expect(svg).toContain(`data:image/png;base64,${PIXEL}`);
    expect(svg).toContain('Folded');
    expect(svg).not.toContain('Hidden');
    expect(svg).toContain('--mm-bg:#1e1e1e');
    expect(err).toContain('bogus');
    expect(open).not.toHaveBeenCalled();
  });

  it('writes math in SVG', async () => {
    await writeFile(inDir('a.md'), '# A\n\n- $x^2$');
    await run([inDir('a.md'), '--svg', '-o', '-']);
    expect(out).toContain('<path');
    expect(out).not.toContain('x^2');
  });

  it('writes PNG', async () => {
    await writeFile(inDir('a.png'), Buffer.from(PIXEL, 'base64'));
    await writeFile(inDir('a.md'), '# A\n\n- ![a](a.png)\n- Text');
    expect(await run([inDir('a.md'), '--png', '-o', inDir('map.png')])).toBe(0);
    const png = await readFile(inDir('map.png'));
    expect(png.subarray(1, 4).toString()).toBe('PNG');
  });

  it('refuses to overwrite an image the input uses', async () => {
    await writeFile(inDir('a.png'), 'image');
    await writeFile(inDir('a.md'), '# A\n\n- ![a](a.png)');
    expect(await run([inDir('a.md'), '--png'])).toBe(1);
    expect(err).toContain('it is an image the input uses');
    expect(await readFile(inDir('a.png'), 'utf8')).toBe('image');
    expect(await run([inDir('a.md'), '--png', '-o', inDir('map.png')])).toBe(0);
  });

  it('sees through links and encoded names', async () => {
    await writeFile(inDir('my pic.png'), 'image');
    await symlink(inDir('my pic.png'), inDir('link.png'));
    await writeFile(inDir('a.md'), '# A\n\n- ![a](my%20pic.png)');
    expect(await run([inDir('a.md'), '--svg', '-o', inDir('link.png')])).toBe(1);
    expect(await readFile(inDir('my pic.png'), 'utf8')).toBe('image');
  });

  it('refuses to overwrite the input', async () => {
    await writeFile(inDir('a.md'), '# A');
    expect(await run([inDir('a.md'), '-o', inDir('a.md'), '--no-open'])).toBe(1);
    expect(err).toContain('it is the input');
    expect(await readFile(inDir('a.md'), 'utf8')).toBe('# A');
  });

  it('refuses to overwrite the input through a hard link', async () => {
    await writeFile(inDir('a.md'), '# A');
    await link(inDir('a.md'), inDir('a.html'));
    expect(await run([inDir('a.md'), '--no-open'])).toBe(1);
    expect(err).toContain('it is the input');
    expect(await readFile(inDir('a.md'), 'utf8')).toBe('# A');
  });

  it('refuses to overwrite a referenced image through a hard link', async () => {
    const image = Buffer.from(PIXEL, 'base64');
    await writeFile(inDir('a.png'), image);
    await writeFile(inDir('a.md'), '# A\n\n- ![a](a.png)');
    await link(inDir('a.png'), inDir('a.html'));
    expect(await run([inDir('a.md'), '--no-open'])).toBe(1);
    expect(err).toContain('it is an image the input uses');
    expect(await readFile(inDir('a.png'))).toEqual(image);
  });

  it('still replaces its own earlier output', async () => {
    await writeFile(inDir('a.md'), '# A');
    expect(await run([inDir('a.md'), '--no-open'])).toBe(0);
    expect(await run([inDir('a.md'), '--no-open'])).toBe(0);
    await writeFile(inDir('a.png'), 'unrelated');
    expect(await run([inDir('a.md'), '--png'])).toBe(0);
    expect((await readFile(inDir('a.png'))).subarray(1, 4).toString()).toBe('PNG');
  });

  it('explains what is wrong', async () => {
    expect(await run([inDir('none.md')])).toBe(1);
    expect(err).toContain('No such file');
    err = '';
    expect(await run([])).toBe(2);
    expect(err).toContain('Usage');
    err = '';
    expect(await run(['a.md', '--svg', '--png'])).toBe(2);
    err = '';
    expect(await run(['--nope'])).toBe(2);
    expect(err).toContain('--nope');
  });

  it('shows help', async () => {
    expect(await run(['--help'])).toBe(0);
    expect(out).toContain('--no-toolbar');
  });
});

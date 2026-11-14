import { spawn } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, dirname, extname, join, parse as parsePath, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { type MarkmapNode, toPlainText } from '@markmap/core';
import { createPage, remarkReplaceImages, walk } from '@markmap/page';
import { parse, type ParseResult } from '@markmap/parse';
import { mathContent, remarkMath } from '@markmap/plugin-math';
import {
  approximateMeasurer,
  createImageContent,
  defaultContentPlugins,
  type RenderOptions,
  renderTreeAsync,
  resolveRenderOptions,
  toSVGString,
} from '@markmap/render';
import type { Image, Nodes } from 'mdast';
import { inlineImages, localPath } from './inline-images';

const USAGE = `Usage: markmap [options] <file.md>

Writes a map of a Markdown file as one HTML file that works offline. Use - to read
from stdin.

Options:
  -o, --output <file>  Where to write; - for stdout. Defaults to the input's name.
      --svg            Write an SVG image instead
      --png            Write a PNG image instead
      --no-open        Do not open the page in a browser
      --no-toolbar     Leave the toolbar off the page
  -h, --help           Show this help
  -v, --version        Show the version
`;

/** The outside world, replaceable in tests. */
export interface Io {
  stdin(): Promise<string>;
  stdout(data: string | Uint8Array): void;
  stderr(text: string): void;
  /** The bundled client script for a page. */
  client(math: boolean): Promise<string>;
  open(file: string): void;
}

const require = createRequire(import.meta.url);

/** Open a file with whatever the system uses for it. Failing is not worth stopping for. */
function openFile(file: string) {
  const [command, ...args] =
    process.platform === 'darwin'
      ? ['open']
      : process.platform === 'win32'
        ? ['rundll32', 'url.dll,FileProtocolHandler']
        : ['xdg-open'];
  const child = spawn(command, [...args, file], { detached: true, stdio: 'ignore' });
  child.on('error', () => {});
  child.unref();
}

const defaultIo: Io = {
  async stdin() {
    let text = '';
    for await (const chunk of process.stdin) text += String(chunk);
    return text;
  },
  stdout: (data) => void process.stdout.write(data),
  stderr: (text) => void process.stderr.write(text),
  client: (math) =>
    readFile(require.resolve(`@markmap/page/${math ? 'client-math' : 'client'}.js`), 'utf8'),
  open: openFile,
};

/** Image URLs in a document, and whether it has math. */
function inspect(markdown: string) {
  const urls: string[] = [];
  let math = false;
  const visit = (node: Nodes) => {
    if (node.type === 'image') urls.push((node as Image).url);
    // Set by remark-math.
    const { type } = node as { type: string };
    if (type === 'math' || type === 'inlineMath') math = true;
  };
  parse(markdown, {
    plugins: [remarkMath, () => (tree: Nodes) => walk(tree, visit)],
  });
  return { urls, math };
}

/** Folds as a view would start with them; exports have no reader to unfold anything. */
function startFolded(root: MarkmapNode, foldLevel: unknown): Set<string> {
  const folded = new Set<string>();
  const visit = (node: MarkmapNode, depth: number, foldAll: boolean) => {
    const all = foldAll || !!node.data.foldAll;
    const byLevel = typeof foldLevel === 'number' && depth >= foldLevel;
    if (node.children.length && (all || node.data.fold || byLevel)) folded.add(node.id);
    for (const child of node.children) visit(child, depth + 1, all);
  };
  visit(root, 0, false);
  return folded;
}

interface Source {
  markdown: string;
  /** `undefined` for stdin, whose images have no folder to come from. */
  file?: string;
}

async function writeHtml(source: Source, toolbar: boolean, io: Io) {
  const { urls, math } = inspect(source.markdown);
  const { file, markdown } = source;
  const images = file ? await inlineImages(urls, dirname(file), warnWith(io)) : new Map();
  const { root, frontmatter } = parse(markdown);
  const title = typeof frontmatter.title === 'string' ? frontmatter.title : undefined;
  return createPage({
    title: title || toPlainText(root.content) || (file ? basename(file) : 'Markmap'),
    data: { markdown, images: Object.fromEntries(images), toolbar },
    script: await io.client(math),
  });
}

const warnWith = (io: Io) => (message: string) => io.stderr(`${message}\n`);

/** Frontmatter options, with what was ignored reported. */
function documentOptions({ frontmatter }: ParseResult, io: Io) {
  const { options, json, warnings } = resolveRenderOptions(
    { plugins: [...defaultContentPlugins, mathContent] } as Partial<RenderOptions>,
    frontmatter.markmap,
  );
  warnings.forEach(warnWith(io));
  const colorScheme = json.colorScheme === 'dark' ? ('dark' as const) : ('light' as const);
  return { options, colorScheme, foldLevel: json.foldLevel };
}

async function loadNodeCanvas() {
  try {
    return await import('@markmap/canvas/node');
  } catch {
    return undefined;
  }
}

async function writeSvg({ markdown, file }: Source, io: Io) {
  const images = file
    ? await inlineImages(inspect(markdown).urls, dirname(file), warnWith(io))
    : new Map<string, string>();
  const parsed = parse(markdown, { plugins: [remarkMath, remarkReplaceImages(images)] });
  const { options, colorScheme, foldLevel } = documentOptions(parsed, io);
  const canvas = await loadNodeCanvas();
  if (!canvas) io.stderr('Without @napi-rs/canvas, text and image sizes are approximate\n');
  const nodeImages = createImageContent({
    loadSize: canvas && ((src) => canvas.loadNodeImage(src)),
  });
  const result = await renderTreeAsync(parsed.root, {
    ...options,
    plugins: options.plugins?.map((p) => (p.name === nodeImages.name ? nodeImages : p)),
    measurer: canvas?.createNodeMeasurer() ?? approximateMeasurer,
    folded: startFolded(parsed.root, foldLevel),
  });
  return toSVGString(result, { colorScheme });
}

async function writePng({ markdown, file }: Source, io: Io) {
  const canvas = await loadNodeCanvas();
  if (!canvas) throw new Error('--png needs @napi-rs/canvas, which is not installed');
  const parsed = parse(markdown, { plugins: [remarkMath] });
  const { options, colorScheme, foldLevel } = documentOptions(parsed, io);
  return canvas.renderPNG(parsed.root, {
    ...options,
    colorScheme,
    baseDir: file && dirname(file),
    folded: startFolded(parsed.root, foldLevel),
  });
}

function fileIdentity(path: string) {
  return stat(path, { bigint: true }).catch(() => undefined);
}

/** What `output` would destroy, if it is the input or an image the input uses. */
async function conflict({ markdown, file }: Source, output: string) {
  if (!file) return undefined;
  const target = await fileIdentity(output);
  if (!target) return undefined;
  const sameFile = async (path: string) => {
    const source = await fileIdentity(path);
    return source?.dev === target.dev && source.ino === target.ino;
  };
  if (await sameFile(file)) return 'the input';
  const paths = inspect(markdown).urls.map((url) => localPath(url, dirname(file)));
  for (const path of paths) {
    if (path && (await sameFile(path))) return 'an image the input uses';
  }
  return undefined;
}

async function version() {
  const file = join(dirname(fileURLToPath(import.meta.url)), '../package.json');
  const pkg = JSON.parse(await readFile(file, 'utf8')) as {
    version: string;
  };
  return pkg.version;
}

/** Run the command. Returns the exit code. */
export async function main(argv: readonly string[], overrides: Partial<Io> = {}): Promise<number> {
  const io = { ...defaultIo, ...overrides };
  let args;
  try {
    args = parseArgs({
      args: [...argv],
      allowPositionals: true,
      options: {
        output: { type: 'string', short: 'o' },
        svg: { type: 'boolean' },
        png: { type: 'boolean' },
        'no-open': { type: 'boolean' },
        'no-toolbar': { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
    });
  } catch (error) {
    io.stderr(`${(error as Error).message}\n\n${USAGE}`);
    return 2;
  }
  const { values, positionals } = args;
  if (values.help) {
    io.stdout(USAGE);
    return 0;
  }
  if (values.version) {
    io.stdout(`${await version()}\n`);
    return 0;
  }
  if (positionals.length !== 1 || (values.svg && values.png)) {
    io.stderr(USAGE);
    return 2;
  }

  const [input] = positionals;
  const stdin = input === '-';
  const extension = values.svg ? '.svg' : values.png ? '.png' : '.html';
  const name = stdin ? 'markmap' : parsePath(input).name;
  const output =
    values.output ?? (stdin ? `${name}${extension}` : join(dirname(input), `${name}${extension}`));
  try {
    const source: Source = stdin
      ? { markdown: await io.stdin() }
      : { markdown: await readFile(input, 'utf8'), file: resolve(input) };
    const used = output === '-' ? undefined : await conflict(source, output);
    if (used) {
      io.stderr(`Not overwriting ${output}: it is ${used}. Choose another name with -o.\n`);
      return 1;
    }
    const data = values.svg
      ? await writeSvg(source, io)
      : values.png
        ? await writePng(source, io)
        : await writeHtml(source, !values['no-toolbar'], io);
    if (output === '-') {
      io.stdout(data);
      return 0;
    }
    await mkdir(dirname(resolve(output)), { recursive: true });
    await writeFile(output, data);
    io.stderr(`Wrote ${output}\n`);
    if (extname(output) === '.html' && !values.svg && !values.png && !values['no-open']) {
      io.open(resolve(output));
    }
    return 0;
  } catch (error) {
    const { code, path, message } = error as NodeJS.ErrnoException;
    io.stderr(`${code === 'ENOENT' ? `No such file: ${path}` : message}\n`);
    return 1;
  }
}

import { readFile, realpath } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';

/** The types `sanitizeImageUrl` lets through as data URLs. */
const IMAGE_TYPES: Readonly<Record<string, string>> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

/** Has a scheme, or is `//host/…`: not a file next to the Markdown. */
const NOT_A_PATH = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/** The file a URL in the Markdown points at, if it can point at one. */
export function localPath(url: string, baseDir: string): string | undefined {
  if (!url || NOT_A_PATH.test(url)) return undefined;
  try {
    return resolve(baseDir, decodeURI(url));
  } catch {
    return undefined;
  }
}

async function toDataUrl(url: string, baseDir: string): Promise<string> {
  const type = IMAGE_TYPES[extname(url).toLowerCase()];
  if (!type) throw new Error('not a supported image type');
  const base = await realpath(baseDir);
  // After `realpath`, so links cannot point out of the folder either.
  const file = await realpath(resolve(base, decodeURI(url)));
  const path = relative(base, file);
  if (path === '..' || path.startsWith(`..${sep}`) || isAbsolute(path)) {
    throw new Error("outside the Markdown file's folder");
  }
  return `data:${type};base64,${(await readFile(file)).toString('base64')}`;
}

/**
 * Data URLs for local images, by the URL in the Markdown. Only files in `baseDir` are
 * read: Markdown from someone else must not be able to pull other files into a page
 * that gets shared. Anything skipped is reported and keeps its URL.
 */
export async function inlineImages(
  urls: Iterable<string>,
  baseDir: string,
  warn: (message: string) => void,
): Promise<Map<string, string>> {
  const images = new Map<string, string>();
  const local = [...new Set(urls)].filter((url) => localPath(url, baseDir));
  await Promise.all(
    local.map(async (url) => {
      try {
        images.set(url, await toDataUrl(url, baseDir));
      } catch (error) {
        const reason = (error as NodeJS.ErrnoException).code ?? (error as Error).message;
        warn(`Image ${url} not included: ${reason}`);
      }
    }),
  );
  return images;
}

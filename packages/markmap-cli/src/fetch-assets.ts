import { createWriteStream } from 'fs';
import { mkdir, stat } from 'fs/promises';
import { extractAssets } from 'markmap-common';
import { Transformer } from 'markmap-lib';
import { baseJsPaths } from 'markmap-render';
import { dirname, resolve } from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import { ReadableStream } from 'stream/web';
import { ASSETS_PREFIX, config, localProvider, toolbarAssets } from './util';

const providerName = 'local-hook';

export async function fetchAssets(assetsDir = config.assetsDir) {
  const transformer = new Transformer();
  transformer.urlBuilder.setProvider(providerName, localProvider);
  transformer.urlBuilder.provider = providerName;
  const assets = transformer.getAssets();
  delete transformer.urlBuilder.providers[providerName];
  const pluginPaths = extractAssets(assets)
    .filter((url) => url.startsWith(ASSETS_PREFIX))
    .map((url) => url.slice(ASSETS_PREFIX.length));
  const resources = transformer.plugins.flatMap(
    (plugin) => plugin.config?.resources || [],
  );
  const paths = [
    ...baseJsPaths,
    ...pluginPaths,
    ...resources,
    ...extractAssets(toolbarAssets),
  ];
  // Delay getFastestProvider in case the assets are already downloaded
  let findingProvider: Promise<string>;
  const findProvider = () => {
    findingProvider ||= transformer.urlBuilder.getFastestProvider();
    return findingProvider;
  };
  await Promise.all(
    paths.map((path) =>
      downloadAsset(resolve(assetsDir, path), async () =>
        transformer.urlBuilder.getFullUrl(path, await findProvider()),
      ),
    ),
  );
}

async function downloadAsset(
  fullPath: string,
  resolveUrl: () => Promise<string>,
) {
  // console.log(`${url} -> ${fullPath}`);
  try {
    const result = await stat(fullPath);
    // Skip existing files
    if (result.isFile()) return;
  } catch {
    // ignore
  }
  const url = await resolveUrl();
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Failed to download: ${url}`);
  await mkdir(dirname(fullPath), { recursive: true });
  await finished(
    Readable.fromWeb(res.body as ReadableStream).pipe(
      createWriteStream(fullPath),
    ),
  );
}

import { createMindmap } from 'markmap-embed';
import type {
  MindmapEmbed,
  MindmapEmbedOptions,
  MindmapUpdateOptions,
} from 'markmap-embed';

export interface SvelteActionReturn<Options> {
  update?: (options?: Options) => void;
  destroy?: () => void;
}

export type MarkmapActionOptions = Omit<MindmapEmbedOptions, 'signal'>;

export interface MarkmapActionHandle
  extends SvelteActionReturn<MarkmapActionOptions> {
  getEmbed(): MindmapEmbed | undefined;
}

function getContent(options: MarkmapActionOptions | undefined) {
  return options?.content || '';
}

function getUpdateOptions(
  options: MarkmapActionOptions | undefined,
): MindmapUpdateOptions {
  return {
    parserOptions: options?.parserOptions,
    viewOptions: options?.viewOptions,
    autoFit: options?.autoFit,
  };
}

export function markmap(
  node: HTMLElement,
  options: MarkmapActionOptions = {},
): MarkmapActionHandle {
  const controller = new AbortController();
  let latestOptions = options;
  let renderedContent = getContent(options);
  let embed: MindmapEmbed | undefined;
  let destroyed = false;

  function reportError(error: unknown) {
    latestOptions.onError?.(error);
  }

  async function updateContent(nextOptions: MarkmapActionOptions = {}) {
    latestOptions = nextOptions;
    const content = getContent(nextOptions);
    if (!embed || content === renderedContent) return;
    renderedContent = content;
    try {
      await embed.update(content, getUpdateOptions(nextOptions));
    } catch (error) {
      reportError(error);
    }
  }

  createMindmap(node, {
    ...options,
    content: renderedContent,
    signal: controller.signal,
    onUpdate: (result) => latestOptions.onUpdate?.(result),
    onError: reportError,
    onDestroy: (nextEmbed) => latestOptions.onDestroy?.(nextEmbed),
  })
    .then((nextEmbed) => {
      if (destroyed) {
        nextEmbed.destroy();
        return;
      }
      embed = nextEmbed;
      latestOptions.onReady?.(nextEmbed);
      void updateContent(latestOptions);
    })
    .catch((error: unknown) => {
      if (!destroyed) reportError(error);
    });

  return {
    getEmbed: () => embed,
    update: (nextOptions = {}) => {
      void updateContent(nextOptions);
    },
    destroy: () => {
      destroyed = true;
      controller.abort();
      embed = undefined;
    },
  };
}

export default markmap;

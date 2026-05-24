import type { IPureNode } from 'markmap-common';
import { Transformer } from 'markmap-lib';
import type { ITransformResult } from 'markmap-lib';
import type { IHtmlParserOptions } from 'markmap-html-parser';
import { Markmap } from 'markmap-view';
import type { IMarkmapOptions } from 'markmap-view';

export interface MindmapEmbedOptions {
  /**
   * Markdown content to render immediately.
   */
  content?: string;
  /**
   * Existing transformer instance. Pass this to reuse plugins or URL providers.
   */
  transformer?: Transformer;
  /**
   * Options passed to the markdown/html parser.
   */
  parserOptions?: Partial<IHtmlParserOptions>;
  /**
   * Options passed to markmap-view.
   */
  viewOptions?: Partial<IMarkmapOptions>;
  /**
   * Fit after initial render and updates.
   */
  autoFit?: boolean;
  /**
   * Destroy the embedded mindmap when the host lifecycle is aborted.
   */
  signal?: AbortSignal;
  onReady?: (embed: MindmapEmbed) => void;
  onUpdate?: (result: ITransformResult) => void;
  onError?: (error: unknown) => void;
  onDestroy?: (embed: MindmapEmbed) => void;
}

export interface MindmapEmbed {
  element: SVGElement;
  markmap: Markmap;
  transformer: Transformer;
  update(
    content: string,
    options?: MindmapUpdateOptions,
  ): Promise<ITransformResult>;
  setData(root: IPureNode, options?: MindmapUpdateOptions): Promise<void>;
  fit(): Promise<void>;
  destroy(): void;
}

export interface MindmapUpdateOptions {
  parserOptions?: Partial<IHtmlParserOptions>;
  viewOptions?: Partial<IMarkmapOptions>;
  autoFit?: boolean;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvg(container: HTMLElement) {
  return container.ownerDocument.createElementNS(SVG_NS, 'svg');
}

export async function createMindmap(
  container: HTMLElement,
  options: MindmapEmbedOptions = {},
): Promise<MindmapEmbed> {
  const {
    content = '',
    parserOptions,
    viewOptions = {},
    autoFit = false,
    signal,
    onReady,
    onUpdate,
    onError,
    onDestroy,
  } = options;
  const transformer = options.transformer || new Transformer();
  const element = createSvg(container);
  container.replaceChildren(element);

  const markmap = Markmap.create(element, viewOptions, null);
  let destroyed = false;

  function emitError(error: unknown) {
    onError?.(error);
    return error;
  }

  function assertActive() {
    if (!destroyed) return;
    throw emitError(new Error('Cannot use a destroyed mindmap embed.'));
  }

  async function setData(
    root: IPureNode,
    updateOptions: MindmapUpdateOptions = {},
  ) {
    assertActive();
    await markmap.setData(root, updateOptions.viewOptions);
    if (updateOptions.autoFit ?? autoFit) await markmap.fit();
  }

  async function update(
    nextContent: string,
    updateOptions: MindmapUpdateOptions = {},
  ) {
    assertActive();
    try {
      const result = transformer.transform(
        nextContent,
        updateOptions.parserOptions || parserOptions,
      );
      await setData(result.root, updateOptions);
      onUpdate?.(result);
      return result;
    } catch (error) {
      throw emitError(error);
    }
  }

  const embed: MindmapEmbed = {
    element,
    markmap,
    transformer,
    update,
    setData,
    async fit() {
      assertActive();
      await markmap.fit();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      signal?.removeEventListener('abort', embed.destroy);
      markmap.destroy();
      container.replaceChildren();
      onDestroy?.(embed);
    },
  };

  signal?.addEventListener('abort', embed.destroy, { once: true });
  if (signal?.aborted) {
    embed.destroy();
    return embed;
  }

  if (content) await update(content);
  onReady?.(embed);
  return embed;
}

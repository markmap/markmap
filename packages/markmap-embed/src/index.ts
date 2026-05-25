import type { INode, IPureNode } from 'markmap-common';
import { Transformer } from 'markmap-lib';
import type { ITransformResult } from 'markmap-lib';
import type { IHtmlParserOptions } from 'markmap-html-parser';
import { Markmap, deriveOptions } from 'markmap-view';
import type { IMarkmapOptions } from 'markmap-view';

export * from './host';

export interface MindmapTheme {
  colors?: string[];
  colorFreezeLevel?: number;
  lineWidth?: number | number[];
  maxWidth?: number;
  nodeMinHeight?: number;
  paddingX?: number;
  spacingHorizontal?: number;
  spacingVertical?: number;
  font?: string;
  textColor?: string;
  linkColor?: string;
  linkHoverColor?: string;
  codeBackground?: string;
  codeColor?: string;
  highlightBackground?: string;
  highlightNodeBackground?: string;
  circleOpenBackground?: string;
}

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
   * Host-app visual theme. Applies safe CSS variables and view layout options.
   */
  theme?: MindmapTheme;
  /**
   * Fit after initial render and updates.
   */
  autoFit?: boolean;
  /**
   * Fit when the host container is resized.
   */
  autoResize?: boolean | ResizeObserverOptions;
  /**
   * Destroy the embedded mindmap when the host lifecycle is aborted.
   */
  signal?: AbortSignal;
  onReady?: (embed: MindmapEmbed) => void;
  onUpdate?: (result: ITransformResult) => void;
  onError?: (error: unknown) => void;
  onDestroy?: (embed: MindmapEmbed) => void;
  onNodeClick?: (event: MindmapNodeEvent) => void;
  onNodeToggle?: (event: MindmapNodeEvent) => void;
}

export interface MindmapNodeEvent {
  embed: MindmapEmbed;
  node: INode;
  nativeEvent: MouseEvent;
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
  setTheme(theme: MindmapTheme): Promise<void>;
  fit(): Promise<void>;
  destroy(): void;
}

export interface MindmapUpdateOptions {
  parserOptions?: Partial<IHtmlParserOptions>;
  viewOptions?: Partial<IMarkmapOptions>;
  theme?: MindmapTheme;
  autoFit?: boolean;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvg(container: HTMLElement) {
  return container.ownerDocument.createElementNS(SVG_NS, 'svg');
}

function getResizeObserver(container: HTMLElement) {
  return (
    container.ownerDocument.defaultView?.ResizeObserver ||
    globalThis.ResizeObserver
  );
}

function getResizeObserverOptions(
  autoResize: MindmapEmbedOptions['autoResize'],
) {
  return typeof autoResize === 'object' ? autoResize : undefined;
}

const THEME_CSS_VARIABLES: [keyof MindmapTheme, string][] = [
  ['font', '--markmap-font'],
  ['textColor', '--markmap-text-color'],
  ['linkColor', '--markmap-a-color'],
  ['linkHoverColor', '--markmap-a-hover-color'],
  ['codeBackground', '--markmap-code-bg'],
  ['codeColor', '--markmap-code-color'],
  ['highlightBackground', '--markmap-highlight-bg'],
  ['highlightNodeBackground', '--markmap-highlight-node-bg'],
  ['circleOpenBackground', '--markmap-circle-open-bg'],
];

function getThemeViewOptions(theme?: MindmapTheme) {
  if (!theme) return {};
  return deriveOptions({
    color: theme.colors,
    colorFreezeLevel: theme.colorFreezeLevel,
    lineWidth: theme.lineWidth,
    maxWidth: theme.maxWidth,
    nodeMinHeight: theme.nodeMinHeight,
    paddingX: theme.paddingX,
    spacingHorizontal: theme.spacingHorizontal,
    spacingVertical: theme.spacingVertical,
  });
}

function applyTheme(element: SVGElement, theme?: MindmapTheme) {
  if (!theme) return;
  THEME_CSS_VARIABLES.forEach(([key, variable]) => {
    const value = theme[key];
    if (value == null) return;
    element.style.setProperty(variable, String(value));
  });
}

function getViewOptions(
  theme?: MindmapTheme,
  viewOptions?: Partial<IMarkmapOptions>,
) {
  if (!theme && !viewOptions) return undefined;
  return {
    ...getThemeViewOptions(theme),
    ...viewOptions,
  };
}

function getClassName(element: unknown) {
  return String(
    (element as Element | undefined)?.getAttribute?.('class') || '',
  );
}

function isMarkmapNode(element: unknown) {
  return getClassName(element).split(/\s+/).includes('markmap-node');
}

function isCircle(element: unknown) {
  return (element as Element | undefined)?.tagName?.toLowerCase() === 'circle';
}

function closestNodeElement(target: EventTarget | null) {
  let element: unknown = target;
  while (element) {
    if (isMarkmapNode(element))
      return element as Element & { __data__?: INode };
    element = (element as Node | undefined)?.parentNode;
  }
}

export async function createMindmap(
  container: HTMLElement,
  options: MindmapEmbedOptions = {},
): Promise<MindmapEmbed> {
  const {
    content = '',
    parserOptions,
    viewOptions,
    theme,
    autoFit = false,
    autoResize = false,
    signal,
    onReady,
    onUpdate,
    onError,
    onDestroy,
    onNodeClick,
    onNodeToggle,
  } = options;
  const transformer = options.transformer || new Transformer();
  const element = createSvg(container);
  container.replaceChildren(element);
  applyTheme(element, theme);

  const markmap = Markmap.create(
    element,
    getViewOptions(theme, viewOptions) || {},
    null,
  );
  let destroyed = false;
  let resizeObserver: ResizeObserver | undefined;
  let resizePending = false;
  let listeningForNodeClicks = false;

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
    applyTheme(element, updateOptions.theme);
    await markmap.setData(
      root,
      getViewOptions(updateOptions.theme, updateOptions.viewOptions),
    );
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

  function queueResizeFit() {
    if (destroyed || resizePending) return;
    resizePending = true;
    Promise.resolve()
      .then(async () => {
        resizePending = false;
        if (!destroyed) await markmap.fit();
      })
      .catch(emitError);
  }

  function handleNodeClick(nativeEvent: MouseEvent) {
    const node = closestNodeElement(nativeEvent.target)?.__data__;
    if (!node) return;
    const event = { embed, node, nativeEvent };
    onNodeClick?.(event);
    if (isCircle(nativeEvent.target)) onNodeToggle?.(event);
  }

  const embed: MindmapEmbed = {
    element,
    markmap,
    transformer,
    update,
    setData,
    async setTheme(nextTheme: MindmapTheme) {
      assertActive();
      applyTheme(element, nextTheme);
      await markmap.setData(undefined, getThemeViewOptions(nextTheme));
    },
    async fit() {
      assertActive();
      await markmap.fit();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      signal?.removeEventListener('abort', embed.destroy);
      if (listeningForNodeClicks) {
        element.removeEventListener('click', handleNodeClick);
      }
      resizeObserver?.disconnect();
      resizeObserver = undefined;
      markmap.destroy();
      container.replaceChildren();
      onDestroy?.(embed);
    },
  };

  if (autoResize) {
    const ResizeObserverCtor = getResizeObserver(container);
    if (ResizeObserverCtor) {
      resizeObserver = new ResizeObserverCtor(queueResizeFit);
      resizeObserver.observe(container, getResizeObserverOptions(autoResize));
    }
  }

  if (onNodeClick || onNodeToggle) {
    element.addEventListener('click', handleNodeClick);
    listeningForNodeClicks = true;
  }

  signal?.addEventListener('abort', embed.destroy, { once: true });
  if (signal?.aborted) {
    embed.destroy();
    return embed;
  }

  if (content) await update(content);
  onReady?.(embed);
  return embed;
}

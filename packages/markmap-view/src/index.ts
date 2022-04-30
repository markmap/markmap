import * as d3 from 'd3';
import { flextree } from 'd3-flextree';
import {
  INode,
  Hook,
  getId,
  walkTree,
  arrayFrom,
  addClass,
  childSelector,
  noop,
  loadJS,
  loadCSS,
} from 'markmap-common';
import {
  IMarkmapOptions,
  IMarkmapState,
  IMarkmapFlexTreeItem,
  IMarkmapLinkItem,
} from './types';
import css from './style.css';
import containerCSS from './container.css';

export const globalCSS = css;

export { loadJS, loadCSS };
export * from './types';

interface IPadding {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function linkWidth(nodeData: IMarkmapFlexTreeItem): number {
  const data: INode = nodeData.data;
  return Math.max(6 - 2 * data.depth, 1.5);
}

function adjustSpacing(tree: IMarkmapFlexTreeItem, spacing: number): void {
  walkTree(
    tree,
    (d, next) => {
      d.ySizeInner = d.ySize - spacing;
      d.y += spacing;
      next();
    },
    'children'
  );
}

function minBy(numbers: number[], by: (v: number) => number): number {
  const index = d3.minIndex(numbers, by);
  return numbers[index];
}

function stopPropagation(e: Event) {
  e.stopPropagation();
}

type ID3SVGElement = d3.Selection<
  SVGElement,
  IMarkmapFlexTreeItem,
  HTMLElement,
  IMarkmapFlexTreeItem
>;

function createViewHooks() {
  return {
    transformHtml: new Hook<[mm: Markmap, nodes: HTMLElement[]]>(),
  };
}

/**
 * A global hook to refresh all markmaps when called.
 */
export const refreshHook = new Hook<[]>();

export const defaultColorFn = d3.scaleOrdinal(d3.schemeCategory10);

const isMacintosh =
  typeof navigator !== 'undefined' && navigator.userAgent.includes('Macintosh');

export class Markmap {
  static defaultOptions: IMarkmapOptions = {
    duration: 500,
    embedGlobalCSS: true,
    nodeMinHeight: 16,
    spacingVertical: 5,
    spacingHorizontal: 80,
    autoFit: false,
    fitRatio: 0.95,
    color: (node: INode): string => defaultColorFn(`${node.state.id}`),
    paddingX: 8,
    scrollForPan: isMacintosh,
  };

  options: IMarkmapOptions;

  state: IMarkmapState;

  svg: ID3SVGElement;

  styleNode: d3.Selection<
    HTMLStyleElement,
    IMarkmapFlexTreeItem,
    HTMLElement,
    IMarkmapFlexTreeItem
  >;

  g: d3.Selection<
    SVGGElement,
    IMarkmapFlexTreeItem,
    HTMLElement,
    IMarkmapFlexTreeItem
  >;

  zoom: d3.ZoomBehavior<Element, unknown>;

  viewHooks: ReturnType<typeof createViewHooks>;

  revokers: (() => void)[] = [];

  constructor(
    svg: string | SVGElement | ID3SVGElement,
    opts?: Partial<IMarkmapOptions>
  ) {
    ['handleZoom', 'handleClick', 'handlePan'].forEach((key) => {
      this[key] = this[key].bind(this);
    });
    this.viewHooks = createViewHooks();
    this.svg = (svg as ID3SVGElement).datum
      ? (svg as ID3SVGElement)
      : d3.select(svg as string);
    this.styleNode = this.svg.append('style');
    this.zoom = d3
      .zoom()
      .filter((event) => {
        if (this.options.scrollForPan) {
          // Pan with wheels, zoom with ctrl+wheels
          if (event.type === 'wheel') return event.ctrlKey && !event.button;
        }
        return (!event.ctrlKey || event.type === 'wheel') && !event.button;
      })
      .on('zoom', this.handleZoom);
    this.setOptions(opts);
    this.state = {
      id: this.options.id || this.svg.attr('id') || getId(),
    };
    this.g = this.svg.append('g');
    this.updateStyle();
    this.svg.call(this.zoom).on('wheel', this.handlePan);
    this.revokers.push(
      refreshHook.tap(() => {
        this.setData();
      })
    );
  }

  getStyleContent(): string {
    const { style } = this.options;
    const { id } = this.state;
    const styleText = typeof style === 'function' ? style(id) : '';
    return [this.options.embedGlobalCSS && css, styleText]
      .filter(Boolean)
      .join('\n');
  }

  updateStyle(): void {
    this.svg.attr(
      'class',
      addClass(this.svg.attr('class'), 'markmap', this.state.id)
    );
    const style = this.getStyleContent();
    this.styleNode.text(style);
  }

  handleZoom(e) {
    const { transform } = e;
    this.g.attr('transform', transform);
  }

  handlePan(e: WheelEvent) {
    e.preventDefault();
    const transform = d3.zoomTransform(this.svg.node());
    const newTransform = transform.translate(-e.deltaX, -e.deltaY);
    this.svg.call(this.zoom.transform, newTransform);
  }

  handleClick(_: MouseEvent, d: IMarkmapFlexTreeItem): void {
    const { data } = d;
    data.payload = {
      ...data.payload,
      fold: !data.payload?.fold,
    };
    this.renderData(d.data);
  }

  initializeData(node: INode): void {
    let nodeId = 0;
    const { color, nodeMinHeight } = this.options;
    const { id } = this.state;
    const container = document.createElement('div');
    container.className = addClass(
      container.className,
      'markmap',
      'markmap-container',
      'markmap-foreign',
      `${id}-g`
    );
    const style = document.createElement('style');
    style.textContent = [this.getStyleContent(), containerCSS].join('\n');
    document.body.append(style, container);
    walkTree(node, (item, next) => {
      item.children = item.children?.map((child) => ({ ...child }));
      nodeId += 1;
      const el = document.createElement('div');
      el.innerHTML = item.content;
      container.append(el);
      item.state = {
        ...item.state,
        id: nodeId,
        el,
      };
      color(item); // preload colors
      next();
    });
    const nodes = arrayFrom(container.childNodes) as HTMLElement[];
    this.viewHooks.transformHtml.call(this, nodes);
    walkTree(node, (item, next, parent) => {
      const rect = item.state.el.getBoundingClientRect();
      item.content = item.state.el.innerHTML;
      item.state.size = [
        Math.ceil(rect.width),
        Math.max(Math.ceil(rect.height), nodeMinHeight),
      ];
      item.state.path = [parent?.state?.path, item.state.id]
        .filter(Boolean)
        .join('.');
      item.state.key =
        [parent?.state?.id, item.state.id].filter(Boolean).join('.') +
        // FIXME: find a way to check content hash
        item.content;
      next();
    });
    container.remove();
    style.remove();
  }

  setOptions(opts: Partial<IMarkmapOptions>): void {
    this.options = {
      ...Markmap.defaultOptions,
      ...opts,
    };
  }

  setData(data?: INode, opts?: Partial<IMarkmapOptions>): void {
    if (data) this.state.data = data;
    this.initializeData(this.state.data);
    if (opts) this.setOptions(opts);
    this.renderData();
  }

  renderData(originData?: INode): void {
    if (!this.state.data) return;
    const { spacingHorizontal, paddingX, spacingVertical, autoFit, color } =
      this.options;
    const layout = flextree()
      .children((d: INode) => !d.payload?.fold && d.children)
      .nodeSize((d: IMarkmapFlexTreeItem) => {
        const [width, height] = d.data.state.size;
        return [height, width + (width ? paddingX * 2 : 0) + spacingHorizontal];
      })
      .spacing((a: IMarkmapFlexTreeItem, b: IMarkmapFlexTreeItem) => {
        return a.parent === b.parent ? spacingVertical : spacingVertical * 2;
      });
    const tree = layout.hierarchy(this.state.data);
    layout(tree);
    adjustSpacing(tree, spacingHorizontal);
    const descendants: IMarkmapFlexTreeItem[] = tree.descendants().reverse();
    const links: IMarkmapLinkItem[] = tree.links();
    const linkShape = d3.linkHorizontal();
    const minX = d3.min(descendants, (d) => d.x - d.xSize / 2);
    const maxX = d3.max(descendants, (d) => d.x + d.xSize / 2);
    const minY = d3.min(descendants, (d) => d.y);
    const maxY = d3.max(descendants, (d) => d.y + d.ySizeInner);
    Object.assign(this.state, {
      minX,
      maxX,
      minY,
      maxY,
    });

    if (autoFit) this.fit();

    const origin =
      (originData && descendants.find((item) => item.data === originData)) ||
      (tree as IMarkmapFlexTreeItem);
    const x0 = origin.data.state.x0 ?? origin.x;
    const y0 = origin.data.state.y0 ?? origin.y;

    // Update the nodes
    const node = this.g
      .selectAll<SVGGElement, IMarkmapFlexTreeItem>(
        childSelector<SVGGElement>('g')
      )
      .data(descendants, (d) => d.data.state.key);
    const nodeEnter = node
      .enter()
      .append('g')
      .attr('class', 'markmap-node')
      .attr('data-depth', (d) => d.data.depth)
      .attr('data-path', (d) => d.data.state.path)
      .attr(
        'transform',
        (d) =>
          `translate(${y0 + origin.ySizeInner - d.ySizeInner},${
            x0 + origin.xSize / 2 - d.xSize
          })`
      );

    const nodeExit = this.transition(node.exit<IMarkmapFlexTreeItem>());
    nodeExit
      .select('line')
      .attr('x1', (d) => d.ySizeInner)
      .attr('x2', (d) => d.ySizeInner);
    nodeExit.select('foreignObject').style('opacity', 0);
    nodeExit
      .attr(
        'transform',
        (d) =>
          `translate(${origin.y + origin.ySizeInner - d.ySizeInner},${
            origin.x + origin.xSize / 2 - d.xSize
          })`
      )
      .remove();

    const nodeMerge = node.merge(nodeEnter);
    this.transition(nodeMerge).attr(
      'transform',
      (d) => `translate(${d.y},${d.x - d.xSize / 2})`
    );

    // Update lines under the content
    const line = nodeMerge
      .selectAll<SVGLineElement, IMarkmapFlexTreeItem>(
        childSelector<SVGLineElement>('line')
      )
      .data(
        (d) => [d],
        (d) => d.data.state.key
      )
      .join(
        (enter) => {
          return enter
            .append('line')
            .attr('x1', (d) => d.ySizeInner)
            .attr('y1', (d) => d.xSize)
            .attr('x2', (d) => d.ySizeInner)
            .attr('y2', (d) => d.xSize);
        },
        (update) => update,
        (exit) => exit.remove()
      );
    this.transition(line)
      .attr('x1', -1)
      .attr('x2', (d) => d.ySizeInner + 2)
      .attr('stroke', (d) => color(d.data))
      .attr('stroke-width', linkWidth);

    // Circle to link to children of the node
    const circle = nodeMerge
      .selectAll<SVGCircleElement, IMarkmapFlexTreeItem>(
        childSelector<SVGCircleElement>('circle')
      )
      .data(
        (d) => (d.data.children ? [d] : []),
        (d) => d.data.state.key
      )
      .join(
        (enter) => {
          return enter
            .append('circle')
            .attr('stroke-width', '1.5')
            .attr('cx', (d) => d.ySizeInner)
            .attr('cy', (d) => d.xSize)
            .attr('r', 0)
            .on('click', this.handleClick);
        },
        (update) => update,
        (exit) => exit.remove()
      );
    this.transition(circle)
      .attr('r', 6)
      .attr('stroke', (d) => color(d.data))
      .attr('fill', (d) =>
        d.data.payload?.fold && d.data.children ? color(d.data) : '#fff'
      );

    const foreignObject = nodeMerge
      .selectAll<SVGForeignObjectElement, IMarkmapFlexTreeItem>(
        childSelector<SVGForeignObjectElement>('foreignObject')
      )
      .data(
        (d) => [d],
        (d) => d.data.state.key
      )
      .join(
        (enter) => {
          const fo = enter
            .append('foreignObject')
            .attr('class', 'markmap-foreign')
            .attr('x', paddingX)
            .attr('y', 0)
            .style('opacity', 0)
            .attr('height', (d) => d.xSize)
            .on('mousedown', stopPropagation)
            .on('dblclick', stopPropagation);
          fo.append<HTMLDivElement>('xhtml:div')
            .select(function select(d) {
              const clone = d.data.state.el.cloneNode(true) as HTMLElement;
              this.replaceWith(clone);
              return clone;
            })
            .attr('xmlns', 'http://www.w3.org/1999/xhtml');
          return fo;
        },
        (update) => update,
        (exit) => exit.remove()
      )
      .attr('width', (d) => Math.max(0, d.ySizeInner - paddingX * 2));
    this.transition(foreignObject).style('opacity', 1);

    // Update the links
    const path = this.g
      .selectAll<SVGPathElement, IMarkmapLinkItem>(
        childSelector<SVGPathElement>('path')
      )
      .data(links, (d) => d.target.data.state.key)
      .join(
        (enter) => {
          const source: [number, number] = [
            y0 + origin.ySizeInner,
            x0 + origin.xSize / 2,
          ];
          return enter
            .insert('path', 'g')
            .attr('class', 'markmap-link')
            .attr('data-depth', (d) => d.target.data.depth)
            .attr('data-path', (d) => d.target.data.state.path)
            .attr('d', linkShape({ source, target: source }));
        },
        (update) => update,
        (exit) => {
          const source: [number, number] = [
            origin.y + origin.ySizeInner,
            origin.x + origin.xSize / 2,
          ];
          return this.transition(exit)
            .attr('d', linkShape({ source, target: source }))
            .remove();
        }
      );
    this.transition(path)
      .attr('stroke', (d) => color(d.target.data))
      .attr('stroke-width', (d) => linkWidth(d.target))
      .attr('d', (d) => {
        const source: [number, number] = [
          d.source.y + d.source.ySizeInner,
          d.source.x + d.source.xSize / 2,
        ];
        const target: [number, number] = [
          d.target.y,
          d.target.x + d.target.xSize / 2,
        ];
        return linkShape({ source, target });
      });

    descendants.forEach((d) => {
      d.data.state.x0 = d.x;
      d.data.state.y0 = d.y;
    });
  }

  transition<T extends d3.BaseType, U, P extends d3.BaseType, Q>(
    sel: d3.Selection<T, U, P, Q>
  ): d3.Transition<T, U, P, Q> {
    const { duration } = this.options;
    return sel.transition().duration(duration);
  }

  /**
   * Fit the content to the viewport.
   */
  async fit(): Promise<void> {
    const svgNode = this.svg.node();
    const { width: offsetWidth, height: offsetHeight } =
      svgNode.getBoundingClientRect();
    const { fitRatio } = this.options;
    const { minX, maxX, minY, maxY } = this.state;
    const naturalWidth = maxY - minY;
    const naturalHeight = maxX - minX;
    const scale = Math.min(
      (offsetWidth / naturalWidth) * fitRatio,
      (offsetHeight / naturalHeight) * fitRatio,
      2
    );
    const initialZoom = d3.zoomIdentity
      .translate(
        (offsetWidth - naturalWidth * scale) / 2 - minY * scale,
        (offsetHeight - naturalHeight * scale) / 2 - minX * scale
      )
      .scale(scale);
    return this.transition(this.svg)
      .call(this.zoom.transform, initialZoom)
      .end()
      .catch(noop);
  }

  /**
   * Pan the content to make the provided node visible in the viewport.
   */
  async ensureView(
    node: INode,
    padding: Partial<IPadding> | undefined
  ): Promise<void> {
    let g: SVGGElement | undefined;
    let itemData: IMarkmapFlexTreeItem | undefined;
    this.g
      .selectAll<SVGGElement, IMarkmapFlexTreeItem>(
        childSelector<SVGGElement>('g')
      )
      .each(function walk(d) {
        if (d.data === node) {
          g = this;
          itemData = d;
        }
      });
    if (!g || !itemData) return;
    const svgNode = this.svg.node();
    const relRect = svgNode.getBoundingClientRect();
    const transform = d3.zoomTransform(svgNode);
    const [left, right] = [
      itemData.y,
      itemData.y + itemData.ySizeInner + 2,
    ].map((x) => x * transform.k + transform.x);
    const [top, bottom] = [
      itemData.x - itemData.xSize / 2,
      itemData.x + itemData.xSize / 2,
    ].map((y) => y * transform.k + transform.y);
    // Skip if the node includes or is included in the container.
    const pd: IPadding = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      ...padding,
    };
    const dxs = [pd.left - left, relRect.width - pd.right - right];
    const dys = [pd.top - top, relRect.height - pd.bottom - bottom];
    const dx = dxs[0] * dxs[1] > 0 ? minBy(dxs, Math.abs) / transform.k : 0;
    const dy = dys[0] * dys[1] > 0 ? minBy(dys, Math.abs) / transform.k : 0;
    if (dx || dy) {
      const newTransform = transform.translate(dx, dy);
      return this.transition(this.svg)
        .call(this.zoom.transform, newTransform)
        .end()
        .catch(noop);
    }
  }

  /**
   * Scale content with it pinned at the center of the viewport.
   */
  async rescale(scale: number): Promise<void> {
    const svgNode = this.svg.node();
    const { width: offsetWidth, height: offsetHeight } =
      svgNode.getBoundingClientRect();
    const halfWidth = offsetWidth / 2;
    const halfHeight = offsetHeight / 2;
    const transform = d3.zoomTransform(svgNode);
    const newTransform = transform
      .translate(
        ((halfWidth - transform.x) * (1 - scale)) / transform.k,
        ((halfHeight - transform.y) * (1 - scale)) / transform.k
      )
      .scale(scale);
    return this.transition(this.svg)
      .call(this.zoom.transform, newTransform)
      .end()
      .catch(noop);
  }

  destroy() {
    this.svg.on('.zoom', null);
    this.svg.html(null);
    this.revokers.forEach((fn) => {
      fn();
    });
  }

  static create(
    svg: string | SVGElement | ID3SVGElement,
    opts?: Partial<IMarkmapOptions>,
    data?: INode
  ): Markmap {
    const mm = new Markmap(svg, opts);
    if (data) {
      mm.setData(data);
      mm.fit(); // always fit for the first render
    }
    return mm;
  }
}

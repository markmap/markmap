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

export { loadJS, loadCSS };

interface IPadding {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function linkWidth(nodeData: IMarkmapFlexTreeItem): number {
  const data: INode = nodeData.data;
  return Math.max(6 - 2 * data.d, 1.5);
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

function stopPropagation(e) {
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

export class Markmap {
  static defaultOptions: IMarkmapOptions = {
    duration: 500,
    nodeFont: '300 16px/20px sans-serif',
    nodeMinHeight: 16,
    spacingVertical: 5,
    spacingHorizontal: 80,
    autoFit: false,
    fitRatio: 0.95,
    color: (
      (colorFn) =>
      (node: INode): string =>
        colorFn(node.p.i)
    )(d3.scaleOrdinal(d3.schemeCategory10)),
    paddingX: 8,
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
    opts?: IMarkmapOptions
  ) {
    ['handleZoom', 'handleClick'].forEach((key) => {
      this[key] = this[key].bind(this);
    });
    this.viewHooks = createViewHooks();
    this.svg = (svg as ID3SVGElement).datum
      ? (svg as ID3SVGElement)
      : d3.select(svg as string);
    this.styleNode = this.svg.append('style');
    this.zoom = d3.zoom().on('zoom', this.handleZoom);
    this.options = {
      ...Markmap.defaultOptions,
      ...opts,
    };
    this.state = {
      id: this.options.id || getId(),
    };
    this.g = this.svg.append('g').attr('class', `${this.state.id}-g`);
    this.updateStyle();
    this.svg.call(this.zoom);
    this.revokers.push(
      refreshHook.tap(() => {
        this.setData();
      })
    );
  }

  getStyleContent(): string {
    const { style, nodeFont } = this.options;
    const { id } = this.state;
    const extraStyle = typeof style === 'function' ? style(id) : '';
    const styleText = `\
.${id} { line-height: 1; }
.${id} a { color: #0097e6; }
.${id} a:hover { color: #00a8ff; }
.${id}-g > path { fill: none; }
.${id}-g > g > circle { cursor: pointer; }
.${id}-fo > div { display: inline-block; font: ${nodeFont}; white-space: nowrap; }
.${id}-fo code { font-size: calc(1em - 2px); color: #555; background-color: #f0f0f0; border-radius: 2px; }
.${id}-fo :not(pre) > code { padding: .2em .4em; }
.${id}-fo del { text-decoration: line-through; }
.${id}-fo em { font-style: italic; }
.${id}-fo strong { font-weight: bolder; }
.${id}-fo pre { margin: 0; padding: .2em .4em; }
${extraStyle}
`;
    return styleText;
  }

  updateStyle(): void {
    this.svg.attr('class', addClass(this.svg.attr('class'), this.state.id));
    this.styleNode.text(this.getStyleContent());
  }

  handleZoom(e): void {
    const { transform } = e;
    this.g.attr('transform', transform);
  }

  handleClick(e, d: IMarkmapFlexTreeItem): void {
    const { data } = d;
    data.p = {
      ...data.p,
      f: !data.p?.f,
    };
    this.renderData(d.data);
  }

  initializeData(node: INode): void {
    let i = 0;
    const { nodeFont, color, nodeMinHeight } = this.options;
    const { id } = this.state;
    const container = document.createElement('div');
    const containerClass = `${id}-container`;
    container.className = addClass(
      container.className,
      `${id}-fo`,
      containerClass
    );
    const style = document.createElement('style');
    style.textContent = `
${this.getStyleContent()}
.${containerClass} {
  position: absolute;
  width: 0;
  height: 0;
  top: -100px;
  left: -100px;
  overflow: hidden;
  font: ${nodeFont};
}
.${containerClass} > div {
  display: inline-block;
}
`;
    document.body.append(style, container);
    walkTree(node, (item, next) => {
      item.c = item.c?.map((child) => ({ ...child }));
      i += 1;
      const el = document.createElement('div');
      el.innerHTML = item.v;
      container.append(el);
      item.p = {
        ...item.p,
        // unique ID
        i,
        el,
      };
      color(item); // preload colors
      next();
    });
    const nodes = arrayFrom(container.childNodes) as HTMLElement[];
    this.viewHooks.transformHtml.call(this, nodes);
    walkTree(node, (item, next, parent) => {
      const rect = item.p.el.getBoundingClientRect();
      item.v = item.p.el.innerHTML;
      item.p.s = [
        Math.ceil(rect.width),
        Math.max(Math.ceil(rect.height), nodeMinHeight),
      ];
      // TODO keep keys for unchanged objects
      // unique key, should be based on content
      item.p.k = `${parent?.p?.i || ''}.${item.p.i}:${item.v}`;
      next();
    });
    container.remove();
    style.remove();
  }

  setOptions(opts: IMarkmapOptions): void {
    Object.assign(this.options, opts);
  }

  setData(data?: INode, opts?: IMarkmapOptions): void {
    if (data) this.state.data = data;
    this.initializeData(this.state.data);
    if (opts) this.setOptions(opts);
    this.renderData();
  }

  renderData(originData?: INode): void {
    if (!this.state.data) return;
    const { spacingHorizontal, paddingX, spacingVertical, autoFit, color } =
      this.options;
    const { id } = this.state;
    const layout = flextree()
      .children((d: INode) => !d.p?.f && d.c)
      .nodeSize((d: IMarkmapFlexTreeItem) => {
        const [width, height] = d.data.p.s;
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
    const minX = d3.min<any, number>(descendants, (d) => d.x - d.xSize / 2);
    const maxX = d3.max<any, number>(descendants, (d) => d.x + d.xSize / 2);
    const minY = d3.min<any, number>(descendants, (d) => d.y);
    const maxY = d3.max<any, number>(descendants, (d) => d.y + d.ySizeInner);
    Object.assign(this.state, {
      minX,
      maxX,
      minY,
      maxY,
    });

    if (autoFit) this.fit();

    const origin =
      (originData && descendants.find((item) => item.data === originData)) ||
      tree;
    const x0 = origin.data.p.x0 ?? origin.x;
    const y0 = origin.data.p.y0 ?? origin.y;

    // Update the nodes
    const node = this.g
      .selectAll<SVGGElement, IMarkmapFlexTreeItem>(
        childSelector<SVGGElement>('g')
      )
      .data(descendants, (d) => d.data.p.k);
    const nodeEnter = node
      .enter()
      .append('g')
      .attr(
        'transform',
        (d) =>
          `translate(${y0 + origin.ySizeInner - d.ySizeInner},${
            x0 + origin.xSize / 2 - d.xSize
          })`
      );

    const nodeExit = this.transition(node.exit<IMarkmapFlexTreeItem>());
    nodeExit
      .select('rect')
      .attr('width', 0)
      .attr('x', (d) => d.ySizeInner);
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

    const rect = nodeMerge
      .selectAll<SVGRectElement, IMarkmapFlexTreeItem>(
        childSelector<SVGRectElement>('rect')
      )
      .data(
        (d) => [d],
        (d) => d.data.p.k
      )
      .join(
        (enter) => {
          return enter
            .append('rect')
            .attr('x', (d) => d.ySizeInner)
            .attr('y', (d) => d.xSize - linkWidth(d) / 2)
            .attr('width', 0)
            .attr('height', linkWidth);
        },
        (update) => update,
        (exit) => exit.remove()
      );
    this.transition(rect)
      .attr('x', -1)
      .attr('width', (d) => d.ySizeInner + 2)
      .attr('fill', (d) => color(d.data));

    const circle = nodeMerge
      .selectAll<SVGCircleElement, IMarkmapFlexTreeItem>(
        childSelector<SVGCircleElement>('circle')
      )
      .data(
        (d) => (d.data.c ? [d] : []),
        (d) => d.data.p.k
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
      .attr('fill', (d) => (d.data.p?.f && d.data.c ? color(d.data) : '#fff'));

    const foreignObject = nodeMerge
      .selectAll<SVGForeignObjectElement, IMarkmapFlexTreeItem>(
        childSelector<SVGForeignObjectElement>('foreignObject')
      )
      .data(
        (d) => [d],
        (d) => d.data.p.k
      )
      .join(
        (enter) => {
          const fo = enter
            .append('foreignObject')
            .attr('class', `${id}-fo`)
            .attr('x', paddingX)
            .attr('y', 0)
            .style('opacity', 0)
            .attr('height', (d) => d.xSize)
            .on('mousedown', stopPropagation)
            .on('dblclick', stopPropagation);
          fo.append<HTMLDivElement>('xhtml:div')
            .select(function select(d) {
              const clone = d.data.p.el.cloneNode(true);
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
      .data(links, (d) => d.target.data.p.k)
      .join(
        (enter) => {
          const source: [number, number] = [
            y0 + origin.ySizeInner,
            x0 + origin.xSize / 2,
          ];
          return enter
            .insert('path', 'g')
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
      d.data.p.x0 = d.x;
      d.data.p.y0 = d.y;
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
    this.svg.remove();
    this.revokers.forEach((fn) => {
      fn();
    });
  }

  static create(
    svg: string | SVGElement | ID3SVGElement,
    opts?: IMarkmapOptions,
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

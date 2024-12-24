import type * as d3 from 'd3';
import {
  linkHorizontal,
  max,
  min,
  minIndex,
  select,
  zoom,
  zoomIdentity,
  zoomTransform,
} from 'd3';
import { flextree } from 'd3-flextree';
import {
  Hook,
  IMarkmapOptions,
  INode,
  IPureNode,
  addClass,
  childSelector,
  debounce,
  getId,
  noop,
  walkTree,
} from 'markmap-common';
import { defaultOptions, isMacintosh } from './constants';
import css from './style.css?inline';
import { ID3SVGElement, IMarkmapState, IPadding } from './types';
import { simpleHash } from './util';

export const globalCSS = css;

const linkShape = linkHorizontal();

function linkWidth(data: INode): number {
  return Math.max(4 - 2 * data.state.depth, 1.5);
}

function minBy(numbers: number[], by: (v: number) => number): number {
  const index = minIndex(numbers, by);
  return numbers[index];
}

function stopPropagation(e: Event) {
  e.stopPropagation();
}

/**
 * A global hook to refresh all markmaps when called.
 */
export const refreshHook = new Hook<[]>();

export class Markmap {
  options = defaultOptions;

  state: IMarkmapState;

  svg: ID3SVGElement;

  styleNode: d3.Selection<HTMLStyleElement, INode, HTMLElement, INode>;

  g: d3.Selection<SVGGElement, INode, HTMLElement, INode>;

  observer: ResizeObserver;

  zoom: d3.ZoomBehavior<SVGElement, INode>;

  revokers: (() => void)[] = [];

  constructor(
    svg: string | SVGElement | ID3SVGElement,
    opts?: Partial<IMarkmapOptions>,
  ) {
    this.svg = (svg as ID3SVGElement).datum
      ? (svg as ID3SVGElement)
      : select(svg as string);
    this.styleNode = this.svg.append('style');
    this.zoom = zoom<SVGElement, INode>()
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
      rect: { x1: 0, y1: 0, x2: 0, y2: 0 },
    };
    this.g = this.svg.append('g');
    this.observer = new ResizeObserver(
      debounce(() => {
        this.renderData();
      }, 100),
    );
    this.revokers.push(
      refreshHook.tap(() => {
        this.setData();
      }),
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
      addClass(this.svg.attr('class'), 'markmap', this.state.id),
    );
    const style = this.getStyleContent();
    this.styleNode.text(style);
  }

  handleZoom = (e: any) => {
    const { transform } = e;
    this.g.attr('transform', transform);
  };

  handlePan = (e: WheelEvent) => {
    e.preventDefault();
    const transform = zoomTransform(this.svg.node()!);
    const newTransform = transform.translate(
      -e.deltaX / transform.k,
      -e.deltaY / transform.k,
    );
    this.svg.call(this.zoom.transform, newTransform);
  };

  async toggleNode(data: INode, recursive = false) {
    const fold = data.payload?.fold ? 0 : 1;
    if (recursive) {
      // recursively
      walkTree(data, (item, next) => {
        item.payload = {
          ...item.payload,
          fold,
        };
        next();
      });
    } else {
      data.payload = {
        ...data.payload,
        fold: data.payload?.fold ? 0 : 1,
      };
    }
    await this.renderData(data);
  }

  handleClick = (e: MouseEvent, d: INode) => {
    let recursive = this.options.toggleRecursively;
    if (isMacintosh ? e.metaKey : e.ctrlKey) recursive = !recursive;
    this.toggleNode(d, recursive);
  };

  private _initializeData(node: INode): void {
    let nodeId = 0;
    const { color, initialExpandLevel } = this.options;

    let foldRecursively = 0;
    let depth = 0;
    walkTree(node, (item, next, parent) => {
      depth += 1;
      item.children = item.children?.map((child) => ({ ...child }));
      nodeId += 1;
      item.state = {
        ...item.state,
        depth,
        id: nodeId,
        rect: {
          x: 0,
          y: 0,
          width: 0,
          height: 0,
        },
        size: [0, 0],
      };
      item.state.key =
        [parent?.state?.id, item.state.id].filter(Boolean).join('.') +
        simpleHash(item.content);
      item.state.path = [parent?.state?.path, item.state.id]
        .filter(Boolean)
        .join('.');
      color(item); // preload colors

      const isFoldRecursively = item.payload?.fold === 2;
      if (isFoldRecursively) {
        foldRecursively += 1;
      } else if (
        foldRecursively ||
        (initialExpandLevel >= 0 && item.state.depth >= initialExpandLevel)
      ) {
        item.payload = { ...item.payload, fold: 1 };
      }
      next();
      if (isFoldRecursively) foldRecursively -= 1;
      depth -= 1;
    });
  }

  private _relayout() {
    if (!this.state.data) return;

    this.g
      .selectAll<SVGGElement, INode>(childSelector<SVGGElement>('g'))
      .selectAll<SVGForeignObjectElement, INode>(
        childSelector<SVGForeignObjectElement>('foreignObject'),
      )
      .each(function (d) {
        const el = this.firstChild?.firstChild as HTMLDivElement;
        const newSize: [number, number] = [el.scrollWidth, el.scrollHeight];
        d.state.size = newSize;
      });

    const { spacingHorizontal, paddingX, spacingVertical } = this.options;
    const layout = flextree<INode>({})
      .children((d) => {
        if (!d.payload?.fold) return d.children;
      })
      .nodeSize((node) => {
        const [width, height] = node.data.state.size;
        return [height, width + (width ? paddingX * 2 : 0) + spacingHorizontal];
      })
      .spacing((a, b) => {
        return a.parent === b.parent ? spacingVertical : spacingVertical * 2;
      });
    const tree = layout.hierarchy(this.state.data);
    layout(tree);
    const fnodes = tree.descendants();
    fnodes.forEach((fnode) => {
      const node = fnode.data;
      node.state.rect = {
        x: fnode.y,
        y: fnode.x - fnode.xSize / 2,
        width: fnode.ySize - spacingHorizontal,
        height: fnode.xSize,
      };
    });
    this.state.rect = {
      x1: min(fnodes, (fnode) => fnode.data.state.rect.x) || 0,
      y1: min(fnodes, (fnode) => fnode.data.state.rect.y) || 0,
      x2:
        max(
          fnodes,
          (fnode) => fnode.data.state.rect.x + fnode.data.state.rect.width,
        ) || 0,
      y2:
        max(
          fnodes,
          (fnode) => fnode.data.state.rect.y + fnode.data.state.rect.height,
        ) || 0,
    };
  }

  setOptions(opts?: Partial<IMarkmapOptions>): void {
    this.options = {
      ...this.options,
      ...opts,
    };
    if (this.options.zoom) {
      this.svg.call(this.zoom);
    } else {
      this.svg.on('.zoom', null);
    }
    if (this.options.pan) {
      this.svg.on('wheel', this.handlePan);
    } else {
      this.svg.on('wheel', null);
    }
  }

  async setData(data?: IPureNode | null, opts?: Partial<IMarkmapOptions>) {
    if (opts) this.setOptions(opts);
    if (data) this.state.data = data as INode;
    if (!this.state.data) return;
    this._initializeData(this.state.data);
    this.updateStyle();
    await this.renderData();
  }

  async renderData(originData?: INode) {
    const { paddingX, autoFit, color, maxWidth } = this.options;
    if (!this.state.data) return;

    const nodes: INode[] = [];
    walkTree(this.state.data, (item, next) => {
      if (!item.payload?.fold) next();
      nodes.push(item);
    });

    const origin = originData || this.state.data;
    const originRect = origin.state.rect;

    // Update the nodes
    const mmG = this.g
      .selectAll<SVGGElement, INode>(childSelector<SVGGElement>('g'))
      .data(nodes, (d) => d.state.key);
    const mmGEnter = mmG
      .enter()
      .append('g')
      .attr('data-depth', (d) => d.state.depth)
      .attr('data-path', (d) => d.state.path);
    const mmGExit = mmG.exit<INode>();
    const mmGMerge = mmG
      .merge(mmGEnter)
      .attr('class', (d) =>
        ['markmap-node', d.payload?.fold && 'markmap-fold']
          .filter(Boolean)
          .join(' '),
      );

    // Update lines under the content
    const mmLine = mmGMerge
      .selectAll<SVGLineElement, INode>(childSelector<SVGLineElement>('line'))
      .data(
        (d) => [d],
        (d) => d.state.key,
      );
    const mmLineEnter = mmLine.enter().append('line');
    const mmLineExit = mmGExit.selectAll<SVGLineElement, INode>(
      childSelector<SVGLineElement>('line'),
    );
    const mmLineMerge = mmLine.merge(mmLineEnter);

    // Circle to link to children of the node
    const mmCircle = mmGMerge
      .selectAll<SVGCircleElement, INode>(
        childSelector<SVGCircleElement>('circle'),
      )
      .data(
        (d) => (d.children?.length ? [d] : []),
        (d) => d.state.key,
      )
      .join(
        (enter) => {
          return enter
            .append('circle')
            .attr('stroke-width', '1.5')
            .attr('r', 0)
            .on('click', (e, d) => this.handleClick(e, d))
            .on('mousedown', stopPropagation);
        },
        (update) => update,
        (exit) => exit.remove(),
      );

    const observer = this.observer;
    const mmFo = mmGMerge
      .selectAll<
        SVGForeignObjectElement,
        INode
      >(childSelector<SVGForeignObjectElement>('foreignObject'))
      .data(
        (d) => [d],
        (d) => d.state.key,
      );
    const mmFoEnter = mmFo
      .enter()
      .append('foreignObject')
      .attr('class', 'markmap-foreign')
      .attr('x', paddingX)
      .attr('y', 0)
      .style('opacity', 0)
      .on('mousedown', stopPropagation)
      .on('dblclick', stopPropagation);
    mmFoEnter
      // The outer `<div>` with a width of `maxWidth`
      .append<HTMLDivElement>('xhtml:div')
      // The inner `<div>` with `display: inline-block` to get the proper width
      .append<HTMLDivElement>('xhtml:div')
      .html((d) => d.content)
      .attr('xmlns', 'http://www.w3.org/1999/xhtml');
    mmFoEnter.each(function () {
      const el = this.firstChild?.firstChild as Element;
      observer.observe(el);
    });
    const mmFoExit = mmGExit.selectAll<SVGForeignObjectElement, INode>(
      childSelector<SVGForeignObjectElement>('foreignObject'),
    );
    mmFoExit.each(function () {
      const el = this.firstChild?.firstChild as Element;
      observer.unobserve(el);
    });
    const mmFoMerge = mmFoEnter.merge(mmFo);

    // Update the links
    const links = nodes.flatMap((node) =>
      node.payload?.fold
        ? []
        : node.children.map((child) => ({ source: node, target: child })),
    );
    const mmPath = this.g
      .selectAll<
        SVGPathElement,
        { source: INode; target: INode }
      >(childSelector<SVGPathElement>('path'))
      .data(links, (d) => d.target.state.key);
    const mmPathExit = mmPath.exit();
    const mmPathEnter = mmPath
      .enter()
      .insert('path', 'g')
      .attr('class', 'markmap-link')
      .attr('data-depth', (d) => d.target.state.depth)
      .attr('data-path', (d) => d.target.state.path);
    const mmPathMerge = mmPathEnter.merge(mmPath);

    this.svg.style(
      '--markmap-max-width',
      maxWidth ? `${maxWidth}px` : (null as any),
    );
    await new Promise(requestAnimationFrame);
    this._relayout();

    this.transition(mmGExit)
      .attr('transform', (d) => {
        const targetX = originRect.x + originRect.width - d.state.rect.width;
        const targetY = originRect.y + originRect.height - d.state.rect.height;
        return `translate(${targetX},${targetY})`;
      })
      .remove();

    mmGEnter.attr(
      'transform',
      (d) =>
        `translate(${originRect.x + originRect.width - d.state.rect.width},${
          originRect.y + originRect.height - d.state.rect.height
        })`,
    );
    this.transition(mmGMerge).attr(
      'transform',
      (d) => `translate(${d.state.rect.x},${d.state.rect.y})`,
    );

    this.transition(mmLineExit)
      .attr('x1', (d) => d.state.rect.width)
      .attr('x2', (d) => d.state.rect.width);
    mmLineEnter
      .attr('x1', (d) => d.state.rect.width)
      .attr('x2', (d) => d.state.rect.width);
    mmLineMerge
      .attr('y1', (d) => d.state.rect.height)
      .attr('y2', (d) => d.state.rect.height)
      .attr('stroke', (d) => color(d));
    this.transition(mmLineMerge)
      .attr('x1', -1)
      .attr('x2', (d) => d.state.rect.width + 2)
      .attr('stroke-width', linkWidth);

    mmCircle
      .attr('cx', (d) => d.state.rect.width)
      .attr('cy', (d) => d.state.rect.height)
      .attr('stroke', (d) => color(d))
      .attr('fill', (d) =>
        d.payload?.fold && d.children
          ? color(d)
          : 'var(--markmap-circle-open-bg)',
      );
    this.transition(mmCircle).attr('r', 6);

    this.transition(mmFoExit).style('opacity', 0);
    mmFoMerge
      .attr('width', (d) => Math.max(0, d.state.rect.width - paddingX * 2))
      .attr('height', (d) => d.state.rect.height);
    this.transition(mmFoMerge).style('opacity', 1);

    const pathOrigin: [number, number] = [
      originRect.x + originRect.width,
      originRect.y + originRect.height,
    ];
    this.transition(mmPathExit)
      .attr('d', linkShape({ source: pathOrigin, target: pathOrigin }))
      .remove();

    mmPathEnter.attr(
      'd',
      linkShape({ source: pathOrigin, target: pathOrigin }),
    );
    this.transition(mmPathMerge)
      .attr('stroke', (d) => color(d.target))
      .attr('stroke-width', (d) => linkWidth(d.target))
      .attr('d', (d) => {
        const origSource = d.source;
        const origTarget = d.target;
        const source: [number, number] = [
          origSource.state.rect.x + origSource.state.rect.width,
          origSource.state.rect.y + origSource.state.rect.height,
        ];
        const target: [number, number] = [
          origTarget.state.rect.x,
          origTarget.state.rect.y + origTarget.state.rect.height,
        ];
        return linkShape({ source, target });
      });

    if (autoFit) this.fit();
  }

  transition<T extends d3.BaseType, U, P extends d3.BaseType, Q>(
    sel: d3.Selection<T, U, P, Q>,
  ): d3.Transition<T, U, P, Q> {
    const { duration } = this.options;
    return sel.transition().duration(duration);
  }

  /**
   * Fit the content to the viewport.
   */
  async fit(maxScale = this.options.maxInitialScale): Promise<void> {
    const svgNode = this.svg.node()!;
    const { width: offsetWidth, height: offsetHeight } =
      svgNode.getBoundingClientRect();
    const { fitRatio } = this.options;
    const { x1, y1, x2, y2 } = this.state.rect;
    const naturalWidth = x2 - x1;
    const naturalHeight = y2 - y1;
    const scale = Math.min(
      (offsetWidth / naturalWidth) * fitRatio,
      (offsetHeight / naturalHeight) * fitRatio,
      maxScale,
    );
    const initialZoom = zoomIdentity
      .translate(
        (offsetWidth - naturalWidth * scale) / 2 - x1 * scale,
        (offsetHeight - naturalHeight * scale) / 2 - y1 * scale,
      )
      .scale(scale);
    return this.transition(this.svg)
      .call(this.zoom.transform, initialZoom)
      .end()
      .catch(noop);
  }

  findElement(node: INode) {
    let result:
      | {
          data: INode;
          g: SVGGElement;
        }
      | undefined;
    this.g
      .selectAll<SVGGElement, INode>(childSelector<SVGGElement>('g'))
      .each(function walk(d) {
        if (d === node) {
          result = {
            data: d,
            g: this,
          };
        }
      });
    return result;
  }

  /**
   * Pan the content to make the provided node visible in the viewport.
   */
  async ensureView(
    node: INode,
    padding: Partial<IPadding> | undefined,
  ): Promise<void> {
    const itemData = this.findElement(node)?.data;
    if (!itemData) return;
    const svgNode = this.svg.node()!;
    const relRect = svgNode.getBoundingClientRect();
    const transform = zoomTransform(svgNode);
    const [left, right] = [
      itemData.state.rect.x,
      itemData.state.rect.x + itemData.state.rect.width + 2,
    ].map((x) => x * transform.k + transform.x);
    const [top, bottom] = [
      itemData.state.rect.y,
      itemData.state.rect.y + itemData.state.rect.height,
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
    const svgNode = this.svg.node()!;
    const { width: offsetWidth, height: offsetHeight } =
      svgNode.getBoundingClientRect();
    const halfWidth = offsetWidth / 2;
    const halfHeight = offsetHeight / 2;
    const transform = zoomTransform(svgNode);
    const newTransform = transform
      .translate(
        ((halfWidth - transform.x) * (1 - scale)) / transform.k,
        ((halfHeight - transform.y) * (1 - scale)) / transform.k,
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
    data: IPureNode | null = null,
  ): Markmap {
    const mm = new Markmap(svg, opts);
    if (data) {
      mm.setData(data).then(() => {
        mm.fit(); // always fit for the first render
      });
    }
    return mm;
  }
}
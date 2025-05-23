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
  INode,
  IPureNode,
  addClass,
  debounce,
  getId,
  noop,
  walkTree,
} from 'markmap-common';
import { defaultOptions, isMacintosh } from './constants';
import css from './style.css?inline';
import {
  ID3SVGElement,
  IMarkmapOptions,
  IMarkmapState,
  IPadding,
} from './types';
import { childSelector, simpleHash } from './util';

export const globalCSS = css;

const SELECTOR_NODE = 'g.markmap-node';
const SELECTOR_LINK = 'path.markmap-link';
const SELECTOR_HIGHLIGHT = 'g.markmap-highlight';

const linkShape = linkHorizontal();

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
  options = { ...defaultOptions };

  state: IMarkmapState;

  svg: ID3SVGElement;

  styleNode: d3.Selection<HTMLStyleElement, INode, HTMLElement, INode>;

  g: d3.Selection<SVGGElement, INode, HTMLElement, INode>;

  zoom: d3.ZoomBehavior<SVGElement, INode>;

  private _observer: ResizeObserver;

  private _disposeList: (() => void)[] = [];

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
    this.g.append('g').attr('class', 'markmap-highlight');
    this._observer = new ResizeObserver(
      debounce(() => {
        this.renderData();
      }, 100),
    );
    this._disposeList.push(
      refreshHook.tap(() => {
        this.setData();
      }),
      () => this._observer.disconnect(),
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

  private _initializeData(node: IPureNode | INode) {
    let nodeId = 0;
    const { color, initialExpandLevel } = this.options;

    let foldRecursively = 0;
    let depth = 0;
    walkTree(node as INode, (item, next, parent) => {
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

    return node as INode;
  }

  private _relayout() {
    if (!this.state.data) return;

    this.g
      .selectAll<SVGGElement, INode>(childSelector<SVGGElement>(SELECTOR_NODE))
      .selectAll<SVGForeignObjectElement, INode>(
        childSelector<SVGForeignObjectElement>('foreignObject'),
      )
      .each(function (d) {
        const el = this.firstChild?.firstChild as HTMLDivElement;
        const newSize: [number, number] = [el.scrollWidth, el.scrollHeight];
        d.state.size = newSize;
      });

    const { lineWidth, paddingX, spacingHorizontal, spacingVertical } =
      this.options;
    const layout = flextree<INode>({})
      .children((d) => {
        if (!d.payload?.fold) return d.children;
      })
      .nodeSize((node) => {
        const [width, height] = node.data.state.size;
        return [height, width + (width ? paddingX * 2 : 0) + spacingHorizontal];
      })
      .spacing((a, b) => {
        return (
          (a.parent === b.parent ? spacingVertical : spacingVertical * 2) +
          lineWidth(a.data)
        );
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
    if (data) this.state.data = this._initializeData(data);
    if (!this.state.data) return;
    this.updateStyle();
    await this.renderData();
  }

  async setHighlight(node?: INode | null) {
    this.state.highlight = node || undefined;
    await this.renderData();
  }

  private _getHighlightRect(highlight: INode) {
    const svgNode = this.svg.node()!;
    const transform = zoomTransform(svgNode);
    const padding = 4 / transform.k;
    const rect = {
      ...highlight.state.rect,
    };
    rect.x -= padding;
    rect.y -= padding;
    rect.width += 2 * padding;
    rect.height += 2 * padding;
    return rect;
  }

  async renderData(originData?: INode) {
    const { paddingX, autoFit, color, maxWidth, lineWidth } = this.options;
    const rootNode = this.state.data;
    if (!rootNode) return;

    const nodeMap: Record<number, INode> = {};
    const parentMap: Record<number, number> = {};
    const nodes: INode[] = [];
    walkTree(rootNode, (item, next, parent) => {
      if (!item.payload?.fold) next();
      nodeMap[item.state.id] = item;
      if (parent) parentMap[item.state.id] = parent.state.id;
      nodes.push(item);
    });

    const originMap: Record<number, number> = {};
    const sourceRectMap: Record<
      number,
      { x: number; y: number; width: number; height: number }
    > = {};
    const setOriginNode = (originNode: INode | undefined) => {
      if (!originNode || originMap[originNode.state.id]) return;
      walkTree(originNode, (item, next) => {
        originMap[item.state.id] = originNode.state.id;
        next();
      });
    };
    const getOriginSourceRect = (node: INode) => {
      const rect = sourceRectMap[originMap[node.state.id]];
      return rect || rootNode.state.rect;
    };
    const getOriginTargetRect = (node: INode) =>
      (nodeMap[originMap[node.state.id]] || rootNode).state.rect;
    sourceRectMap[rootNode.state.id] = rootNode.state.rect;
    if (originData) setOriginNode(originData);

    // Update highlight
    let { highlight } = this.state;
    if (highlight && !nodeMap[highlight.state.id]) highlight = undefined;
    let highlightNodes = this.g
      .selectAll(childSelector(SELECTOR_HIGHLIGHT))
      .selectAll<SVGRectElement, INode>(childSelector<SVGRectElement>('rect'))
      .data(highlight ? [this._getHighlightRect(highlight)] : [])
      .join('rect')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .attr('width', (d) => d.width)
      .attr('height', (d) => d.height);

    // Update the nodes
    const mmG = this.g
      .selectAll<SVGGElement, INode>(childSelector<SVGGElement>(SELECTOR_NODE))
      .each((d) => {
        // Save the current rects before updating nodes
        sourceRectMap[d.state.id] = d.state.rect;
      })
      .data(nodes, (d) => d.state.key);
    const mmGEnter = mmG
      .enter()
      .append('g')
      .attr('data-depth', (d) => d.state.depth)
      .attr('data-path', (d) => d.state.path)
      .each((d) => {
        setOriginNode(nodeMap[parentMap[d.state.id]]);
      });
    const mmGExit = mmG.exit<INode>().each((d) => {
      setOriginNode(nodeMap[parentMap[d.state.id]]);
    });
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
    const mmLineEnter = mmLine
      .enter()
      .append('line')
      .attr('stroke', (d) => color(d))
      .attr('stroke-width', 0);
    const mmLineMerge = mmLine.merge(mmLineEnter);

    // Circle to link to children of the node
    const mmCircle = mmGMerge
      .selectAll<
        SVGCircleElement,
        INode
      >(childSelector<SVGCircleElement>('circle'))
      .data(
        (d) => (d.children?.length ? [d] : []),
        (d) => d.state.key,
      );
    const mmCircleEnter = mmCircle
      .enter()
      .append('circle')
      .attr('stroke-width', 0)
      .attr('r', 0)
      .on('click', (e, d) => this.handleClick(e, d))
      .on('mousedown', stopPropagation);
    const mmCircleMerge = mmCircleEnter
      .merge(mmCircle)
      .attr('stroke', (d) => color(d))
      .attr('fill', (d) =>
        d.payload?.fold && d.children
          ? color(d)
          : 'var(--markmap-circle-open-bg)',
      );

    const observer = this._observer;
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
      >(childSelector<SVGPathElement>(SELECTOR_LINK))
      .data(links, (d) => d.target.state.key);
    const mmPathExit = mmPath.exit<{ source: INode; target: INode }>();
    const mmPathEnter = mmPath
      .enter()
      .insert('path', 'g')
      .attr('class', 'markmap-link')
      .attr('data-depth', (d) => d.target.state.depth)
      .attr('data-path', (d) => d.target.state.path)
      .attr('d', (d) => {
        const originRect = getOriginSourceRect(d.target);
        const pathOrigin: [number, number] = [
          originRect.x + originRect.width,
          originRect.y + originRect.height,
        ];
        return linkShape({ source: pathOrigin, target: pathOrigin });
      })
      .attr('stroke-width', 0);
    const mmPathMerge = mmPathEnter.merge(mmPath);

    this.svg.style(
      '--markmap-max-width',
      maxWidth ? `${maxWidth}px` : (null as any),
    );
    await new Promise(requestAnimationFrame);
    // Note: d.state.rect is only available after relayout
    this._relayout();

    highlightNodes = highlightNodes
      .data(highlight ? [this._getHighlightRect(highlight)] : [])
      .join('rect');
    this.transition(highlightNodes)
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .attr('width', (d) => d.width)
      .attr('height', (d) => d.height);

    mmGEnter.attr('transform', (d) => {
      const originRect = getOriginSourceRect(d);
      return `translate(${originRect.x + originRect.width - d.state.rect.width},${
        originRect.y + originRect.height - d.state.rect.height
      })`;
    });
    this.transition(mmGExit)
      .attr('transform', (d) => {
        const targetRect = getOriginTargetRect(d);
        const targetX = targetRect.x + targetRect.width - d.state.rect.width;
        const targetY = targetRect.y + targetRect.height - d.state.rect.height;
        return `translate(${targetX},${targetY})`;
      })
      .remove();

    this.transition(mmGMerge).attr(
      'transform',
      (d) => `translate(${d.state.rect.x},${d.state.rect.y})`,
    );

    const mmLineExit = mmGExit.selectAll<SVGLineElement, INode>(
      childSelector<SVGLineElement>('line'),
    );
    this.transition(mmLineExit)
      .attr('x1', (d) => d.state.rect.width)
      .attr('stroke-width', 0);
    mmLineEnter
      .attr('x1', (d) => d.state.rect.width)
      .attr('x2', (d) => d.state.rect.width);
    mmLineMerge
      .attr('y1', (d) => d.state.rect.height + lineWidth(d) / 2)
      .attr('y2', (d) => d.state.rect.height + lineWidth(d) / 2);
    this.transition(mmLineMerge)
      .attr('x1', -1)
      .attr('x2', (d) => d.state.rect.width + 2)
      .attr('stroke', (d) => color(d))
      .attr('stroke-width', lineWidth);

    const mmCircleExit = mmGExit.selectAll<SVGCircleElement, INode>(
      childSelector<SVGCircleElement>('circle'),
    );
    this.transition(mmCircleExit).attr('r', 0).attr('stroke-width', 0);
    mmCircleMerge
      .attr('cx', (d) => d.state.rect.width)
      .attr('cy', (d) => d.state.rect.height + lineWidth(d) / 2);
    this.transition(mmCircleMerge).attr('r', 6).attr('stroke-width', '1.5');

    this.transition(mmFoExit).style('opacity', 0);
    mmFoMerge
      .attr('width', (d) => Math.max(0, d.state.rect.width - paddingX * 2))
      .attr('height', (d) => d.state.rect.height);
    this.transition(mmFoMerge).style('opacity', 1);

    this.transition(mmPathExit)
      .attr('d', (d) => {
        const targetRect = getOriginTargetRect(d.target);
        const pathTarget: [number, number] = [
          targetRect.x + targetRect.width,
          targetRect.y + targetRect.height + lineWidth(d.target) / 2,
        ];
        return linkShape({ source: pathTarget, target: pathTarget });
      })
      .attr('stroke-width', 0)
      .remove();

    this.transition(mmPathMerge)
      .attr('stroke', (d) => color(d.target))
      .attr('stroke-width', (d) => lineWidth(d.target))
      .attr('d', (d) => {
        const origSource = d.source;
        const origTarget = d.target;
        const source: [number, number] = [
          origSource.state.rect.x + origSource.state.rect.width,
          origSource.state.rect.y +
            origSource.state.rect.height +
            lineWidth(origSource) / 2,
        ];
        const target: [number, number] = [
          origTarget.state.rect.x,
          origTarget.state.rect.y +
            origTarget.state.rect.height +
            lineWidth(origTarget) / 2,
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
      .selectAll<SVGGElement, INode>(childSelector<SVGGElement>(SELECTOR_NODE))
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
  async ensureVisible(node: INode, padding?: Partial<IPadding>) {
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

  /** @deprecated Use `ensureVisible` instead */
  ensureView = this.ensureVisible;

  async centerNode(node: INode, padding?: Partial<IPadding>) {
    const itemData = this.findElement(node)?.data;
    if (!itemData) return;
    const svgNode = this.svg.node()!;
    const relRect = svgNode.getBoundingClientRect();
    const transform = zoomTransform(svgNode);
    const x =
      (itemData.state.rect.x + itemData.state.rect.width / 2) * transform.k +
      transform.x;
    const y =
      (itemData.state.rect.y + itemData.state.rect.height / 2) * transform.k +
      transform.y;
    const pd: IPadding = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      ...padding,
    };
    const cx = (pd.left + relRect.width - pd.right) / 2;
    const cy = (pd.top + relRect.height - pd.bottom) / 2;
    const dx = (cx - x) / transform.k;
    const dy = (cy - y) / transform.k;
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
    this._disposeList.forEach((fn) => {
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

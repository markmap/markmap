import { mountDom } from '@gera2ld/jsx-dom';
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
import { FlextreeNode, flextree } from 'd3-flextree';
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
import containerCSS from './container.css?inline';
import css from './style.css?inline';
import { ID3SVGElement, IMarkmapState, IPadding } from './types';

export const globalCSS = css;

function linkWidth(nodeData: d3.HierarchyNode<INode>): number {
  const data: INode = nodeData.data;
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

  styleNode: d3.Selection<
    HTMLStyleElement,
    FlextreeNode<INode>,
    HTMLElement,
    FlextreeNode<INode>
  >;

  g: d3.Selection<
    SVGGElement,
    FlextreeNode<INode>,
    HTMLElement,
    FlextreeNode<INode>
  >;

  zoom: d3.ZoomBehavior<SVGElement, FlextreeNode<INode>>;

  revokers: (() => void)[] = [];

  private imgCache: Record<string, [number, number]> = {};

  private debouncedRefresh: () => void;

  constructor(
    svg: string | SVGElement | ID3SVGElement,
    opts?: Partial<IMarkmapOptions>,
  ) {
    this.svg = (svg as ID3SVGElement).datum
      ? (svg as ID3SVGElement)
      : select(svg as string);
    this.styleNode = this.svg.append('style');
    this.zoom = zoom<SVGElement, FlextreeNode<INode>>()
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
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
    };
    this.g = this.svg.append('g');
    this.debouncedRefresh = debounce(() => this.setData(), 200);
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

  toggleNode(data: INode, recursive = false): void {
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
    this.renderData(data);
  }

  handleClick = (e: MouseEvent, d: FlextreeNode<INode>) => {
    let recursive = this.options.toggleRecursively;
    if (isMacintosh ? e.metaKey : e.ctrlKey) recursive = !recursive;
    this.toggleNode(d.data, recursive);
  };

  initializeData(node: INode): void {
    let nodeId = 0;
    const { color, nodeMinHeight, maxWidth, initialExpandLevel } = this.options;
    const { id } = this.state;
    const container = mountDom(
      <div className={`markmap-container markmap ${id}-g`}></div>,
    ) as HTMLElement;
    const style = mountDom(
      <style>{[this.getStyleContent(), containerCSS].join('\n')}</style>,
    ) as HTMLElement;
    document.body.append(container, style);
    const groupStyle = maxWidth ? `--markmap-max-width: ${maxWidth}px` : '';

    let foldRecursively = 0;
    let depth = 0;
    walkTree(node, (item, next, parent) => {
      depth += 1;
      item.children = item.children?.map((child) => ({ ...child }));
      nodeId += 1;
      const group = mountDom(
        <div
          className="markmap-foreign markmap-foreign-testing-max"
          style={groupStyle}
        >
          <div dangerouslySetInnerHTML={{ __html: item.content }}></div>
        </div>,
      );
      container.append(group);
      item.state = {
        ...item.state,
        depth,
        id: nodeId,
        el: group.firstChild as HTMLElement,
      };
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

    const nodes = Array.from(container.childNodes).map(
      (group) => group.firstChild as HTMLElement,
    );

    this._checkImages(container);

    // Clone the rendered HTML and set `white-space: nowrap` to it to detect its max-width.
    // The parent node will have a width of the max-width and the original content without
    // `white-space: nowrap` gets re-layouted, then we will get the expected layout, with
    // content in one line as much as possible, and subjecting to the given max-width.
    nodes.forEach((node) => {
      node.parentNode?.append(node.cloneNode(true));
    });
    walkTree(node, (item, next, parent) => {
      const state = item.state;
      const rect = state.el.getBoundingClientRect();
      item.content = state.el.innerHTML;
      state.size = [
        Math.ceil(rect.width) + 1,
        Math.max(Math.ceil(rect.height), nodeMinHeight),
      ];
      state.key =
        [parent?.state?.id, state.id].filter(Boolean).join('.') +
        // FIXME: find a way to check content hash
        item.content;
      next();
    });
    container.remove();
    style.remove();
  }

  private _checkImages(container: HTMLElement) {
    container.querySelectorAll('img').forEach((img) => {
      if (img.width) return;
      const size = this.imgCache[img.src];
      if (size?.[0]) {
        [img.width, img.height] = size;
      } else if (!size) {
        this._loadImage(img.src);
      }
    });
  }

  private _loadImage(src: string) {
    this.imgCache[src] = [0, 0];
    const img = new Image();
    img.src = src;
    img.onload = () => {
      this.imgCache[src] = [img.naturalWidth, img.naturalHeight];
      this.debouncedRefresh();
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

  setData(data?: IPureNode | null, opts?: Partial<IMarkmapOptions>): void {
    if (opts) this.setOptions(opts);
    if (data) this.state.data = data as INode;
    if (!this.state.data) return;
    this.initializeData(this.state.data);
    this.updateStyle();
    this.renderData();
  }

  renderData(originData?: INode): void {
    if (!this.state.data) return;
    const { spacingHorizontal, paddingX, spacingVertical, autoFit, color } =
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
        return a.parent === b.parent ? spacingVertical : spacingVertical * 2;
      });
    const tree = layout.hierarchy(this.state.data);
    layout(tree);
    const descendants = tree.descendants().reverse();
    const links = tree.links();
    const linkShape = linkHorizontal();
    const minX = min(descendants, (d) => d.x - d.xSize / 2);
    const maxX = max(descendants, (d) => d.x + d.xSize / 2);
    const minY = min(descendants, (d) => d.y);
    const maxY = max(descendants, (d) => d.y + d.ySize - spacingHorizontal);
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
    const x0 = origin.data.state.x0 ?? origin.x;
    const y0 = origin.data.state.y0 ?? origin.y;

    // Update the nodes
    const node = this.g
      .selectAll<
        SVGGElement,
        FlextreeNode<INode>
      >(childSelector<SVGGElement>('g'))
      .data(descendants, (d) => d.data.state.key);
    const nodeEnter = node
      .enter()
      .append('g')
      .attr('data-depth', (d) => d.data.state.depth)
      .attr('data-path', (d) => d.data.state.path)
      .attr(
        'transform',
        (d) =>
          `translate(${y0 + origin.ySize - d.ySize},${
            x0 + origin.xSize / 2 - d.xSize
          })`,
      );

    const nodeExit = this.transition(node.exit<FlextreeNode<INode>>());
    nodeExit
      .select('line')
      .attr('x1', (d) => d.ySize - spacingHorizontal)
      .attr('x2', (d) => d.ySize - spacingHorizontal);
    nodeExit.select('foreignObject').style('opacity', 0);
    nodeExit
      .attr(
        'transform',
        (d) =>
          `translate(${origin.y + origin.ySize - d.ySize},${
            origin.x + origin.xSize / 2 - d.xSize
          })`,
      )
      .remove();

    const nodeMerge = node
      .merge(nodeEnter)
      .attr('class', (d) =>
        ['markmap-node', d.data.payload?.fold && 'markmap-fold']
          .filter(Boolean)
          .join(' '),
      );
    this.transition(nodeMerge).attr(
      'transform',
      (d) => `translate(${d.y},${d.x - d.xSize / 2})`,
    );

    // Update lines under the content
    const line = nodeMerge
      .selectAll<SVGLineElement, FlextreeNode<INode>>(
        childSelector<SVGLineElement>('line'),
      )
      .data(
        (d) => [d],
        (d) => d.data.state.key,
      )
      .join(
        (enter) => {
          return enter
            .append('line')
            .attr('x1', (d) => d.ySize - spacingHorizontal)
            .attr('x2', (d) => d.ySize - spacingHorizontal);
        },
        (update) => update,
        (exit) => exit.remove(),
      );
    this.transition(line)
      .attr('x1', -1)
      .attr('x2', (d) => d.ySize - spacingHorizontal + 2)
      .attr('y1', (d) => d.xSize)
      .attr('y2', (d) => d.xSize)
      .attr('stroke', (d) => color(d.data))
      .attr('stroke-width', linkWidth);

    // Circle to link to children of the node
    const circle = nodeMerge
      .selectAll<SVGCircleElement, FlextreeNode<INode>>(
        childSelector<SVGCircleElement>('circle'),
      )
      .data(
        (d) => (d.data.children?.length ? [d] : []),
        (d) => d.data.state.key,
      )
      .join(
        (enter) => {
          return enter
            .append('circle')
            .attr('stroke-width', '1.5')
            .attr('cx', (d) => d.ySize - spacingHorizontal)
            .attr('cy', (d) => d.xSize)
            .attr('r', 0)
            .on('click', (e, d) => this.handleClick(e, d))
            .on('mousedown', stopPropagation);
        },
        (update) => update,
        (exit) => exit.remove(),
      );
    this.transition(circle)
      .attr('r', 6)
      .attr('cx', (d) => d.ySize - spacingHorizontal)
      .attr('cy', (d) => d.xSize)
      .attr('stroke', (d) => color(d.data))
      .attr('fill', (d) =>
        d.data.payload?.fold && d.data.children
          ? color(d.data)
          : 'var(--markmap-circle-open-bg)',
      );

    const foreignObject = nodeMerge
      .selectAll<SVGForeignObjectElement, FlextreeNode<INode>>(
        childSelector<SVGForeignObjectElement>('foreignObject'),
      )
      .data(
        (d) => [d],
        (d) => d.data.state.key,
      )
      .join(
        (enter) => {
          const fo = enter
            .append('foreignObject')
            .attr('class', 'markmap-foreign')
            .attr('x', paddingX)
            .attr('y', 0)
            .style('opacity', 0)
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
        (exit) => exit.remove(),
      )
      .attr('width', (d) =>
        Math.max(0, d.ySize - spacingHorizontal - paddingX * 2),
      )
      .attr('height', (d) => d.xSize);
    this.transition(foreignObject).style('opacity', 1);

    // Update the links
    const path = this.g
      .selectAll<SVGPathElement, d3.HierarchyLink<INode>>(
        childSelector<SVGPathElement>('path'),
      )
      .data(links, (d) => d.target.data.state.key)
      .join(
        (enter) => {
          const source: [number, number] = [
            y0 + origin.ySize - spacingHorizontal,
            x0 + origin.xSize / 2,
          ];
          return enter
            .insert('path', 'g')
            .attr('class', 'markmap-link')
            .attr('data-depth', (d) => d.target.data.state.depth)
            .attr('data-path', (d) => d.target.data.state.path)
            .attr('d', linkShape({ source, target: source }));
        },
        (update) => update,
        (exit) => {
          const source: [number, number] = [
            origin.y + origin.ySize - spacingHorizontal,
            origin.x + origin.xSize / 2,
          ];
          return this.transition(exit)
            .attr('d', linkShape({ source, target: source }))
            .remove();
        },
      );
    this.transition(path)
      .attr('stroke', (d) => color(d.target.data))
      .attr('stroke-width', (d) => linkWidth(d.target))
      .attr('d', (d) => {
        const origSource = d.source as FlextreeNode<INode>;
        const origTarget = d.target as FlextreeNode<INode>;
        const source: [number, number] = [
          origSource.y + origSource.ySize - spacingHorizontal,
          origSource.x + origSource.xSize / 2,
        ];
        const target: [number, number] = [
          origTarget.y,
          origTarget.x + origTarget.xSize / 2,
        ];
        return linkShape({ source, target });
      });

    descendants.forEach((d) => {
      d.data.state.x0 = d.x;
      d.data.state.y0 = d.y;
    });
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
    const { minX, maxX, minY, maxY } = this.state;
    const naturalWidth = maxY - minY;
    const naturalHeight = maxX - minX;
    const scale = Math.min(
      (offsetWidth / naturalWidth) * fitRatio,
      (offsetHeight / naturalHeight) * fitRatio,
      maxScale,
    );
    const initialZoom = zoomIdentity
      .translate(
        (offsetWidth - naturalWidth * scale) / 2 - minY * scale,
        (offsetHeight - naturalHeight * scale) / 2 - minX * scale,
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
          data: FlextreeNode<INode>;
          g: SVGGElement;
        }
      | undefined;
    this.g
      .selectAll<
        SVGGElement,
        FlextreeNode<INode>
      >(childSelector<SVGGElement>('g'))
      .each(function walk(d) {
        if (d.data === node) {
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
    const { spacingHorizontal } = this.options;
    const relRect = svgNode.getBoundingClientRect();
    const transform = zoomTransform(svgNode);
    const [left, right] = [
      itemData.y,
      itemData.y + itemData.ySize - spacingHorizontal + 2,
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
      mm.setData(data);
      requestAnimationFrame(() => {
        mm.fit(); // always fit for the first render
      });
    }
    return mm;
  }
}

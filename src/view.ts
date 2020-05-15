import * as d3 from 'd3';
import { flextree } from 'd3-flextree';
import { INode, IMarkmapOptions, IMarkmapState, IMarkmapFlexTreeItem, IMarkmapLinkItem } from './types';
import { initializePlugins, getId, walkTree, arrayFrom, addClass, childSelector } from './util';
import * as plugins from './plugins';

export { plugins };

function linkWidth(nodeData: IMarkmapFlexTreeItem): number {
  const data: INode = nodeData.data;
  return Math.max(6 - 2 * data.d, 1.5);
}

function adjustSpacing(tree: IMarkmapFlexTreeItem, spacing: number): void {
  walkTree(tree, (d, next) => {
    d.ySizeInner = d.ySize - spacing;
    d.y += spacing;
    next();
  }, 'children');
}

type ID3SVGElement = d3.Selection<SVGElement, IMarkmapFlexTreeItem, HTMLElement, IMarkmapFlexTreeItem>;

export class Markmap {
  options: IMarkmapOptions;
  state: IMarkmapState;
  svg: ID3SVGElement;
  styleNode: d3.Selection<HTMLStyleElement, IMarkmapFlexTreeItem, HTMLElement, IMarkmapFlexTreeItem>;
  g: d3.Selection<SVGGElement, IMarkmapFlexTreeItem, HTMLElement, IMarkmapFlexTreeItem>;
  zoom: d3.ZoomBehavior<Element, unknown>;
  static processors = [];

  constructor(svg: string | SVGElement | ID3SVGElement, opts?: IMarkmapOptions) {
    [
      'handleZoom',
      'handleClick',
    ].forEach(key => {
      this[key] = this[key].bind(this);
    });
    this.svg = (svg as ID3SVGElement).datum ? (svg as ID3SVGElement) : d3.select(svg as string);
    this.styleNode = this.svg.append('style');
    this.zoom = d3.zoom().on('zoom', this.handleZoom);
    this.options = {
      duration: 500,
      nodeFont: '300 16px/20px sans-serif',
      nodeMinHeight: 16,
      spacingVertical: 5,
      spacingHorizontal: 80,
      autoFit: false,
      fitRatio: 0.95,
      color: (colorFn => (node: INode): string => colorFn(node.p.i))(d3.scaleOrdinal(d3.schemeCategory10)),
      paddingX: 8,
      ...opts,
    };
    this.state = {
      id: this.options.id || getId(),
    };
    this.g = this.svg.append('g').attr('class', `${this.state.id}-g`);
    this.updateStyle();
    this.svg.call(this.zoom);
  }

  getStyleContent(): string {
    const { style, nodeFont } = this.options;
    const { id } = this.state;
    const extraStyle = typeof style === 'function' ? style(id) : '';
    const styleText = `\
.${id} a { color: #0097e6; }
.${id} a:hover { color: #00a8ff; }
.${id}-g > path { fill: none; }
.${id}-fo > div { font: ${nodeFont}; white-space: nowrap; }
.${id}-fo code { padding: .2em .4em; font-size: calc(1em - 2px); color: #555; background-color: #f0f0f0; border-radius: 2px; }
.${id}-fo del { text-decoration: line-through; }
.${id}-fo em { font-style: italic; }
.${id}-fo strong { font-weight: 500; }
.${id}-fo pre { margin: 0; }
.${id}-fo pre[class*=language-] { padding: 0; }
.${id}-g > g { cursor: pointer; }
${extraStyle}
`;
    return styleText;
  }

  updateStyle(): void {
    this.svg.attr('class', addClass(this.svg.attr('class'), this.state.id));
    this.styleNode.text(this.getStyleContent());
  }

  handleZoom(): void {
    const { transform } = d3.event;
    this.g.attr('transform', transform);
  }

  handleClick(d: IMarkmapFlexTreeItem): void {
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
      containerClass,
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
      item.c = item.c?.map(child => ({ ...child }));
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
    if (Markmap.processors?.length) {
      const nodes = arrayFrom(container.childNodes);
      Markmap.processors.forEach(processor => {
        processor(nodes, this);
      });
    }
    walkTree(node, (item, next, parent) => {
      const rect = item.p.el.getBoundingClientRect();
      item.v = item.p.el.innerHTML;
      item.p.s = [Math.ceil(rect.width), Math.max(Math.ceil(rect.height), nodeMinHeight)];
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

  setData(data: INode, opts?: IMarkmapOptions): void {
    if (!data) data = { ...this.state.data };
    this.state.data = data;
    this.initializeData(data);
    if (opts) this.setOptions(opts);
    this.renderData();
  }

  renderData(originData?: INode): void {
    if (!this.state.data) return;
    const { spacingHorizontal, paddingX, spacingVertical, autoFit, color } = this.options;
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
    const minX = d3.min<any, number>(descendants, d => d.x - d.xSize / 2);
    const maxX = d3.max<any, number>(descendants, d => d.x + d.xSize / 2);
    const minY = d3.min<any, number>(descendants, d => d.y);
    const maxY = d3.max<any, number>(descendants, d => d.y + d.ySizeInner);
    Object.assign(this.state, {
      minX,
      maxX,
      minY,
      maxY,
    });

    if (autoFit) this.fit();

    const origin = originData && descendants.find(item => item.data === originData) || tree;
    const x0 = origin.data.p.x0 ?? origin.x;
    const y0 = origin.data.p.y0 ?? origin.y;

    // Update the nodes
    const node = this.g.selectAll<SVGGElement, IMarkmapFlexTreeItem>(childSelector<SVGGElement>('g'))
    .data(descendants, d => d.data.p.k);
    const nodeEnter = node.enter().append('g')
      .attr('transform', d => `translate(${y0 + origin.ySizeInner - d.ySizeInner},${x0 + origin.xSize / 2 - d.xSize})`)
      .on('click', this.handleClick);

    const nodeExit = this.transition(node.exit<IMarkmapFlexTreeItem>());
    nodeExit.select('rect').attr('width', 0).attr('x', d => d.ySizeInner);
    nodeExit.select('foreignObject').style('opacity', 0);
    nodeExit.attr('transform', d => `translate(${origin.y + origin.ySizeInner - d.ySizeInner},${origin.x + origin.xSize / 2 - d.xSize})`).remove();

    const nodeMerge = node.merge(nodeEnter);
    this.transition(nodeMerge).attr('transform', d => `translate(${d.y},${d.x - d.xSize / 2})`);

    const rect = nodeMerge.selectAll<SVGRectElement, IMarkmapFlexTreeItem>(childSelector<SVGRectElement>('rect'))
      .data(d => [d], d => d.data.p.k)
      .join(
        enter => {
          return enter.append('rect')
            .attr('x', d => d.ySizeInner)
            .attr('y', d => d.xSize - linkWidth(d) / 2)
            .attr('width', 0)
            .attr('height', linkWidth);
        },
        update => update,
        exit => exit.remove(),
      );
    this.transition(rect)
      .attr('x', -1)
      .attr('width', d => d.ySizeInner + 2)
      .attr('fill', d => color(d.data));

    const circle = nodeMerge.selectAll<SVGCircleElement, IMarkmapFlexTreeItem>(childSelector<SVGCircleElement>('circle'))
      .data(d => d.data.c ? [d] : [], d => d.data.p.k)
      .join(
        enter => {
          return enter.append('circle')
            .attr('stroke-width', '1.5')
            .attr('cx', d => d.ySizeInner)
            .attr('cy', d => d.xSize)
            .attr('r', 0);
        },
        update => update,
        exit => exit.remove(),
      );
    this.transition(circle)
      .attr('r', 6)
      .attr('stroke', d => color(d.data))
      .attr('fill', d => d.data.p?.f ? color(d.data) : '#fff');

    const foreignObject = nodeMerge.selectAll<SVGForeignObjectElement, IMarkmapFlexTreeItem>(childSelector<SVGForeignObjectElement>('foreignObject'))
      .data(d => [d], d => d.data.p.k)
      .join(
        enter => {
          const fo = enter.append('foreignObject')
            .attr('class', `${id}-fo`)
            .attr('x', paddingX)
            .attr('y', 0)
            .style('opacity', 0)
            .attr('height', d => d.xSize);
          fo.append<HTMLDivElement>('xhtml:div')
            .select(function (d) {
              const node = d.data.p.el.cloneNode(true);
              this.replaceWith(node);
              return node;
            })
            .attr('xmlns', 'http://www.w3.org/1999/xhtml');
          return fo;
        },
        update => update,
        exit => exit.remove(),
      )
      .attr('width', d => Math.max(0, d.ySizeInner - paddingX * 2));
    this.transition(foreignObject)
      .style('opacity', 1);

    // Update the links
    const path = this.g.selectAll<SVGPathElement, IMarkmapLinkItem>(childSelector<SVGPathElement>('path'))
      .data(links, d => d.target.data.p.k)
      .join(
        enter => {
          const source: [number, number] = [
            y0 + origin.ySizeInner,
            x0 + origin.xSize / 2,
          ];
          return enter.insert('path', 'g')
            .attr('d', linkShape({ source, target: source }));
        },
        update => update,
        exit => {
          const source: [number, number] = [
            origin.y + origin.ySizeInner,
            origin.x + origin.xSize / 2,
          ];
          return this.transition(exit)
            .attr('d', linkShape({ source, target: source }))
            .remove();
        },
      );
    this.transition(path)
      .attr('stroke', d => color(d.target.data))
      .attr('stroke-width', d => linkWidth(d.target))
      .attr('d', d => {
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

    descendants.forEach(d => {
      d.data.p.x0 = d.x;
      d.data.p.y0 = d.y;
    });
  }

  transition<T extends d3.BaseType, U, P extends d3.BaseType, Q>(sel: d3.Selection<T, U, P, Q>): d3.Transition<T, U, P, Q> {
    const { duration } = this.options;
    if (duration) {
      return sel.transition().duration(duration);
    }
    return sel as unknown as d3.Transition<T, U, P, Q>;
  }

  fit(): void {
    const svgNode = this.svg.node();
    const { width: offsetWidth, height: offsetHeight } = svgNode.getBoundingClientRect();
    const { fitRatio } = this.options;
    const { minX, maxX, minY, maxY } = this.state;
    const naturalWidth = maxY - minY;
    const naturalHeight = maxX - minX;
    const scale = Math.min(offsetWidth / naturalWidth * fitRatio, offsetHeight / naturalHeight * fitRatio, 2);
    const initialZoom = d3.zoomIdentity
      .translate((offsetWidth - naturalWidth * scale) / 2 - minY * scale, (offsetHeight - naturalHeight * scale) / 2 - minX * scale)
      .scale(scale);
    this.transition(this.svg).call(this.zoom.transform, initialZoom);
  }

  rescale(scale: number): void {
    const svgNode = this.svg.node();
    const { width: offsetWidth, height: offsetHeight } = svgNode.getBoundingClientRect();
    const halfWidth = offsetWidth / 2;
    const halfHeight = offsetHeight / 2;
    const transform = d3.zoomTransform(svgNode);
    const newTransform = transform
    .translate((halfWidth - transform.x) * (1 - scale) / transform.k, (halfHeight - transform.y) * (1 - scale) / transform.k)
    .scale(scale);
    this.transition(this.svg).call(this.zoom.transform, newTransform);
  }

  static create(svg: string | SVGElement | ID3SVGElement, opts?: IMarkmapOptions, data?: INode): Markmap {
    const mm = new Markmap(svg, opts);
    if (data) {
      mm.setData(data);
      mm.fit(); // always fit for the first render
    }
    return mm;
  }
}

export function markmap(svg: string | SVGElement | ID3SVGElement, data?: INode, opts?: IMarkmapOptions): Markmap {
  return Markmap.create(svg, opts, data);
}

export async function loadPlugins(items: any[], options: any): Promise<void> {
  items = items.map((item: any) => {
    if (typeof item === 'string') {
      const name = item;
      item = plugins[name];
      if (!item) {
        console.warn(`[markmap] Unknown plugin: ${name}`);
      }
    }
    return item;
  })
  .filter(Boolean);
  Markmap.processors = [
    ...Markmap.processors,
    ...await initializePlugins(items, options),
  ];
}

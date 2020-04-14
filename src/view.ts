import * as d3 from 'd3';
import { flextree } from 'd3-flextree';
import { INode, IValue, IMarkmapOptions } from './types';

function walkTree<T>(tree: T, callback: (item: T, next: () => void, parent?: T) => void, key = 'c'): void {
  const walk = (item: T, parent?: T): void => callback(item, () => {
    item[key]?.forEach((child: T) => {
      walk(child, item);
    });
  }, parent);
  walk(tree);
}

let canvas: HTMLCanvasElement;
function getTextRect(items: IValue[], options: IMarkmapOptions): [number, number] {
  // re-use canvas object for better performance
  if (!canvas) canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = options.nodeFont;
  let maxWidth = 0;
  let width = 0;
  let height = 0;
  let row = 0;
  const walk = (item: IValue): void => {
    if (item.t === 'text') {
      height = (row + 1) * options.lineHeight;
      item.p = {
        ...item.p,
        x: width,
        y: height,
      };
      if (!width && row) item.p.newline = true;
      const metrics = context.measureText(item.v);
      width += metrics.width;
      if (maxWidth < width) maxWidth = width;
    } else if (item.t === 'softbreak') {
      width = 0;
      row += 1;
    } else if (item.t === 'link') {
      item.c.forEach(walk);
    }
  };
  items.forEach(walk);
  return [maxWidth, height];
}

function linkWidth(nodeData): number {
  const data: INode = nodeData.data;
  return Math.max(6 - 2 * data.d, 1.5);
}

function getKey(v: IValue[]): string {
  const result = ['<'];
  v.forEach(item => {
    if (item.t === 'text') result.push(item.v.replace(/[<|&]/g, m => `&${m}`));
    else if (item.c) result.push(getKey(item.c));
  });
  result.push('>');
  return result.join('');
}

function addSpacing(tree, spacing: number): void {
  let depth = 0;
  walkTree(tree, (item, next) => {
    item.y += depth * spacing;
    depth += 1;
    next();
    depth -= 1;
  }, 'children');
}

function getChildNodes() {
  return this.childNodes;
}

export function markmap(svg, data, opts) {
  svg = svg.datum ? svg : d3.select(svg);
  const classList = (svg.attr('class') || '').split(' ').filter(Boolean);
  if (classList.indexOf('markmap') < 0) {
    classList.push('markmap');
    svg.attr('class', classList.join(' '));
  }
  const style = svg.append('style');
  const g = svg.append('g');
  const zoom = d3.zoom().on('zoom', handleZoom);
  const svgNode = svg.node();
  const options: IMarkmapOptions = {
    duration: 500,
    nodeFont: '300 16px sans-serif',
    lineHeight: 20,
    spacingVertical: 5,
    spacingHorizontal: 80,
    autoFit: false,
    fitRatio: 0.95,
    color: d3.scaleOrdinal(d3.schemeCategory10),
    colorDepth: 0,
    ...opts,
  };
  const state: any = {};
  updateStyle();
  if (data) {
    setData(data);
    fit(); // always fit for the first render
  }
  svg.call(zoom);
  return {
    setData,
    setOptions,
    fit,
  };

  function updateStyle() {
    style.text(`\
.markmap a { fill: #0097e6; }
.markmap a:hover { fill: #00a8ff; }
.markmap path { fill: none; }
.markmap text { font: ${options.nodeFont} }
.markmap tspan.markmap-em { font-style: italic; }
.markmap tspan.markmap-strong { font-weight: 500; }
.markmap g > g { cursor: pointer; }
`);
  }
  function handleZoom() {
    const { transform } = d3.event;
    g.attr('transform', transform);
  }
  function addKeys(node: INode) {
    let i = 1;
    const { colorDepth } = options;
    walkTree(node, (item, next, parent) => {
      options.color(`${i}`); // preload colors
      item.p = {
        i,
        ...item.p,
      };
      if (item.v?.length) {
        item.p.k = (parent?.p?.k || '') + getKey(item.v);
      }
      next();
      if (!colorDepth || item.d === colorDepth) i += 1;
    });
  }
  function setOptions(opts) {
    Object.assign(options, opts);
  }
  function setData(data, opts?: any) {
    addKeys(data);
    state.data = data;
    if (opts) setOptions(opts);
    renderData(data);
  }
  function fit() {
    const { width: offsetWidth, height: offsetHeight } = svgNode.getBoundingClientRect();
    const { minX, maxX, minY, maxY } = state;
    const naturalWidth = maxY - minY;
    const naturalHeight = maxX - minX;
    const scale = Math.min(offsetWidth / naturalWidth * options.fitRatio, offsetHeight / naturalHeight * options.fitRatio, 2);
    const initialZoom = d3.zoomIdentity
      .translate((offsetWidth - naturalWidth * scale) / 2 - minY * scale, (offsetHeight - naturalHeight * scale) / 2 - minX * scale)
      .scale(scale);
    svg.transition().duration(options.duration)
      .call(zoom.transform, initialZoom);
  }
  function handleClick(d) {
    const { data } = d;
    data.p = {
      ...data.p,
      f: !data.p?.f,
    };
    renderData(d.data);
  }
  function handleLink(d) {
    d3.event.preventDefault();
    window.open(d.p.href);
  }
  function renderTextNode(t, d: IValue): void {
    if (d.t === 'link') {
      const a = t.append('a')
        .attr('href', d.p.href)
        .attr('title', d.p.title)
        .on('click', handleLink);
      const text = a.selectAll(getChildNodes).data((d: IValue) => d.c);
      text.enter().each(function (d: IValue) {
        const t = d3.select(this);
        renderTextNode(t, d);
      });
    }
    if (d.t === 'text') {
      t.append('tspan')
        .text(d.v)
        .attr('class', (d: IValue) => {
          const style = d.p?.style || {};
          return [
            style.em && 'markmap-em',
            style.strong && 'markmap-strong',
          ].filter(Boolean).join(' ');
        })
        .attr('x', (d: IValue) => d.p?.x + 8)
        .attr('y', (d: IValue) => d.p?.y - 4);
    }
  }
  function renderText(text) {
    const textNode = text.selectAll(getChildNodes)
      .data(d => d.data.v);
    textNode.enter().each(function (d: IValue) {
      const t = d3.select(this);
      renderTextNode(t, d);
    });
    return text;
  }
  function renderData(originData) {
    if (!state.data) return;
    const layout = flextree()
      .children(d => !d.p?.f && d.c)
      .nodeSize(d => {
        const [width, height] = getTextRect(d.data.v, options);
        return [height, width + 16];
      })
      .spacing((a, b) => {
        return a.parent === b.parent ? options.spacingVertical : options.spacingVertical * 2;
      });
    const tree = layout.hierarchy(state.data);
    layout(tree);
    addSpacing(tree, options.spacingHorizontal);
    const descendants = tree.descendants().reverse();
    const links = tree.links();
    const linkShape = d3.linkHorizontal();
    const minX = d3.min<any, number>(descendants, d => d.x - d.xSize / 2);
    const maxX = d3.max<any, number>(descendants, d => d.x + d.xSize / 2);
    const minY = d3.min<any, number>(descendants, d => d.y);
    const maxY = d3.max<any, number>(descendants, d => d.y + d.ySize);
    state.minX = minX;
    state.maxX = maxX;
    state.minY = minY;
    state.maxY = maxY;

    if (options.autoFit) fit();

    const origin = originData ? descendants.find(item => item.data === originData) : tree;
    const x0 = origin.data.x0 ?? origin.x;
    const y0 = origin.data.y0 ?? origin.y;

    // Update the nodes
    const node = g.selectAll('g').data(descendants, d => d.data.p.k);
    const nodeEnter = node.enter().append('g')
      .attr('transform', d => `translate(${y0 + origin.ySize - d.ySize},${x0 + origin.xSize / 2 - d.xSize})`)
      .on('click', handleClick);

    const nodeExit = node.exit().transition().duration(options.duration);
    nodeExit.select('rect').attr('width', 0).attr('x', d => d.ySize);
    nodeExit.select('text').attr('fill-opacity', 0);
    nodeExit.attr('transform', d => `translate(${origin.y + origin.ySize - d.ySize},${origin.x + origin.xSize / 2 - d.xSize})`).remove();

    const nodeMerge = node.merge(nodeEnter);
    nodeMerge.transition()
      .duration(options.duration)
      .attr('transform', d => `translate(${d.y},${d.x - d.xSize / 2})`);

    nodeMerge.selectAll('rect').data(d => [d], d => d.data.p.k)
      .join(
        enter => {
          return enter.append('rect')
            .attr('x', d => d.ySize)
            .attr('y', d => d.xSize - linkWidth(d) / 2)
            .attr('width', 0)
            .attr('height', linkWidth);
        },
        update => update,
        exit => exit.remove(),
      )
      .transition().duration(options.duration)
      .attr('x', -1)
      .attr('width', d => d.ySize + 2)
      .attr('fill', d => options.color(d.data.p.i));

    nodeMerge.selectAll('circle').data(d => d.data.c ? [d] : [], d => d.data.p.k)
      .join(
        enter => {
          return enter.append('circle')
            .attr('stroke-width', '1.5')
            .attr('cx', d => d.ySize)
            .attr('cy', d => d.xSize)
            .attr('r', 0);
        },
        update => update,
        exit => exit.remove(),
      )
      .transition().duration(options.duration)
      .attr('r', 6)
      .attr('stroke', d => options.color(d.data.p.i))
      .attr('fill', d => d.data.p?.f ? options.color(d.data.p.i) : '#fff');

    nodeMerge.selectAll('text').data(d => [d], d => d.data.p.k)
      .join(
        enter => {
          return enter.append('text')
            .attr('x', 8)
            .attr('y', 0)
            .attr('text-anchor', 'start')
            .attr('fill-opacity', 0)
            .call(renderText);
        },
        update => update,
        exit => exit.remove(),
      )
      .transition().duration(options.duration)
      .attr('fill-opacity', 1);

    // Update the links
    g.selectAll('path').data(links, d => d.target.data.p.k)
      .join(
        enter => {
          const source: [number, number] = [
            y0 + origin.ySize,
            x0 + origin.xSize / 2,
          ];
          return enter.insert('path', 'g')
            .attr('d', linkShape({ source, target: source }));
        },
        update => update,
        exit => {
          const source: [number, number] = [
            origin.y + origin.ySize,
            origin.x + origin.xSize / 2,
          ];
          return exit.transition()
            .duration(options.duration)
            .attr('d', linkShape({ source, target: source }))
            .remove();
        },
      )
      .transition()
      .duration(options.duration)
      .attr('stroke', d => options.color(d.target.data.p.i))
      .attr('stroke-width', d => linkWidth(d.target))
      .attr('d', d => {
        const source: [number, number] = [
          d.source.y + d.source.ySize,
          d.source.x + d.source.xSize / 2,
        ];
        const target: [number, number] = [
          d.target.y,
          d.target.x + d.target.xSize / 2,
        ];
        return linkShape({ source, target });
      });

    descendants.forEach(d => {
      d.data.x0 = d.x;
      d.data.y0 = d.y;
    });
  }
}

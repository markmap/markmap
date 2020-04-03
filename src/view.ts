import * as d3 from 'd3';
import { flextree } from 'd3-flextree';
import { INode, IValue } from './types';
import './style.css';

const color = d3.scaleOrdinal(d3.schemeCategory10);

function walkTree(tree, callback: (item, next: () => void) => void): void {
  const walk = (item): void => callback(item, () => {
    item.children?.forEach(walk);
  });
  walk(tree);
}

let canvas: HTMLCanvasElement;
function getTextRect(items: IValue[], font: string): [number, number] {
  // re-use canvas object for better performance
  if (!canvas) canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = font;
  let maxWidth = 0;
  let width = 0;
  let row = 0;
  const walk = (item: IValue): void => {
    if (item.t === 'text') {
      item.p = {
        ...item.p,
      };
      if (!width && row) item.p.newline = true;
      const metrics = context.measureText(item.v);
      width += metrics.width;
      if (maxWidth < width) maxWidth = width;
    } else if (item.t === 'softbreak') {
      width = 0;
      row += 1;
    } else if (item.t === 'link') {
      item.children.forEach(walk);
    }
  };
  items.forEach(walk);
  return [maxWidth, row + 1];
}

function linkWidth(nodeData): number {
  const data: INode = nodeData.data;
  let { d } = data;
  const { v, children } = data;
  if (v.length && children?.length === 1 && children[0].v.length) {
    d += 1;
  }
  return Math.max(6 - 2 * d, 1.5);
}

function addIds(node: INode, d = 0) {
  let id = 1;
  let i = 1;
  walkTree(node, (item, next) => {
    color(`${i}`); // preload colors
    item.p = {
      id,
      i,
      ...item.p,
    };
    id += 1;
    next();
    if (!d || item.d === d) i += 1;
  });
}

function addSpacing(tree, spacing: number): void {
  let depth = 0;
  walkTree(tree, (item, next) => {
    item.y += depth * spacing;
    depth += 1;
    next();
    depth -= 1;
  });
}

export function render(svg, data: INode) {
  svg = svg.datum ? svg : d3.select(svg);
  const classList = (svg.attr('class') || '').split(' ').filter(Boolean);
  if (classList.indexOf('markmap') < 0) {
    classList.push('markmap');
    svg.attr('class', classList.join(' '));
  }
  const svgNode = svg.node();
  const g = svg.append('g');
  addIds(data, 0);
  const state = {
    data,
    duration: 500,
    nodeFont: '300 16px sans-serif',
    lineHeight: 20,
    spacingVertical: 5,
    spacingHorizontal: 80,
    fit: true,
  };
  renderData(state.data);
  state.fit = false;

  function handleClick(d) {
    d.data.fold = !d.data.fold;
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
      const text = a.selectAll('.markmap-text').data((d: IValue) => d.children);
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
            'markmap-text',
            style.em && 'markmap-em',
            style.strong && 'markmap-strong',
          ].filter(Boolean).join(' ');
        })
        .attr('x', (d: IValue) => d.p?.newline ? 8 : null)
        .attr('dy', (d: IValue) => d.p?.newline ? state.lineHeight : null);
    }
  }
  function renderText(text) {
    const textNode = text.selectAll('.markmap-text').data(d => d.data.v);
    textNode.enter().each(function (d: IValue) {
      const t = d3.select(this);
      renderTextNode(t, d);
    });
    return text;
  }
  function renderData(originData) {
    svg.attr('style', `font: ${state.nodeFont}`);
    const layout = flextree()
      .children(d => !d.fold && d.children)
      .nodeSize(d => {
        const [width, rows] = getTextRect(d.data.v, state.nodeFont);
        return [rows * state.lineHeight, width + 16];
      })
      .spacing((a, b) => {
        return a.parent === b.parent ? state.spacingVertical : state.spacingVertical * 2;
      });
    const tree = layout.hierarchy(state.data);
    layout(tree);
    addSpacing(tree, state.spacingHorizontal);
    const descendants = tree.descendants().reverse();
    const links = tree.links();
    const linkShape = d3.linkHorizontal();
    const minX = d3.min<any, number>(descendants, d => d.x);
    const maxX = d3.max<any, number>(descendants, d => d.x);
    const minY = d3.min<any, number>(descendants, d => d.y);
    const maxY = d3.max<any, number>(descendants, d => d.y + d.ySize);
    const naturalWidth = maxY - minY;
    const naturalHeight = maxX - minX;
    const { width: offsetWidth, height: offsetHeight } = svgNode.getBoundingClientRect();

    if (state.fit) {
      g.attr('transform', `translate(${(offsetWidth - naturalWidth) / 2 - minY},${(offsetHeight - naturalHeight) / 2 - minX})`);
    }

    const origin = originData ? descendants.find(item => item.data === originData) : tree;
    const x0 = origin.data.x0 ?? origin.x;
    const y0 = origin.data.y0 ?? origin.y;

    // Update the nodes
    const node = g.selectAll('g.markmap-node').data(descendants, d => d.data.p.id);
    const nodeEnter = node.enter().append('g')
      .attr('class', 'markmap-node')
      .attr("transform", d => `translate(${y0 + origin.ySize - d.ySize},${x0 + origin.xSize / 2})`)
      .on('click', handleClick);

    const nodeExit = node.exit().transition().duration(state.duration);
    nodeExit.select('rect').attr('width', 0).attr('x', d => d.ySize);
    nodeExit.select('text').attr('fill-opacity', 0);
    nodeExit.attr("transform", d => `translate(${origin.y + origin.ySize - d.ySize},${origin.x + origin.xSize / 2})`).remove();

    const nodeMerge = node.merge(nodeEnter);
    nodeMerge.transition()
      .duration(state.duration)
      .attr("transform", d => `translate(${d.y},${d.x + d.xSize / 2})`);

    nodeMerge.selectAll('rect').data(d => [d])
      .join(
        enter => {
          return enter.append('rect')
            .attr("y", -1)
            .attr('x', d => d.ySize)
            .attr('width', 0)
            .attr('height', linkWidth)
            .attr('fill', d => color(d.data.p.i));
        },
        update => update,
        exit => exit.remove(),
      )
      .transition().duration(state.duration)
      .attr('x', -1)
      .attr('width', d => d.ySize + 2);

    nodeMerge.selectAll('circle').data(d => d.data.children ? [d] : [])
      .join(
        enter => {
          return enter.append('circle')
            .attr('cx', d => d.ySize)
            .attr('stroke-width', '1.5')
            .attr('stroke', d => color(d.data.p.i))
            .attr("r", 0);
        },
        update => update,
        exit => exit.remove(),
      )
      .transition().duration(state.duration)
      .attr('r', 6)
      .attr("fill", d => d.data.fold ? color(d.data.p.i) : '#fff');

    nodeMerge.selectAll('text').data(d => [d])
      .join(
        enter => {
          return enter.append('text')
            .attr("x", 8)
            .attr('y', d => state.lineHeight - 4 - d.xSize)
            .attr("text-anchor", "start")
            .attr('fill-opacity', 0)
            .call(renderText);
        },
        update => update,
        exit => exit.remove(),
      )
      .transition().duration(state.duration)
      .attr('fill-opacity', 1);

    // Update the links
    g.selectAll('path.markmap-link').data(links, d => d.target.data.p.id)
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
            .duration(state.duration)
            .attr('d', linkShape({ source, target: source }))
            .remove();
        },
      )
      .transition()
      .duration(state.duration)
      .attr("class", "markmap-link")
      .attr('stroke', d => color(d.target.data.p.i))
      .attr('stroke-width', d => linkWidth(d.target))
      .attr("d", d => {
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

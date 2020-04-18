import * as d3 from 'd3';
import { flextree } from 'd3-flextree';
import { INode, IMarkmapOptions } from './types';

const uniqId = Math.random().toString(36).slice(2, 8);
let globalIndex = 0;
function getId() {
  globalIndex += 1;
  return `mm-${uniqId}-${globalIndex}`;
}

function walkTree<T>(tree: T, callback: (item: T, next: () => void, parent?: T) => void, key = 'c'): void {
  const walk = (item: T, parent?: T): void => callback(item, () => {
    item[key]?.forEach((child: T) => {
      walk(child, item);
    });
  }, parent);
  walk(tree);
}

function linkWidth(nodeData): number {
  const data: INode = nodeData.data;
  return Math.max(6 - 2 * data.d, 1.5);
}

function adjustSpacing(tree, spacing: number): void {
  walkTree(tree, (d, next) => {
    d.ySizeInner = d.ySize - spacing;
    d.y += spacing;
    next();
  }, 'children');
}

function getChildNodes() {
  return this.childNodes;
}

export function markmap(svg, data, opts) {
  svg = svg.datum ? svg : d3.select(svg);
  const styleNode = svg.append('style');
  const g = svg.append('g');
  const zoom = d3.zoom().on('zoom', handleZoom);
  const svgNode = svg.node();
  const options: IMarkmapOptions = {
    duration: 500,
    nodeFont: '300 16px/20px sans-serif',
    spacingVertical: 5,
    spacingHorizontal: 80,
    autoFit: false,
    fitRatio: 0.95,
    color: d3.scaleOrdinal(d3.schemeCategory10),
    colorDepth: 0,
    paddingX: 8,
    ...opts,
  };
  const state: any = {
    id: options.id || getId(),
  };
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

  function getStyleContent() {
    const { style } = options;
    const styleText = style ? style(state.id) : `\
.${state.id} a { color: #0097e6; }
.${state.id} a:hover { color: #00a8ff; }
.${state.id} path { fill: none; }
.${state.id} div { font: ${options.nodeFont}; white-space: nowrap; }
.${state.id} code { padding: .2em .4em; font-size: calc(1em - 2px); color: #555; background-color: #f0f0f0; border-radius: 2px; }
.${state.id} em { font-style: italic; }
.${state.id} strong { font-weight: 500; }
.${state.id} g > g { cursor: pointer; }
`;
    return styleText;
  }
  function updateStyle() {
    const classList = (svg.attr('class') || '').split(' ').filter(Boolean);
    if (classList.indexOf(state.id) < 0) {
      classList.push(state.id);
      svg.attr('class', classList.join(' '));
    }
    styleNode.text(getStyleContent());
  }
  function handleZoom() {
    const { transform } = d3.event;
    g.attr('transform', transform);
  }
  function addKeys(node: INode) {
    let i = 0;
    let c = 0;
    const { colorDepth } = options;
    walkTree(node, (item, next, parent) => {
      i += 1;
      options.color(`${c}`); // preload colors
      item.p = {
        // unique ID
        i,
        // color key
        c,
        ...item.p,
        // TODO keep keys for unchanged objects
        // unique key, should be based on content
        k: `${parent?.p?.i || ''}.${i}:${item.v}`,
      };
      next();
      if (!colorDepth || item.d === colorDepth) c += 1;
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
  function renderData(originData) {
    if (!state.data) return;
    const container = document.createElement('div');
    const containerClass = `${state.id}-container`;
    container.classList.add(state.id, containerClass);
    const style = document.createElement('style');
    style.textContent = `
${getStyleContent()}
.${containerClass} {
  position: absolute;
  width: 0;
  height: 0;
  top: -100px;
  left: -100px;
  overflow: hidden;
  font: ${options.nodeFont};
}
.${containerClass} > div {
  display: inline-block;
}
`;
    container.append(style);
    document.body.append(container);
    const { spacingHorizontal } = options;
    const layout = flextree()
      .children(d => !d.p?.f && d.c)
      .nodeSize(d => {
        if (!d.outerSize) {
          const el = document.createElement('div');
          el.innerHTML = d.data.v;
          container.append(el);
          const rect = el.getBoundingClientRect();
          d.outerSize = [Math.ceil(rect.width), Math.max(Math.ceil(rect.height), 16)];
        }
        const [width, height] = d.outerSize;
        return [height, width + (width ? options.paddingX * 2 : 0) + spacingHorizontal];
      })
      .spacing((a, b) => {
        return a.parent === b.parent ? options.spacingVertical : options.spacingVertical * 2;
      });
    const tree = layout.hierarchy(state.data);
    layout(tree);
    container.remove();
    adjustSpacing(tree, spacingHorizontal);
    const descendants = tree.descendants().reverse();
    const links = tree.links();
    const linkShape = d3.linkHorizontal();
    const minX = d3.min<any, number>(descendants, d => d.x - d.xSize / 2);
    const maxX = d3.max<any, number>(descendants, d => d.x + d.xSize / 2);
    const minY = d3.min<any, number>(descendants, d => d.y);
    const maxY = d3.max<any, number>(descendants, d => d.y + d.ySizeInner);
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
      .attr('transform', d => `translate(${y0 + origin.ySizeInner - d.ySizeInner},${x0 + origin.xSize / 2 - d.xSize})`)
      .on('click', handleClick);

    const nodeExit = node.exit().transition().duration(options.duration);
    nodeExit.select('rect').attr('width', 0).attr('x', d => d.ySizeInner);
    nodeExit.select('foreignObject').style('opacity', 0);
    nodeExit.attr('transform', d => `translate(${origin.y + origin.ySizeInner - d.ySizeInner},${origin.x + origin.xSize / 2 - d.xSize})`).remove();

    const nodeMerge = node.merge(nodeEnter);
    nodeMerge.transition()
      .duration(options.duration)
      .attr('transform', d => `translate(${d.y},${d.x - d.xSize / 2})`);

    nodeMerge.selectAll('rect').data(d => [d], d => d.data.p.k)
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
      )
      .transition().duration(options.duration)
      .attr('x', -1)
      .attr('width', d => d.ySizeInner + 2)
      .attr('fill', d => options.color(d.data.p.c));

    nodeMerge.selectAll('circle').data(d => d.data.c ? [d] : [], d => d.data.p.k)
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
      )
      .transition().duration(options.duration)
      .attr('r', 6)
      .attr('stroke', d => options.color(d.data.p.c))
      .attr('fill', d => d.data.p?.f ? options.color(d.data.p.c) : '#fff');

    nodeMerge.selectAll('foreignObject').data(d => [d], d => d.data.p.k)
      .join(
        enter => {
          const fo = enter.append('foreignObject')
            .attr('x', options.paddingX)
            .attr('y', 0)
            .style('opacity', 0)
            .attr('height', d => d.xSize);
          fo.append('xhtml:div')
            .attr('xmlns', 'http://www.w3.org/1999/xhtml')
            .html(d => d.data.v);
          return fo;
        },
        update => update,
        exit => exit.remove(),
      )
      .attr('width', d => Math.max(0, d.ySizeInner - options.paddingX * 2))
      .transition().duration(options.duration)
      .style('opacity', 1);

    // Update the links
    g.selectAll('path').data(links, d => d.target.data.p.k)
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
          return exit.transition()
            .duration(options.duration)
            .attr('d', linkShape({ source, target: source }))
            .remove();
        },
      )
      .transition()
      .duration(options.duration)
      .attr('stroke', d => options.color(d.target.data.p.c))
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
      d.data.x0 = d.x;
      d.data.y0 = d.y;
    });
  }
}

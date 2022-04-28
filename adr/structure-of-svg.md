# Structure of SVG

Markmap will generate an SVG with the following structure:

```tsx
(
  <svg class="markmap">
    <style>{globalCSS + '\n' + customCSS}</style>
    <g>
      {links.map((link) => (
        <path
          class="markmap-link"
          stroke={link.targetNode.color}
          transform={link.transform}
          data-depth={node.depth}
          data-path={node.path}
        />
      ))}
      {nodes.map((node) => (
        <g
          class="markmap-node"
          transform={node.transform}
          data-depth={node.depth}
          data-path={node.path}>
          <line stroke={node.color} />
          <circle stroke={node.color} />
          <foreignObject class="markmap-foreign">
            <div xmlns="http://www.w3.org/1999/xhtml">
              {node.htmlContent}
            </div>
          </foreignObject>
        </g>
      ))}
    </g>
  </svg>
)
```

Each `<path>` is a link between a node and its parent. The `<path>` element cannot be grouped with the rest part of the node because when nested the `<path>` element is not smooth and looks aliased.

Each node is grouped in a `<g>` element, except for the link to its parent. Inside this `<g>` element, we have a line below the content (`<line>`), the circle to connect to its children (`<circle>`), and the HTML content wrapped in a `<foreignObject>`.

Note that the `depth` and `path` of each node is set as data attributes of their links (`<path>`) and node groups (`<g>`), so that we can easily select the desired nodes and override styles.

## Overriding Styles

```css
/* Use a solid color */
.markmap-link,
.markmap-node > line,
.markmap-node > circle {
  stroke: #333;
}

/* Highlight level 2 */
.markmap-link[data-depth="2"],
.markmap-node[data-depth="2"] > line,
.markmap-node[data-depth="2"] > circle {
  stroke: red;
}
```

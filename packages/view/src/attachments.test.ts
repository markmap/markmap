// @vitest-environment happy-dom
import type { Primitive } from '@markmap/core';
import { parse } from '@markmap/parse';
import { approximateMeasurer } from '@markmap/render';
import { afterEach, describe, expect, it } from 'vitest';
import { Markmap } from '.';
import { attachmentsToHtml } from './attachments-html';

const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvg(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.getBoundingClientRect = () => ({ x: 0, y: 0, width: 800, height: 600 }) as DOMRect;
  document.body.append(svg);
  return svg;
}

const dot = (mm: Markmap) => mm.element.querySelector<SVGElement>('[data-action="attachments"]')!;

/** Layout point at the center of the first `hit` primitive (only translated groups). */
function hitCenter(list: Primitive[], dx = 0, dy = 0): [number, number] | undefined {
  for (const p of list) {
    if (p.kind === 'hit')
      return [dx + p.rect.x + p.rect.width / 2, dy + p.rect.y + p.rect.height / 2];
    if (p.kind === 'group') {
      const found = hitCenter(
        p.children,
        dx + (p.transform?.[4] ?? 0),
        dy + (p.transform?.[5] ?? 0),
      );
      if (found) return found;
    }
  }
  return undefined;
}

/** Click where the attachment dot is drawn, as a user would. */
function clickDot(mm: Markmap) {
  const [clientX, clientY] = mm.transform.apply(hitCenter(mm.state!.primitives)!);
  mm.element.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX, clientY }));
}
const notesOf = (md: string) => parse(md).root.children[0].attachments;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('attachmentsToHtml', () => {
  it('renders blocks, including GFM and highlights', async () => {
    const html = await attachmentsToHtml(
      notesOf(
        '- a\n\n  Some **text** and ==mark==.\n\n  ```js\n  const x = 1;\n  ```\n\n  | h |\n  | - |\n  | c |',
      ),
    );
    expect(html).toContain('<p>Some <strong>text</strong> and <mark>mark</mark>.</p>');
    expect(html).toContain(
      '<pre><code class="language-js hljs"><span class="hljs-keyword">const</span> x = <span class="hljs-number">1</span>;\n</code></pre>',
    );
    expect(html).toContain('<td>c</td>');
  });

  it('opens links in a new tab and drops unsafe URLs', async () => {
    const html = await attachmentsToHtml(
      notesOf('- a\n\n  [ok](https://x.y) [bad](javascript:alert(1))'),
    );
    expect(html).toContain(
      '<a href="https://x.y" target="_blank" rel="noopener noreferrer">ok</a>',
    );
    expect(html).not.toContain('javascript:');
  });

  it('never contains raw HTML; sized <img> tags come through clean', async () => {
    const html = await attachmentsToHtml(
      notesOf(
        '- a\n\n  x <img src=x.png width=40 onerror=alert(1)> <b>y</b> <img src="javascript:alert(1)">',
      ),
    );
    expect(html).toContain('<img src="x.png" alt="" width="40">');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('<b>');
    expect(html).not.toContain('javascript:');
  });
});

describe('code highlighting', () => {
  it('leaves unknown languages, plain blocks and opted-out popovers alone', async () => {
    const notes = notesOf('- a\n\n  ```nosuchlang\n  if\n  ```\n\n  ```\n  if\n  ```');
    const html = await attachmentsToHtml(notes);
    expect(html).not.toContain('hljs');
    const off = await attachmentsToHtml(notesOf('- a\n\n  ```js\n  if\n  ```'), {
      highlight: false,
    });
    expect(off).toBe('<pre><code class="language-js">if\n</code></pre>');
  });

  it('only adds spans: markup in code stays text', async () => {
    const html = await attachmentsToHtml(
      notesOf('- a\n\n  ```html\n  <img src=x onerror=alert(1)>\n  ```'),
    );
    expect(html).toContain('&#x3C;');
    expect(html).not.toContain('<img');
  });

  it('runs plugin popover hooks after sanitizing', async () => {
    const html = await attachmentsToHtml(notesOf('- a\n\n  text'), {
      plugins: [
        {
          name: 'raw',
          popover(tree) {
            tree.children.push({ type: 'raw', value: '<svg data-ok="1"></svg>' });
          },
        },
      ],
    });
    expect(html).toBe('<p>text</p><svg data-ok="1"></svg>');
  });
});

describe('attachment popover', () => {
  const md = '# R\n\n- with notes\n\n  A note with [a link](https://x.y).\n\n- plain';
  const create = () =>
    Markmap.create(createSvg(), parse(md).root, { measurer: approximateMeasurer });

  it('draws one hit area per node with attachments', () => {
    const mm = create();
    expect(mm.element.querySelectorAll('[data-action="attachments"]')).toHaveLength(1);
    expect(dot(mm).closest('[data-node-id]')?.getAttribute('data-node-id')).toBe(
      mm.state!.layout.nodes[1].node.id,
    );
  });

  it('opens on click and closes on a second click', async () => {
    const mm = create();
    clickDot(mm);
    await expect.poll(() => document.querySelector('.markmap-popover')).not.toBeNull();
    const popover = document.querySelector<HTMLElement>('.markmap-popover')!;
    expect(popover.innerHTML).toContain('<a href="https://x.y"');
    expect(popover.getAttribute('role')).toBe('dialog');
    expect(popover.style.getPropertyValue('--mm-link-color')).toBe('#0097e6');
    expect(mm.openAttachmentsId).toBe(mm.state!.layout.nodes[1].node.id);
    clickDot(mm);
    expect(document.querySelector('.markmap-popover')).toBeNull();
  });

  it('closes on Escape, outside clicks and when the node goes away', async () => {
    const mm = create();
    const id = mm.state!.layout.nodes[1].node.id;
    await mm.openAttachments(id);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(mm.openAttachmentsId).toBeUndefined();

    await mm.openAttachments(id);
    document
      .querySelector('.markmap-popover')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(mm.openAttachmentsId).toBe(id);
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(mm.openAttachmentsId).toBeUndefined();

    await mm.openAttachments(id);
    mm.setData(parse('# R\n\n- plain').root);
    expect(document.querySelector('.markmap-popover')).toBeNull();
  });

  it('ignores a popover that finished loading after it was closed', async () => {
    const mm = create();
    const opening = mm.openAttachments(mm.state!.layout.nodes[1].node.id);
    mm.closeAttachments();
    await opening;
    expect(document.querySelector('.markmap-popover')).toBeNull();
  });

  it('does nothing for nodes without attachments', async () => {
    const mm = create();
    await mm.openAttachments(mm.state!.layout.nodes[2].node.id);
    expect(mm.openAttachmentsId).toBeUndefined();
  });
});

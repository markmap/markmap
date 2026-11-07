import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type MarkmapNode, toPlainText, walkTree } from '@markmap/core';
import { describe, expect, it } from 'vitest';
import { parse } from '.';

const fixtures = join(import.meta.dirname, '../test/fixtures');

/** A readable outline: one line per node, notes listed with their position. */
function outline(root: MarkmapNode): string {
  const lines: string[] = [];
  walkTree(root, (node, _parent, depth) => {
    const indent = '  '.repeat(depth);
    const data = Object.keys(node.data).length ? ` ${JSON.stringify(node.data)}` : '';
    lines.push(`${indent}- [${node.type}] ${toPlainText(node.content)}${data}`);
    for (const { block, after } of node.notes) {
      lines.push(`${indent}    @${after} ${block.type}`);
    }
  });
  return `${lines.join('\n')}\n`;
}

function idsByLabel(root: MarkmapNode): Map<string, string> {
  const map = new Map<string, string>();
  walkTree(root, (node) => void map.set(toPlainText(node.content), node.id));
  return map;
}

describe('fixtures', () => {
  const files = readdirSync(fixtures).filter((name) => name.endsWith('.md'));
  it.each(files)('%s', async (file) => {
    const { root } = parse(readFileSync(join(fixtures, file), 'utf8'));
    await expect(outline(root)).toMatchFileSnapshot(`../test/snapshots/${file}.txt`);
  });
});

describe('parse', () => {
  it('promotes a single H1 to the root', () => {
    const { root } = parse('Before.\n\n# Title\n\nAfter.\n\n## Child');
    expect(root.id).toBe('root');
    expect(toPlainText(root.content)).toBe('Title');
    expect(root.notes.map((a) => [toPlainText([a.block as never]), a.after])).toEqual([
      ['Before.', 0],
      ['After.', 0],
    ]);
  });

  it('synthesizes an empty root when there is no single H1', () => {
    const { root } = parse('- a\n- b');
    expect(root.type).toBe('root');
    expect(root.content).toEqual([]);
    expect(root.children).toHaveLength(2);
  });

  it('prefers the frontmatter title over a single H1', () => {
    const { root, frontmatter } = parse('---\ntitle: T\nfoo: 1\n---\n\n# H1');
    expect(frontmatter).toEqual({ title: 'T', foo: 1 });
    expect(toPlainText(root.content)).toBe('T');
    expect(toPlainText(root.children[0].content)).toBe('H1');
  });

  it('ignores invalid frontmatter', () => {
    expect(parse('---\n: [\n---\n\n- a').frontmatter).toEqual({});
  });

  it('keeps inline structure and drops mdast positions', () => {
    const { root } = parse('- **bold** `code`');
    expect(root.children[0].content).toEqual([
      { type: 'strong', children: [{ type: 'text', value: 'bold' }] },
      { type: 'text', value: ' ' },
      { type: 'inlineCode', value: 'code' },
    ]);
  });

  it('records source ranges', () => {
    const md = '# A\n\n- item\n';
    const { root } = parse(md);
    const item = root.children[0];
    expect(md.slice(root.position!.start, root.position!.end)).toBe('# A');
    expect(md.slice(item.position!.start, item.position!.end)).toBe('- item');
  });

  it('keeps ids stable when unrelated content changes', () => {
    const before = parse('# T\n\n## A\n\n- x\n\n## B\n\n- y').root;
    const after = parse('# Renamed\n\n## New\n\n## A\n\nNote.\n\n- x\n\n## B\n\n- y').root;
    const [a, b] = [idsByLabel(before), idsByLabel(after)];
    for (const label of ['A', 'x', 'B', 'y']) expect(b.get(label)).toBe(a.get(label));
  });

  it('gives duplicate siblings and their subtrees distinct ids', () => {
    const { root } = parse(readFileSync(join(fixtures, 'duplicates.md'), 'utf8'));
    const ids: string[] = [];
    walkTree(root, (node) => void ids.push(node.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('serializes to JSON and back unchanged', () => {
    const { root } = parse(readFileSync(join(fixtures, 'notes.md'), 'utf8'));
    expect(JSON.parse(JSON.stringify(root))).toEqual(root);
  });

  it('accepts extra unified plugins', () => {
    const { root } = parse('- a', {
      plugins: [
        () => (tree: { children: { type: string }[] }) => {
          tree.children.push({ type: 'thematicBreak' });
        },
      ],
    });
    expect(root.notes[0].block.type).toBe('thematicBreak');
  });
});

/** Throw `error` from the first parse only, which is the one with GFM. */
function failOnce(error: Error) {
  let failed = false;
  return () => () => {
    if (failed) return;
    failed = true;
    throw error;
  };
}

const alwaysFail = () => () => {
  throw new SyntaxError('always');
};

describe('when GFM is not supported', () => {
  it('falls back to parsing without GFM on a SyntaxError', () => {
    const plugin = failOnce(new SyntaxError('invalid group specifier name'));
    const { root, gfm } = parse('# ~~a~~ **b**', { plugins: [plugin] });
    expect(toPlainText(root.content)).toBe('~~a~~ b');
    expect(gfm).toBe(false);
  });

  it('reports GFM as applied otherwise', () => {
    expect(parse('# a').gfm).toBe(true);
  });

  it('rethrows other errors', () => {
    const plugin = failOnce(new TypeError('a bug'));
    expect(() => parse('# a', { plugins: [plugin] })).toThrow('a bug');
  });

  it('rethrows a SyntaxError that does not come from GFM', () => {
    expect(() => parse('# a', { plugins: [alwaysFail] })).toThrow('always');
  });
});

describe('markmap options and directives', () => {
  it('leaves markmap options raw for the theme-aware resolver', () => {
    const { frontmatter } = parse('---\nmarkmap:\n  wrapWidth: 200\n  color: "#f00"\n---\n\n- a');
    expect(frontmatter.markmap).toEqual({ wrapWidth: 200, color: '#f00' });
  });

  it('applies fold directives from label comments', () => {
    const { root } = parse(
      '# Root\n\n## A <!-- markmap: fold -->\n\n- a1 <!--markmap:foldAll-->\n  - a2\n- b <!-- other -->',
    );
    const [a] = root.children;
    expect(a.data).toEqual({ depth: 2, fold: true });
    expect(a.content).toEqual([{ type: 'text', value: 'A' }]);
    expect(a.children[0].data).toEqual({ foldAll: true });
    expect(a.children[1].content).toEqual([{ type: 'text', value: 'b' }]);
  });

  it('drops raw HTML from labels but keeps the text inside', () => {
    const { root } = parse('- a <b>bold</b> c');
    expect(toPlainText(root.children[0].content)).toBe('a bold c');
    expect(JSON.stringify(root)).not.toContain('"html"');
  });
});

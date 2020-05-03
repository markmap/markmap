import { Remarkable } from 'remarkable';
import { INode } from './types';
import { wrapStyle, escapeHtml, wrapHtml, htmlOpen, htmlClose } from './util';

const md = new Remarkable();
md.block.ruler.enable([
  'deflist',
]);

function extractInline(token): string {
  const html = [];
  let style = {};
  for (const child of token.children) {
    if (child.type === 'text') {
      html.push(wrapStyle(escapeHtml(child.content), style));
    } else if (child.type === 'code') {
      html.push(wrapHtml('code', wrapStyle(escapeHtml(child.content), style)));
    } else if (child.type === 'softbreak') {
      html.push('<br/>');
    } else if (child.type.endsWith('_open')) {
      const type = child.type.slice(0, -5);
      if (type === 'link') {
        html.push(htmlOpen('a', {
          href: child.href,
          title: child.title,
          target: '_blank',
          rel: 'noopener noreferrer',
        }));
      } else {
        style = {
          ...style,
          [type]: true,
        };
      }
    } else if (child.type.endsWith('_close')) {
      const type = child.type.slice(0, -6);
      if (type === 'link') {
        html.push(htmlClose('a'));
      } else {
        style = {
          ...style,
          [type]: false,
        };
      }
    }
  }
  return html.join('');
}

function cleanNode(node: INode, depth = 0): void {
  if (node.t === 'heading') {
    // drop all paragraphs
    node.c = node.c.filter(item => item.t !== 'paragraph');
  } else if (node.t === 'list_item') {
    // keep first paragraph as content of list_item, drop others
    node.c = node.c.filter(item => {
      if (['paragraph', 'fence'].includes(item.t)) {
        if (!node.v) node.v = item.v;
        return false;
      }
      return true;
    });
    if (node.p?.index != null) {
      node.v = `${node.p.index}. ${node.v}`;
    }
  } else if (node.t === 'ordered_list') {
    let index = node.p?.start ?? 1;
    node.c.forEach(item => {
      if (item.t === 'list_item') {
        item.p = {
          ...item.p,
          index: index,
        };
        index += 1;
      }
    });
  }
  if (node.c.length === 0) {
    delete node.c;
  } else {
    if (node.c.length === 1 && !node.c[0].v) {
      node.c = node.c[0].c;
    }
    node.c.forEach(child => cleanNode(child, depth + 1));
  }
  node.d = depth;
  delete node.p;
}

export function buildTree(tokens): INode {
  // TODO deal with <dl><dt>
  const root: INode = {
    t: 'root',
    d: 0,
    v: '',
    c: [],
  };
  const stack = [root];
  let depth = 0;
  for (const token of tokens) {
    let current = stack[stack.length - 1];
    if (token.type.endsWith('_open')) {
      const type = token.type.slice(0, -5);
      const payload: any = {};
      if (type === 'heading') {
        depth = token.hLevel;
        while (current?.d >= depth) {
          stack.pop();
          current = stack[stack.length - 1];
        }
      } else {
        depth = Math.max(depth, current?.d || 0) + 1;
        if (type === 'ordered_list') {
          payload.start = token.order;
        }
      }
      const item: INode = {
        t: type,
        d: depth,
        p: payload,
        v: '',
        c: [],
      };
      current.c.push(item);
      stack.push(item);
    } else if (!current) {
      continue
    } else if (token.type === `${current.t}_close`) {
      if (current.t === 'heading') {
        depth = current.d;
      } else {
        stack.pop();
        depth = 0;
      }
    } else if (token.type === 'inline') {
      current.v = `${current.v || ''}${extractInline(token)}`;
    } else if (token.type === 'fence') {
      current.c.push({
        t: token.type,
        d: depth + 1,
        v: `<pre><code class="language-${token.params}">${escapeHtml(token.content)}</code></pre>`,
        c: [],
      });
    } else {
      // ignore other nodes
    }
  }
  return root;
}

export function transform(content: string): INode {
  const tokens = md.parse(content || '', {});
  let root = buildTree(tokens);
  cleanNode(root);
  if (root.c?.length === 1) root = root.c[0];
  return root;
}

import { Remarkable } from 'remarkable';
import { INode, IValue } from './types';

const md = new Remarkable();
md.block.ruler.enable([
  'deflist',
]);

function shallowEqual(a, b): boolean {
  a = a || {};
  b = b || {};
  return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(k => a[k] === b[k]);
}

function extractInline(token): IValue[] {
  const root: IValue = {
    t: 'inline',
    children: [],
  };
  const stack = [root];
  let style = {};
  for (const child of token.children) {
    const current = stack[stack.length - 1];
    if (child.type === 'text') {
      current.children.push({
        t: 'text',
        v: child.content,
        p: { style },
      });
    } else if (child.type === 'softbreak') {
      current.children.push({
        t: 'softbreak',
      });
    } else if (child.type.endsWith('_open')) {
      const type = child.type.slice(0, -5);
      if (type === 'link') {
        const item = {
          t: 'link',
          children: [],
          p: {
            href: child.href,
            title: child.title,
          },
        };
        current.children.push(item);
        stack.push(item);
      } else {
        style = {
          ...style,
          [type]: true,
        };
      }
    } else if (child.type.endsWith('_close')) {
      const type = child.type.slice(0, -6);
      if (type === 'link') {
        stack.pop();
      } else {
        style = {
          ...style,
          [type]: false,
        };
      }
    }
  }
  return root.children;
}

function cleanNode(node: INode, depth = 0): void {
  if (node.t === 'heading') {
    // drop all paragraphs
    node.children = node.children.filter(item => item.t !== 'paragraph');
  } else if (node.t === 'list_item') {
    // keep first paragraph as content of list_item, drop others
    node.children = node.children.filter(item => {
      if (item.t === 'paragraph') {
        if (!node.v.length) node.v.push(...item.v);
        return false;
      }
      return true;
    });
    if (node.p?.index != null) {
      node.v.unshift({
        t: 'text',
        v: `${node.p.index}. `,
      });
    }
  } else if (node.t === 'ordered_list') {
    let index = node.p?.start ?? 1;
    node.children.forEach(item => {
      if (item.t === 'list_item') {
        item.p = {
          ...item.p,
          index: index,
        };
        index += 1;
      }
    });
  }
  if (node.children.length === 0) {
    delete node.children;
  } else {
    if (node.children.length === 1 && !node.children[0].v.length) {
      node.children = node.children[0].children;
    }
    node.children.forEach(child => cleanNode(child, depth + 1));
  }
  let last: IValue;
  const content = [];
  for (const item of node.v) {
    if (last?.t === 'text' && item.t === 'text' && shallowEqual(last.p?.style, item.p?.style)) {
      last.v += item.v;
    } else {
      content.push(item);
    }
    last = item;
  }
  node.v = content;
  node.d = depth;
  delete node.p;
}

export function buildTree(tokens): INode {
  // TODO deal with <dl><dt>
  const root: INode = {
    t: 'root',
    d: 0,
    v: [],
    children: [],
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
        v: [],
        p: payload,
        children: [],
      };
      current.children.push(item);
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
    } else {
      current.v.push(...extractInline(token));
    }
  }
  return root;
}

export function transform(content: string): INode {
  const tokens = md.parse(content || '', {});
  let root = buildTree(tokens);
  cleanNode(root);
  if (root.children.length === 1) root = root.children[0];
  return root;
}

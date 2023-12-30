import { Element, load } from 'cheerio';
import { IPureNode, walkTree } from 'markmap-common';

export enum Levels {
  None,
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  Block,
  List,
  ListItem,
}

export interface IHtmlNode {
  id: number;
  tag: string;
  html: string;
  level: Levels;
  childrenLevel: Levels;
  children?: IHtmlNode[];
  parent: number;
}

export interface IHtmlParserOptions {
  selector: string;
  /** If matches, the whole content will be preserved and no any other nodes will be selected. */
  selectorPreserveContent: string;
  /** If matches, the current tag will be preserved along with its content. */
  selectorPreserveTag: string;
}

const SELECTOR_HEADING = /^h[1-6]$/;
const SELECTOR_LIST = /^[uo]l$/;
const SELECTOR_LIST_ITEM = /^li$/;

export const defaultOptions: IHtmlParserOptions = {
  selector: 'h1,h2,h3,h4,h5,h6,ul,ol,li,table,pre,p>img:first-child:last-child',
  selectorPreserveContent: 'table,pre',
  selectorPreserveTag: 'table,pre,img',
};

function getLevel(tagName: string) {
  if (SELECTOR_HEADING.test(tagName)) return +tagName[1] as Levels;
  if (SELECTOR_LIST.test(tagName)) return Levels.List;
  if (SELECTOR_LIST_ITEM.test(tagName)) return Levels.ListItem;
  return Levels.Block;
}

export function parseHtml(html: string, opts?: Partial<IHtmlParserOptions>) {
  const options = {
    ...defaultOptions,
    ...opts,
  };
  const $ = load(html);
  let id = 0;
  const elMap = {
    [id]: $('<div>'),
  };
  const root: IHtmlNode = {
    id,
    tag: '',
    html: '',
    level: Levels.None,
    childrenLevel: Levels.None,
    children: [],
    parent: 0,
  };
  const nodeMap = {
    [id]: root,
  };
  let cur = root;

  $<Element, string>(options.selector).each((_, el) => {
    const node: IHtmlNode = {
      id: ++id,
      tag: el.tagName,
      html: '',
      level: getLevel(el.tagName),
      childrenLevel: Levels.None,
      children: $(el).is(options.selectorPreserveContent) ? undefined : [],
      parent: 0,
    };
    elMap[node.id] = $(el);
    nodeMap[node.id] = node;
    if (node.level <= Levels.H6) {
      while (cur !== root && (cur.level > Levels.H6 || cur.tag >= node.tag)) {
        cur = nodeMap[cur.parent];
      }
    } else {
      while (
        cur !== root &&
        cur.level > Levels.H6 &&
        !elMap[cur.id].find(el).length
      ) {
        cur = nodeMap[cur.parent];
      }
    }
    // Ignore if `children` is not allowed for `cur`
    if (cur.children) {
      node.parent = cur.id;
      const level = getLevel(node.tag);
      if (!cur.childrenLevel || cur.childrenLevel > level) {
        cur.childrenLevel = level;
        cur.children = [];
      }
      if (cur.childrenLevel === level) {
        cur.children.push(node);
      }
      cur = node;
    }
  });

  walkTree(root, (node, next) => {
    next();
    const $el = elMap[node.id];
    $el.remove();
    node.html = (
      ($el.is(options.selectorPreserveTag) ? $.html($el) : $el.html()) || ''
    ).trimEnd();
  });
  return root;
}

export function buildTree(html: string, opts?: Partial<IHtmlParserOptions>) {
  const htmlRoot = parseHtml(html, opts);
  return walkTree<IHtmlNode, IPureNode>(htmlRoot, (node, next) => ({
    content: node.html,
    children: next() || [],
  }));
}

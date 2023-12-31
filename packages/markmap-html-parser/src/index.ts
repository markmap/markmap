import { Cheerio, Element, load } from 'cheerio';
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
  parent: number;
  childrenLevel: Levels;
  children?: IHtmlNode[];
  comments?: string[];
}

export interface IHtmlParserOptions {
  /** Matches nodes to be displayed on markmap. */
  selector: string;
  /** Matches wrapper elements that should be ignored. */
  selectorWrapper: string;
  /** Matches elements that can be nested, such as `li`. */
  selectorNesting: string;
  /** Matches elements whose tag name should be preserved, such as `<pre>`, `<img>`. */
  selectorPreserveTag: string;
}

const MARKMAP_COMMENT_PREFIX = 'markmap: ';
const SELECTOR_HEADING = /^h[1-6]$/;
const SELECTOR_LIST = /^[uo]l$/;
const SELECTOR_LIST_ITEM = /^li$/;

export const defaultOptions: IHtmlParserOptions = {
  selector: 'h1,h2,h3,h4,h5,h6,ul,ol,li,table,pre,p>img:first-child:last-child',
  selectorWrapper: 'div,p',
  selectorNesting: 'ul,ol,li',
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
  const $root = $('body');
  let id = 0;
  const rootNode: IHtmlNode = {
    id,
    tag: '',
    html: '',
    level: Levels.None,
    parent: 0,
    childrenLevel: Levels.None,
    children: [],
  };
  const elMap: Record<number, Cheerio<Element>> = {
    [id]: $<Element, string>('<div>'),
  };

  const headingStack: IHtmlNode[] = [];
  let skippingHeading = Levels.None;
  checkNode($root);

  walkTree(rootNode, (node, next) => {
    next();
    const $el = elMap[node.id];
    // Extract magic comments
    $el.contents().each((_, child) => {
      if (child.type === 'comment') {
        const data = child.data.trim();
        if (data.startsWith(MARKMAP_COMMENT_PREFIX)) {
          node.comments ||= [];
          node.comments.push(data.slice(MARKMAP_COMMENT_PREFIX.length).trim());
          $(child).remove();
        }
      }
    });
    node.html = (
      ($el.is(options.selectorPreserveTag) ? $.html($el) : $el.html()) || ''
    ).trimEnd();
  });
  return rootNode;

  function addChild(
    $child: Cheerio<Element>,
    parent: IHtmlNode,
    nesting: boolean,
  ) {
    const child = $child[0];
    const node: IHtmlNode = {
      id: ++id,
      tag: child.tagName,
      html: '',
      level: getLevel(child.tagName),
      childrenLevel: Levels.None,
      children: nesting ? [] : undefined,
      parent: parent.id,
    };
    if (parent.children) {
      if (
        parent.childrenLevel === Levels.None ||
        parent.childrenLevel > node.level
      ) {
        parent.children = [];
        parent.childrenLevel = node.level;
      }
      if (parent.childrenLevel === node.level) {
        parent.children.push(node);
      }
    }
    elMap[node.id] = $child;
    return node;
  }

  function getCurrentHeading(level: Levels) {
    let heading: IHtmlNode | undefined;
    while ((heading = headingStack.at(-1)) && heading.level >= level) {
      headingStack.pop();
    }
    return heading || rootNode;
  }

  function checkNode($el: Cheerio<Element>, node?: IHtmlNode) {
    $el.children().each((_, child) => {
      const $child = $(child);
      if ($child.is(options.selectorWrapper)) {
        checkNode($child);
        return;
      }
      if (!$child.is(options.selector)) {
        const level = getLevel(child.tagName);
        if (level <= Levels.H6) {
          skippingHeading = level;
        }
        return;
      }
      const level = getLevel(child.tagName);
      if (skippingHeading > Levels.None && level > skippingHeading) {
        return;
      }
      skippingHeading = Levels.None;
      if ($child.is(options.selectorNesting)) {
        const childNode = addChild(
          $child,
          node || getCurrentHeading(level),
          true,
        );
        if (childNode) {
          checkNode($child, childNode);
          $child.remove();
        }
        return;
      }
      const isHeading = level <= Levels.H6;
      const childNode = addChild(
        $child,
        node || getCurrentHeading(level),
        isHeading,
      );
      if (isHeading) headingStack.push(childNode);
    });
  }
}

export function convertNode(htmlRoot: IHtmlNode) {
  return walkTree<IHtmlNode, IPureNode>(htmlRoot, (htmlNode, next) => {
    const node: IPureNode = {
      content: htmlNode.html,
      children: next() || [],
    };
    if (htmlNode.comments) {
      if (htmlNode.comments.includes('foldAll')) {
        node.payload = { fold: 2 };
      } else if (htmlNode.comments.includes('fold')) {
        node.payload = { fold: 1 };
      }
    }
    return node;
  });
}

export function buildTree(html: string, opts?: Partial<IHtmlParserOptions>) {
  const htmlRoot = parseHtml(html, opts);
  return convertNode(htmlRoot);
}

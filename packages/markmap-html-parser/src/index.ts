import { Cheerio, CheerioAPI, load } from 'cheerio/slim';
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
  data?: Record<string, unknown>;
}

export interface IHtmlParserContext {
  $node: Cheerio<any>;
  $: CheerioAPI;
  getContent(
    $node: Cheerio<any>,
    preserveTag?: boolean,
  ): { html?: string; comments?: string[] };
}

export interface IHtmlParserResult {
  html?: string | null;
  comments?: string[];
  queue?: Cheerio<any>;
  nesting?: boolean;
}

export type IHtmlParserSelectorRules = Record<
  string,
  (context: IHtmlParserContext) => IHtmlParserResult
>;

export interface IHtmlParserOptions {
  selector: string;
  selectorRules: IHtmlParserSelectorRules;
  sanitize: boolean | IHtmlSanitizeOptions;
}

export interface IHtmlSanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  allowedSchemes?: string[];
  allowedSchemesByTag?: Record<string, string[]>;
}

const defaultSanitizeOptions: Required<IHtmlSanitizeOptions> = {
  allowedTags: [
    'a',
    'abbr',
    'b',
    'blockquote',
    'br',
    'caption',
    'code',
    'col',
    'colgroup',
    'dd',
    'del',
    'div',
    'dl',
    'dt',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'i',
    'img',
    'ins',
    'kbd',
    'li',
    'mark',
    'math',
    'ol',
    'p',
    'path',
    'pre',
    's',
    'samp',
    'small',
    'span',
    'strong',
    'sub',
    'sup',
    'svg',
    'annotation',
    'semantics',
    'mrow',
    'mi',
    'mo',
    'mn',
    'mfrac',
    'msqrt',
    'msup',
    'table',
    'tbody',
    'td',
    'tfoot',
    'th',
    'thead',
    'tr',
    'u',
    'ul',
    'var',
  ],
  allowedAttributes: {
    '*': ['class', 'id', 'title', 'style', 'data-*', 'aria-*'],
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    math: ['xmlns'],
    annotation: ['encoding'],
    svg: [
      'width',
      'height',
      'viewBox',
      'viewbox',
      'xmlns',
      'preserveAspectRatio',
      'preserveaspectratio',
    ],
    path: ['d', 'fill', 'fill-rule', 'clip-rule', 'stroke'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data'],
  },
};

const defaultSelectorRules: IHtmlParserSelectorRules = {
  'div,p': ({ $node }) => ({
    queue: $node.children(),
  }),
  'h1,h2,h3,h4,h5,h6': ({ $node, getContent }) => ({
    ...getContent($node.contents()),
  }),
  'ul,ol': ({ $node }) => ({
    queue: $node.children(),
    nesting: true,
  }),
  li: ({ $node, getContent }) => {
    const queue = $node.children().filter('ul,ol');
    let content: ReturnType<typeof getContent>;
    if ($node.contents().first().is('div,p')) {
      content = getContent($node.children().first());
    } else {
      let $contents = $node.contents();
      const i = $contents.index(queue);
      if (i >= 0) $contents = $contents.slice(0, i);
      content = getContent($contents);
    }
    return {
      queue,
      nesting: true,
      ...content,
    };
  },
  'table,pre,p>img:only-child': ({ $node, getContent }) => ({
    ...getContent($node),
  }),
};

export const defaultOptions: IHtmlParserOptions = {
  selector: 'h1,h2,h3,h4,h5,h6,ul,ol,li,table,pre,p>img:only-child',
  selectorRules: defaultSelectorRules,
  sanitize: true,
};

const MARKMAP_COMMENT_PREFIX = 'markmap: ';
const SELECTOR_HEADING = /^h[1-6]$/;
const SELECTOR_LIST = /^[uo]l$/;
const SELECTOR_LIST_ITEM = /^li$/;

function getLevel(tagName: string) {
  if (SELECTOR_HEADING.test(tagName)) return +tagName[1] as Levels;
  if (SELECTOR_LIST.test(tagName)) return Levels.List;
  if (SELECTOR_LIST_ITEM.test(tagName)) return Levels.ListItem;
  return Levels.Block;
}

function getSanitizeOptions(
  option: IHtmlParserOptions['sanitize'],
): Required<IHtmlSanitizeOptions> | null {
  if (option === false) return null;
  if (option === true) return defaultSanitizeOptions;
  return {
    ...defaultSanitizeOptions,
    ...option,
    allowedAttributes: {
      ...defaultSanitizeOptions.allowedAttributes,
      ...option.allowedAttributes,
    },
    allowedSchemesByTag: {
      ...defaultSanitizeOptions.allowedSchemesByTag,
      ...option.allowedSchemesByTag,
    },
  };
}

function isAllowedAttribute(
  tagName: string,
  attrName: string,
  allowedAttributes: Record<string, string[]>,
) {
  const lowerAttr = attrName.toLowerCase();
  const allowed = [
    ...(allowedAttributes['*'] || []),
    ...(allowedAttributes[tagName] || []),
  ];
  return allowed.some((item) => {
    if (item.endsWith('*')) return lowerAttr.startsWith(item.slice(0, -1));
    return lowerAttr === item.toLowerCase();
  });
}

function getUrlScheme(value: string) {
  const normalizedValue = Array.from(value.trim())
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code > 0x20 && code !== 0x7f;
    })
    .join('');
  const match = normalizedValue.match(/^([^:/?#]+):/);
  return match?.[1].toLowerCase();
}

function isSafeUrl(
  tagName: string,
  attrName: string,
  value: string,
  options: Required<IHtmlSanitizeOptions>,
) {
  const schemes =
    options.allowedSchemesByTag[tagName] || options.allowedSchemes;
  if (attrName === 'srcset') {
    return value
      .split(',')
      .map((item) => item.trim().split(/\s+/)[0])
      .every(
        (url) => !getUrlScheme(url) || schemes.includes(getUrlScheme(url)!),
      );
  }
  const scheme = getUrlScheme(value);
  return !scheme || schemes.includes(scheme);
}

function isSafeStyle(value: string) {
  return !/\b(?:expression|url)\s*\(/i.test(value);
}

function sanitizeContent(
  html: string,
  options: Required<IHtmlSanitizeOptions>,
) {
  const $ = load(html, null, false);
  const blockedTags = 'script,style,iframe,object,embed,link,meta';
  $(blockedTags).remove();
  $('*').each((_, el) => {
    const node = el as { tagName?: string; attribs?: Record<string, string> };
    const tagName = node.tagName?.toLowerCase();
    if (!tagName) return;
    if (!options.allowedTags.includes(tagName)) {
      $(el).replaceWith($(el).contents());
      return;
    }
    Object.keys(node.attribs || {}).forEach((attrName) => {
      const lowerAttr = attrName.toLowerCase();
      const value = node.attribs?.[attrName] || '';
      if (
        lowerAttr.startsWith('on') ||
        !isAllowedAttribute(tagName, lowerAttr, options.allowedAttributes) ||
        (lowerAttr === 'style' && !isSafeStyle(value)) ||
        (['href', 'src', 'srcset'].includes(lowerAttr) &&
          !isSafeUrl(tagName, lowerAttr, value, options))
      ) {
        $(el).removeAttr(attrName);
      }
    });
  });
  return $.root().html() || '';
}

export function parseHtml(html: string, opts?: Partial<IHtmlParserOptions>) {
  const options = {
    ...defaultOptions,
    ...opts,
  };
  const sanitizeOptions = getSanitizeOptions(options.sanitize);
  const $ = load(html);
  let $root: Cheerio<any> = $('body');
  if (!$root.length) $root = $.root();
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
  const headingStack: IHtmlNode[] = [];
  let skippingHeading = Levels.None;
  checkNodes($root.children());
  return rootNode;

  function addChild(props: {
    parent: IHtmlNode;
    nesting: boolean;
    tagName: string;
    level: Levels;
    html: string;
    comments?: string[];
    data?: Record<string, unknown>;
  }) {
    const { parent } = props;
    const node: IHtmlNode = {
      id: ++id,
      tag: props.tagName,
      level: props.level,
      html: props.html,
      childrenLevel: Levels.None,
      children: props.nesting ? [] : undefined,
      parent: parent.id,
    };
    if (props.comments?.length) {
      node.comments = props.comments;
    }
    if (Object.keys(props.data || {}).length) {
      node.data = props.data;
    }
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
    return node;
  }

  function getCurrentHeading(level: Levels) {
    let heading: IHtmlNode | undefined;
    while (
      (heading = headingStack[headingStack.length - 1]) &&
      heading.level >= level
    ) {
      headingStack.pop();
    }
    return heading || rootNode;
  }

  function getContent($node: Cheerio<any>) {
    const result = extractMagicComments($node);
    let html = $.html(result.$node)?.trimEnd();
    if (html && sanitizeOptions) html = sanitizeContent(html, sanitizeOptions);
    return { comments: result.comments, html };
  }

  function extractMagicComments($node: Cheerio<any>) {
    const comments: string[] = [];
    $node = $node.filter((_, child) => {
      if (child.type === 'comment') {
        const data = child.data.trim();
        if (data.startsWith(MARKMAP_COMMENT_PREFIX)) {
          comments.push(data.slice(MARKMAP_COMMENT_PREFIX.length).trim());
          return false;
        }
      }
      return true;
    });
    return { $node, comments };
  }

  function checkNodes($els: Cheerio<any>, node?: IHtmlNode) {
    $els.each((_, child) => {
      const $child = $(child);
      const rule = Object.entries(options.selectorRules).find(([selector]) =>
        $child.is(selector),
      )?.[1];
      const result = rule?.({ $node: $child, $, getContent });
      // Wrapper
      if (result?.queue && !result.nesting) {
        checkNodes(result.queue, node);
        return;
      }
      const level = getLevel(child.tagName);
      if (!result) {
        if (level <= Levels.H6) {
          skippingHeading = level;
        }
        return;
      }
      if (skippingHeading > Levels.None && level > skippingHeading) return;
      if (!$child.is(options.selector)) return;
      skippingHeading = Levels.None;
      const isHeading = level <= Levels.H6;
      let data = {
        // If the child is an inline element and expected to be a separate node,
        // data from the closest `<p>` should be included, e.g. `<p data-lines><img /></p>`
        ...$child.closest('p').data(),
        ...$child.data(),
      };
      let html = result.html || '';
      if ($child.is('ol>li') && node?.children) {
        const start = +($child.parent().attr('start') || 1);
        const listIndex = start + node.children.length;
        html = `${listIndex}. ${html}`;
        data = {
          ...data,
          listIndex,
        };
      }
      const childNode = addChild({
        parent: node || getCurrentHeading(level),
        nesting: !!result.queue || isHeading,
        tagName: child.tagName,
        level,
        html,
        comments: result.comments,
        data,
      });
      if (isHeading) headingStack.push(childNode);
      if (result.queue) checkNodes(result.queue, childNode);
    });
  }
}

export function convertNode(htmlRoot: IHtmlNode) {
  return walkTree<IHtmlNode, IPureNode>(htmlRoot, (htmlNode, next) => {
    const node: IPureNode = {
      content: htmlNode.html,
      children: next() || [],
    };
    if (htmlNode.data) {
      node.payload = {
        tag: htmlNode.tag,
        ...htmlNode.data,
      };
    }
    if (htmlNode.comments) {
      if (htmlNode.comments.includes('foldAll')) {
        node.payload = { ...node.payload, fold: 2 };
      } else if (htmlNode.comments.includes('fold')) {
        node.payload = { ...node.payload, fold: 1 };
      }
    }
    return node;
  });
}

export function buildTree(html: string, opts?: Partial<IHtmlParserOptions>) {
  const htmlRoot = parseHtml(html, opts);
  return convertNode(htmlRoot);
}

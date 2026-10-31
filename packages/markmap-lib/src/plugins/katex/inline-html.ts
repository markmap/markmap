import type MarkdownIt from 'markdown-it';

export function enableMathInlineInHtml(md: MarkdownIt) {
  md.core.ruler.after('inline', 'math_inline_in_html', (state) => {
    for (const token of state.tokens) {
      if (token.type !== 'inline' || !token.children) continue;

      const children = [] as NonNullable<typeof token.children>;
      for (const child of token.children) {
        if (child.type !== 'text' || !child.content.includes('$')) {
          children.push(child);
          continue;
        }

        const parsed = md.parseInline(child.content, state.env);
        const parsedChildren = parsed[0]?.children;
        if (parsedChildren?.some((item) => item.type === 'math_inline')) {
          children.push(...parsedChildren);
        } else {
          children.push(child);
        }
      }
      token.children = children;
    }
  });
}

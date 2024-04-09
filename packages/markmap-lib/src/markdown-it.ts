import MarkdownIt from 'markdown-it';
import md_ins from 'markdown-it-ins';
import md_mark from 'markdown-it-mark';
import md_sub from 'markdown-it-sub';
import md_sup from 'markdown-it-sup';

export function initializeMarkdownIt() {
  const md = MarkdownIt({
    html: true,
    breaks: true,
  });
  md.use(md_ins).use(md_mark).use(md_sub).use(md_sup);
  return md;
}

import { describe, expect, it } from 'vitest';
import { createPage } from './page';

const data = { markdown: '# </script>', images: {}, toolbar: true };

describe('createPage', () => {
  it('escapes the title', () => {
    const html = createPage({ title: 'a <b> & c', data, script: '' });
    expect(html).toContain('<title>a &#60;b&#62; &#38; c</title>');
  });

  it('keeps data and script inside their tags', () => {
    const html = createPage({ title: '', data, script: 'a("</script>", "<!--")' });
    expect(html.match(/<\/script>/g)).toHaveLength(2);
    expect(html).not.toContain('<!--');
  });
});

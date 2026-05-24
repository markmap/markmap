import { createMindmap } from '../../../packages/markmap-embed/src/index';
import type {
  MindmapEmbed,
  MindmapTheme,
} from '../../../packages/markmap-embed/src/index';
import './styles.css';

const starterMarkdown = `# Client Implementation Map

## Discovery
- Business process inventory
- Stakeholder interviews
- Current app constraints

## Solution Design
- Embedded mindmap API
- Theme aligned to host app
- Node click events
- Resize-safe panels

## Delivery
- React adapter
- Vue adapter
- Svelte action
- Secure markdown sanitizer

## Client Use Cases
- CRM opportunity planning
- Real estate acquisition flows
- Internal SOP navigation
- Product roadmap reviews`;

const themes: Record<string, MindmapTheme & { label: string }> = {
  capa: {
    label: 'CAPA',
    colors: ['#0f766e', '#2563eb', '#9333ea', '#ea580c'],
    font: '400 15px/20px Inter, sans-serif',
    textColor: '#172554',
    linkColor: '#2563eb',
    linkHoverColor: '#1d4ed8',
    codeBackground: '#e0f2fe',
    codeColor: '#172554',
    circleOpenBackground: '#ffffff',
    maxWidth: 560,
    spacingHorizontal: 72,
    spacingVertical: 8,
    paddingX: 10,
    lineWidth: [2, 2, 2],
  },
  slate: {
    label: 'Operations',
    colors: ['#334155', '#0f766e', '#7c3aed', '#b45309'],
    font: '400 15px/20px Inter, sans-serif',
    textColor: '#1f2937',
    linkColor: '#0f766e',
    linkHoverColor: '#0d9488',
    codeBackground: '#f1f5f9',
    codeColor: '#334155',
    circleOpenBackground: '#ffffff',
    maxWidth: 520,
    spacingHorizontal: 60,
    spacingVertical: 6,
    paddingX: 8,
    lineWidth: [1.5, 2, 2],
  },
  dark: {
    label: 'Dark',
    colors: ['#38bdf8', '#34d399', '#a78bfa', '#fbbf24'],
    font: '400 15px/20px Inter, sans-serif',
    textColor: '#e5e7eb',
    linkColor: '#7dd3fc',
    linkHoverColor: '#bae6fd',
    codeBackground: '#111827',
    codeColor: '#dbeafe',
    circleOpenBackground: '#1f2937',
    highlightNodeBackground: '#1d4ed833',
    maxWidth: 560,
    spacingHorizontal: 72,
    spacingVertical: 8,
    paddingX: 10,
    lineWidth: [2, 2, 2],
  },
};

let embed: MindmapEmbed | undefined;
let selectedTheme = 'capa';
let selectedNode = 'Click a node in the map to inspect its payload here.';
let renderTimer = 0;

function countNodes(markdown: string) {
  return markdown.split('\n').filter((line) => /^#{1,6}\s+|^\s*-\s+/.test(line))
    .length;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[char];
  });
}

function renderApp() {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;
  app.innerHTML = `
    <main class="app">
      <header class="topbar">
        <div class="brand">
          <h1>CAPA Mindmaps</h1>
          <p>Embedded markmap playground for client apps, themes, resize behavior, and node events.</p>
        </div>
        <div class="toolbar" aria-label="Mindmap controls">
          <select id="sampleSelect" aria-label="Load sample">
            <option value="implementation">Implementation</option>
            <option value="sales">Sales Pipeline</option>
            <option value="security">Security Review</option>
          </select>
          <button id="fitButton" type="button">Fit</button>
          <button id="resetButton" type="button">Reset</button>
        </div>
      </header>
      <section class="workspace">
        <section class="pane" aria-label="Markdown editor">
          <div class="paneHeader">
            <h2>Markdown</h2>
            <span id="nodeCount" class="status">0 nodes</span>
          </div>
          <textarea id="editor" class="editor" spellcheck="false" aria-label="Mindmap markdown"></textarea>
        </section>
        <div id="resizer" class="resizer" role="separator" aria-label="Resize editor and mindmap" tabindex="0"></div>
        <section class="mapPane" aria-label="Mindmap preview">
          <div class="paneHeader">
            <h2>Live Preview</h2>
            <span id="renderStatus" class="status">Ready</span>
          </div>
          <div id="mapHost" class="mapHost"></div>
        </section>
        <aside class="side" aria-label="Theme and node details">
          <div class="paneHeader">
            <h2>Embed Controls</h2>
            <span class="status">autoResize on</span>
          </div>
          <div class="themeGrid">
            ${Object.entries(themes)
              .map(([key, theme]) => {
                const swatches = theme.colors
                  ?.map(
                    (color) =>
                      `<span class="swatch" style="background:${color}"></span>`,
                  )
                  .join('');
                return `<button class="themeButton ${
                  key === selectedTheme ? 'active' : ''
                }" type="button" data-theme="${key}">
                  <span>${theme.label}</span>
                  <span class="swatches">${swatches}</span>
                </button>`;
              })
              .join('')}
          </div>
          <div class="details">
            <h3>Selected Node</h3>
            <p id="selectedNode" class="detailsText">${escapeHtml(selectedNode)}</p>
            <div class="metricGrid">
              <div class="metric"><span>Theme</span><strong id="themeName">${themes[selectedTheme].label}</strong></div>
              <div class="metric"><span>Sanitizer</span><strong>On</strong></div>
              <div class="metric"><span>Resize</span><strong>Observed</strong></div>
              <div class="metric"><span>Events</span><strong>Click</strong></div>
            </div>
            <pre class="codeBlock">createMindmap(host, {
  content,
  autoFit: true,
  autoResize: true,
  theme,
  onNodeClick: ({ node }) => select(node)
});</pre>
          </div>
        </aside>
      </section>
    </main>
  `;
}

function getSample(value: string) {
  if (value === 'sales') {
    return `# Sales Pipeline

## Lead Capture
- Website form
- Referral partner
- CRM import

## Qualification
- Budget
- Authority
- Timeline
- Fit score

## Proposal
- Discovery notes
- Pricing model
- Scope map

## Close
- Agreement
- Onboarding
- Success plan`;
  }
  if (value === 'security') {
    return `# Security Review

## Input Boundaries
- Markdown parser
- HTML sanitizer
- URL scheme checks

## Embed Runtime
- AbortSignal lifecycle
- No globals
- No CDN dependency

## Host App
- CSP review
- Auth boundary
- Tenant branding

## Verification
- Unit tests
- Browser smoke
- Package dry run`;
  }
  return starterMarkdown;
}

async function updateMindmap(content: string) {
  const status = document.querySelector<HTMLSpanElement>('#renderStatus');
  const count = document.querySelector<HTMLSpanElement>('#nodeCount');
  if (status) status.textContent = 'Rendering';
  if (count) count.textContent = `${countNodes(content)} nodes`;
  await embed?.update(content);
  if (status) status.textContent = 'Ready';
}

function scheduleUpdate(content: string) {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(() => {
    void updateMindmap(content);
  }, 180);
}

function wireResize() {
  const workspace = document.querySelector<HTMLElement>('.workspace');
  const resizer = document.querySelector<HTMLElement>('#resizer');
  if (!workspace || !resizer) return;
  let dragging = false;

  const stop = () => {
    dragging = false;
    resizer.classList.remove('active');
  };

  resizer.addEventListener('pointerdown', (event) => {
    dragging = true;
    resizer.classList.add('active');
    resizer.setPointerCapture(event.pointerId);
  });
  resizer.addEventListener('pointerup', stop);
  resizer.addEventListener('pointercancel', stop);
  resizer.addEventListener('pointermove', (event) => {
    if (!dragging || window.matchMedia('(max-width: 980px)').matches) return;
    const rect = workspace.getBoundingClientRect();
    const left = Math.min(
      Math.max(event.clientX - rect.left, 280),
      rect.width - 720,
    );
    workspace.style.gridTemplateColumns = `${left}px 8px minmax(420px, 1fr) minmax(260px, 0.7fr)`;
  });
}

async function boot() {
  renderApp();
  const editor = document.querySelector<HTMLTextAreaElement>('#editor');
  const host = document.querySelector<HTMLDivElement>('#mapHost');
  if (!editor || !host) return;

  editor.value = starterMarkdown;
  embed = await createMindmap(host, {
    content: starterMarkdown,
    autoFit: true,
    autoResize: true,
    theme: themes[selectedTheme],
    parserOptions: {
      sanitize: true,
    },
    onNodeClick: ({ node }) => {
      selectedNode = node.content.replace(/<[^>]*>/g, '');
      const target =
        document.querySelector<HTMLParagraphElement>('#selectedNode');
      if (target) target.textContent = selectedNode;
    },
  });

  document.querySelector<HTMLSpanElement>('#nodeCount')!.textContent =
    `${countNodes(starterMarkdown)} nodes`;

  editor.addEventListener('input', () => scheduleUpdate(editor.value));
  document
    .querySelector<HTMLButtonElement>('#fitButton')
    ?.addEventListener('click', () => {
      void embed?.fit();
    });
  document
    .querySelector<HTMLButtonElement>('#resetButton')
    ?.addEventListener('click', () => {
      editor.value = starterMarkdown;
      void updateMindmap(editor.value);
    });
  document
    .querySelector<HTMLSelectElement>('#sampleSelect')
    ?.addEventListener('change', (event) => {
      const value = (event.target as HTMLSelectElement).value;
      editor.value = getSample(value);
      void updateMindmap(editor.value);
    });
  document
    .querySelectorAll<HTMLButtonElement>('.themeButton')
    .forEach((button) => {
      button.addEventListener('click', () => {
        selectedTheme = button.dataset.theme || selectedTheme;
        document
          .querySelectorAll('.themeButton')
          .forEach((item) => item.classList.toggle('active', item === button));
        const name = document.querySelector('#themeName');
        if (name) name.textContent = themes[selectedTheme].label;
        void embed?.setTheme(themes[selectedTheme]);
      });
    });
  wireResize();
}

void boot();

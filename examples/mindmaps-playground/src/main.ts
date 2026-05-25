import type {
  MindmapEmbed,
  MindmapHostConnection,
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
let selectedSample = 'implementation';
let selectedNode = 'Click a node in the map to inspect its payload here.';
let selectedNodeId: string | undefined;
let selectedNodeLineIndex: number | undefined;
let currentContent = starterMarkdown;
let hostConnection: MindmapHostConnection | undefined;
let hostSelectedNodeId: string | undefined;
let hostSelectedLineIndex: number | undefined;
let hostAutosaveTimer = 0;
let hostLatestMarkdown = '';
let hostDirty = false;
let nextNodeId = 1;
let renderTimer = 0;
const nodeIdsByLineIndex = new Map<number, string>();
const lineIndexByNodeId = new Map<string, number>();

type MindmapHostMessage = {
  type?: unknown;
  action?: unknown;
  content?: unknown;
  formats?: unknown;
  id?: unknown;
  line?: unknown;
  requestId?: unknown;
  sample?: unknown;
  theme?: unknown;
};

const params = new URLSearchParams(window.location.search);
const isEmbedMode = params.get('embed') === '1';
const isHostMode = params.get('host') === '1';
const isEmbedHelpMode =
  window.location.pathname.replace(/\/$/, '') === '/embed-help' ||
  params.get('embedHelp') === '1';
const parentOrigin = getAllowedParentOrigin();

if (params.get('theme') && themes[params.get('theme') || '']) {
  selectedTheme = params.get('theme') || selectedTheme;
}

if (
  ['implementation', 'sales', 'security'].includes(params.get('sample') || '')
) {
  selectedSample = params.get('sample') || selectedSample;
}

function getEmbedUrl() {
  const url = new URL('/', window.location.origin);
  url.searchParams.set('embed', '1');
  url.searchParams.set('theme', selectedTheme);
  url.searchParams.set('sample', selectedSample);
  url.searchParams.set('parentOrigin', window.location.origin);
  return url.toString();
}

function getHostExampleUrl() {
  const url = new URL('/', window.location.origin);
  url.searchParams.set('host', '1');
  url.searchParams.set('theme', selectedTheme);
  url.searchParams.set('sample', selectedSample);
  return url.toString();
}

function getIframeSnippet() {
  return `<iframe
  src="${getEmbedUrl()}"
  title="CAPA Mindmaps"
  loading="lazy"
  style="width:100%;height:640px;border:0;"
></iframe>`;
}

function getScriptSnippet() {
  return `<div id="mindmap-frame"></div>
<script>
  const markdown = '# Client Map\\n\\n## Discovery\\n- Process\\n- Stakeholders\\n\\n## Delivery\\n- Tasks\\n- Decisions';
  const frame = document.createElement('iframe');
  frame.src = '${getEmbedUrl()}';
  frame.title = 'CAPA Mindmaps';
  frame.loading = 'lazy';
  frame.style.cssText = 'width:100%;height:640px;border:0;';

  const mindmapOrigin = new URL(frame.src).origin;
  window.addEventListener('message', (event) => {
    if (event.origin !== mindmapOrigin) return;
    if (event.data?.type !== 'capa:mindmap:ready') return;
    frame.contentWindow?.postMessage({
      type: 'capa:mindmap',
      action: 'setContent',
      content: markdown,
      theme: 'capa'
    }, mindmapOrigin);
  });

  window.addEventListener('message', (event) => {
    if (event.origin !== mindmapOrigin) return;
    if (event.data?.type !== 'capa:mindmap:export') return;
    console.log('Mindmap export:', event.data);
  });

  window.addEventListener('message', (event) => {
    if (event.origin !== mindmapOrigin) return;
    if (event.data?.type !== 'capa:mindmap:nodeClick') return;
    console.log('Mindmap node click:', event.data.node);
  });

  window.addEventListener('message', (event) => {
    if (event.origin !== mindmapOrigin) return;
    if (event.data?.type !== 'capa:mindmap:nodeEdit') return;
    console.log('Mindmap node edit:', event.data.node);
  });

  window.addEventListener('message', (event) => {
    if (event.origin !== mindmapOrigin) return;
    if (event.data?.type !== 'capa:mindmap:resize') return;
    if (typeof event.data.height !== 'number') return;
    frame.style.height = Math.ceil(event.data.height) + 'px';
  });

  function requestMindmapExport() {
    frame.contentWindow?.postMessage({
      type: 'capa:mindmap',
      action: 'export',
      formats: ['markdown', 'svg', 'png'],
      requestId: crypto.randomUUID()
    }, mindmapOrigin);
  }
  document.querySelector('#mindmap-frame').append(frame);
</script>`;
}

const embedHelpSnippets = {
  'web-component': () => `<markmap-host-frame
  id="client-map"
  src="${getEmbedUrl()}"
  target-origin="${window.location.origin}"
  queue-until-ready
  auto-resize
  autosave
  map-id="client-123"
  autosave-debounce-ms="800"
></markmap-host-frame>

<script type="module">
  import { defineMindmapHostFrame } from 'markmap-embed';

  defineMindmapHostFrame();

  const frame = document.querySelector('#client-map');
  frame.persistence = {
    load: (id) => localStorage.getItem(\`mindmap:\${id}\`) || '# Strategy',
    save: (id, markdown) => {
      localStorage.setItem(\`mindmap:\${id}\`, markdown);
    },
  };
  frame.addEventListener('ready', (event) => {
    event.detail.connection.loadMap('client-123');
  });
  frame.addEventListener('autosave', (event) => {
    console.log('saved', event.detail.id);
  });
</script>`,
  react: () => `import { useMemo, useRef } from 'react';
import {
  MindmapHostFrame,
  type MindmapHostFrameHandle,
} from 'markmap-react';

export function ClientMindmapFrame() {
  const ref = useRef<MindmapHostFrameHandle>(null);
  const persistence = useMemo(
    () => ({
      load: (id: string) => localStorage.getItem(\`mindmap:\${id}\`) || '# Strategy',
      save: (id: string, markdown: string) => {
        localStorage.setItem(\`mindmap:\${id}\`, markdown);
      },
    }),
    [],
  );

  return (
    <MindmapHostFrame
      ref={ref}
      src="${getEmbedUrl()}"
      targetOrigin="${window.location.origin}"
      queueUntilReady
      autoResize
      autosave
      mapId="client-123"
      persistence={persistence}
      onReady={(connection) => connection.loadMap('client-123')}
      onAutosave={(map) => console.log('saved', map.id)}
    />
  );
}`,
  vue: () => `<script setup lang="ts">
import { MarkmapHostFrame } from 'markmap-vue';

const persistence = {
  load: (id: string) => localStorage.getItem(\`mindmap:\${id}\`) || '# Strategy',
  save: (id: string, markdown: string) => {
    localStorage.setItem(\`mindmap:\${id}\`, markdown);
  },
};
</script>

<template>
  <MarkmapHostFrame
    src="${getEmbedUrl()}"
    target-origin="${window.location.origin}"
    queue-until-ready
    auto-resize
    autosave
    map-id="client-123"
    :persistence="persistence"
    @ready="(connection) => connection.loadMap('client-123')"
    @autosave="(map) => console.log('saved', map.id)"
  />
</template>`,
};

type EmbedHelpSnippetKey = keyof typeof embedHelpSnippets;

function getEmbedHelpSnippet(key: EmbedHelpSnippetKey) {
  return embedHelpSnippets[key]();
}

function syncThemeChrome() {
  document.body.dataset.mapTheme = selectedTheme;
}

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

function stripNodeContent(value: string) {
  return value.replace(/<[^>]*>/g, '');
}

function getEditableLineIndex(node: { payload?: unknown }) {
  const lines = (node.payload as { lines?: unknown } | undefined)?.lines;
  if (typeof lines !== 'string') return undefined;
  const start = Number(lines.split(',')[0]);
  return Number.isInteger(start) ? start : undefined;
}

function getEditableLineParts(markdownLine: string) {
  const match = markdownLine.match(
    /^(\s*(?:#{1,6}\s+|[-*+]\s+|\d+\.\s+))(.*)$/,
  );
  if (!match) return;
  return {
    prefix: match[1],
    text: match[2],
  };
}

function resetNodeIdRegistry() {
  selectedNodeId = undefined;
  hostSelectedNodeId = undefined;
  nodeIdsByLineIndex.clear();
  lineIndexByNodeId.clear();
  nextNodeId = 1;
}

function getNodeIdForLineIndex(lineIndex: number) {
  const existing = nodeIdsByLineIndex.get(lineIndex);
  if (existing) return existing;
  const id = `node-${nextNodeId++}`;
  nodeIdsByLineIndex.set(lineIndex, id);
  lineIndexByNodeId.set(id, lineIndex);
  return id;
}

function getLineIndexForNodeId(id: string) {
  return lineIndexByNodeId.get(id);
}

function setNodeEditorState(enabled: boolean, value = '', status?: string) {
  const input = document.querySelector<HTMLInputElement>('#nodeTextInput');
  const save = document.querySelector<HTMLButtonElement>('#saveNodeEdit');
  const cancel = document.querySelector<HTMLButtonElement>('#cancelNodeEdit');
  const statusNode =
    document.querySelector<HTMLParagraphElement>('#nodeEditStatus');
  if (input) {
    input.disabled = !enabled;
    input.value = value;
  }
  if (save) save.disabled = !enabled;
  if (cancel) cancel.disabled = !enabled;
  if (statusNode && status) statusNode.textContent = status;
}

function renderApp() {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;
  if (isEmbedMode) {
    app.innerHTML = `
      <main class="embedApp">
        <div id="mapHost" class="mapHost"></div>
      </main>
    `;
    return;
  }
  if (isEmbedHelpMode) {
    app.innerHTML = `
      <main class="embedHelpApp">
        <header class="embedHelpHero">
          <div>
            <h1>Embed CAPA Mindmaps</h1>
            <p>Copy a host integration, preview the iframe, and verify autosave wiring before embedding in a client app.</p>
          </div>
          <a class="hostLinkButton" href="${escapeHtml(getHostExampleUrl())}">Open Host Test</a>
        </header>
        <section class="embedHelpLayout">
          <section class="embedHelpMain" aria-label="Embed integration snippets">
            <div class="embedHelpToolbar" role="tablist" aria-label="Snippet type">
              <button class="snippetTab active" type="button" role="tab" aria-selected="true" data-snippet-tab="web-component">Web Component</button>
              <button class="snippetTab" type="button" role="tab" aria-selected="false" data-snippet-tab="react">React</button>
              <button class="snippetTab" type="button" role="tab" aria-selected="false" data-snippet-tab="vue">Vue</button>
              <button id="embedHelpCopy" class="smallButton" type="button">Copy</button>
            </div>
            <pre id="embedHelpSnippet" class="embedHelpSnippet"><code>${escapeHtml(getEmbedHelpSnippet('web-component'))}</code></pre>
            <div class="embedHelpNotes">
              <div>
                <h2>Persistence</h2>
                <p>The host app provides a load/save adapter, so maps can live in your DB, CRM, tenant workspace, or browser storage.</p>
              </div>
              <div>
                <h2>Autosave</h2>
                <p>Dirty iframe changes debounce into <code>saveMap(mapId)</code>. Keep the map id aligned with the host record id.</p>
              </div>
              <div>
                <h2>CSP</h2>
                <p id="embedHelpCsp">Current frame policy: <code>frame-ancestors 'self' https://capaholdings.com https://*.capaholdings.com http://localhost:* http://127.0.0.1:*</code></p>
              </div>
            </div>
          </section>
          <aside class="embedHelpPreviewPane" aria-label="Iframe preview">
            <div class="paneHeader">
              <h2>Iframe Preview</h2>
              <span class="status">embed=1</span>
            </div>
            <iframe id="embedHelpPreview" src="${escapeHtml(getEmbedUrl())}" title="CAPA Mindmaps embed preview" loading="lazy"></iframe>
            <div class="copyRow embedHelpUrlRow">
              <input id="embedHelpUrl" class="snippetInput" value="${escapeHtml(getEmbedUrl())}" readonly aria-label="Embed URL" />
              <button id="embedHelpCopyUrl" class="copyButton" type="button">Copy URL</button>
            </div>
          </aside>
        </section>
      </main>
    `;
    return;
  }
  if (isHostMode) {
    app.innerHTML = `
      <main class="hostApp">
        <header class="hostTopbar">
          <div>
            <h1>Host SDK Integration</h1>
            <p>External app controls an embedded mindmap through connectMindmap().</p>
          </div>
          <strong id="hostStatus" class="hostStatus">Connecting</strong>
        </header>
        <section class="hostWorkspace">
          <div class="hostPreview">
            <iframe
              id="hostMindmapFrame"
              src="${escapeHtml(getEmbedUrl())}"
              title="CAPA Mindmaps host SDK preview"
            ></iframe>
          </div>
          <aside class="hostPanel">
            <h2>Selected Node</h2>
            <p id="hostSelectedNode" class="detailsText">Click a heading or list item in the mindmap.</p>
            <label class="nodeEditLabel" for="hostNodeId">Node ID</label>
            <input id="hostNodeId" class="nodeEditInput" aria-label="Host node ID" readonly />
            <label class="nodeEditLabel" for="hostNodeText">Node text</label>
            <div class="nodeEditRow">
              <input id="hostNodeText" class="nodeEditInput" aria-label="Host node text" disabled />
              <button id="hostSaveNode" class="smallButton" type="button" disabled>Save</button>
            </div>
            <div class="hostActionRow">
              <button id="hostFit" class="smallButton quietButton" type="button">Fit</button>
              <button id="hostExport" class="smallButton quietButton" type="button">Export</button>
            </div>
            <div class="hostPersistence">
              <label class="nodeEditLabel" for="hostMapId">Map ID</label>
              <div class="nodeEditRow">
                <input id="hostMapId" class="nodeEditInput" aria-label="Host map ID" value="client-demo" />
              </div>
              <label class="hostAutosaveToggle" for="hostAutosave">
                <input id="hostAutosave" type="checkbox" />
                <span>Auto-save edits after 600ms</span>
              </label>
              <strong id="hostDirtyState" class="hostDirtyState">Saved</strong>
              <div class="hostActionRow">
                <button id="hostSaveMap" class="smallButton" type="button">Save Map</button>
                <button id="hostLoadMap" class="smallButton quietButton" type="button">Load Map</button>
              </div>
            </div>
            <p id="hostEventLog" class="nodeEditStatus">Waiting for iframe ready event.</p>
            <pre class="codeBlock">const mindmap = connectMindmap(iframe, {
  autoResize: true,
  queueUntilReady: true,
  persistence: {
    load: (id) => api.getMap(id),
    save: (id, markdown) => api.saveMap(id, markdown)
  }
});

mindmap.onNodeClick(({ id }) => select(id));
mindmap.onChange(({ dirty }) => queueAutosave(dirty));
mindmap.editNode({ id, content });
mindmap.saveMap(id);
mindmap.loadMap(id);</pre>
          </aside>
        </section>
      </main>
    `;
    return;
  }

  app.innerHTML = `
    <main class="app">
      <header class="topbar">
        <div class="brand">
          <h1>CAPA Mindmaps</h1>
          <p>Embedded markmap playground for client apps, themes, resize behavior, and node events.</p>
        </div>
        <div class="toolbar" aria-label="Mindmap controls">
          <select id="sampleSelect" aria-label="Load sample">
            <option value="implementation" ${selectedSample === 'implementation' ? 'selected' : ''}>Implementation</option>
            <option value="sales" ${selectedSample === 'sales' ? 'selected' : ''}>Sales Pipeline</option>
            <option value="security" ${selectedSample === 'security' ? 'selected' : ''}>Security Review</option>
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
            <label class="nodeEditLabel" for="nodeTextInput">Node text</label>
            <div class="nodeEditRow">
              <input id="nodeTextInput" class="nodeEditInput" aria-label="Node text" disabled />
              <button id="saveNodeEdit" class="smallButton" type="button" disabled>Save node</button>
              <button id="cancelNodeEdit" class="smallButton quietButton" type="button" disabled>Cancel</button>
            </div>
            <p id="nodeEditStatus" class="nodeEditStatus">Select a heading or list item to edit it.</p>
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
          <div class="embedTest">
            <div class="embedTestHeader">
              <h3>Embed Test</h3>
              <button id="openHostTest" class="smallButton" type="button">Open Test</button>
            </div>
            <label class="snippetLabel" for="embedUrl">URL</label>
            <div class="copyRow">
              <input id="embedUrl" class="snippetInput" value="${escapeHtml(getEmbedUrl())}" readonly />
              <button class="copyButton" type="button" data-copy="url">Copy</button>
            </div>
            <div class="snippetHeader">
              <span>Iframe</span>
              <button class="copyButton" type="button" data-copy="iframe">Copy</button>
            </div>
            <pre class="snippetBlock"><code>${escapeHtml(getIframeSnippet())}</code></pre>
            <div class="snippetHeader">
              <span>Script</span>
              <button class="copyButton" type="button" data-copy="script">Copy</button>
            </div>
            <pre class="snippetBlock"><code>${escapeHtml(getScriptSnippet())}</code></pre>
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

async function updateMindmap(
  content: string,
  options: { preserveNodeIds?: boolean } = {},
) {
  if (!options.preserveNodeIds) resetNodeIdRegistry();
  currentContent = content;
  const status = document.querySelector<HTMLSpanElement>('#renderStatus');
  const count = document.querySelector<HTMLSpanElement>('#nodeCount');
  if (status) status.textContent = 'Rendering';
  if (count) count.textContent = `${countNodes(content)} nodes`;
  await embed?.update(content);
  if (status) status.textContent = 'Ready';
  postEmbedResize();
}

function serializeCurrentSvg() {
  const svg = document.querySelector<SVGSVGElement>('svg.markmap');
  return svg ? new XMLSerializer().serializeToString(svg) : '';
}

function getMapBackground() {
  return selectedTheme === 'dark' ? '#0f172a' : '#eef2f7';
}

function prepareSvgForCanvas(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll('foreignObject').forEach((foreignObject) => {
    const label = (foreignObject.textContent || '').trim();
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    const x = Number(foreignObject.getAttribute('x') || 0);
    const y = Number(foreignObject.getAttribute('y') || 0);
    const height = Number(foreignObject.getAttribute('height') || 20);
    const opacity = foreignObject
      .getAttribute('style')
      ?.match(/opacity:\s*([.\d]+)/)?.[1];
    text.textContent = label;
    text.setAttribute('x', String(x));
    text.setAttribute('y', String(y + height * 0.75));
    text.setAttribute('fill', themes[selectedTheme].textColor || '#172554');
    text.setAttribute(
      'font',
      themes[selectedTheme].font || '400 15px sans-serif',
    );
    if (opacity) text.setAttribute('opacity', opacity);
    foreignObject.replaceWith(text);
  });
  return clone;
}

async function renderCurrentPng() {
  const svg = document.querySelector<SVGSVGElement>('svg.markmap');
  if (!svg) return '';

  const rect = svg.getBoundingClientRect();
  const width = Math.max(Math.ceil(rect.width), 1);
  const height = Math.max(Math.ceil(rect.height), 1);
  const clone = prepareSvgForCanvas(svg);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  const background = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'rect',
  );
  background.setAttribute('x', '0');
  background.setAttribute('y', '0');
  background.setAttribute('width', '100%');
  background.setAttribute('height', '100%');
  background.setAttribute('fill', getMapBackground());
  clone.insertBefore(background, clone.firstChild);

  const svgText = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = 'async';
    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Unable to render SVG export'));
    });
    image.src = url;
    await loaded;

    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const context = canvas.getContext('2d');
    if (!context) return '';
    context.scale(scale, scale);
    context.fillStyle = getMapBackground();
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function wantsFormat(message: MindmapHostMessage, format: string) {
  if (!Array.isArray(message.formats)) return false;
  return message.formats.includes(format);
}

function isHostMessage(data: unknown): data is MindmapHostMessage {
  return (
    !!data &&
    typeof data === 'object' &&
    (data as MindmapHostMessage).type === 'capa:mindmap'
  );
}

function isLocalhostOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

function normalizeAllowedOrigin(value: string | null) {
  if (!value) return window.location.origin;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && !isLocalhostOrigin(url.origin)) {
      return window.location.origin;
    }
    return url.origin;
  } catch {
    return window.location.origin;
  }
}

function getAllowedParentOrigin() {
  return normalizeAllowedOrigin(params.get('parentOrigin'));
}

function isAllowedHostMessageOrigin(origin: string) {
  if (origin === parentOrigin) return true;
  return isLocalhostOrigin(parentOrigin) && isLocalhostOrigin(origin);
}

function resolveTheme(value: unknown) {
  if (typeof value === 'string' && themes[value]) return themes[value];
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as MindmapTheme;
  }
  return undefined;
}

function postParentMessage(message: Record<string, unknown>) {
  if (window.parent === window) return;
  window.parent.postMessage(message, parentOrigin);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function postEmbedError(action: string, error: unknown, requestId?: unknown) {
  postParentMessage({
    type: 'capa:mindmap:error',
    action,
    message: getErrorMessage(error),
    requestId,
  });
}

function postEmbedChange(reason: string, requestId?: unknown) {
  postParentMessage({
    type: 'capa:mindmap:change',
    dirty: true,
    markdown: currentContent,
    reason,
    requestId,
  });
}

function selectNodeForEditing(node: {
  content: string;
  payload?: unknown;
  state?: { depth?: number; path?: string };
}) {
  selectedNode = stripNodeContent(node.content);
  const target = document.querySelector<HTMLParagraphElement>('#selectedNode');
  if (target) target.textContent = selectedNode;

  const lineIndex = getEditableLineIndex(node);
  const line =
    lineIndex == null ? undefined : currentContent.split('\n')[lineIndex];
  const parts = line == null ? undefined : getEditableLineParts(line);
  selectedNodeLineIndex = parts ? lineIndex : undefined;
  selectedNodeId =
    parts && lineIndex != null ? getNodeIdForLineIndex(lineIndex) : undefined;

  if (parts) {
    setNodeEditorState(true, parts.text, `Editing ${selectedNodeId}.`);
  } else {
    setNodeEditorState(
      false,
      '',
      'This node is not backed by an editable line.',
    );
  }

  postParentMessage({
    type: 'capa:mindmap:nodeClick',
    node: {
      content: selectedNode,
      id: selectedNodeId,
      rawContent: node.content,
      depth: node.state?.depth,
      path: node.state?.path,
      payload: node.payload,
    },
  });
}

async function applyNodeLineEdit(
  lineIndex: number,
  nextText: string,
  requestId?: unknown,
  nodeId?: string,
) {
  const lines = currentContent.split('\n');
  const previousLine = lines[lineIndex];
  const parts =
    previousLine == null ? undefined : getEditableLineParts(previousLine);
  if (!parts) {
    throw new Error('Editable node line was not found.');
  }

  const trimmedText = nextText.trim();
  if (!trimmedText) {
    throw new Error('Node text cannot be empty.');
  }

  lines[lineIndex] = `${parts.prefix}${trimmedText}`;
  const nextContent = lines.join('\n');
  const nextNodeId = nodeId || getNodeIdForLineIndex(lineIndex);
  nodeIdsByLineIndex.set(lineIndex, nextNodeId);
  lineIndexByNodeId.set(nextNodeId, lineIndex);
  const editor = document.querySelector<HTMLTextAreaElement>('#editor');
  if (editor) editor.value = nextContent;
  selectedNode = trimmedText;
  selectedNodeId = nextNodeId;
  selectedNodeLineIndex = lineIndex;
  const target = document.querySelector<HTMLParagraphElement>('#selectedNode');
  if (target) target.textContent = selectedNode;
  setNodeEditorState(true, trimmedText, 'Saved.');
  await updateMindmap(nextContent, { preserveNodeIds: true });

  postParentMessage({
    type: 'capa:mindmap:nodeEdit',
    requestId,
    node: {
      content: trimmedText,
      id: nextNodeId,
      previousContent: parts.text,
      line: lineIndex,
    },
    markdown: nextContent,
  });
  postEmbedChange('nodeEdit', requestId);
}

async function saveSelectedNodeEdit() {
  const input = document.querySelector<HTMLInputElement>('#nodeTextInput');
  if (!input || selectedNodeLineIndex == null) return;

  const nextText = input.value.trim();
  if (!nextText) {
    setNodeEditorState(true, input.value, 'Node text cannot be empty.');
    return;
  }

  await applyNodeLineEdit(selectedNodeLineIndex, nextText);
}

function wireNodeEditor() {
  document
    .querySelector<HTMLButtonElement>('#saveNodeEdit')
    ?.addEventListener('click', () => {
      void saveSelectedNodeEdit();
    });
  document
    .querySelector<HTMLButtonElement>('#cancelNodeEdit')
    ?.addEventListener('click', () => {
      if (selectedNodeLineIndex == null) return;
      const line = currentContent.split('\n')[selectedNodeLineIndex];
      const parts = getEditableLineParts(line || '');
      setNodeEditorState(
        !!parts,
        parts?.text || '',
        parts ? 'Edit canceled.' : 'Select a heading or list item to edit it.',
      );
    });
}

function getEmbedWidth() {
  return Math.ceil(
    window.innerWidth || document.documentElement.clientWidth || 720,
  );
}

function getEmbedHeight() {
  const width = getEmbedWidth();
  return Math.ceil(Math.min(Math.max(width * 0.62, 420), 820));
}

function postEmbedResize() {
  if (!isEmbedMode) return;
  window.requestAnimationFrame(() => {
    postParentMessage({
      type: 'capa:mindmap:resize',
      height: getEmbedHeight(),
      width: getEmbedWidth(),
    });
  });
}

function wireHostMessages() {
  window.addEventListener('message', async (event) => {
    const message = event.data;
    if (!isHostMessage(message)) return;
    if (!isAllowedHostMessageOrigin(event.origin)) return;

    if (message.action === 'export') {
      try {
        const payload = {
          type: 'capa:mindmap:export',
          requestId: message.requestId,
          markdown: currentContent,
          svg: serializeCurrentSvg(),
          theme: selectedTheme,
        };
        if (wantsFormat(message, 'png')) {
          payload.png = await renderCurrentPng();
        }
        (event.source as WindowProxy | null)?.postMessage(
          payload,
          parentOrigin,
        );
      } catch (error) {
        postEmbedError('export', error, message.requestId);
      }
      return;
    }

    if (message.action === 'editNode') {
      try {
        if (typeof message.content !== 'string') {
          throw new Error('editNode requires node content.');
        }
        const lineIndex =
          typeof message.id === 'string'
            ? getLineIndexForNodeId(message.id)
            : typeof message.line === 'number'
              ? message.line
              : undefined;
        if (lineIndex == null) {
          throw new Error('editNode requires a valid node id or numeric line.');
        }
        await applyNodeLineEdit(
          lineIndex,
          message.content,
          message.requestId,
          typeof message.id === 'string' ? message.id : undefined,
        );
      } catch (error) {
        postEmbedError('editNode', error, message.requestId);
      }
      return;
    }

    if (typeof message.theme === 'string' && themes[message.theme]) {
      selectedTheme = message.theme;
      syncThemeChrome();
      void embed?.setTheme(themes[selectedTheme]);
      postEmbedResize();
    } else {
      const theme = resolveTheme(message.theme);
      if (theme) {
        void embed?.setTheme(theme);
        postEmbedResize();
      }
    }

    const nextContent =
      typeof message.content === 'string'
        ? message.content
        : typeof message.sample === 'string'
          ? getSample(message.sample)
          : undefined;
    if (nextContent) {
      const editor = document.querySelector<HTMLTextAreaElement>('#editor');
      if (editor) editor.value = nextContent;
      void updateMindmap(nextContent).catch((error: unknown) => {
        postEmbedError('setContent', error, message.requestId);
      });
    }
    if (message.action === 'fit') {
      void embed?.fit().catch((error: unknown) => {
        postEmbedError('fit', error, message.requestId);
      });
    }
  });

  postParentMessage({ type: 'capa:mindmap:ready', version: 1 });
  postEmbedResize();
}

function wireEmbedResize() {
  if (!isEmbedMode) return;
  window.addEventListener('resize', postEmbedResize);
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
    workspace.style.gridTemplateColumns = `${left}px 8px minmax(0, 1fr) 320px`;
  });
}

function refreshEmbedSnippets() {
  const url = document.querySelector<HTMLInputElement>('#embedUrl');
  const blocks = document.querySelectorAll<HTMLElement>('.snippetBlock code');
  if (url) url.value = getEmbedUrl();
  if (blocks[0]) blocks[0].textContent = getIframeSnippet();
  if (blocks[1]) blocks[1].textContent = getScriptSnippet();
}

function wireEmbedTools() {
  const copyText = async (button: HTMLButtonElement, text: string) => {
    await navigator.clipboard.writeText(text);
    const label = button.textContent || 'Copy';
    button.textContent = 'Copied';
    window.setTimeout(() => {
      button.textContent = label;
    }, 1400);
  };

  document
    .querySelectorAll<HTMLButtonElement>('.copyButton')
    .forEach((button) => {
      button.addEventListener('click', () => {
        const kind = button.dataset.copy;
        const value =
          kind === 'iframe'
            ? getIframeSnippet()
            : kind === 'script'
              ? getScriptSnippet()
              : getEmbedUrl();
        void copyText(button, value);
      });
    });

  document
    .querySelector<HTMLButtonElement>('#openHostTest')
    ?.addEventListener('click', () => {
      window.open(getHostExampleUrl(), '_blank', 'noopener');
    });
}

function wireEmbedHelp() {
  let selectedSnippet: EmbedHelpSnippetKey = 'web-component';
  const snippet = document.querySelector<HTMLElement>('#embedHelpSnippet code');
  const copyButton =
    document.querySelector<HTMLButtonElement>('#embedHelpCopy');
  const copyUrlButton =
    document.querySelector<HTMLButtonElement>('#embedHelpCopyUrl');

  const copyText = async (button: HTMLButtonElement, text: string) => {
    await navigator.clipboard.writeText(text);
    const label = button.textContent || 'Copy';
    button.textContent = 'Copied';
    window.setTimeout(() => {
      button.textContent = label;
    }, 1400);
  };

  const setSnippet = (key: EmbedHelpSnippetKey) => {
    selectedSnippet = key;
    if (snippet) snippet.textContent = getEmbedHelpSnippet(key);
    document
      .querySelectorAll<HTMLButtonElement>('[data-snippet-tab]')
      .forEach((button) => {
        const active = button.dataset.snippetTab === key;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
      });
  };

  document
    .querySelectorAll<HTMLButtonElement>('[data-snippet-tab]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        const key = button.dataset.snippetTab as EmbedHelpSnippetKey;
        if (key in embedHelpSnippets) setSnippet(key);
      });
    });
  copyButton?.addEventListener('click', () => {
    void copyText(copyButton, getEmbedHelpSnippet(selectedSnippet));
  });
  copyUrlButton?.addEventListener('click', () => {
    void copyText(copyUrlButton, getEmbedUrl());
  });
}

function setHostStatus(value: string) {
  const status = document.querySelector<HTMLElement>('#hostStatus');
  if (status) status.textContent = value;
}

function setHostLog(value: string) {
  const log = document.querySelector<HTMLElement>('#hostEventLog');
  if (log) log.textContent = value;
}

function setHostEditor(enabled: boolean, value = '') {
  const input = document.querySelector<HTMLInputElement>('#hostNodeText');
  const save = document.querySelector<HTMLButtonElement>('#hostSaveNode');
  if (input) {
    input.disabled = !enabled;
    input.value = value;
  }
  if (save) save.disabled = !enabled;
}

function setHostNodeId(value = '') {
  const input = document.querySelector<HTMLInputElement>('#hostNodeId');
  if (input) input.value = value;
}

function setHostDirtyState(value: string) {
  const state = document.querySelector<HTMLElement>('#hostDirtyState');
  if (state) {
    state.textContent = value;
    state.dataset.state = value.toLowerCase();
  }
}

function isHostAutosaveEnabled() {
  return !!document.querySelector<HTMLInputElement>('#hostAutosave')?.checked;
}

function getHostMapId() {
  const input = document.querySelector<HTMLInputElement>('#hostMapId');
  return input?.value.trim() || 'client-demo';
}

function getHostStorageKey(id: string) {
  return `capa:mindmap:${id}`;
}

function saveHostMap(id: string, status = 'Saved map') {
  setHostStatus('Saving map');
  return hostConnection
    ?.saveMap(id, {
      requestId: `host-save-map-${Date.now()}`,
      timeoutMs: 5000,
    })
    .then((result) => {
      hostDirty = false;
      hostLatestMarkdown = result.markdown;
      setHostDirtyState('Saved');
      setHostStatus(status);
      setHostLog(`Saved ${result.markdown.length} markdown chars to ${id}.`);
      return result;
    })
    .catch((error: unknown) => {
      setHostStatus('Error');
      setHostDirtyState('Dirty');
      setHostLog(getErrorMessage(error));
      throw error;
    });
}

function queueHostAutosave() {
  window.clearTimeout(hostAutosaveTimer);
  if (!isHostAutosaveEnabled()) return;
  hostAutosaveTimer = window.setTimeout(() => {
    void saveHostMap(getHostMapId(), 'Autosaved');
  }, 600);
}

async function wireHostSdkExample() {
  const iframe = document.querySelector<HTMLIFrameElement>('#hostMindmapFrame');
  if (!iframe) return;
  const { connectMindmap } = await import(
    '../../../packages/markmap-embed/src/index'
  );

  hostConnection = connectMindmap(iframe, {
    autoResize: true,
    queueUntilReady: true,
    readyTimeoutMs: 10000,
    persistence: {
      load(id) {
        return (
          window.localStorage.getItem(getHostStorageKey(id)) ||
          getSample(selectedSample)
        );
      },
      save(id, markdown) {
        window.localStorage.setItem(getHostStorageKey(id), markdown);
      },
    },
  });
  hostConnection.onReady(() => {
    setHostStatus('Ready');
    setHostLog('Click a node in the iframe to edit it from this host panel.');
  });
  hostConnection.onNodeClick((node) => {
    const text = stripNodeContent(node.content);
    hostSelectedNodeId = node.id;
    hostSelectedLineIndex = getEditableLineIndex({ payload: node.payload });
    const selected = document.querySelector<HTMLElement>('#hostSelectedNode');
    if (selected) selected.textContent = text;
    setHostNodeId(hostSelectedNodeId || '');
    setHostEditor(!!hostSelectedNodeId || hostSelectedLineIndex != null, text);
    setHostLog(
      hostSelectedNodeId
        ? `Selected ${hostSelectedNodeId}.`
        : hostSelectedLineIndex == null
          ? 'Selected node has no editable markdown line.'
          : `Selected line ${hostSelectedLineIndex}.`,
    );
  });
  hostConnection.onNodeEdit((result) => {
    setHostStatus(`Saved line ${result.node.line}`);
    setHostLog(`Updated node: ${result.node.content}`);
    setHostNodeId(result.node.id || hostSelectedNodeId || '');
    setHostEditor(true, result.node.content);
  });
  hostConnection.onChange((result) => {
    hostDirty = result.dirty;
    hostLatestMarkdown = result.markdown;
    setHostDirtyState(result.dirty ? 'Dirty' : 'Saved');
    if (result.dirty) queueHostAutosave();
  });
  hostConnection.onResize((result) => {
    setHostLog(
      `Iframe resize ${Math.round(result.width || 0)} x ${Math.round(result.height)}.`,
    );
  });
  hostConnection.onError((result) => {
    setHostStatus('Error');
    setHostLog(result.message);
  });
  hostConnection.ready().catch((error: unknown) => {
    setHostStatus('Error');
    setHostLog(getErrorMessage(error));
  });

  document
    .querySelector<HTMLButtonElement>('#hostSaveNode')
    ?.addEventListener('click', () => {
      const input = document.querySelector<HTMLInputElement>('#hostNodeText');
      const content = input?.value.trim() || '';
      if (!hostSelectedNodeId && hostSelectedLineIndex == null) {
        setHostLog('Select an editable node and enter text before saving.');
        return;
      }
      if (!content) {
        setHostLog('Enter node text before saving.');
        return;
      }
      setHostStatus('Saving');
      hostConnection?.editNode({
        content,
        id: hostSelectedNodeId,
        line: hostSelectedNodeId ? undefined : hostSelectedLineIndex,
        requestId: `host-edit-${Date.now()}`,
      });
    });
  document
    .querySelector<HTMLButtonElement>('#hostFit')
    ?.addEventListener('click', () => {
      hostConnection?.fit();
    });
  document
    .querySelector<HTMLButtonElement>('#hostExport')
    ?.addEventListener('click', () => {
      setHostStatus('Exporting');
      hostConnection
        ?.export(['markdown', 'svg'], {
          requestId: `host-export-${Date.now()}`,
          timeoutMs: 5000,
        })
        .then((result) => {
          setHostStatus('Ready');
          setHostLog(
            `Exported ${result.markdown.length} markdown chars and ${result.svg.length} svg chars.`,
          );
        })
        .catch((error: unknown) => {
          setHostStatus('Error');
          setHostLog(getErrorMessage(error));
        });
    });
  document
    .querySelector<HTMLButtonElement>('#hostSaveMap')
    ?.addEventListener('click', () => {
      void saveHostMap(getHostMapId());
    });
  document
    .querySelector<HTMLButtonElement>('#hostLoadMap')
    ?.addEventListener('click', () => {
      const id = getHostMapId();
      setHostStatus('Loading map');
      hostConnection
        ?.loadMap(id, { theme: selectedTheme })
        .then((markdown) => {
          hostDirty = false;
          hostLatestMarkdown = markdown;
          setHostDirtyState('Saved');
          setHostStatus('Loaded map');
          setHostLog(`Loaded ${markdown.length} markdown chars from ${id}.`);
        })
        .catch((error: unknown) => {
          setHostStatus('Error');
          setHostLog(getErrorMessage(error));
        });
    });
  document
    .querySelector<HTMLInputElement>('#hostAutosave')
    ?.addEventListener('change', () => {
      if (hostDirty && hostLatestMarkdown) queueHostAutosave();
    });
}

async function boot() {
  syncThemeChrome();
  renderApp();

  if (isEmbedHelpMode) {
    wireEmbedHelp();
    return;
  }

  if (isHostMode) {
    await wireHostSdkExample();
    return;
  }

  const editor = document.querySelector<HTMLTextAreaElement>('#editor');
  const host = document.querySelector<HTMLDivElement>('#mapHost');
  if (!host) return;

  const content = getSample(selectedSample);
  currentContent = content;
  if (editor) editor.value = content;
  const { createMindmap } = await import(
    '../../../packages/markmap-embed/src/index'
  );
  embed = await createMindmap(host, {
    content,
    autoFit: true,
    autoResize: true,
    theme: themes[selectedTheme],
    parserOptions: {
      sanitize: true,
    },
    onNodeClick: ({ node }) => {
      selectNodeForEditing(node);
    },
  });

  wireHostMessages();
  wireEmbedResize();

  if (isEmbedMode) return;
  if (!editor) return;

  document.querySelector<HTMLSpanElement>('#nodeCount')!.textContent =
    `${countNodes(content)} nodes`;

  wireNodeEditor();

  editor.addEventListener('input', () => {
    currentContent = editor.value;
    scheduleUpdate(editor.value);
  });
  document
    .querySelector<HTMLButtonElement>('#fitButton')
    ?.addEventListener('click', () => {
      void embed?.fit();
    });
  document
    .querySelector<HTMLButtonElement>('#resetButton')
    ?.addEventListener('click', () => {
      selectedSample = 'implementation';
      editor.value = starterMarkdown;
      const sampleSelect =
        document.querySelector<HTMLSelectElement>('#sampleSelect');
      if (sampleSelect) sampleSelect.value = selectedSample;
      refreshEmbedSnippets();
      void updateMindmap(editor.value);
    });
  document
    .querySelector<HTMLSelectElement>('#sampleSelect')
    ?.addEventListener('change', (event) => {
      const value = (event.target as HTMLSelectElement).value;
      selectedSample = value;
      editor.value = getSample(value);
      refreshEmbedSnippets();
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
        syncThemeChrome();
        refreshEmbedSnippets();
        void embed?.setTheme(themes[selectedTheme]);
      });
    });
  wireResize();
  wireEmbedTools();
}

void boot();

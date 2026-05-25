export type MindmapExportFormat = 'markdown' | 'svg' | 'png';

export interface MindmapHostNode {
  content: string;
  id?: string;
  rawContent: string;
  depth?: number;
  path?: string;
  payload?: unknown;
}

export interface MindmapHostEditedNode {
  content: string;
  id?: string;
  previousContent?: string;
  line?: number;
}

export interface MindmapNodeEditCommand {
  content: string;
  id?: string;
  line?: number;
  requestId?: string;
}

export interface MindmapNodeEditResult {
  markdown?: string;
  node: MindmapHostEditedNode;
}

export interface MindmapChangeResult {
  dirty: boolean;
  markdown: string;
  reason?: string;
  requestId?: unknown;
}

export interface MindmapPersistedMap {
  id: string;
  markdown: string;
}

export interface MindmapPersistenceAdapter {
  load(id: string): Promise<string> | string;
  save(id: string, markdown: string): Promise<void> | void;
}

export interface MindmapExportResult {
  type: 'capa:mindmap:export';
  requestId?: unknown;
  markdown: string;
  svg: string;
  png?: string;
  theme?: string;
}

export interface MindmapResizeResult {
  height: number;
  width?: number;
}

export interface MindmapErrorResult {
  action?: string;
  message: string;
  requestId?: unknown;
}

export interface MindmapHostConnection {
  ready(): Promise<void>;
  setContent(content: string, options?: MindmapSetContentOptions): void;
  editNode(command: MindmapNodeEditCommand): void;
  fit(): void;
  export(
    formats?: MindmapExportFormat[],
    options?: MindmapExportOptions,
  ): Promise<MindmapExportResult>;
  loadMap(id: string, options?: MindmapSetContentOptions): Promise<string>;
  saveMap(
    id: string,
    options?: MindmapExportOptions,
  ): Promise<MindmapPersistedMap>;
  onReady(listener: () => void): () => void;
  onChange(listener: (result: MindmapChangeResult) => void): () => void;
  onNodeClick(listener: (node: MindmapHostNode) => void): () => void;
  onNodeEdit(listener: (result: MindmapNodeEditResult) => void): () => void;
  onExport(listener: (result: MindmapExportResult) => void): () => void;
  onError(listener: (result: MindmapErrorResult) => void): () => void;
  onResize(listener: (result: MindmapResizeResult) => void): () => void;
  destroy(): void;
}

export interface MindmapSetContentOptions {
  theme?: string | Record<string, unknown>;
  sample?: string;
}

export interface MindmapExportOptions {
  requestId?: string;
  timeoutMs?: number;
}

export interface ConnectMindmapOptions {
  autoResize?: boolean;
  queueUntilReady?: boolean;
  readyTimeoutMs?: number;
  persistence?: MindmapPersistenceAdapter;
  targetOrigin?: string;
  window?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
}

type HostWindow = Pick<Window, 'addEventListener' | 'removeEventListener'>;
type Listener<T> = (value: T) => void;
type PendingExport = {
  reject: (error: Error) => void;
  resolve: (result: MindmapExportResult) => void;
  timer?: ReturnType<typeof setTimeout>;
};

interface MindmapEventMessage {
  type?: unknown;
  requestId?: unknown;
  node?: unknown;
}

const HOST_MESSAGE_TYPE = 'capa:mindmap';
const READY_MESSAGE_TYPE = 'capa:mindmap:ready';
const CHANGE_MESSAGE_TYPE = 'capa:mindmap:change';
const EXPORT_MESSAGE_TYPE = 'capa:mindmap:export';
const ERROR_MESSAGE_TYPE = 'capa:mindmap:error';
const NODE_CLICK_MESSAGE_TYPE = 'capa:mindmap:nodeClick';
const NODE_EDIT_MESSAGE_TYPE = 'capa:mindmap:nodeEdit';
const RESIZE_MESSAGE_TYPE = 'capa:mindmap:resize';

function getWindow(options: ConnectMindmapOptions): HostWindow {
  if (options.window) return options.window;
  return window;
}

function getTargetOrigin(
  iframe: HTMLIFrameElement,
  options: ConnectMindmapOptions,
) {
  if (options.targetOrigin) return options.targetOrigin;
  const base =
    typeof window === 'undefined' ? 'http://localhost' : window.location.href;
  return new URL(iframe.src, base).origin;
}

function createRequestId() {
  return globalThis.crypto?.randomUUID?.() || `mindmap-${Date.now()}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isHostNode(value: unknown): value is MindmapHostNode {
  return (
    isObject(value) &&
    typeof value.content === 'string' &&
    typeof value.rawContent === 'string'
  );
}

function isEditedNode(value: unknown): value is MindmapHostEditedNode {
  return (
    isObject(value) &&
    typeof value.content === 'string' &&
    (value.id == null || typeof value.id === 'string') &&
    (value.previousContent == null ||
      typeof value.previousContent === 'string') &&
    (value.line == null ||
      (typeof value.line === 'number' && Number.isFinite(value.line)))
  );
}

function isNodeEditResult(value: unknown): value is MindmapNodeEditResult {
  return (
    isObject(value) &&
    value.type === NODE_EDIT_MESSAGE_TYPE &&
    isEditedNode(value.node) &&
    (value.markdown == null || typeof value.markdown === 'string')
  );
}

function isChangeResult(value: unknown): value is MindmapChangeResult {
  return (
    isObject(value) &&
    value.type === CHANGE_MESSAGE_TYPE &&
    typeof value.dirty === 'boolean' &&
    typeof value.markdown === 'string' &&
    (value.reason == null || typeof value.reason === 'string')
  );
}

function isExportResult(value: unknown): value is MindmapExportResult {
  return (
    isObject(value) &&
    value.type === EXPORT_MESSAGE_TYPE &&
    typeof value.markdown === 'string' &&
    typeof value.svg === 'string'
  );
}

function isResizeResult(value: unknown): value is MindmapResizeResult {
  return (
    isObject(value) &&
    value.type === RESIZE_MESSAGE_TYPE &&
    typeof value.height === 'number' &&
    Number.isFinite(value.height) &&
    (value.width == null ||
      (typeof value.width === 'number' && Number.isFinite(value.width)))
  );
}

function isErrorResult(value: unknown): value is MindmapErrorResult {
  return (
    isObject(value) &&
    value.type === ERROR_MESSAGE_TYPE &&
    typeof value.message === 'string' &&
    (value.action == null || typeof value.action === 'string')
  );
}

function addSetListener<T>(listeners: Set<Listener<T>>, listener: Listener<T>) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function formatRequestId(requestId: unknown) {
  return typeof requestId === 'string' ? requestId : String(requestId);
}

function requirePersistence(
  persistence: MindmapPersistenceAdapter | undefined,
) {
  if (!persistence) {
    throw new Error('Mindmap persistence adapter is not configured');
  }
  return persistence;
}

export function connectMindmap(
  iframe: HTMLIFrameElement,
  options: ConnectMindmapOptions = {},
): MindmapHostConnection {
  const hostWindow = getWindow(options);
  const targetOrigin = getTargetOrigin(iframe, options);
  const readyListeners = new Set<Listener<void>>();
  const changeListeners = new Set<Listener<MindmapChangeResult>>();
  const nodeClickListeners = new Set<Listener<MindmapHostNode>>();
  const nodeEditListeners = new Set<Listener<MindmapNodeEditResult>>();
  const exportListeners = new Set<Listener<MindmapExportResult>>();
  const errorListeners = new Set<Listener<MindmapErrorResult>>();
  const resizeListeners = new Set<Listener<MindmapResizeResult>>();
  const pendingExports = new Map<unknown, PendingExport>();
  const queuedMessages: Record<string, unknown>[] = [];
  let iframeReady = false;
  let resolveReady: () => void = () => {};
  let rejectReady: (error: Error) => void = () => {};
  const readyPromise = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  readyPromise.catch(() => {});
  const readyTimer =
    options.readyTimeoutMs == null
      ? undefined
      : setTimeout(() => {
          rejectReady(new Error('Mindmap ready timed out'));
        }, options.readyTimeoutMs);

  const postNow = (message: Record<string, unknown>) => {
    iframe.contentWindow?.postMessage(message, targetOrigin);
  };

  const post = (message: Record<string, unknown>) => {
    if (options.queueUntilReady && !iframeReady) {
      queuedMessages.push(message);
      return;
    }
    postNow(message);
  };

  const flushQueuedMessages = () => {
    while (queuedMessages.length) {
      postNow(queuedMessages.shift()!);
    }
  };

  const handleMessage = (event: MessageEvent) => {
    if (targetOrigin !== '*' && event.origin !== targetOrigin) return;
    if (event.source && event.source !== iframe.contentWindow) return;

    if (!isObject(event.data)) return;
    const message = event.data as MindmapEventMessage;

    if (message.type === READY_MESSAGE_TYPE) {
      iframeReady = true;
      if (readyTimer) clearTimeout(readyTimer);
      resolveReady();
      flushQueuedMessages();
      readyListeners.forEach((listener) => listener());
      return;
    }

    if (message.type === NODE_CLICK_MESSAGE_TYPE && isHostNode(message.node)) {
      const node = message.node;
      nodeClickListeners.forEach((listener) => listener(node));
      return;
    }

    if (isChangeResult(message)) {
      const result = {
        dirty: message.dirty,
        markdown: message.markdown,
        reason: message.reason,
        requestId: message.requestId,
      };
      changeListeners.forEach((listener) => listener(result));
      return;
    }

    if (isNodeEditResult(message)) {
      const result = {
        markdown: message.markdown,
        node: message.node,
      };
      nodeEditListeners.forEach((listener) => listener(result));
      return;
    }

    if (isExportResult(message)) {
      const result = message;
      const pending = pendingExports.get(message.requestId);
      if (pending?.timer) clearTimeout(pending.timer);
      pending?.resolve(result);
      pendingExports.delete(message.requestId);
      exportListeners.forEach((listener) => listener(result));
      return;
    }

    if (isErrorResult(message)) {
      const result = {
        action: message.action,
        message: message.message,
        requestId: message.requestId,
      };
      errorListeners.forEach((listener) => listener(result));
      return;
    }

    if (isResizeResult(message)) {
      const result = { height: message.height, width: message.width };
      if (options.autoResize) iframe.style.height = `${result.height}px`;
      resizeListeners.forEach((listener) => listener(result));
    }
  };

  hostWindow.addEventListener('message', handleMessage as EventListener);

  return {
    ready() {
      return readyPromise;
    },
    setContent(content, setOptions = {}) {
      post({
        type: HOST_MESSAGE_TYPE,
        action: 'setContent',
        content,
        ...setOptions,
      });
    },
    editNode(command) {
      const message: Record<string, unknown> = {
        type: HOST_MESSAGE_TYPE,
        action: 'editNode',
        content: command.content,
        requestId: command.requestId,
      };
      if (command.id != null) {
        message.id = command.id;
      } else {
        message.line = command.line;
      }
      post({
        ...message,
      });
    },
    fit() {
      post({
        type: HOST_MESSAGE_TYPE,
        action: 'fit',
      });
    },
    export(formats = ['markdown', 'svg'], exportOptions = {}) {
      const requestId = exportOptions.requestId || createRequestId();
      post({
        type: HOST_MESSAGE_TYPE,
        action: 'export',
        formats,
        requestId,
      });
      return new Promise<MindmapExportResult>((resolve, reject) => {
        const pending: PendingExport = { resolve, reject };
        if (exportOptions.timeoutMs != null) {
          pending.timer = setTimeout(() => {
            pendingExports.delete(requestId);
            reject(
              new Error(
                `Mindmap export timed out: ${formatRequestId(requestId)}`,
              ),
            );
          }, exportOptions.timeoutMs);
        }
        pendingExports.set(requestId, pending);
      });
    },
    async loadMap(id, setOptions = {}) {
      const persistence = requirePersistence(options.persistence);
      const content = await persistence.load(id);
      this.setContent(content, setOptions);
      return content;
    },
    async saveMap(id, exportOptions = {}) {
      const persistence = requirePersistence(options.persistence);
      const result = await this.export(['markdown'], exportOptions);
      await persistence.save(id, result.markdown);
      return {
        id,
        markdown: result.markdown,
      };
    },
    onReady(listener) {
      return addSetListener(readyListeners, listener);
    },
    onChange(listener) {
      return addSetListener(changeListeners, listener);
    },
    onNodeClick(listener) {
      return addSetListener(nodeClickListeners, listener);
    },
    onNodeEdit(listener) {
      return addSetListener(nodeEditListeners, listener);
    },
    onExport(listener) {
      return addSetListener(exportListeners, listener);
    },
    onError(listener) {
      return addSetListener(errorListeners, listener);
    },
    onResize(listener) {
      return addSetListener(resizeListeners, listener);
    },
    destroy() {
      hostWindow.removeEventListener('message', handleMessage as EventListener);
      if (!iframeReady) {
        rejectReady(new Error('Mindmap connection destroyed before ready'));
      }
      if (readyTimer) clearTimeout(readyTimer);
      readyListeners.clear();
      changeListeners.clear();
      nodeClickListeners.clear();
      nodeEditListeners.clear();
      exportListeners.clear();
      errorListeners.clear();
      resizeListeners.clear();
      pendingExports.forEach((pending, requestId) => {
        if (pending.timer) clearTimeout(pending.timer);
        pending.reject(
          new Error(
            `Mindmap connection destroyed before export completed: ${formatRequestId(
              requestId,
            )}`,
          ),
        );
      });
      pendingExports.clear();
      queuedMessages.length = 0;
    },
  };
}

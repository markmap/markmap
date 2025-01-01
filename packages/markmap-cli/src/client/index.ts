import type { INode } from 'markmap-common';
import type { ITransformResult } from 'markmap-lib';
import { IFileState } from '../types';

const { mm, markmap } = window;
const { cliOptions } = markmap;
const key = new URLSearchParams(window.location.search).get('key') || '';

const state: IFileState = {
  content: {
    ts: 0,
    value: undefined,
  },
  line: {
    ts: 0,
    value: 0,
  },
};
const activeNodeOptions: {
  placement?: 'center' | 'visible';
} = {};

const highlightEl = document.createElement('div');
highlightEl.className = 'markmap-highlight-area';

checkData();

async function checkData() {
  try {
    const query = new URLSearchParams(
      [
        ['key', key],
        ['content', state.content.ts],
        ['line', state.line.ts],
      ].map((pair) => pair.map((s) => `${s}`)),
    );
    const resp = await fetch(`/~data?${query}`);
    if (!resp.ok)
      throw {
        status: resp.status,
      };
    const res = (await resp.json()) as IFileState;
    if (res.content) {
      const value = res.content.value as ITransformResult;
      mm.setOptions(markmap.deriveOptions(value.frontmatter?.markmap));
      await mm.setData(value.root);
      if (!state.content.ts) await mm.fit();
    }
    Object.assign(state, res);
    if (res.line && state.content.value) {
      await setCursor({ line: res.line.value as number });
    }
    setTimeout(checkData);
  } catch (err) {
    if ((err as { status: number }).status !== 404) {
      setTimeout(checkData, 1000);
    }
  }
}

function findActiveNode({
  line,
  autoExpand = true,
}: {
  line: number;
  autoExpand?: boolean;
}) {
  function dfs(node: INode, ancestors: INode[] = []) {
    const [start, end] =
      (node.payload?.lines as string)?.split(',').map((s) => +s) || [];
    if (start >= 0 && start <= line && line < end) {
      best = node;
      bestAncestors = ancestors;
    }
    ancestors = [...ancestors, node];
    node.children?.forEach((child) => {
      dfs(child, ancestors);
    });
  }
  let best: INode | undefined;
  let bestAncestors: INode[] = [];
  dfs((state.content.value as ITransformResult).root as INode);
  if (autoExpand) {
    bestAncestors.forEach((node) => {
      if (node.payload?.fold) {
        node.payload.fold = 0;
      }
    });
  }
  return best;
}

async function setCursor(options: { line: number; autoExpand?: boolean }) {
  if (!state.content.value) return;
  const node = findActiveNode(options);
  await highlightNode(node);
}

async function highlightNode(node?: INode) {
  await mm.setHighlight(node);
  if (!node) return;
  await mm[
    activeNodeOptions.placement === 'center' ? 'centerNode' : 'ensureVisible'
  ](node, {
    bottom: cliOptions.toolbar ? 80 : 0,
  });
}

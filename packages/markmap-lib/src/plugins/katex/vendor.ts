import katexPluginModule from '@vscode/markdown-it-katex';

function interop<T>(mod: T | { default: T }): T {
  return (mod as { default: T }).default || (mod as T);
}

export const katexPlugin = interop(katexPluginModule);

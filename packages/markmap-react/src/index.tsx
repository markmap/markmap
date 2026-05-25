import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type HTMLAttributes,
  type IframeHTMLAttributes,
} from 'react';
import { connectMindmap, createMindmap } from 'markmap-embed';
import type {
  ConnectMindmapOptions,
  MindmapChangeResult,
  MindmapEmbed,
  MindmapEmbedOptions,
  MindmapErrorResult,
  MindmapHostConnection,
  MindmapPersistedMap,
} from 'markmap-embed';

export interface MarkmapProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onError'>,
    Omit<MindmapEmbedOptions, 'signal'> {
  onReady?: (embed: MindmapEmbed) => void;
  onError?: (error: unknown) => void;
}

export interface MarkmapHandle {
  getEmbed(): MindmapEmbed | undefined;
}

export interface MindmapHostFrameProps
  extends Omit<
      IframeHTMLAttributes<HTMLIFrameElement>,
      'children' | 'onChange' | 'onError'
    >,
    Omit<ConnectMindmapOptions, 'window'> {
  autosave?: boolean;
  autosaveDebounceMs?: number;
  mapId?: string;
  onAutosave?: (map: MindmapPersistedMap) => void;
  onChange?: (result: MindmapChangeResult) => void;
  onError?: (error: MindmapErrorResult | unknown) => void;
  onReady?: (connection: MindmapHostConnection) => void;
}

export interface MindmapHostFrameHandle {
  getConnection(): MindmapHostConnection | undefined;
}

export const Markmap = forwardRef<MarkmapHandle, MarkmapProps>(
  (
    {
      content = '',
      transformer,
      parserOptions,
      viewOptions,
      theme,
      autoFit,
      autoResize,
      onReady,
      onUpdate,
      onError,
      onDestroy,
      onNodeClick,
      onNodeToggle,
      ...containerProps
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const embedRef = useRef<MindmapEmbed>();

    useImperativeHandle(ref, () => ({
      getEmbed: () => embedRef.current,
    }));

    useEffect(() => {
      if (!containerRef.current) return;
      const controller = new AbortController();
      let mounted = true;

      createMindmap(containerRef.current, {
        content,
        transformer,
        parserOptions,
        viewOptions,
        theme,
        autoFit,
        autoResize,
        signal: controller.signal,
        onUpdate,
        onDestroy,
        onNodeClick,
        onNodeToggle,
      })
        .then((embed) => {
          if (!mounted) {
            embed.destroy();
            return;
          }
          embedRef.current = embed;
          onReady?.(embed);
        })
        .catch((error: unknown) => {
          if (mounted) onError?.(error);
        });

      return () => {
        mounted = false;
        controller.abort();
        embedRef.current = undefined;
      };
    }, []);

    useEffect(() => {
      if (!embedRef.current) return;
      embedRef.current.update(content).catch((error: unknown) => {
        onError?.(error);
      });
    }, [content]);

    return <div {...containerProps} ref={containerRef} />;
  },
);

Markmap.displayName = 'Markmap';

export const MindmapHostFrame = forwardRef<
  MindmapHostFrameHandle,
  MindmapHostFrameProps
>(
  (
    {
      autosave,
      autosaveDebounceMs = 600,
      autoResize,
      mapId,
      onAutosave,
      onChange,
      onError,
      onReady,
      persistence,
      queueUntilReady,
      readyTimeoutMs,
      targetOrigin,
      ...iframeProps
    },
    ref,
  ) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const connectionRef = useRef<MindmapHostConnection>();
    const autosaveTimerRef = useRef<ReturnType<typeof setTimeout>>();

    useImperativeHandle(ref, () => ({
      getConnection: () => connectionRef.current,
    }));

    useEffect(() => {
      if (!iframeRef.current) return;

      const connection = connectMindmap(iframeRef.current, {
        autoResize,
        persistence,
        queueUntilReady,
        readyTimeoutMs,
        targetOrigin,
      });
      const clearAutosave = () => {
        if (autosaveTimerRef.current) {
          clearTimeout(autosaveTimerRef.current);
          autosaveTimerRef.current = undefined;
        }
      };
      const scheduleAutosave = (result: MindmapChangeResult) => {
        if (!autosave || !mapId || !result.dirty) return;
        clearAutosave();
        autosaveTimerRef.current = setTimeout(() => {
          void connection.saveMap(mapId).then(onAutosave).catch(onError);
        }, autosaveDebounceMs);
      };
      const removeChangeListener = connection.onChange((result) => {
        onChange?.(result);
        scheduleAutosave(result);
      });
      const removeErrorListener = connection.onError((error) => {
        onError?.(error);
      });

      connectionRef.current = connection;
      onReady?.(connection);

      return () => {
        clearAutosave();
        removeChangeListener();
        removeErrorListener();
        connection.destroy();
        connectionRef.current = undefined;
      };
    }, []);

    return <iframe {...iframeProps} ref={iframeRef} />;
  },
);

MindmapHostFrame.displayName = 'MindmapHostFrame';

export default Markmap;

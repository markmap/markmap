import React, { useRef, useEffect, useState } from 'react';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';
import * as d3 from 'd3';

const transformer = new Transformer();

export interface MindMapProps {
  value: string;
  onChange?: (value: string) => void;
  spacingH?: number;
  spacingV?: number;
}

const colors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F06292', '#AED581', '#FFD54F', '#4DB6AC', '#7986CB'
];

export const MindMap: React.FC<MindMapProps> = ({ value, onChange, spacingH = 50, spacingV = 20 }) => {
  const refSvg = useRef<SVGSVGElement>(null);
  const refMm = useRef<Markmap>(null as any);
  const [editingNode, setEditingNode] = useState<{ id: string, text: string, x: number, y: number, path: string } | null>(null);

  useEffect(() => {
    if (refMm.current) {
      return;
    }

    // Create markmap instance
    const mm = Markmap.create(refSvg.current!, undefined, null as any);
    refMm.current = mm;

  }, []);

  useEffect(() => {
    const mm = refMm.current;
    if (mm) {
      const { root } = transformer.transform(value || '');

      // Color assignment
      if (root && root.children) {
         root.children.forEach((child, index) => {
             const assignColor = (n: any, color: string) => {
                 n.payload = { ...n.payload, color };
                 if (n.children) {
                     n.children.forEach((c: any) => assignColor(c, color));
                 }
             };
             assignColor(child, colors[index % colors.length]);
         });
      }

      // Assign custom options
      mm.setOptions({
          spacingHorizontal: spacingH,
          spacingVertical: spacingV,
          color: (node: any) => {
            if (node.payload && node.payload.color) return node.payload.color;
            return '#000';
          }
      });
      mm.setData(root);
      mm.fit();

      // Post-render styling and event binding
      setTimeout(() => {
          const svg = d3.select(refSvg.current);

          // Apply color to links (paths)
          svg.selectAll('.markmap-link').each(function(d: any) {
              if (d.target && d.target.data && d.target.data.payload && d.target.data.payload.color) {
                  d3.select(this as any).style('stroke', d.target.data.payload.color);
              }
          });

          // Apply to circles
          svg.selectAll('.markmap-node circle').each(function(d: any) {
               if (d.data && d.data.payload && d.data.payload.color) {
                  d3.select(this as any).style('stroke', d.data.payload.color);
                  d3.select(this as any).style('fill', d.data.payload.color);
              }
          });

          // Remove old listeners to prevent duplicates
          svg.on('dblclick', null);
          svg.on('click', null);

          // Add double click listener to nodes for editing using event delegation
          svg.on('dblclick', (e) => {
              const nodeEl = (e.target as Element).closest('.markmap-node');
              if (nodeEl) {
                  e.stopPropagation();
                  const bbox = nodeEl.getBoundingClientRect();

                  // Use d3 to get the data bound to the closest .markmap-node
                  const nodeData: any = d3.select(nodeEl).datum();
                  if (!nodeData || !nodeData.data) return;

                  const getPath = (node: any, currentPath: number[] = []): number[] => {
                      if (!node || node.parent === null || node.parent === undefined) return currentPath;
                      if (!node.parent.children) return currentPath;
                      const index = node.parent.children.indexOf(node);
                      return getPath(node.parent, [index, ...currentPath]);
                  };

                  setEditingNode({
                      id: nodeData.data.id,
                      text: nodeData.data.content,
                      x: bbox.left,
                      y: bbox.top,
                      path: getPath(nodeData).join('.')
                  });
              }
          });

          // Add image click listener using event delegation
          svg.on('click', (e) => {
               const imgEl = (e.target as Element).closest('img');
               if (imgEl) {
                   e.stopPropagation();
                   const src = (imgEl as HTMLImageElement).src;
                   window.dispatchEvent(new CustomEvent('open-image-modal', { detail: { src } }));
               }
          });
      }, 100);
    }
  }, [value, spacingH, spacingV]);

  // Expose fit method for external reset button
  useEffect(() => {
      const handleReset = () => {
          if (refMm.current) {
              refMm.current.fit();
          }
      };
      window.addEventListener('reset-mindmap', handleReset);
      return () => window.removeEventListener('reset-mindmap', handleReset);
  }, []);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (editingNode) {
          setEditingNode({ ...editingNode, text: e.target.value });
      }
  };

  const handleEditComplete = () => {
      if (!editingNode || !onChange) return;

      const buildMarkdown = (node: any, level: number = 0): string => {
          let md = '  '.repeat(level) + '- ' + node.content + '\n';
          if (node.children) {
              node.children.forEach((child: any) => {
                  md += buildMarkdown(child, level + 1);
              });
          }
          return md;
      };

      if (refMm.current) {
         const root = refMm.current.state.data;
         const updateNodeContent = (n: any) => {
             if (n.id === editingNode.id) {
                 n.content = editingNode.text;
             }
             if (n.children) {
                 n.children.forEach(updateNodeContent);
             }
         };
         updateNodeContent(root);

         let newMarkdown = buildMarkdown(root).trim();
         // Basic clean up: removing the first '- ' since the root usually is a '#'
         if (newMarkdown.startsWith('- ')) {
             newMarkdown = '# ' + newMarkdown.substring(2);
         }
         onChange(newMarkdown);
      }

      setEditingNode(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          handleEditComplete();
      } else if (e.key === 'Escape') {
          setEditingNode(null);
      }
  };

  return (
    <div className="w-full h-full relative">
      <svg className="w-full h-full" ref={refSvg} />
      {editingNode && (
          <div
            className="absolute bg-white shadow-lg border rounded p-2 z-50 flex flex-col gap-2"
            style={{ left: editingNode.x, top: editingNode.y }}
          >
              <input
                  type="text"
                  autoFocus
                  className="border p-1 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingNode.text}
                  onChange={handleEditChange}
                  onKeyDown={handleKeyDown}
                  onBlur={handleEditComplete}
              />
              <div className="text-xs text-gray-500">Press Enter to save, Esc to cancel. Note: Images are added via markdown `![alt](url)`</div>
          </div>
      )}
    </div>
  );
};

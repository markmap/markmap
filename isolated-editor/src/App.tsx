import React, { useState, useEffect } from 'react';
import { MindMap } from './MindMap';
import {
    Download, Upload, RefreshCw, FileText
} from 'lucide-react';

const initialMarkdown = `# Welcome
## Features
- Double click to edit nodes
- Drag to pan
- Scroll to zoom
- Interactive Images
- Add your own images
## Usage
- Enter text on the left
- View map on the right
## Images
- Click me to zoom!
- ![Sample](https://picsum.photos/200/100)
`;

function App() {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [spacingH, setSpacingH] = useState(80);
  const [spacingV, setSpacingV] = useState(30);
  const [showEditor, setShowEditor] = useState(true);
  const [modalImage, setModalImage] = useState<string | null>(null);

  useEffect(() => {
      const handleOpenModal = (e: any) => {
          setModalImage(e.detail.src);
      };
      window.addEventListener('open-image-modal', handleOpenModal);
      return () => window.removeEventListener('open-image-modal', handleOpenModal);
  }, []);

  const handleReset = () => {
      window.dispatchEvent(new CustomEvent('reset-mindmap'));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const content = event.target?.result as string;

          let converted = content;
          if (file.name.endsWith('.txt')) {
             const lines = content.split('\n');
             converted = lines.map(line => {
                 const trimLine = line.trim();
                 if (!trimLine) return '';

                 const spaces = line.search(/\S/);
                 const level = spaces > -1 ? Math.floor(spaces / 2) : 0;
                 return '  '.repeat(level) + '- ' + trimLine;
             }).join('\n');
             if (!converted.startsWith('#')) {
                 converted = '# Root\n' + converted;
             }
          }

          setMarkdown(converted);
      };
      reader.readAsText(file);
  };

  const handleDownloadHtml = () => {
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Interactive Mindmap</title>
<style>
  body, html { margin: 0; padding: 0; height: 100%; width: 100%; font-family: sans-serif; }
  #mindmap { width: 100vw; height: 100vh; }
</style>
<script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
<script src="https://cdn.jsdelivr.net/npm/markmap-view"></script>
<script src="https://cdn.jsdelivr.net/npm/markmap-lib"></script>
</head>
<body>
<svg id="mindmap"></svg>
<script>
  const { Markmap, loadCSS, loadJS } = window.markmap;
  const { Transformer } = window.markmap;

  const markdown = ${JSON.stringify(markdown)};
  const transformer = new Transformer();
  const { root, features } = transformer.transform(markdown);
  const { scripts, styles } = transformer.getAssets(features);

  if (styles) loadCSS(styles);
  if (scripts) loadJS(scripts, { getMarkmap: () => window.markmap });

  window.addEventListener('load', () => {
    const mm = Markmap.create('#mindmap', {
      spacingHorizontal: ${spacingH},
      spacingVertical: ${spacingV}
    }, root);
  });
</script>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mindmap.html';
      a.click();
      URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 overflow-hidden font-sans text-gray-800">

      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                 M
             </div>
             <h1 className="text-xl font-semibold tracking-tight">MindNode Clone</h1>
          </div>

          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-lg border border-gray-200">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider ml-1">Spacing H</label>
                  <input
                    type="range" min="30" max="200" value={spacingH}
                    onChange={(e) => setSpacingH(Number(e.target.value))}
                    className="w-24 accent-blue-500"
                  />
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider ml-2">V</label>
                  <input
                    type="range" min="10" max="100" value={spacingV}
                    onChange={(e) => setSpacingV(Number(e.target.value))}
                    className="w-24 accent-blue-500"
                  />
              </div>

              <div className="h-6 w-px bg-gray-300 mx-1"></div>

              <button
                  onClick={handleReset}
                  className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors flex items-center gap-2"
                  title="Reset / Center Map"
              >
                  <RefreshCw size={18} />
                  <span className="text-sm font-medium hidden sm:inline">Center</span>
              </button>

              <label className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors cursor-pointer flex items-center gap-2" title="Import TXT/MD">
                  <Upload size={18} />
                  <span className="text-sm font-medium hidden sm:inline">Import</span>
                  <input type="file" accept=".txt,.md" className="hidden" onChange={handleFileUpload} />
              </label>

              <button
                  onClick={handleDownloadHtml}
                  className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md transition-colors flex items-center gap-2 border border-blue-200"
                  title="Download Interactive HTML"
              >
                  <Download size={18} />
                  <span className="text-sm font-medium hidden sm:inline">Export HTML</span>
              </button>

              <button
                  onClick={() => setShowEditor(!showEditor)}
                  className={`p-2 rounded-md transition-colors flex items-center gap-2 ${showEditor ? 'bg-gray-200 text-gray-800' : 'hover:bg-gray-100 text-gray-600'}`}
                  title="Toggle Markdown Editor"
              >
                  <FileText size={18} />
              </button>
          </div>
      </header>

      <main className="flex-1 flex overflow-hidden">

          {showEditor && (
             <div className="w-1/3 border-r border-gray-200 bg-white flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-0">
                 <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                     <span className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Markdown Source</span>
                 </div>
                 <textarea
                     className="flex-1 p-4 resize-none focus:outline-none font-mono text-sm leading-relaxed text-gray-700 bg-gray-50"
                     value={markdown}
                     onChange={(e) => setMarkdown(e.target.value)}
                     placeholder="Type markdown here..."
                 />
                 <div className="p-3 border-t border-gray-200 text-xs text-gray-500 bg-gray-50">
                     Add images: <code>![alt](https://url...)</code>
                 </div>
             </div>
          )}

          <div className="flex-1 relative bg-[#FAFAFA]" id="mindmap-container">
             <MindMap
                value={markdown}
                onChange={setMarkdown}
                spacingH={spacingH}
                spacingV={spacingV}
             />

             <div className="absolute bottom-6 left-6 pointer-events-none text-gray-400 text-sm">
                 <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> Double-click any node to edit</p>
                 <p className="flex items-center gap-2 mt-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> Click images to zoom</p>
             </div>
          </div>
      </main>

      {modalImage && (
          <div
             className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
             onClick={() => setModalImage(null)}
          >
              <div className="relative max-w-4xl max-h-[90vh]">
                  <img
                      src={modalImage}
                      alt="Enlarged"
                      className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                  />
                  <button
                      className="absolute -top-4 -right-4 w-8 h-8 bg-white text-black rounded-full flex items-center justify-center font-bold shadow-lg hover:bg-gray-100"
                      onClick={() => setModalImage(null)}
                  >
                      ×
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}

export default App;

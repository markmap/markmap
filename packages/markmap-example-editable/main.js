// Attempt to import from assumed bundled locations within the monorepo
// Adjust paths if necessary based on actual build output locations.
import { Transformer } from '../../markmap-lib/dist/index.js';
import { Markmap } from '../../markmap-view/dist/index.js';

const transformer = new Transformer();
const mm = Markmap.create('#markmap', {}); // Create Markmap instance attached to the SVG

const textarea = document.getElementById('markdown-input');

function renderMarkmap() {
  const content = textarea.value;
  const { root, features } = transformer.transform(content);
  
  // Note: In a full setup, you might use getUsedAssets(features) 
  // and load them. For this basic example, we'll assume global CSS 
  // from markmap-view is sufficient or handled separately (next step).
  console.log('Transformed Root:', root);
  console.log('Features:', features);
  
  mm.setData(root);
  mm.fit(); // Fit the mindmap to the view after setting data
}

// Initial render
renderMarkmap();

// Re-render on input
textarea.addEventListener('input', renderMarkmap);

console.log('Editable Markmap example initialized.');

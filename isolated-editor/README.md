# Isolated MindMap Editor

This is a standalone, isolated mindmap editor built with React, Vite, Tailwind CSS, and Markmap. It provides a clean, user-friendly interface inspired by MindNode.

## Features

- **Markdown Support**: Create your mindmap using a simple markdown format.
- **Interactive Editing**: Double-click any node to edit its text directly on the map.
- **Customizable Colors**: Each first-level branch and its children automatically get a unique color from a pleasing palette.
- **Adjustable Spacing**: Use sliders to tweak horizontal and vertical spacing for perfect layout.
- **Images**: Add images via markdown (`![alt](url)`) and click them on the map to view them in an enlarged modal.
- **Import**: Import `.md` or `.txt` files directly. (TXT files are converted to a simple list automatically).
- **Export**: Download your mindmap as a fully interactive HTML file.
- **Centering**: Quickly center and reset the view using the "Center" button.

## Getting Started

### Prerequisites
Make sure you have Node.js installed.

### Installation

Navigate to the directory and install dependencies:

```bash
cd isolated-editor
npm install
```

### Development Server

Run the local development server:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### Building for Production

Build the application:

```bash
npm run build
```

The compiled assets will be available in the `dist` directory.

## Usage Guide

1. **Typing content**: The left panel allows you to type Markdown. `#` indicates the root node, `##` second level, `-` for bullet points (children), etc.
2. **Editing on map**: Double-click any text node on the visual map to open a quick input. Press `Enter` to save or `Esc` to cancel.
3. **Adding images**: In the Markdown editor or via inline edit, type `![Some Alt Text](https://link-to-your-image.jpg)`.
4. **Zoom and Pan**: Click and drag on empty space to pan. Use your mouse scroll wheel or trackpad to zoom in and out.
5. **Adjusting Spacing**: Use the sliders in the top toolbar to adjust how far apart the nodes are.
6. **Exporting**: Click the "Export HTML" button to download a standalone file that you can share with anyone.

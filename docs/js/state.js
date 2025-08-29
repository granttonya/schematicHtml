// Global state variables
let imgLoaded = false;
let imgW = 0, imgH = 0;
let panX = 0, panY = 0;
let viewScale = 1;
let mouseDown = false;
let lastMouse = null;
let panning = false;
let spaceHeld = false;

// Modes
let panMode = false;
let highlightMode = true;
let textMode = false;
let eraserMode = false;
let lineMode = false;
let netLabelMode = false;
let continuityMode = false;
let retypeMode = false;

// Selections and dragging
let selectedSym = -1;
// Track selected segments as an array of objects { layer, index }
// rather than a single index so we can highlight entire connected paths.
// An empty array means no segment is selected.
let selectedSeg = [];
let selectedAnn = -1;
let draggingSym = false;
let draggingSeg = false;
let draggingAnn = false;
let annOffset = { dx: 0, dy: 0 };
let lastWorld = { x: 0, y: 0 };

// Drawing state
let lineStart = null;
let lineEnd = null;
let linePreview = null;
let lastErase = null;
let suppressNextClick = false;
let highlightPaths = [];

// Data
let layers = [];
let activeLayer = 0;
let symbols = [];
let annotations = [];
let segments = [];
let netLabels = [];
let activeNet = -1;

// History for undo/redo
const history = [];
let historyIndex = -1;

// DOM elements that are frequently accessed
let view, octx, ctx, labelEditor, imgBitmap, rawImageData;

// Configuration from UI controls
const config = {
    eraserSize: 10,
    eraseImageTarget: false,
    segmentMode: true,
    autoThresh: true,
    thresh: 120,
    autoDownscale: true,
    maxDim: 4096,
    snapRadius: 6,
    opacity: 0.7,
    color: '#ff0000',
    thickness: 6,
    pixelLimit: 600000,
    gridSize: 10,
    snapToGrid: true,
    snapToLines: false,
    showAnnotations: true,
    showNetLabels: true,
    freeContinuity: false,
};
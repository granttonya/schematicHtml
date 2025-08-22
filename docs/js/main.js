// Main application entry point
document.addEventListener('DOMContentLoaded', () => {
    // Initialize canvases
    const view = document.getElementById('view');
    const overlay = document.getElementById('overlay');
    const ctx = view.getContext('2d');
    const octx = overlay.getContext('2d');

    // Make contexts and canvases globally available for other modules
    window.view = view;
    window.overlay = overlay;
    window.ctx = ctx;
    window.octx = octx;

    // Initial setup
    setCanvasSizeToContainer();
    window.addEventListener('resize', setCanvasSizeToContainer);

    // Load default image or handle file input
    loadImage('schematic.png'); // Example: load a default image

    // Setup event listeners
    setupEventListeners();
});

function loadImage(url) {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = url;
    img.onload = () => {
        imgW = img.width;
        imgH = img.height;
        createImageBitmap(img).then(bitmap => {
            imgBitmap = bitmap;
            const offscreenCanvas = new OffscreenCanvas(imgW, imgH);
            const offscreenCtx = offscreenCanvas.getContext('2d');
            offscreenCtx.drawImage(imgBitmap, 0, 0);
            rawImageData = offscreenCtx.getImageData(0, 0, imgW, imgH);
            imgLoaded = true;
            logHistory(`Image loaded: ${url}`);
            resetView();
        });
    };
    img.onerror = () => {
        logHistory(`Error loading image: ${url}`);
    };
}

function resetView() {
    panX = view.width / 2;
    panY = view.height / 2;
    viewScale = 1.0;
    drawBase();
    redrawOverlay();
}

function setupEventListeners() {
    let lastMouse = null, mouseDown = false, panning = false, draggingSym = false, draggingAnn = false, draggingSeg = false;
    let suppressNextClick = false;
    let spaceHeld = false;
    let lineStart = null, lineEnd = null;
    let annOffset = { dx: 0, dy: 0 };
    let lastWorld = {x:0, y:0};

    overlay.addEventListener('contextmenu', e => e.preventDefault());
    overlay.addEventListener('auxclick', e => { if (e.button === 1) e.preventDefault(); });

    overlay.addEventListener('mousedown', (e) => {
        if (!imgLoaded) return;
        mouseDown = true;
        if (e.button === 1) e.preventDefault(); // Prevent middle-mouse scroll
        if (spaceHeld || panMode || e.button === 1) {
            hideEditor();
            panning = true;
            lastMouse = { x: e.clientX, y: e.clientY };
            return;
        }

        const [ix, iy] = screenToImg(e.offsetX, e.offsetY);

        if (eraserMode) {
            suppressNextClick = true;
            if (document.getElementById('eraseImageTarget')?.checked) {
                eraseImageAt(ix, iy, +document.getElementById('eraserSize').value);
                drawBase();
            } else {
                eraseAt(ix, iy, +document.getElementById('eraserSize').value);
            }
            redrawOverlay();
            return;
        }

        if (lineMode) {
            const [sx, sy] = snapPosition(ix, iy);
            lineStart = { x: sx, y: sy };
            lineEnd = { x: sx, y: sy };
            linePreview = { x1: lineStart.x, y1: lineStart.y, x2: sx, y2: sy };
            redrawOverlay();
            return;
        }

        let hit = hitTestSymbol(ix, iy);
        if (hit >= 0) {
            selectedSym = hit; selectedSeg = -1; selectedAnn = -1;
            draggingSym = true; suppressNextClick = true;
            syncSymbolUI();
            redrawOverlay();
            return;
        }

        hit = hitTestAnnotation(ix, iy);
        if (hit >= 0) {
            selectedAnn = hit; selectedSym = -1; selectedSeg = -1;
            draggingAnn = true; annOffset.dx = ix - annotations[hit].x; annOffset.dy = iy - annotations[hit].y;
            suppressNextClick = true;
            redrawOverlay();
            return;
        }

        hit = hitTestSegment(ix, iy);
        if (hit >= 0) {
            selectedSeg = hit; selectedSym = -1; selectedAnn = -1;
            draggingSeg = true; lastWorld = {x:ix, y:iy};
            suppressNextClick = true;
            redrawOverlay();
            return;
        }
        
        // If nothing was hit, start a new line/segment
        if (layers[activeLayer]) {
            const newSeg = { points: [{x:ix, y:iy}] };
            layers[activeLayer].segments.push(newSeg);
            draggingSeg = true;
            lastWorld = {x:ix, y:iy};
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (panning) {
            const dx = e.clientX - lastMouse.x, dy = e.clientY - lastMouse.y;
            lastMouse = { x: e.clientX, y: e.clientY };
            panX += dx;
            panY += dy;
            drawBase();
            redrawOverlay();
        }

        if (!imgLoaded || !mouseDown) return;

        const rect = view.getBoundingClientRect();
        const [ix, iy] = screenToImg(e.clientX - rect.left, e.clientY - rect.top);

        if (draggingSym && symbols[selectedSym]) {
            symbols[selectedSym].x = ix;
            symbols[selectedSym].y = iy;
            redrawOverlay();
        }
        if (draggingAnn && annotations[selectedAnn]) {
            annotations[selectedAnn].x = ix - annOffset.dx;
            annotations[selectedAnn].y = iy - annOffset.dy;
            redrawOverlay();
        }
        if (draggingSeg && layers[activeLayer]) {
            const currentSeg = layers[activeLayer].segments[layers[activeLayer].segments.length - 1];
            if(currentSeg) currentSeg.points.push({x:ix, y:iy});
            redrawOverlay();
        }
        if (lineMode && lineStart) {
            const [sx, sy] = snapPosition(ix, iy);
            lineEnd = { x: sx, y: sy };
            linePreview.x2 = sx;
            linePreview.y2 = sy;
            redrawOverlay();
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (panning) suppressNextClick = true;
        panning = false;
        mouseDown = false;
        draggingSym = false;
        draggingAnn = false;
        draggingSeg = false;
        
        if (lineMode && lineStart && lineEnd) {
            if (layers[activeLayer]) {
                layers[activeLayer].segments.push({ points: [lineStart, lineEnd] });
            }
            lineStart = lineEnd = linePreview = null;
            redrawOverlay();
        }
    });

    overlay.addEventListener('wheel', (e) => {
        e.preventDefault();
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const [ix, iy] = screenToImg(e.offsetX, e.offsetY);
        viewScale *= scaleFactor;
        panX = e.offsetX - (ix - imgW/2) * viewScale;
        panY = e.offsetY - (iy - imgH/2) * viewScale;
        drawBase();
        redrawOverlay();
    });

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            spaceHeld = true;
            e.preventDefault();
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            spaceHeld = false;
        }
    });

    // File drag and drop
    document.body.addEventListener('dragover', e => e.preventDefault());
    document.body.addEventListener('drop', e => {
        e.preventDefault();
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                loadImage(URL.createObjectURL(file));
            }
        }
    });
}
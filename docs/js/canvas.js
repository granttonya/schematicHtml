function setCanvasSizeToContainer() {
    const container = document.querySelector('.canvasWrap');
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (view.width !== w || view.height !== h) {
        view.width = octx.canvas.width = w;
        view.height = octx.canvas.height = h;
        drawBase();
        redrawOverlay();
    }
}

function applyViewTransform(c) {
    c.setTransform(viewScale, 0, 0, viewScale, panX, panY);
    c.translate(-imgW / 2, -imgH / 2);
}

function drawGrid(ctx) {
    if (!config.snapToGrid) return;
    const gs = config.gridSize;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.2)';
    ctx.lineWidth = 1;
    const [start_ix, start_iy] = screenToImg(0, 0);
    const [end_ix, end_iy] = screenToImg(view.width, view.height);

    for (let ix = Math.floor(start_ix / gs) * gs; ix < end_ix; ix += gs) {
        const [sx, sy] = imgToScreen(ix, start_iy);
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, view.height);
        ctx.stroke();
    }
    for (let iy = Math.floor(start_iy / gs) * gs; iy < end_iy; iy += gs) {
        const [sx, sy] = imgToScreen(start_ix, iy);
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(view.width, sy);
        ctx.stroke();
    }
    ctx.restore();
}

function drawBase() {
    if (!imgLoaded) {
        ctx.clearRect(0, 0, view.width, view.height);
        return;
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, view.width, view.height);
    ctx.translate(panX, panY);
    ctx.scale(viewScale, viewScale);
    ctx.drawImage(imgBitmap, -imgW / 2, -imgH / 2);
    ctx.restore();
}

function drawLayer(layer, ctx, layerIndex) {
    if (!layer.visible) return;
    ctx.globalAlpha = layer.opacity;
    ctx.lineWidth = layer.thickness / viewScale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let si = 0; si < layer.segments.length; si++) {
        const seg = layer.segments[si];
        ctx.beginPath();
        for (let i = 0; i < seg.points.length; i++) {
            const pt = seg.points[i];
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
        }
        // Highlight selected segments in cyan; otherwise use layer color
        const isSelected = selectedSeg.some(s => s.layer === layerIndex && s.index === si);
        ctx.strokeStyle = isSelected ? 'cyan' : layer.color;
        ctx.stroke();
    }
}

function redrawOverlay() {
    octx.clearRect(0, 0, view.width, view.height);
    if (!imgLoaded) return;

    drawGrid(octx);

    octx.save();
    applyViewTransform(octx);

    // Draw all layers
    layers.forEach((layer, idx) => drawLayer(layer, octx, idx));

    // Draw symbols
    if (symbols.length > 0) {
        for (let i = 0; i < symbols.length; i++) {
            drawSymbol(octx, symbols[i], i === selectedSym);
        }
    }

    // Draw annotations
    if (config.showAnnotations && annotations.length > 0) {
        for (let i = 0; i < annotations.length; i++) {
            const a = annotations[i];
            octx.fillStyle = a.color;
            octx.font = `${a.size / viewScale}px sans-serif`;
            octx.fillText(a.text, a.x, a.y);
            if (i === selectedAnn) {
                octx.strokeStyle = 'cyan';
                octx.lineWidth = 1 / viewScale;
                octx.strokeRect(a.x - 2, a.y - a.size / viewScale, octx.measureText(a.text).width + 4, a.size / viewScale + 4);
            }
        }
    }

    // Draw traced highlight paths
    if (highlightPaths.length > 0) {
        octx.strokeStyle = config.color;
        octx.lineWidth = config.thickness / viewScale;
        octx.lineCap = 'round';
        octx.lineJoin = 'round';
        for (const path of highlightPaths) {
            if (path.length < 2) continue;
            octx.beginPath();
            octx.moveTo(path[0].x, path[0].y);
            for (let i = 1; i < path.length; i++) {
                octx.lineTo(path[i].x, path[i].y);
            }
            octx.stroke();
        }
    }

    // Draw line preview
    if (lineMode && linePreview) {
        octx.strokeStyle = config.color;
        octx.lineWidth = config.thickness / viewScale;
        octx.beginPath();
        octx.moveTo(linePreview.x1, linePreview.y1);
        octx.lineTo(linePreview.x2, linePreview.y2);
        octx.stroke();
    }

    octx.restore();
    
    // Call other overlay functions if they exist
    if (window.drawCleanupOverlay) window.drawCleanupOverlay(octx);
    if (window.drawJunctionDots) window.drawJunctionDots(octx);
}

function eraseAt(ix, iy, size) {
    if (!layers[activeLayer]) return;
    const r2 = (size * size) / (viewScale * viewScale);
    layers[activeLayer].segments = layers[activeLayer].segments.filter(seg => {
        return !seg.points.some(pt => {
            const dx = pt.x - ix;
            const dy = pt.y - iy;
            return dx * dx + dy * dy < r2;
        });
    });
}

function eraseImageAt(ix, iy, size) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imgW;
    tempCanvas.height = imgH;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(imgBitmap, 0, 0);
    tempCtx.globalCompositeOperation = 'destination-out';
    tempCtx.beginPath();
    tempCtx.arc(ix, iy, size, 0, 2 * Math.PI);
    tempCtx.fill();
    createImageBitmap(tempCanvas).then(newBitmap => {
        imgBitmap = newBitmap;
        const offscreenCtx = new OffscreenCanvas(imgW, imgH).getContext('2d');
        offscreenCtx.drawImage(imgBitmap, 0, 0);
        rawImageData = offscreenCtx.getImageData(0, 0, imgW, imgH);
    });
}

function eraseLineTo(ix, iy, size) {
    if (!lastErase) {
        lastErase = { x: ix, y: iy };
        return;
    }
    // This needs more complex implementation to erase a line segment
    eraseAt(ix, iy, size);
    lastErase = { x: ix, y: iy };
}

function drawSymbol(ctx, sym, isSelected) {
    ctx.save();
    ctx.translate(sym.x, sym.y);
    ctx.rotate(sym.rotation * Math.PI / 180);
    ctx.scale(sym.size / 64, sym.size / 64);
    ctx.strokeStyle = sym.color;
    ctx.lineWidth = 2 / viewScale;
    
    // Simple box for placeholder
    ctx.strokeRect(-32, -32, 64, 64);

    if (sym.label) {
        ctx.fillStyle = sym.labelColor;
        ctx.font = `${sym.labelSize / viewScale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(sym.label, 0, 48);
    }

    ctx.restore();

    if (isSelected) {
        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 2 / viewScale;
        ctx.strokeRect(sym.x - sym.size/2, sym.y - sym.size/2, sym.size, sym.size);
    }
}

// Functions from the arrows engine
function drawDot(actx, x, y, theta, size, color) {
    actx.fillStyle = color;
    actx.beginPath();
    actx.arc(x, y, size / 2, 0, 2 * Math.PI);
    actx.fill();
}

function drawTriangle(actx, x, y, theta, size, color) {
    actx.save();
    actx.translate(x, y);
    actx.rotate(theta);
    actx.fillStyle = color;
    actx.beginPath();
    actx.moveTo(-size / 2, -size / 2);
    actx.lineTo(size / 2, 0);
    actx.lineTo(-size / 2, size / 2);
    actx.closePath();
    actx.fill();
    actx.restore();
}

function drawChevronShape(actx, x, y, theta, size, color) {
    actx.save();
    actx.translate(x, y);
    actx.rotate(theta);
    actx.strokeStyle = color;
    actx.lineWidth = size / 4;
    actx.lineCap = 'round';
    actx.beginPath();
    actx.moveTo(-size / 2, -size / 2);
    actx.lineTo(0, 0);
    actx.lineTo(-size / 2, size / 2);
    actx.stroke();
    actx.restore();
}

function drawLabel(actx, path, text, size, bgColor, fgColor) {
    if (path.length < 1) return;
    const p0 = path[0];
    actx.font = `${size}px sans-serif`;
    const metrics = actx.measureText(text);
    const w = metrics.width + 8;
    const h = size + 4;
    actx.fillStyle = bgColor;
    actx.fillRect(p0.x - w / 2, p0.y - h / 2, w, h);
    actx.fillStyle = fgColor;
    actx.textAlign = 'center';
    actx.textBaseline = 'middle';
    actx.fillText(text, p0.x, p0.y);
}
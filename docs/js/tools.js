// Coordinate conversion
function screenToImg(sx, sy) {
    const rect = view.getBoundingClientRect();
    const x = (sx - panX) / viewScale;
    const y = (sy - panY) / viewScale;
    return [x + imgW / 2, y + imgH / 2];
}

function imgToScreen(ix, iy) {
    const x = (ix - imgW / 2) * viewScale + panX;
    const y = (iy - imgH / 2) * viewScale + panY;
    return [x, y];
}

// Offscreen context used for precise hit testing
const hitCtx = (() => {
    if (typeof OffscreenCanvas !== 'undefined') {
        return new OffscreenCanvas(1, 1).getContext('2d');
    }
    return document.createElement('canvas').getContext('2d');
})();

// Snapping
function snapPosition(ix, iy) {
    if (config.snapToGrid) {
        const gs = config.gridSize;
        return [Math.round(ix / gs) * gs, Math.round(iy / gs) * gs];
    }
    // Add snap to line logic if needed
    return [ix, iy];
}

// Hit Testing
function hitTestSymbol(ix, iy) {
    for (let i = symbols.length - 1; i >= 0; i--) {
        const s = symbols[i];
        const size = s.size / 2;
        if (ix >= s.x - size && ix <= s.x + size && iy >= s.y - size && iy <= s.y + size) {
            return i;
        }
    }
    return -1;
}

function hitTestAnnotation(ix, iy) {
    // This is a simplified hit test. A more accurate one would consider text rendering bounds.
    for (let i = annotations.length - 1; i >= 0; i--) {
        const a = annotations[i];
        const size = a.size;
        if (ix >= a.x - size && ix <= a.x + size * 4 && iy >= a.y - size && iy <= a.y + size) {
            return i;
        }
    }
    return -1;
}

function ensureSegmentPath(seg) {
    if (seg.path && seg.bbox) return;
    const path = new Path2D();
    path.moveTo(seg.points[0].x, seg.points[0].y);
    let minX = seg.points[0].x, maxX = minX;
    let minY = seg.points[0].y, maxY = minY;
    for (let i = 1; i < seg.points.length; i++) {
        const pt = seg.points[i];
        path.lineTo(pt.x, pt.y);
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
    }
    seg.path = path;
    seg.bbox = { minX, maxX, minY, maxY };
}

 codex/debug-and-fix-code-fg24ox
function hitTestSegment(ix, iy) {
    const [sx, sy] = imgToScreen(ix, iy);

function hitTestSegment(x, y) {
    // Accept either screen or image coordinates.
    // If the point appears to be in image space, convert it.
    let sx = x, sy = y, ix = x, iy = y;
    if (x >= 0 && x <= view.width && y >= 0 && y <= view.height) {
        [ix, iy] = screenToImg(x, y);
    } else {
        [sx, sy] = imgToScreen(x, y);
    }

DevSchmeaticHtml
    hitCtx.save();
    applyViewTransform(hitCtx);
    const tol = 5 / viewScale; // constant screen-space tolerance
    for (let li = layers.length - 1; li >= 0; li--) {
        const layer = layers[li];
        if (!layer.visible) continue;
        for (let si = layer.segments.length - 1; si >= 0; si--) {
            const seg = layer.segments[si];
            if (!seg || seg.points.length < 2) continue;
            ensureSegmentPath(seg);
            const half = (layer.thickness / viewScale) / 2 + tol;
            const { minX, maxX, minY, maxY } = seg.bbox;
            if (ix < minX - half || ix > maxX + half || iy < minY - half || iy > maxY + half) continue;
 codex/debug-and-fix-code-fg24ox

            // Use the segment's actual thickness so hits only register on the line itself
 DevSchmeaticHtml
            hitCtx.lineWidth = layer.thickness / viewScale + 2 * tol;
            hitCtx.lineCap = 'round';
            hitCtx.lineJoin = 'round';
            if (hitCtx.isPointInStroke(seg.path, sx, sy)) {
                hitCtx.restore();
                return { layer: li, index: si };
            }
        }
    }
    hitCtx.restore();
    return null;
}

function pointToSegmentDistance(px, py, p1, p2) {
    const x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y;
    const dx = x2 - x1, dy = y2 - y1;
    if (dx === 0 && dy === 0) {
        return Math.hypot(px - x1, py - y1);
    }
    const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    const clamped = Math.max(0, Math.min(1, t));
    const x = x1 + clamped * dx, y = y1 + clamped * dy;
    return Math.hypot(px - x, py - y);
}

function pointsEqual(p1, p2, tol = 0.1) {
    return Math.abs(p1.x - p2.x) <= tol && Math.abs(p1.y - p2.y) <= tol;
}

function collectConnectedSegments(layerIndex, startIndex) {
    const layer = layers[layerIndex];
    if (!layer) return [];
    const result = [];
    const visited = new Set();
    const stack = [startIndex];
    while (stack.length) {
        const idx = stack.pop();
        if (visited.has(idx)) continue;
        visited.add(idx);
        result.push({ layer: layerIndex, index: idx });
        const seg = layer.segments[idx];
        if (!seg || seg.points.length === 0) continue;
        const endpoints = [seg.points[0], seg.points[seg.points.length - 1]];
        for (let i = 0; i < layer.segments.length; i++) {
            if (visited.has(i) || i === idx) continue;
            const other = layer.segments[i];
            if (!other || other.points.length === 0) continue;
            const otherEnds = [other.points[0], other.points[other.points.length - 1]];
            const connected = endpoints.some(p1 => otherEnds.some(p2 => pointsEqual(p1, p2)));
            if (connected) stack.push(i);
        }
    }
    return result;
}

// Image analysis
function isInk(x, y, threshold) {
    if (!rawImageData) return false;
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || x >= imgW || y < 0 || y >= imgH) return false;
    const i = (y * imgW + x) * 4;
    const r = rawImageData.data[i];
    const g = rawImageData.data[i+1];
    const b = rawImageData.data[i+2];
    const intensity = 0.299 * r + 0.587 * g + 0.114 * b;
    return intensity < threshold;
}

function findNearestInkRobust(ix, iy, searchRadius, threshold) {
    let bestD2 = Infinity;
    let bestPt = null;
    for (let r = 0; r < searchRadius; r++) {
        for (let i = 0; i < 360; i += 360 / (8 + 8 * r)) {
            const rad = i * Math.PI / 180;
            const x = Math.round(ix + r * Math.cos(rad));
            const y = Math.round(iy + r * Math.sin(rad));
            if (isInk(x, y, threshold)) {
                const d2 = (x-ix)*(x-ix) + (y-iy)*(y-iy);
                if (d2 < bestD2) {
                    bestD2 = d2;
                    bestPt = {x, y};
                }
            }
        }
        if (bestPt) return bestPt;
    }
    return null;
}

function neighbors(x, y, threshold, excludeX = null, excludeY = null) {
    const out = [];
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= imgW || ny >= imgH) continue;
            if (excludeX !== null && nx === excludeX && ny === excludeY) continue;
            if (isInk(nx, ny, threshold)) out.push({ x: nx, y: ny });
        }
    }
    return out;
}

function chooseNextStep(px, py, cx, cy, threshold) {
    const ring = Array.from({ length: 3 }, () => [0, 0, 0]);
    const cands = [];
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= imgW || ny >= imgH) continue;
            if (nx === px && ny === py) continue;
            if (isInk(nx, ny, threshold)) {
                ring[dy + 1][dx + 1] = 1;
                cands.push({ x: nx, y: ny, dx, dy });
            }
        }
    }
    let comps = 0;
    const seen = Array.from({ length: 3 }, () => [0, 0, 0]);
    const dirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    function flood(i, j) {
        const q = [[i, j]];
        seen[i][j] = 1;
        while (q.length) {
            const [a, b] = q.shift();
            for (const [di, dj] of dirs) {
                const ni = a + di, nj = b + dj;
                if (ni < 0 || nj < 0 || ni > 2 || nj > 2) continue;
                if (!seen[ni][nj] && ring[ni][nj]) {
                    seen[ni][nj] = 1;
                    q.push([ni, nj]);
                }
            }
        }
    }
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (ring[i][j] && !seen[i][j]) {
                comps++;
                flood(i, j);
            }
        }
    }
    if (cands.length === 0) return null;
    if (comps !== 1) return null;
    const dirx = cx - px, diry = cy - py;
    const dirLen = Math.hypot(dirx, diry) || 1;
    let best = null, bestScore = -Infinity;
    for (const c of cands) {
        const clen = Math.hypot(c.dx, c.dy) || 1;
        const cos = (dirx * c.dx + diry * c.dy) / (dirLen * clen);
        const lateral = Math.abs(dirx * c.dy - diry * c.dx) / (dirLen * clen);
        const score = cos - 0.05 * lateral;
        if (score > bestScore) { bestScore = score; best = c; }
    }
    return best ? { x: best.x, y: best.y } : null;
}

function walkFrom(px, py, cx, cy, threshold) {
    const path = [{ x: cx, y: cy }];
    let steps = 0;
    const MAX_STEPS = config.pixelLimit;
    while (steps++ < MAX_STEPS) {
        const next = chooseNextStep(px, py, cx, cy, threshold);
        if (!next) break;
        px = cx; py = cy; cx = next.x; cy = next.y;
        path.push({ x: cx, y: cy });
    }
    return path;
}

function traceSegment(ix, iy) {
    if (ix < 0 || iy < 0 || ix >= imgW || iy >= imgH) return [];
    const threshold = config.thresh;
    const start = findNearestInkRobust(ix | 0, iy | 0, config.snapRadius, threshold);
    if (!start) return [];
    const paths = [];
    const neigh = neighbors(start.x, start.y, threshold);
    if (neigh.length === 0) return paths;
    for (const n of neigh.slice(0, 2)) {
        const path = [{ x: start.x, y: start.y }];
        path.push(...walkFrom(start.x, start.y, n.x, n.y, threshold));
        paths.push(path);
    }
    return paths;
}

/* ===============================================================
   Cleanup v3f — invert toggle + prefer H/V + robust single-run
   =============================================================== */
(function(){
  // -------- helpers to access app globals --------
  const G = {
    get imgLoaded(){ return window.imgLoaded; },
    get rawImageData(){ return window.rawImageData; },
    get imgW(){ return window.imgW; },
    get imgH(){ return window.imgH; },
    get viewScale(){ return window.viewScale; },
    get octx(){ return window.octx; },
    get ctx(){ return window.ctx; },
    get redrawOverlay(){ return window.redrawOverlay; },
    get logHistory(){ return window.logHistory; },
    get applyViewTransform(){ return window.applyViewTransform; },
  };

  // -------- locate Cleanup panel and add UI toggles --------
  function $(id){ return document.getElementById(id); }
  function addToggleRow(){
    const bridge = $('cleanupBridge');
    const runBtn = $('cleanupRunNow');
    const anchor = bridge?.parentElement || runBtn?.parentElement || document.body;

    const box = document.createElement('div');
    box.id = 'cleanupAdvancedRow';
    box.style.display = 'grid';
    box.style.gridTemplateColumns = 'repeat(3, auto)';
    box.style.gap = '8px';
    box.style.alignItems = 'center';
    box.style.marginTop = '6px';

    function mk(labelText, id){
      const wrap = document.createElement('label');
      wrap.style.display='inline-flex';
      wrap.style.alignItems='center';
      wrap.style.gap='6px';
      const cb = document.createElement('input');
      cb.type='checkbox'; cb.id=id;
      const sp = document.createElement('span');
      sp.textContent = labelText;
      wrap.appendChild(cb); wrap.appendChild(sp);
      return wrap;
    }

    box.appendChild(mk('Invert input', 'cleanupInvert'));
    box.appendChild(mk('Prefer H lines', 'cleanupPreferH'));
    box.appendChild(mk('Prefer V lines', 'cleanupPreferV'));

    if (!$('cleanupAdvancedRow')){
      (anchor).appendChild(box);
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', addToggleRow);
  } else addToggleRow();

  const enabledEl  = $('cleanupEnabled');
  const thickEl    = $('cleanupThickness');
  const bridgeEl   = $('cleanupBridge');
  const invertEl   = $('cleanupInvert');
  const prefHEl    = $('cleanupPreferH');
  const prefVEl    = $('cleanupPreferV');

  let H = [];
  let V = [];
  let running=false, lastRun=0;

  window.drawCleanupOverlay = function(ctx){
    try{
      if (!G.imgLoaded || !enabledEl?.checked) return;
      if (H.length===0 && V.length===0) return;

      ctx.save();
      if (typeof G.applyViewTransform === 'function') G.applyViewTransform(ctx);

      const tUI = Number(thickEl?.value || 1.4);
      const scale = 1/Math.max(0.001, (G.viewScale||1));
      const lw = tUI*scale;
      const under = (tUI + 1.0 + Number(bridgeEl?.value||0))*scale;

      ctx.lineCap='round'; ctx.lineJoin='round';

      ctx.globalCompositeOperation='source-over';
      ctx.strokeStyle='#ffffff';
      ctx.lineWidth=under;
      for (const s of H){ ctx.beginPath(); ctx.moveTo(s.x0 - G.imgW/2, s.y - G.imgH/2); ctx.lineTo(s.x1 - G.imgW/2, s.y - G.imgH/2); ctx.stroke(); }
      for (const s of V){ ctx.beginPath(); ctx.moveTo(s.x - G.imgW/2, s.y0 - G.imgH/2); ctx.lineTo(s.x - G.imgW/2, s.y1 - G.imgH/2); ctx.stroke(); }

      ctx.strokeStyle='#000000';
      ctx.lineWidth=lw;
      for (const s of H){ ctx.beginPath(); ctx.moveTo(s.x0 - G.imgW/2, s.y - G.imgH/2); ctx.lineTo(s.x1 - G.imgW/2, s.y - G.imgH/2); ctx.stroke(); }
      for (const s of V){ ctx.beginPath(); ctx.moveTo(s.x - G.imgW/2, s.y0 - G.imgH/2); ctx.lineTo(s.x - G.imgW/2, s.y1 - G.imgH/2); ctx.stroke(); }

      ctx.restore();
    }catch(e){ console.warn('drawCleanupOverlay error', e); }
  };

  window.__cleanupV3_run = async function(){
    const now = performance.now();
    if (running || (now - lastRun) < 250) return;
    running = true; lastRun = now;
    try{
      G.logHistory?.('[cleanup] starting…');
      const g = toGray(G.rawImageData, G.imgW, G.imgH);
      const bin = adaptiveBradley(g, G.imgW, G.imgH, 31, 0.15);
      if (invertEl?.checked){
        for (let i=0;i<bin.length;i++) bin[i] = bin[i]?0:1;
      }
      despeckle(bin, G.imgW, G.imgH);

      const baseL = Math.max(4, 4 + Math.round(Number(bridgeEl?.value||0)*2));
      let Lh = baseL, Lv = baseL;
      const preferH = !!prefHEl?.checked, preferV = !!prefVEl?.checked;
      if (preferH && !preferV){ Lh = Math.max(2, baseL-2); Lv = baseL+2; }
      if (preferV && !preferH){ Lv = Math.max(2, baseL-2); Lh = baseL+2; }

      const keepH = keepLongRunsH(bin, G.imgW, G.imgH, Lh);
      const keepV = keepLongRunsV(bin, G.imgW, G.imgH, Lv);
      const keep = new Uint8Array(G.imgW*G.imgH);
      for (let i=0;i<keep.length;i++) keep[i] = (keepH[i] | keepV[i]);

      const segsH = [];
      for (let y=0;y<G.imgH;y++){
        let x=0;
        while (x<G.imgW){
          while (x<G.imgW && !keep[y*G.imgW+x]) x++;
          const x0=x;
          while (x<G.imgW && keep[y*G.imgW+x]) x++;
          const x1=x-1;
          if (x1>=x0 && (x1-x0+1)>=Lh) segsH.push({y, x0, x1});
        }
      }
      const segsV = [];
      for (let x=0;x<G.imgW;x++){
        let y=0;
        while (y<G.imgH){
          while (y<G.imgH && !keep[y*G.imgW+x]) y++;
          const y0=y;
          while (y<G.imgH && keep[y*G.imgW+x]) y++;
          const y1=y-1;
          if (y1>=y0 && (y1-y0+1)>=Lv) segsV.push({x, y0, y1});
        }
      }

      H = mergeColinearH(segsH, 2);
      V = mergeColinearV(segsV, 2);

      G.logHistory?.(`Cleanup v3f: H=${H.length} V=${V.length} (Lh=${Lh}, Lv=${Lv}) • ${(performance.now()-now|0)} ms`);
      if (enabledEl && !enabledEl.checked){ enabledEl.checked = true; }
      G.redrawOverlay?.();
      G.logHistory?.('[cleanup] done.');
    }catch(e){
      console.error(e);
      G.logHistory?.('[cleanup] error — see console');
    }finally{
      running=false;
    }
  };

  function toGray(rgba,w,h){
    const src = rgba.data || rgba;
    const g = new Uint8Array(w*h);
    for (let i=0,j=0;i<g.length;i++,j+=4){
      g[i] = (0.2126*src[j] + 0.7152*src[j+1] + 0.0722*src[j+2])|0;
    }
    return g;
  }

  function adaptiveBradley(gray,w,h, win, t){
    const ii = new Uint32Array((w+1)*(h+1));
    for (let y=1;y<=h;y++){
      let rowsum=0;
      for (let x=1;x<=w;x++){
        const v = gray[(y-1)*w + (x-1)];
        rowsum += v;
        ii[y*(w+1)+x] = ii[(y-1)*(w+1)+x] + rowsum;
      }
    }
    const out = new Uint8Array(w*h);
    const half = Math.max(1, win>>1);
    for (let y=0;y<h;y++){
      const y0 = Math.max(0, y-half), y1 = Math.min(h-1, y+half);
      for (let x=0;x<w;x++){
        const x0 = Math.max(0, x-half), x1 = Math.min(w-1, x+half);
        const A = ii[y0*(w+1)+x0], B = ii[y0*(w+1)+(x1+1)];
        const C = ii[(y1+1)*(w+1)+x0], D = ii[(y1+1)*(w+1)+(x1+1)];
        const area = (x1-x0+1)*(y1-y0+1);
        const mean = (D - B - C + A) / area;
        const v = gray[y*w+x];
        out[y*w+x] = (v <= mean*(1 - t)) ? 1 : 0;
      }
    }
    return out;
  }

  function despeckle(img,w,h){
    const copy = img.slice(0);
    const idx=(x,y)=>y*w+x;
    for (let y=1;y<h-1;y++){
      for (let x=1;x<w-1;x++){
        const i=idx(x,y);
        if (!copy[i]) continue;
        let s=0;
        for (let dy=-1;dy<=1;dy++){
          for (let dx=-1;dx<=1;dx++){
            if (!dx && !dy) continue;
            s += copy[idx(x+dx,y+dy)];
          }
        }
        if (s<=1) img[i]=0;
      }
    }
  }

  function keepLongRunsH(bin,w,h,L){
    const out = new Uint8Array(w*h);
    for (let y=0;y<h;y++){
      let x=0;
      while (x<w){
        while (x<w && bin[y*w+x]===0) x++;
        const x0=x;
        while (x<w && bin[y*w+x]===1) x++;
        const x1=x-1, len=x1-x0+1;
        if (len>=L){ for (let X=x0; X<=x1; X++) out[y*w+X]=1; }
      }
    }
    return out;
  }
  function keepLongRunsV(bin,w,h,L){
    const out = new Uint8Array(w*h);
    for (let x=0;x<w;x++){
      let y=0;
      while (y<h){
        while (y<h && bin[y*w+x]===0) y++;
        const y0=y;
        while (y<h && bin[y*w+x]===1) y++;
        const y1=y-1, len=y1-y0+1;
        if (len>=L){ for (let Y=y0; Y<=y1; Y++) out[Y*w+x]=1; }
      }
    }
    return out;
  }

  function mergeColinearH(segs, gap){
    segs.sort((a,b)=> a.y-b.y || a.x0-b.x0);
    const out=[];
    for (const s of segs){
      const last = out[out.length-1];
      if (last && last.y===s.y && s.x0 <= last.x1 + gap) last.x1 = Math.max(last.x1, s.x1);
      else out.push({...s});
    }
    return out;
  }
  function mergeColinearV(segs, gap){
    segs.sort((a,b)=> a.x-b.x || a.y0-b.y0);
    const out=[];
    for (const s of segs){
      const last = out[out.length-1];
      if (last && last.x===s.x && s.y0 <= last.y1 + gap) last.y1 = Math.max(last.y1, s.y1);
      else out.push({...s});
    }
    return out;
  }
  window.H=H; window.V=V;
})();

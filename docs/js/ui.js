// Panel and Toolbar Toggling (IDs aligned to docs/index.html)
function setBtnActive(btn, active) {
    if (!btn) return;
    btn.classList.toggle('active', !!active);
}

function toggleLeftPanel(force) {
    const panel = document.getElementById('leftPanel');
    const btn = document.getElementById('toggleLeft');
    const reveal = document.getElementById('revealLeft');
    const split = document.getElementById('splitLeft');
    const isHidden = panel.classList.contains('hidden');
    const show = force === undefined ? isHidden : force;
    panel.classList.toggle('hidden', !show);
    setBtnActive(btn, show);
    if (reveal) reveal.style.display = show ? 'none' : 'flex';
    if (split) split.style.display = show ? '' : 'none';
}

function toggleRightPanel(force) {
    const panel = document.getElementById('rightPanel');
    const btn = document.getElementById('toggleRight');
    const reveal = document.getElementById('revealRight');
    const split = document.getElementById('splitRight');
    const isHidden = panel.classList.contains('hidden');
    const show = force === undefined ? isHidden : force;
    panel.classList.toggle('hidden', !show);
    setBtnActive(btn, show);
    if (reveal) reveal.style.display = show ? 'none' : 'flex';
    if (split) split.style.display = show ? '' : 'none';
}

function toggleBottomPanel(force) {
    const panel = document.getElementById('bottomPanel');
    const split = document.getElementById('splitBottom');
    const btn = document.getElementById('toggleBottom');
    const reveal = document.getElementById('revealBottom');
    const dock = document.getElementById('dock');

    const isHidden = panel.classList.contains('hidden');
    const show = force === undefined ? isHidden : force;

    panel.classList.toggle('hidden', !show);
    if (dock) dock.classList.toggle('bottom-panel-visible', show);

    if (split) split.style.display = show ? '' : 'none';
    setBtnActive(btn, show);
    if (reveal) reveal.style.display = show ? 'none' : 'flex';
}

function toggleToolbar(name, force) {
    const toolbar = document.getElementById(`${name}Toolbar`);
    if (!toolbar) return;
    const isHidden = toolbar.style.display === 'none';
    const show = force === undefined ? isHidden : force;
    toolbar.style.display = show ? 'flex' : 'none';
}

// History Log
function logHistory(msg) {
    const history = document.getElementById('historyList');
    const entry = document.createElement('div');
    entry.textContent = msg;
    history.appendChild(entry);
    history.scrollTop = history.scrollHeight;
}

// Symbol and Annotation UI
function syncSymbolUI() {
    if (selectedSym < 0 || selectedSym >= symbols.length) {
        document.getElementById('symbolEditor').style.display = 'none';
        return;
    }
    const sym = symbols[selectedSym];
    document.getElementById('symbolEditor').style.display = 'block';
    document.getElementById('symbolLabel').value = sym.label;
    document.getElementById('symbolSize').value = sym.size;
    document.getElementById('symbolRotation').value = sym.rotation;
    document.getElementById('symbolColor').value = sym.color;
}

function syncAnnotationUI() {
    if (selectedAnn < 0 || selectedAnn >= annotations.length) {
        document.getElementById('annotationEditor').style.display = 'none';
        return;
    }
    const ann = annotations[selectedAnn];
    document.getElementById('annotationEditor').style.display = 'block';
    document.getElementById('annotationText').value = ann.text;
    document.getElementById('annotationSize').value = ann.size;
    document.getElementById('annotationColor').value = ann.color;
}

function hideEditor() {
    selectedSym = -1;
    selectedAnn = -1;
    syncSymbolUI();
    syncAnnotationUI();
}

// OCR UI
function setupOcr() {
    const ocrGo = document.getElementById('ocrGo');
    const ocrResult = document.getElementById('ocrResult');
    if (!ocrGo) return;

    ocrGo.addEventListener('click', async () => {
        if (!imgLoaded) {
            logHistory('Load an image first.');
            return;
        }
        logHistory('OCR started...');
        ocrGo.disabled = true;
        try {
            const worker = await Tesseract.createWorker('eng');
            const { data: { text } } = await worker.recognize(rawImageData);
            ocrResult.value = text;
            logHistory('OCR finished.');
            await worker.terminate();
        } catch (e) {
            logHistory('OCR error: ' + e.message);
            console.error(e);
        } finally {
            ocrGo.disabled = false;
        }
    });
}

// Initial UI setup
document.addEventListener('DOMContentLoaded', () => {
    // Attach event listeners to UI elements
    const btnLeft = document.getElementById('toggleLeft');
    const btnRight = document.getElementById('toggleRight');
    const btnBottom = document.getElementById('toggleBottom');
    if (btnLeft) btnLeft.addEventListener('click', () => toggleLeftPanel());
    if (btnRight) btnRight.addEventListener('click', () => toggleRightPanel());
    if (btnBottom) btnBottom.addEventListener('click', () => toggleBottomPanel());

    // Chevron hide buttons
    const chevLeft = document.getElementById('chevLeft');
    const chevRight = document.getElementById('chevRight');
    const chevBottom = document.getElementById('chevBottom');
    const chevBottomSplit = document.getElementById('chevBottomSplit');
    if (chevLeft) chevLeft.addEventListener('click', () => toggleLeftPanel(false));
    if (chevRight) chevRight.addEventListener('click', () => toggleRightPanel(false));
    if (chevBottom) chevBottom.addEventListener('click', () => toggleBottomPanel(false));
    if (chevBottomSplit) chevBottomSplit.addEventListener('click', () => toggleBottomPanel(false));

    // Edge reveal buttons
    const revLeft = document.getElementById('revealLeft');
    const revRight = document.getElementById('revealRight');
    const revBottom = document.getElementById('revealBottom');
    if (revLeft) revLeft.addEventListener('click', () => toggleLeftPanel(true));
    if (revRight) revRight.addEventListener('click', () => toggleRightPanel(true));
    if (revBottom) revBottom.addEventListener('click', () => toggleBottomPanel(true));

    // Example for toolbar toggles - you might need to adjust selectors
    document.querySelectorAll('[data-toolbar]').forEach(el => {
        el.addEventListener('click', () => {
            const toolbarName = el.dataset.toolbar;
            toggleToolbar(toolbarName);
        });
    });

    // Symbol editor events (IDs aligned with index.html)
    const elSymLabel = document.getElementById('symLabel');
    const elSymSize = document.getElementById('symSize');
    const elSymColor = document.getElementById('symColor');
    const elSymLabelSize = document.getElementById('symLabelSize');
    const elSymLabelColor = document.getElementById('symLabelColor');
    if (elSymLabel) elSymLabel.addEventListener('input', e => { if (symbols[selectedSym]) symbols[selectedSym].label = e.target.value; redrawOverlay(); });
    if (elSymSize) elSymSize.addEventListener('input', e => { if (symbols[selectedSym]) symbols[selectedSym].size = +e.target.value; redrawOverlay(); });
    if (elSymColor) elSymColor.addEventListener('input', e => { if (symbols[selectedSym]) symbols[selectedSym].color = e.target.value; redrawOverlay(); });
    if (elSymLabelSize) elSymLabelSize.addEventListener('input', e => { if (symbols[selectedSym]) symbols[selectedSym].labelSize = +e.target.value; redrawOverlay(); });
    if (elSymLabelColor) elSymLabelColor.addEventListener('input', e => { if (symbols[selectedSym]) symbols[selectedSym].labelColor = e.target.value; redrawOverlay(); });

    // Annotation editor events (IDs in index.html: label controls in Properties pane)
    const elLabelColor = document.getElementById('labelColor');
    const elLabelSize = document.getElementById('labelSize');
    if (elLabelColor) elLabelColor.addEventListener('input', e => { labelColor = e.target.value; redrawOverlay(); });
    if (elLabelSize) elLabelSize.addEventListener('input', e => { labelSize = +e.target.value; redrawOverlay(); });

    // Setup OCR button
    setupOcr();

    // Set initial panel states from button active classes
    toggleLeftPanel(document.getElementById('toggleLeft')?.classList.contains('active'));
    toggleRightPanel(document.getElementById('toggleRight')?.classList.contains('active'));
    toggleBottomPanel(document.getElementById('toggleBottom')?.classList.contains('active'));
});

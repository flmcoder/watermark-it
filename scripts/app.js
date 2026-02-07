/**
 * Watermark-It — Fort Lowell Realty Property Image Watermarking Tool
 * Complete application logic with ARMLS compliance, per-image drag positioning,
 * live preview, batch processing, and ZIP download.
 *
 * AD 2025-2026
 */

// ==========================================================
// CONFIGURATION
// ==========================================================
var CONFIG = {
  maxFileSize: 100 * 1024 * 1024, // 100 MB
  previewMaxDim: 1200,
  quality: 0.92,
  githubBase: 'https://raw.githubusercontent.com/flmcoder/watermark-it/main/assets/'
};

// ==========================================================
// WATERMARK CATALOGS
// ==========================================================
var STANDARD_WATERMARKS = [
  { name: 'Reverse Logo (Default)', file: 'reverse-logo.png', isDefault: true },
  { name: 'Rounded Logo',           file: 'rounded-logo.png' },
  { name: 'Rounded',                file: 'rounded.png' },
  { name: 'Logo Watermark',         file: 'logo-watermark.png' },
  { name: 'Logo Watermark 2',       file: 'logo-watermark2.png' },
  { name: 'Grey Watermark',         file: 'grey-watermark.png' },
  { name: 'Flat White Stroke',      file: 'Flat-white-stroke-watermark.png' }
];

var ARMLS_WATERMARKS = [
  { name: 'For Rent Only — Black',        file: 'armls/For Rent only-blk.png' },
  { name: 'For Rent Only — White',        file: 'armls/For Rent only-wht.png' },
  { name: 'For Sale Only — Black',        file: 'armls/For Sale Only-blk.png' },
  { name: 'For Sale Only — White',        file: 'armls/For Sale Only-wht.png' },
  { name: 'For Sale or Rent — Black',     file: 'armls/For Sale or Rent - blk.png' },
  { name: 'For Sale or Rent — White',     file: 'armls/For Sale or Rent -wht.png' },
  { name: 'For Sale Not Rent — Black',    file: 'armls/For sale not rent-blk.png' },
  { name: 'For Sale Not Rent — White',    file: 'armls/For sale not rent-wht.png' },
  { name: 'Under Construction — Black',   file: 'armls/Under-construction-FINAL-BLACK.png' },
  { name: 'Under Construction — White',   file: 'armls/Under-construction-FINAL-WHITE.png' },
  { name: 'Virtual Staging — Black',      file: 'armls/Virtual Staging Watermark_BLACK.png' },
  { name: 'Virtual Staging — White',      file: 'armls/Virtual Staging Watermark_WHITE.png' },
  { name: 'To Be Built — Black',          file: 'armls/to-be-built-FINAL-BLACK.png' },
  { name: 'To Be Built — White',          file: 'armls/to-be-built-FINAL-WHITE.png' }
];

// ==========================================================
// STATE
// ==========================================================
var state = {
  uploadedFiles: [],
  // Each entry: { name, type, size, width, height, url, converted, customPosition: null | {xFrac, yFrac} }
  processedPreviews: [],
  // Each entry: { canvas, name, index }
  currentPreviewIndex: 0,
  selectedWatermark: null,   // Image element
  selectedWatermarkUrl: '',
  isArmlsMode: false,
  isProcessing: false,
  previewGenerated: false
};

// ==========================================================
// HELPERS
// ==========================================================
var $ = function (sel) { return document.querySelector(sel); };
var $$ = function (sel) { return document.querySelectorAll(sel); };

function escapeHtml(text) {
  var d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  var k = 1024;
  var sizes = ['B', 'KB', 'MB', 'GB'];
  var i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function isImageFile(filename) {
  return /\.(jpg|jpeg|png|webp|gif|bmp|heic|heif)$/i.test(filename);
}

function getMimeType(filename) {
  var ext = filename.split('.').pop().toLowerCase();
  var map = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp',
    heic: 'image/heic', heif: 'image/heif'
  };
  return map[ext] || 'image/jpeg';
}

function resolveWatermarkUrl(file) {
  return 'assets/' + file;
}

// ==========================================================
// TOAST NOTIFICATIONS
// ==========================================================
function showToast(type, title, message) {
  var container = $('#toast-container');
  if (!container) return;
  var icons = {
    success: 'fa-check-circle',
    warning: 'fa-exclamation-triangle',
    error: 'fa-times-circle',
    info: 'fa-info-circle'
  };
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.innerHTML =
    '<div class="toast-icon"><i class="fas ' + (icons[type] || icons.info) + '"></i></div>' +
    '<div class="toast-content"><div class="toast-title">' + escapeHtml(title) + '</div>' +
    '<div class="toast-message">' + escapeHtml(message) + '</div></div>' +
    '<button class="toast-close"><i class="fas fa-times"></i></button>';
  container.appendChild(toast);

  var closeBtn = toast.querySelector('.toast-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', function () { removeToast(toast); });
  }
  var tid = setTimeout(function () { removeToast(toast); }, 5000);
  toast.dataset.timeout = String(tid);
}

function removeToast(toast) {
  if (!toast || !toast.parentNode) return;
  clearTimeout(parseInt(toast.dataset.timeout, 10));
  toast.classList.add('toast-exit');
  toast.addEventListener('animationend', function () { toast.remove(); });
}

// ==========================================================
// INITIALIZATION
// ==========================================================
document.addEventListener('DOMContentLoaded', function () {
  populateWatermarkDropdown();
  setupEventListeners();
  selectDefaultWatermark();
  updateCounts();
});

function selectDefaultWatermark() {
  var list = state.isArmlsMode ? ARMLS_WATERMARKS : STANDARD_WATERMARKS;
  var def = null;
  for (var i = 0; i < list.length; i++) {
    if (list[i].isDefault) { def = list[i]; break; }
  }
  if (!def) def = list[0];
  if (def) {
    var sel = $('#watermark-select');
    if (sel) sel.value = def.file;
    selectWatermark(resolveWatermarkUrl(def.file));
  }
}

// ==========================================================
// WATERMARK DROPDOWN
// ==========================================================
function populateWatermarkDropdown() {
  var sel = $('#watermark-select');
  if (!sel) return;
  sel.innerHTML = '';
  var list = state.isArmlsMode ? ARMLS_WATERMARKS : STANDARD_WATERMARKS;

  for (var i = 0; i < list.length; i++) {
    var wm = list[i];
    var opt = document.createElement('option');
    opt.value = wm.file;
    opt.textContent = wm.name;
    if (wm.isDefault) opt.selected = true;
    sel.appendChild(opt);
  }

  var helper = $('#wm-helper-text');
  if (helper) {
    helper.textContent = state.isArmlsMode
      ? 'ARMLS mode: Only approved watermarks shown. No center placement allowed.'
      : 'Default: reverse-logo (white). Toggle ARMLS above for compliance mode.';
  }
}

// ==========================================================
// WATERMARK SELECTION
// ==========================================================
function selectWatermark(url) {
  var preview = $('#watermark-preview');
  var placeholder = $('#watermark-placeholder');
  if (!preview || !placeholder) return;

  state.selectedWatermark = null;
  state.selectedWatermarkUrl = url;

  var img = new Image();
  img.crossOrigin = 'anonymous';

  img.onload = function () {
    state.selectedWatermark = img;
    preview.src = url;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
    if (state.uploadedFiles.length > 0 && state.previewGenerated) {
      debouncedGeneratePreview();
    }
  };

  img.onerror = function () {
    // Fallback: try GitHub raw URL
    var ghUrl = CONFIG.githubBase + url.replace('assets/', '');
    if (url !== ghUrl) {
      var img2 = new Image();
      img2.crossOrigin = 'anonymous';
      img2.onload = function () {
        state.selectedWatermark = img2;
        state.selectedWatermarkUrl = ghUrl;
        preview.src = ghUrl;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
        if (state.uploadedFiles.length > 0 && state.previewGenerated) {
          debouncedGeneratePreview();
        }
      };
      img2.onerror = function () {
        showToast('warning', 'Watermark Error', 'Could not load watermark: ' + url);
      };
      img2.src = ghUrl;
    } else {
      showToast('warning', 'Watermark Error', 'Could not load watermark: ' + url);
    }
  };

  img.src = url;
}

// ==========================================================
// ARMLS MODE
// ==========================================================
function toggleArmlsMode(enabled) {
  state.isArmlsMode = enabled;

  var card = $('#armls-card');
  var statusEl = $('#armls-status');
  var customWrapper = $('#custom-upload-wrapper');
  var posSelect = $('#position-select');

  if (card) card.classList.toggle('armls-active', enabled);
  if (statusEl) statusEl.textContent = enabled ? 'ON' : 'OFF';

  // Disable / enable custom upload section
  if (customWrapper) {
    if (enabled) {
      customWrapper.classList.add('custom-upload-disabled');
      var advSection = $('#advanced-watermark-section');
      if (advSection) advSection.style.display = 'none';
    } else {
      customWrapper.classList.remove('custom-upload-disabled');
    }
  }

  // ARMLS: disable center position
  if (posSelect) {
    var centerOpt = posSelect.querySelector('option[value="center"]');
    if (enabled) {
      if (centerOpt) centerOpt.disabled = true;
      if (posSelect.value === 'center') {
        posSelect.value = 'bottom-right';
      }
    } else {
      if (centerOpt) centerOpt.disabled = false;
    }
  }

  // Repopulate dropdown and select first item
  populateWatermarkDropdown();
  var list = enabled ? ARMLS_WATERMARKS : STANDARD_WATERMARKS;
  var def = null;
  for (var i = 0; i < list.length; i++) {
    if (list[i].isDefault) { def = list[i]; break; }
  }
  if (!def) def = list[0];
  if (def) {
    var sel = $('#watermark-select');
    if (sel) sel.value = def.file;
    selectWatermark(resolveWatermarkUrl(def.file));
  }

  showToast(
    'info', 'ARMLS Mode',
    enabled
      ? 'ARMLS compliance enabled. Only approved watermarks available.'
      : 'ARMLS compliance disabled. Full watermark library available.'
  );
}

// ==========================================================
// EVENT LISTENERS
// ==========================================================
function setupEventListeners() {
  // File input
  var fileInput = $('#file-input');
  if (fileInput) fileInput.addEventListener('change', handleFileSelect);

  // Drop zone
  var dropZone = $('#drop-zone');
  if (dropZone) {
    dropZone.addEventListener('click', function () { if (fileInput) fileInput.click(); });
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
  }

  // Upload method tabs
  $$('.upload-method-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchUploadMethod(btn.dataset.method);
    });
  });

  // URL add
  var addUrlBtn = $('#add-url-btn');
  if (addUrlBtn) addUrlBtn.addEventListener('click', handleUrlAdd);
  var urlInput = $('#image-url-input');
  if (urlInput) {
    urlInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.ctrlKey) handleUrlAdd();
    });
  }

  // Watermark select
  var wmSel = $('#watermark-select');
  if (wmSel) {
    wmSel.addEventListener('change', function (e) {
      if (e.target.value) selectWatermark(resolveWatermarkUrl(e.target.value));
    });
  }

  // ARMLS toggle
  var mlsToggle = $('#mls-toggle');
  if (mlsToggle) {
    mlsToggle.addEventListener('change', function (e) {
      toggleArmlsMode(e.target.checked);
    });
  }

  // Opacity slider
  var opSlider = $('#opacity-slider');
  if (opSlider) {
    opSlider.addEventListener('input', function (e) {
      var valEl = $('#opacity-value');
      if (valEl) valEl.textContent = e.target.value + '%';
      debouncedUpdatePreview();
    });
  }

  // Size slider
  var szSlider = $('#size-slider');
  if (szSlider) {
    szSlider.addEventListener('input', function (e) {
      var valEl = $('#size-value');
      if (valEl) valEl.textContent = e.target.value + '%';
      debouncedUpdatePreview();
    });
  }

  // Position select
  var posSel = $('#position-select');
  if (posSel) posSel.addEventListener('change', debouncedUpdatePreview);

  // Generate preview
  var genBtn = $('#generate-preview');
  if (genBtn) genBtn.addEventListener('click', generatePreview);

  // Preview navigation
  var prevBtn = $('#prev-image');
  if (prevBtn) prevBtn.addEventListener('click', function () { navigatePreview(-1); });
  var nextBtn = $('#next-image');
  if (nextBtn) nextBtn.addEventListener('click', function () { navigatePreview(1); });

  // Fullscreen
  var enlargeBtn = $('#enlarge-preview');
  if (enlargeBtn) enlargeBtn.addEventListener('click', openFullscreen);
  var fsClose = $('#fullscreen-close');
  if (fsClose) fsClose.addEventListener('click', closeFullscreen);
  var fsPrev = $('#fullscreen-prev');
  if (fsPrev) fsPrev.addEventListener('click', function () { navigateFullscreen(-1); });
  var fsNext = $('#fullscreen-next');
  if (fsNext) fsNext.addEventListener('click', function () { navigateFullscreen(1); });

  // Process & download
  var processBtn = $('#process-btn');
  if (processBtn) processBtn.addEventListener('click', processAllImages);

  // Advanced toggle
  var advToggle = $('#advanced-toggle');
  if (advToggle) advToggle.addEventListener('click', toggleAdvancedSection);

  // Custom watermark upload
  var changeWm = $('#change-watermark');
  if (changeWm) {
    changeWm.addEventListener('click', function () {
      var wmUp = $('#watermark-upload');
      if (wmUp) wmUp.click();
    });
  }
  var wmUpload = $('#watermark-upload');
  if (wmUpload) wmUpload.addEventListener('change', handleCustomWatermarkUpload);

  // Help modal
  var helpBtn = $('#help-btn');
  if (helpBtn) helpBtn.addEventListener('click', openHelpModal);
  var closeHelp = $('#close-help');
  if (closeHelp) closeHelp.addEventListener('click', closeHelpModal);

  // Reset position button
  var resetBtn = $('#reset-position');
  if (resetBtn) resetBtn.addEventListener('click', resetCurrentImagePosition);

  // Canvas drag / click for per-image positioning
  setupCanvasDrag();

  // Keyboard shortcuts
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeFullscreen();
      closeHelpModal();
    }
    var fsModal = $('#fullscreen-modal');
    if (fsModal && fsModal.classList.contains('active')) {
      if (e.key === 'ArrowLeft') navigateFullscreen(-1);
      if (e.key === 'ArrowRight') navigateFullscreen(1);
    }
  });

  // Close modals on overlay click
  var helpModal = $('#help-modal');
  if (helpModal) {
    helpModal.addEventListener('click', function (e) {
      if (e.target === helpModal) closeHelpModal();
    });
  }
  var fsModal = $('#fullscreen-modal');
  if (fsModal) {
    fsModal.addEventListener('click', function (e) {
      if (e.target === fsModal || e.target.classList.contains('fullscreen-content')) closeFullscreen();
    });
  }

  // Body-level drag prevention
  document.body.addEventListener('dragover', function (e) { e.preventDefault(); });
  document.body.addEventListener('drop', function (e) { e.preventDefault(); });
}

// ==========================================================
// CANVAS DRAG & DROP — PER-IMAGE WATERMARK PLACEMENT
// ==========================================================
function setupCanvasDrag() {
  var canvas = $('#preview-canvas');
  if (!canvas) return;

  var dragging = false;

  function getCanvasFraction(e) {
    var rect = canvas.getBoundingClientRect();
    var clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    var xFrac = (clientX - rect.left) / rect.width;
    var yFrac = (clientY - rect.top) / rect.height;
    return {
      xFrac: Math.max(0, Math.min(1, xFrac)),
      yFrac: Math.max(0, Math.min(1, yFrac))
    };
  }

  function applyPosition(frac) {
    if (!state.previewGenerated || state.uploadedFiles.length === 0) return;
    var idx = state.currentPreviewIndex;
    if (idx < 0 || idx >= state.uploadedFiles.length) return;

    // In ARMLS mode snap to nearest corner (no center)
    if (state.isArmlsMode) {
      frac.xFrac = frac.xFrac < 0.5 ? 0 : 1;
      frac.yFrac = frac.yFrac < 0.5 ? 0 : 1;
    }

    state.uploadedFiles[idx].customPosition = { xFrac: frac.xFrac, yFrac: frac.yFrac };
    regenerateCurrentPreview();
  }

  // Mouse events
  canvas.addEventListener('mousedown', function (e) {
    if (!state.previewGenerated) return;
    dragging = true;
    applyPosition(getCanvasFraction(e));
  });
  canvas.addEventListener('mousemove', function (e) {
    if (dragging) applyPosition(getCanvasFraction(e));
  });
  document.addEventListener('mouseup', function () { dragging = false; });

  // Touch events
  canvas.addEventListener('touchstart', function (e) {
    if (!state.previewGenerated) return;
    dragging = true;
    e.preventDefault();
    applyPosition(getCanvasFraction(e));
  }, { passive: false });
  canvas.addEventListener('touchmove', function (e) {
    if (dragging) {
      e.preventDefault();
      applyPosition(getCanvasFraction(e));
    }
  }, { passive: false });
  canvas.addEventListener('touchend', function () { dragging = false; });
}

function resetCurrentImagePosition() {
  var idx = state.currentPreviewIndex;
  if (idx >= 0 && idx < state.uploadedFiles.length) {
    state.uploadedFiles[idx].customPosition = null;
    regenerateCurrentPreview();
    showToast('info', 'Position Reset', 'Using default position for this image');
  }
}

// ==========================================================
// DEBOUNCE HELPERS
// ==========================================================
var _previewTimer = null;
function debouncedUpdatePreview() {
  if (!state.previewGenerated || state.uploadedFiles.length === 0) return;
  clearTimeout(_previewTimer);
  _previewTimer = setTimeout(function () { regenerateCurrentPreview(); }, 60);
}

var _genTimer = null;
function debouncedGeneratePreview() {
  clearTimeout(_genTimer);
  _genTimer = setTimeout(function () { generatePreview(); }, 100);
}

// ==========================================================
// FILE HANDLING
// ==========================================================
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  if (e.currentTarget) e.currentTarget.classList.add('hover');
}

function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  if (e.currentTarget) e.currentTarget.classList.remove('hover');
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  if (e.currentTarget) e.currentTarget.classList.remove('hover');
  processFiles(Array.from(e.dataTransfer.files));
}

function handleFileSelect(e) {
  processFiles(Array.from(e.target.files));
  e.target.value = '';
}

async function processFiles(files) {
  var valid = files.filter(function (f) {
    if (f.size > CONFIG.maxFileSize) {
      showToast('warning', 'File Too Large', f.name + ' exceeds 100 MB limit');
      return false;
    }
    return true;
  });
  if (valid.length === 0) return;

  var needsProcessing = valid.some(function (f) {
    var lower = f.name.toLowerCase();
    return lower.endsWith('.heic') || lower.endsWith('.heif') || lower.endsWith('.zip');
  });
  if (needsProcessing) {
    var overlay = $('#processing-overlay');
    if (overlay) overlay.style.display = 'flex';
  }

  try {
    for (var i = 0; i < valid.length; i++) {
      var f = valid[i];
      var lower = f.name.toLowerCase();
      if (lower.endsWith('.zip')) {
        await handleZipFile(f);
      } else if (lower.endsWith('.heic') || lower.endsWith('.heif')) {
        await handleHeicFile(f);
      } else {
        await handleRegularFile(f, false);
      }
    }
    updateCounts();
    showToast('success', 'Files Uploaded', valid.length + ' file(s) ready for processing');
  } catch (err) {
    showToast('error', 'Processing Error', 'Some files could not be processed');
  } finally {
    var ov = $('#processing-overlay');
    if (ov) ov.style.display = 'none';
  }
}

async function handleZipFile(file) {
  try {
    var zip = await JSZip.loadAsync(file);
    var imgFiles = [];
    var paths = Object.keys(zip.files);
    for (var i = 0; i < paths.length; i++) {
      var path = paths[i];
      if (zip.files[path].dir || !isImageFile(path)) continue;
      var blob = await zip.files[path].async('blob');
      var fname = path.split('/').pop();
      imgFiles.push(new File([blob], fname, { type: getMimeType(fname) }));
    }
    for (var j = 0; j < imgFiles.length; j++) {
      await handleRegularFile(imgFiles[j], true);
    }
    if (imgFiles.length > 0) {
      showToast('success', 'ZIP Extracted', imgFiles.length + ' images extracted');
    }
  } catch (err) {
    showToast('error', 'ZIP Error', 'Could not extract images from ZIP');
  }
}

async function handleHeicFile(file) {
  try {
    var buf = await file.arrayBuffer();
    var blob = await heic2any({ blob: new Blob([buf]), toType: 'image/jpeg', quality: 0.9 });
    var jpegFile = new File(
      [blob],
      file.name.replace(/\.hei[cf]$/i, '.jpg'),
      { type: 'image/jpeg' }
    );
    await handleRegularFile(jpegFile, true);
    showToast('success', 'HEIC Converted', file.name + ' → JPEG');
  } catch (err) {
    showToast('error', 'Conversion Error', 'Could not convert ' + file.name);
  }
}

function handleRegularFile(file, converted) {
  return new Promise(function (resolve) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        state.uploadedFiles.push({
          name: file.name,
          type: file.type,
          size: file.size,
          width: img.width,
          height: img.height,
          url: e.target.result,
          converted: !!converted,
          customPosition: null
        });
        addFileToList({
          name: file.name,
          size: formatFileSize(file.size),
          converted: !!converted
        });
        resolve();
      };
      img.onerror = function () { resolve(); };
      img.src = e.target.result;
    };
    reader.onerror = function () { resolve(); };
    reader.readAsDataURL(file);
  });
}

function handleUrlAdd() {
  var textarea = $('#image-url-input');
  if (!textarea) return;
  var urls = textarea.value.trim().split('\n').filter(function (u) { return u.trim(); });
  if (urls.length === 0) {
    showToast('warning', 'No URLs', 'Enter at least one image URL');
    return;
  }
  var loaded = 0;
  var total = urls.length;
  urls.forEach(function (rawUrl) {
    var cleanUrl = rawUrl.trim();
    try { new URL(cleanUrl); } catch (e) { loaded++; return; }
    fetch(cleanUrl)
      .then(function (r) { if (!r.ok) throw new Error('fetch failed'); return r.blob(); })
      .then(function (blob) {
        var fn = cleanUrl.split('/').pop() || ('image-' + Date.now() + '.jpg');
        return handleRegularFile(new File([blob], fn, { type: blob.type || 'image/jpeg' }), false);
      })
      .then(function () {
        loaded++;
        if (loaded === total) {
          updateCounts();
          showToast('success', 'URLs Loaded', loaded + ' image(s) loaded');
          textarea.value = '';
        }
      })
      .catch(function () { loaded++; });
  });
}

function switchUploadMethod(method) {
  $$('.upload-method-btn').forEach(function (b) {
    b.classList.toggle('active', b.dataset.method === method);
  });
  var filesUp = $('#files-upload');
  var urlUp = $('#url-upload');
  if (filesUp) filesUp.style.display = method === 'files' ? 'block' : 'none';
  if (urlUp) urlUp.style.display = method === 'url' ? 'block' : 'none';
}

// ==========================================================
// UI UPDATES
// ==========================================================
function addFileToList(file) {
  var list = $('#file-list');
  if (!list) return;
  var item = document.createElement('div');
  item.className = 'file-item' + (file.converted ? ' converted' : '');
  item.setAttribute('data-filename', file.name);
  item.innerHTML =
    '<div class="file-icon' + (file.converted ? ' converted' : '') + '"><i class="fas fa-image"></i></div>' +
    '<div class="file-info">' +
      '<div class="file-name">' + escapeHtml(file.name) +
        (file.converted ? '<span class="converted-badge">Converted</span>' : '') +
      '</div>' +
      '<div class="file-size">' + file.size + '</div>' +
    '</div>' +
    '<button class="remove-file" title="Remove"><i class="fas fa-times"></i></button>';
  var rmBtn = item.querySelector('.remove-file');
  rmBtn.addEventListener('click', function () { removeFile(file.name); });
  list.appendChild(item);
}

function removeFile(fileName) {
  state.uploadedFiles = state.uploadedFiles.filter(function (f) { return f.name !== fileName; });
  var list = $('#file-list');
  if (list) {
    var el = list.querySelector('[data-filename="' + CSS.escape(fileName) + '"]');
    if (el) el.remove();
  }
  updateCounts();
  if (state.uploadedFiles.length === 0) resetPreview();
}

function updateCounts() {
  var c = state.uploadedFiles.length;
  var fc = $('#file-count');
  if (fc) fc.textContent = String(c);
  var pc = $('#process-count');
  if (pc) pc.textContent = String(c);
  var pb = $('#process-btn');
  if (pb) pb.disabled = c === 0;
}

// ==========================================================
// PREVIEW GENERATION
// ==========================================================
async function generatePreview() {
  if (state.uploadedFiles.length === 0) {
    showToast('warning', 'No Images', 'Please upload images first');
    return;
  }

  var canvas = $('#preview-canvas');
  var placeholder = $('#preview-placeholder');
  var loading = $('#preview-loading');
  var bar = $('#preview-bar');
  var actions = $('#preview-actions');
  var enlargeBtn = $('#enlarge-preview');

  if (placeholder) placeholder.style.display = 'none';
  if (loading) loading.style.display = 'block';

  try {
    state.processedPreviews = [];
    state.currentPreviewIndex = 0;

    for (var i = 0; i < state.uploadedFiles.length; i++) {
      await generateSinglePreview(i);
    }

    displayPreviewImage();

    if (loading) loading.style.display = 'none';
    if (canvas) canvas.style.display = 'block';
    if (bar) bar.style.display = 'flex';
    if (actions) actions.style.display = 'flex';
    if (enlargeBtn) enlargeBtn.style.display = 'flex';

    state.previewGenerated = true;
    updateCounts();
  } catch (err) {
    if (loading) loading.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
    showToast('error', 'Preview Error', 'Could not generate preview');
  }
}

function generateSinglePreview(idx) {
  return new Promise(function (resolve) {
    var fileData = state.uploadedFiles[idx];
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      var cv = document.createElement('canvas');
      var ctx = cv.getContext('2d');
      var scale = Math.min(1, CONFIG.previewMaxDim / Math.max(img.width, img.height));
      cv.width = img.width * scale;
      cv.height = img.height * scale;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      if (state.selectedWatermark) {
        drawWatermarkOnCanvas(ctx, cv, idx);
      }
      state.processedPreviews[idx] = { canvas: cv, name: fileData.name, index: idx };
      resolve();
    };
    img.onerror = function () { resolve(); };
    img.src = fileData.url;
  });
}

function regenerateCurrentPreview() {
  if (!state.previewGenerated || state.uploadedFiles.length === 0) return;
  var idx = state.currentPreviewIndex;
  generateSinglePreview(idx).then(function () { displayPreviewImage(); });
}

// ==========================================================
// WATERMARK DRAWING
// ==========================================================
function drawWatermarkOnCanvas(ctx, canvas, fileIdx) {
  var wm = state.selectedWatermark;
  if (!wm) return;

  var opacityEl = $('#opacity-slider');
  var sizeEl = $('#size-slider');
  var opacity = parseInt(opacityEl ? opacityEl.value : '40', 10) / 100;
  var size = parseInt(sizeEl ? sizeEl.value : '35', 10) / 100;

  var aspectRatio = wm.naturalWidth / wm.naturalHeight;
  var maxDim = Math.min(canvas.width, canvas.height) * size;
  var wmW, wmH;
  if (aspectRatio > 1) {
    wmW = maxDim;
    wmH = maxDim / aspectRatio;
  } else {
    wmH = maxDim;
    wmW = maxDim * aspectRatio;
  }

  var fileData = state.uploadedFiles[fileIdx];
  var pos;

  if (fileData && fileData.customPosition) {
    // Per-image custom position (fraction-based)
    var cx = fileData.customPosition.xFrac * canvas.width;
    var cy = fileData.customPosition.yFrac * canvas.height;
    pos = { x: cx - wmW / 2, y: cy - wmH / 2 };
    // Clamp within bounds
    pos.x = Math.max(0, Math.min(canvas.width - wmW, pos.x));
    pos.y = Math.max(0, Math.min(canvas.height - wmH, pos.y));
  } else {
    var posEl = $('#position-select');
    var position = (posEl ? posEl.value : 'center').toLowerCase().replace(/[-_\s]/g, '-');
    pos = getWatermarkPosition(canvas, wmW, wmH, position);
  }

  ctx.globalAlpha = opacity;
  ctx.drawImage(wm, pos.x, pos.y, wmW, wmH);
  ctx.globalAlpha = 1.0;
}

function getWatermarkPosition(canvas, wmW, wmH, position) {
  var pad = Math.min(canvas.width, canvas.height) * 0.03;
  switch (position) {
    case 'top-left':     return { x: pad, y: pad };
    case 'top-right':    return { x: canvas.width - wmW - pad, y: pad };
    case 'bottom-left':  return { x: pad, y: canvas.height - wmH - pad };
    case 'bottom-right': return { x: canvas.width - wmW - pad, y: canvas.height - wmH - pad };
    case 'center':
    default:             return { x: (canvas.width - wmW) / 2, y: (canvas.height - wmH) / 2 };
  }
}

// ==========================================================
// PREVIEW DISPLAY & NAVIGATION
// ==========================================================
function displayPreviewImage() {
  var canvas = $('#preview-canvas');
  if (!canvas || state.processedPreviews.length === 0) return;

  var idx = state.currentPreviewIndex;
  var current = state.processedPreviews[idx];
  if (!current) return;

  canvas.width = current.canvas.width;
  canvas.height = current.canvas.height;
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(current.canvas, 0, 0);

  // Update file info
  var fn = $('#preview-file-name');
  if (fn) fn.textContent = current.name;
  var counter = $('#preview-counter');
  if (counter) counter.textContent = (idx + 1) + ' / ' + state.processedPreviews.length;

  // Navigation buttons
  var prevBtn = $('#prev-image');
  var nextBtn = $('#next-image');
  if (prevBtn) prevBtn.disabled = idx === 0;
  if (nextBtn) nextBtn.disabled = idx === state.processedPreviews.length - 1;

  // Placement badge
  var badge = $('#placement-status');
  var fileData = state.uploadedFiles[idx];
  if (badge && fileData) {
    if (fileData.customPosition) {
      badge.textContent = 'Custom';
      badge.className = 'placement-badge badge-custom';
    } else {
      badge.textContent = 'Default';
      badge.className = 'placement-badge';
    }
  }

  // Reset button visibility
  var resetBtn = $('#reset-position');
  if (resetBtn && fileData) {
    resetBtn.style.display = fileData.customPosition ? 'inline-flex' : 'none';
  }

  updateFullscreenInfo();
}

function navigatePreview(direction) {
  var newIdx = state.currentPreviewIndex + direction;
  if (newIdx >= 0 && newIdx < state.processedPreviews.length) {
    state.currentPreviewIndex = newIdx;
    displayPreviewImage();
  }
}

function resetPreview() {
  var canvas = $('#preview-canvas');
  var placeholder = $('#preview-placeholder');
  var bar = $('#preview-bar');
  var actions = $('#preview-actions');
  var enlargeBtn = $('#enlarge-preview');

  if (canvas) {
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.display = 'none';
  }
  if (placeholder) placeholder.style.display = 'block';
  if (bar) bar.style.display = 'none';
  if (actions) actions.style.display = 'none';
  if (enlargeBtn) enlargeBtn.style.display = 'none';

  state.processedPreviews = [];
  state.currentPreviewIndex = 0;
  state.previewGenerated = false;
}

// ==========================================================
// FULLSCREEN MODAL
// ==========================================================
function openFullscreen() {
  if (state.processedPreviews.length === 0) return;
  var modal = $('#fullscreen-modal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  displayFullscreenImage();
}

function closeFullscreen() {
  var modal = $('#fullscreen-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function displayFullscreenImage() {
  var canvas = $('#fullscreen-canvas');
  if (!canvas || state.processedPreviews.length === 0) return;
  var current = state.processedPreviews[state.currentPreviewIndex];
  if (!current) return;

  canvas.width = current.canvas.width;
  canvas.height = current.canvas.height;
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(current.canvas, 0, 0);
  updateFullscreenInfo();
}

function navigateFullscreen(direction) {
  var newIdx = state.currentPreviewIndex + direction;
  if (newIdx >= 0 && newIdx < state.processedPreviews.length) {
    state.currentPreviewIndex = newIdx;
    displayFullscreenImage();
    displayPreviewImage();
  }
}

function updateFullscreenInfo() {
  if (state.processedPreviews.length === 0) return;
  var current = state.processedPreviews[state.currentPreviewIndex];
  var fn = $('#fullscreen-filename');
  var counter = $('#fullscreen-counter');
  if (fn && current) fn.textContent = current.name;
  if (counter) counter.textContent = (state.currentPreviewIndex + 1) + ' / ' + state.processedPreviews.length;

  var prevBtn = $('#fullscreen-prev');
  var nextBtn = $('#fullscreen-next');
  if (prevBtn) prevBtn.disabled = state.currentPreviewIndex === 0;
  if (nextBtn) nextBtn.disabled = state.currentPreviewIndex === state.processedPreviews.length - 1;
}

// ==========================================================
// BATCH PROCESS & ZIP DOWNLOAD
// ==========================================================
async function processAllImages() {
  if (state.uploadedFiles.length === 0) {
    showToast('warning', 'No Images', 'Upload images first');
    return;
  }

  // Generate previews if not yet done
  if (!state.previewGenerated) {
    await generatePreview();
  }

  var processBtn = $('#process-btn');
  var btnText = processBtn ? processBtn.querySelector('.btn-text') : null;
  var btnLoader = processBtn ? processBtn.querySelector('.btn-loader') : null;
  var downloadSection = $('#download-section');
  var downloadLink = $('#download-link');

  // Processing state
  state.isProcessing = true;
  if (processBtn) processBtn.disabled = true;
  if (btnText) btnText.style.visibility = 'hidden';
  if (btnLoader) btnLoader.style.display = 'flex';
  if (downloadSection) downloadSection.style.display = 'none';

  try {
    var zip = new JSZip();

    for (var i = 0; i < state.uploadedFiles.length; i++) {
      var fileData = state.uploadedFiles[i];
      var fileIdx = i; // capture for closure
      await new Promise(function (resolve) {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function () {
          var cv = document.createElement('canvas');
          var ctx = cv.getContext('2d');
          // Full resolution
          cv.width = img.width;
          cv.height = img.height;
          ctx.clearRect(0, 0, cv.width, cv.height);
          ctx.drawImage(img, 0, 0);
          if (state.selectedWatermark) {
            drawWatermarkOnCanvas(ctx, cv, fileIdx);
          }
          cv.toBlob(function (blob) {
            var origName = fileData.name.replace(/\.[^/.]+$/, '');
            zip.file(origName + '-watermarked.jpg', blob);
            resolve();
          }, 'image/jpeg', CONFIG.quality);
        };
        img.onerror = function () { resolve(); };
        img.src = fileData.url;
      });
    }

    var zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    var url = URL.createObjectURL(zipBlob);

    if (downloadLink) {
      downloadLink.href = url;
      downloadLink.download = 'watermarked-images-' + Date.now() + '.zip';
    }
    if (downloadSection) downloadSection.style.display = 'block';
    showToast('success', 'Done!', state.uploadedFiles.length + ' images processed');
  } catch (err) {
    showToast('error', 'Processing Error', 'Failed to process images');
  } finally {
    state.isProcessing = false;
    if (processBtn) processBtn.disabled = false;
    if (btnText) btnText.style.visibility = 'visible';
    if (btnLoader) btnLoader.style.display = 'none';
  }
}

// ==========================================================
// ADVANCED / CUSTOM WATERMARK UPLOAD
// ==========================================================
function toggleAdvancedSection() {
  var section = $('#advanced-watermark-section');
  var toggle = $('#advanced-toggle');
  if (!section || !toggle) return;
  var isHidden = section.style.display === 'none';
  section.style.display = isHidden ? 'block' : 'none';
  var icon = toggle.querySelector('.fas');
  if (icon) {
    icon.classList.toggle('fa-chevron-down', !isHidden);
    icon.classList.toggle('fa-chevron-up', isHidden);
  }
}

function handleCustomWatermarkUpload(e) {
  var file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('warning', 'Invalid File', 'Please select an image file');
    return;
  }

  var reader = new FileReader();
  reader.onload = function (ev) {
    var img = new Image();
    img.onload = function () {
      state.selectedWatermark = img;
      var preview = $('#watermark-preview');
      var placeholder = $('#watermark-placeholder');
      if (preview) { preview.src = ev.target.result; preview.style.display = 'block'; }
      if (placeholder) placeholder.style.display = 'none';
      if (state.uploadedFiles.length > 0 && state.previewGenerated) {
        generatePreview();
      }
      showToast('success', 'Custom Watermark', 'Applied successfully');
    };
    img.onerror = function () {
      showToast('error', 'Upload Failed', 'Could not load watermark');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

// ==========================================================
// HELP MODAL
// ==========================================================
function openHelpModal() {
  var m = $('#help-modal');
  if (m) {
    m.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeHelpModal() {
  var m = $('#help-modal');
  if (m) {
    m.classList.remove('active');
    document.body.style.overflow = '';
  }
}

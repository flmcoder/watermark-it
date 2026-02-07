/**
 * Watermark-It - Fort Lowell Realty Property Image Watermarking Tool
 * Updates: ARMLS mode, opacity fix, quick position near preview, default opacity 22%
 */

const CONFIG = {
  supportedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  maxFileSize: 100 * 1024 * 1024,
  previewWidth: 1200,
  previewHeight: 800,
  quality: 0.92,
  watermarkMaxWidth: 200
};

const ARMLS_WATERMARKS = [
  { name: 'For Sale Only (blk)', file: 'assets/armls/For Sale Only-blk.png' },
  { name: 'For Sale Only (wht)', file: 'assets/armls/For Sale Only-wht.png' },
  { name: 'For Rent Only (blk)', file: 'assets/armls/For Rent only-blk.png' },
  { name: 'For Rent Only (wht)', file: 'assets/armls/For Rent only-wht.png' },
  { name: 'For Sale or Rent (blk)', file: 'assets/armls/For Sale or Rent -blk.png' },
  { name: 'For Sale or Rent (wht)', file: 'assets/armls/For Sale or Rent -wht.png' },
  { name: 'For Sale not Rent (blk)', file: 'assets/armls/For sale not rent-blk.png' },
  { name: 'For Sale not Rent (wht)', file: 'assets/armls/For sale not rent-wht.png' },
  { name: 'Under Construction (blk)', file: 'assets/armls/Under-construction-FINAL-BLACK.png' },
  { name: 'Under Construction (wht)', file: 'assets/armls/Under-construction-FINAL-WHITE.png' },
  { name: 'To Be Built (blk)', file: 'assets/armls/to-be-built-FINAL-BLACK.png' },
  { name: 'To Be Built (wht)', file: 'assets/armls/to-be-built-FINAL-WHITE.png' },
  { name: 'Virtually Staged (blk)', file: 'assets/armls/Virtual Staging Watermark_BLACK.png' },
  { name: 'Virtually Staged (wht)', file: 'assets/armls/Virtual Staging Watermark_WHITE.png' }
];

let state = {
  uploadedFiles: [],
  processedPreviews: [],
  currentPreviewIndex: 0,
  selectedWatermark: null,
  watermarkList: [],
  baseWatermarkList: [],
  customWatermark: null,
  isProcessing: false,
  isDarkMode: false,
  previewGenerated: false,
  isMLSMode: false
};

let previewJobId = 0;
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
const requestPreviewGeneration = debounce(() => {
  startPreviewGeneration();
}, 120);

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  loadWatermarks();
  setupEventListeners();
  checkTheme();
  console.log('Watermark-It initialized successfully');
});

function initializeApp() {
  preloadSampleImages();
  updateFileCount();
  updateProcessCount();

  document.body.addEventListener('dragover', handleDragOver);
  document.body.addEventListener('dragleave', handleDragLeave);
  document.body.addEventListener('drop', handleDrop);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeFullscreen();
      closeHelpModal();
    }
  });

  document.querySelectorAll('.modal, .fullscreen-modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeFullscreen();
        closeHelpModal();
      }
    });
  });
}

function preloadSampleImages() {
  const sampleImages = [
    { name: 'sample-property-1.jpg', url: generateSampleImage(800, 600, '#4a5568', '#2d3748', 'Property Photo 1') },
    { name: 'sample-property-2.jpg', url: generateSampleImage(800, 600, '#2d3748', '#1a202c', 'Property Photo 2') },
    { name: 'sample-property-3.jpg', url: generateSampleImage(800, 600, '#553c9a', '#44337a', 'Property Photo 3') }
  ];
  window.demoImages = sampleImages;
}

function generateSampleImage(width, height, bgColor, textColor, text) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  for (let i = 0; i < width; i += 40) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
  }
  for (let i = 0; i < height; i += 40) {
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
  }
  ctx.fillStyle = textColor;
  ctx.font = 'bold 48px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);
  return canvas.toDataURL('image/jpeg', 0.8);
}

async function loadWatermarks() {
  try {
    const response = await fetch('assets/watermarks.json');
    if (!response.ok) throw new Error('Failed to load watermarks');
    const data = await response.json();
    state.watermarkList = data.watermarks || [];
    state.baseWatermarkList = [...state.watermarkList];
    populateWatermarkDropdown();
    if (state.watermarkList.length > 0) selectWatermark(state.watermarkList[0].file);
  } catch (error) {
    console.warn('Could not load watermarks.json, using directory defaults:', error);
    loadWatermarksFromDirectory();
  }
}

function loadWatermarksFromDirectory() {
  const defaults = [
    { name: 'Rounded (Default)', file: 'assets/rounded.png', default: true },
    { name: 'Flat White Stroke', file: 'assets/Flat-white-stroke-watermark.png' },
    { name: 'Grey', file: 'assets/grey-watermark.png' },
    { name: 'Logo', file: 'assets/logo-watermark.png' },
    { name: 'Logo Alt', file: 'assets/logo-watermark2.png' }
  ];
  state.watermarkList = defaults;
  state.baseWatermarkList = [...defaults];
  populateWatermarkDropdown();
  if (state.watermarkList.length > 0) selectWatermark(state.watermarkList[0].file);
}

function populateWatermarkDropdown() {
  const select = $('#watermark-select');
  if (!select) return;
  select.innerHTML = '';
  state.watermarkList.forEach((wm) => {
    const option = document.createElement('option');
    option.value = wm.file;
    option.textContent = wm.name;
    if (wm.default) option.selected = true;
    select.appendChild(option);
  });
  const quick = $('#position-select-quick');
  syncPositionSelectors(); // ensure sync on reload
}

function selectWatermark(url) {
  const preview = $('#watermark-preview');
  const placeholder = $('#watermark-placeholder');
  if (!preview || !placeholder) return;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    state.selectedWatermark = img;
    preview.src = url;
    preview.alt = 'Selected Watermark';
    preview.style.display = 'block';
    placeholder.style.display = 'none';
    if (state.uploadedFiles.length > 0 && state.previewGenerated) {
      requestPreviewGeneration();
    }
  };
  img.onerror = () => {
    console.warn(`Failed to load watermark: ${url}`);
    showToast('warning', 'Watermark Error', `Could not load watermark from: ${url}`);
  };
  img.src = url;
}

function setupEventListeners() {
  const fileInput = $('#file-input');
  if (fileInput) fileInput.addEventListener('change', handleFileSelect);

  const dropZone = $('#drop-zone');
  if (dropZone) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
  }

  $$('.upload-method-btn').forEach(btn => {
    btn.addEventListener('click', () => switchUploadMethod(btn.dataset.method));
  });

  $('#add-url-btn')?.addEventListener('click', handleUrlAdd);
  $('#image-url-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) handleUrlAdd();
  });

  $('#watermark-select')?.addEventListener('change', (e) => {
    if (e.target.value) selectWatermark(e.target.value);
  });

  $('#opacity-slider')?.addEventListener('input', (e) => {
    $('#opacity-value').textContent = `${e.target.value}%`;
    if (state.uploadedFiles.length > 0) requestPreviewGeneration();
  });
  $('#size-slider')?.addEventListener('input', (e) => {
    $('#size-value').textContent = `${e.target.value}%`;
    if (state.uploadedFiles.length > 0) requestPreviewGeneration();
  });
  $('#position-select')?.addEventListener('change', () => {
    syncPositionSelectors('main');
    if (state.uploadedFiles.length > 0) requestPreviewGeneration();
  });
  $('#position-select-quick')?.addEventListener('change', () => {
    syncPositionSelectors('quick');
    if (state.uploadedFiles.length > 0) requestPreviewGeneration();
  });

  $('#generate-preview')?.addEventListener('click', startPreviewGeneration);
  $('#prev-image')?.addEventListener('click', () => navigatePreview(-1));
  $('#next-image')?.addEventListener('click', () => navigatePreview(1));

  $('#enlarge-preview')?.addEventListener('click', openFullscreen);
  $('#fullscreen-close')?.addEventListener('click', closeFullscreen);
  $('#fullscreen-prev')?.addEventListener('click', () => navigateFullscreen(-1));
  $('#fullscreen-next')?.addEventListener('click', () => navigateFullscreen(1));

  $('#process-btn')?.addEventListener('click', processAllImages);

  $('#advanced-toggle')?.addEventListener('click', toggleAdvancedSection);

  $('#change-watermark')?.addEventListener('click', () => $('#watermark-upload')?.click());
  $('#watermark-upload')?.addEventListener('change', handleCustomWatermarkUpload);

  $('#help-btn')?.addEventListener('click', openHelpModal);
  $('#close-help')?.addEventListener('click', closeHelpModal);

  $('#theme-toggle')?.addEventListener('click', toggleTheme);

  $('#mls-toggle')?.addEventListener('change', handleMLSToggle);

  document.addEventListener('keydown', handlePreviewKeyboard);
}

function handleDragOver(e) { e.preventDefault(); e.stopPropagation(); e.currentTarget?.classList.add('hover'); }
function handleDragLeave(e) { e.preventDefault(); e.stopPropagation(); e.currentTarget?.classList.remove('hover'); }
function handleDrop(e) {
  e.preventDefault(); e.stopPropagation(); e.currentTarget?.classList.remove('hover');
  const files = Array.from(e.dataTransfer.files);
  processFiles(files);
}
function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  processFiles(files);
  e.target.value = '';
}

async function processFiles(files) {
  const validFiles = files.filter(file => {
    if (file.size > CONFIG.maxFileSize) {
      showToast('warning', 'File Too Large', `${file.name} exceeds ${CONFIG.maxFileSize / 1024 / 1024}MB limit`);
      return false;
    }
    return true;
  });
  if (validFiles.length === 0) return;

  const needsProcessing = validFiles.some(f => f.name.toLowerCase().endsWith('.heic') || f.name.toLowerCase().endsWith('.zip'));
  if (needsProcessing) $('#processing-overlay').style.display = 'flex';

  try {
    for (const file of validFiles) {
      if (file.name.toLowerCase().endsWith('.zip')) {
        await handleZipFile(file);
      } else if (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
        await handleHeicFile(file);
      } else {
        await handleRegularFile(file);
      }
    }
    updateFileCount();
    showToast('success', 'Files Uploaded', `${validFiles.length} file(s) ready for processing`);
  } catch (error) {
    console.error('Error processing files:', error);
    showToast('error', 'Processing Error', 'Some files could not be processed');
  } finally {
    $('#processing-overlay').style.display = 'none';
  }
}

async function handleZipFile(file) {
  if (typeof JSZip === 'undefined') {
    console.error('JSZip is not loaded');
    showToast('error', 'ZIP Error', 'JSZip library is missing. Ensure it is loaded in HTML.');
    return;
  }
  try {
    const zip = await JSZip.loadAsync(file);
    const imageFiles = [];

    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue;
      if (path.startsWith('__MACOSX') || path.split('/').some(p => p.startsWith('.') || p === '')) continue;
      if (!isImageFile(path)) continue;

      const fileName = path.split('/').pop();

      if (isHeic(fileName)) {
        if (typeof heic2any === 'undefined') {
          console.warn('heic2any not available; skipping HEIC in ZIP');
          showToast('warning', 'HEIC Skipped', `${fileName} skipped (missing HEIC converter).`);
          continue;
        }
        const arrayBuffer = await zipEntry.async('arraybuffer');
        const heicBlob = new Blob([arrayBuffer]);
        try {
          const jpegBlob = await heic2any({ blob: heicBlob, toType: 'image/jpeg', quality: 0.9 });
          const jpegName = fileName.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg');
          const jpegFile = new File([jpegBlob], jpegName, { type: 'image/jpeg' });
          imageFiles.push({ file: jpegFile, converted: true });
        } catch (err) {
          console.error('HEIC conversion in ZIP failed:', fileName, err);
          showToast('error', 'Conversion Error', `Could not convert ${fileName}`);
        }
      } else {
        const blob = await zipEntry.async('blob');
        const fileObj = new File([blob], fileName, { type: getMimeType(fileName) });
        imageFiles.push({ file: fileObj, converted: false });
      }
    }

    for (const img of imageFiles) {
      await handleRegularFile(img.file, img.converted);
    }

    if (imageFiles.length > 0) {
      showToast('success', 'ZIP Extracted', `${imageFiles.length} image(s) extracted from ${file.name}`);
    } else {
      showToast('warning', 'No Images Found', `No supported images were found in ${file.name}`);
    }
  } catch (error) {
    console.error('Error processing ZIP:', error);
    showToast('error', 'ZIP Error', 'Could not extract images from ZIP file');
  }
}

async function handleHeicFile(file) {
  if (typeof heic2any === 'undefined') {
    console.error('heic2any is not loaded');
    showToast('error', 'Conversion Error', 'HEIC converter is missing. Ensure heic2any is loaded in HTML.');
    return;
  }
  try {
    const arrayBuffer = await file.arrayBuffer();
    const blob = await heic2any({ blob: new Blob([arrayBuffer]), toType: 'image/jpeg', quality: 0.9 });
    const jpegFile = new File([blob], file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'), { type: 'image/jpeg' });
    await handleRegularFile(jpegFile, true);
    showToast('success', 'HEIC Converted', `${file.name} converted to JPEG`);
  } catch (error) {
    console.error('HEIC conversion error:', error);
    showToast('error', 'Conversion Error', `Could not convert ${file.name}`);
  }
}

async function handleRegularFile(file, converted = false) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        state.uploadedFiles.push({
          name: file.name,
          type: file.type,
          size: file.size,
          width: img.width,
          height: img.height,
          url: e.target.result,
          converted: converted
        });
        addFileToList({
          name: file.name,
          size: formatFileSize(file.size),
          converted: converted
        });
        resolve();
      };
      img.onerror = () => { console.error('Failed to load image:', file.name); resolve(); };
      img.src = e.target.result;
    };
    reader.onerror = () => { console.error('Failed to read file:', file.name); resolve(); };
    reader.readAsDataURL(file);
  });
}

function isImageFile(filename) { return /\.(jpg|jpeg|png|webp|gif|bmp|heic|heif)$/i.test(filename); }
function isHeic(filename) { return /\.(heic|heif)$/i.test(filename); }
function getMimeType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const mimeTypes = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp', heic: 'image/heic', heif: 'image/heif' };
  return mimeTypes[ext] || 'image/jpeg';
}
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function handleUrlAdd() {
  const textarea = $('#image-url-input');
  if (!textarea) return;
  const urls = textarea.value.trim().split('\n').filter(url => url.trim());
  if (urls.length === 0) {
    showToast('warning', 'No URLs', 'Please enter at least one image URL');
    return;
  }
  let loadedCount = 0;
  const totalUrls = urls.length;
  urls.forEach(url => {
    const cleanUrl = url.trim();
    try { new URL(cleanUrl); } catch { console.warn('Invalid URL:', cleanUrl); return; }
    fetch(cleanUrl)
      .then(response => { if (!response.ok) throw new Error('Failed to fetch'); return response.blob(); })
      .then(blob => {
        const fileName = cleanUrl.split('/').pop() || `image-${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
        return handleRegularFile(file);
      })
      .then(() => {
        loadedCount++;
        if (loadedCount === totalUrls) {
          showToast('success', 'URLs Loaded', `${loadedCount} image(s) loaded from URLs`);
          textarea.value = '';
        }
      })
      .catch(error => { console.error('Error loading URL:', cleanUrl, error); loadedCount++; });
  });
}

function switchUploadMethod(method) {
  $$('.upload-method-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.method === method));
  $('#files-upload').style.display = method === 'files' ? 'block' : 'none';
  $('#url-upload').style.display = method === 'url' ? 'block' : 'none';
}

function addFileToList(file) {
  const fileList = $('#file-list');
  if (!fileList) return;
  const fileItem = document.createElement('div');
  fileItem.className = `file-item${file.converted ? ' converted' : ''}`;
  fileItem.innerHTML = `
    <div class="file-icon${file.converted ? ' converted' : ''}">
      <i class="fas fa-image"></i>
    </div>
    <div class="file-info">
      <div class="file-name">${escapeHtml(file.name)}${file.converted ? '<span class="converted-badge">Converted</span>' : ''}</div>
      <div class="file-size">${file.size}</div>
    </div>
    <button class="remove-file" onclick="removeFile('${escapeHtml(file.name)}')">
      <i class="fas fa-times"></i>
    </button>
  `;
  fileList.appendChild(fileItem);
}

function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

function removeFile(fileName) {
  state.uploadedFiles = state.uploadedFiles.filter(f => f.name !== fileName);
  const fileList = $('#file-list');
  if (fileList) {
    const items = fileList.querySelectorAll('.file-item');
    items.forEach(item => { if (item.querySelector('.file-name').textContent.includes(fileName)) item.remove(); });
  }
  updateFileCount();
  updateProcessCount();
  if (state.uploadedFiles.length === 0) resetPreview();
}

function updateFileCount() {
  const count = state.uploadedFiles.length;
  $('#file-count').textContent = count;
  const processBtn = $('#process-btn');
  if (processBtn) processBtn.disabled = count === 0;
}

function updateProcessCount() {
  const count = state.uploadedFiles.length;
  $('#process-count').textContent = count;
  const processBtn = $('#process-btn');
  if (processBtn) processBtn.disabled = count === 0;
}

function updateSteps() {
  const steps = $$('.step');
  let activeStep = 0;
  if (state.uploadedFiles.length > 0) activeStep = 1;
  if (state.selectedWatermark) activeStep = Math.max(activeStep, 2);
  if (state.previewGenerated) activeStep = Math.max(activeStep, 4);
  steps.forEach((step, index) => step.classList.toggle('active', index < activeStep));
}

function startPreviewGeneration() {
  if (state.uploadedFiles.length === 0) {
    showToast('warning', 'No Images', 'Please upload images first');
    return;
  }
  const jobId = ++previewJobId;
  generatePreview(jobId);
}

async function generatePreview(jobId) {
  const canvas = $('#preview-canvas');
  const placeholder = $('#preview-placeholder');
  const loading = $('#preview-loading');
  const previewInfo = $('#preview-info');
  const enlargeBtn = $('#enlarge-preview');
  if (!canvas || !placeholder) return;

  state.previewGenerated = false;

  const ctx = canvas.getContext('2d');
  canvas.width = canvas.width;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.style.display = 'none';

  placeholder.style.display = 'none';
  if (loading) loading.style.display = 'flex';

  state.processedPreviews = [];
  state.currentPreviewIndex = 0;

  try {
    await processPreviewsSequentially(jobId);
    if (jobId !== previewJobId) return;

    displayPreviewImage();
    if (loading) loading.style.display = 'none';
    canvas.style.display = 'block';
    if (previewInfo) previewInfo.style.display = 'flex';
    if (enlargeBtn) enlargeBtn.style.display = 'flex';

    state.previewGenerated = true;
    updateSteps();
  } catch (error) {
    console.error('Preview generation error:', error);
    showToast('error', 'Preview Error', 'Could not generate preview');
    if (loading) loading.style.display = 'none';
    placeholder.style.display = 'flex';
  }
}

async function processPreviewsSequentially(jobId) {
  for (let i = 0; i < state.uploadedFiles.length; i++) {
    const fileData = state.uploadedFiles[i];
    if (jobId !== previewJobId) return;

    await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxWidth = CONFIG.previewWidth;
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        if (state.selectedWatermark) drawWatermarkOnCanvas(ctx, canvas);
        state.processedPreviews.push({ canvas, name: fileData.name, index: i });
        resolve();
      };
      img.onerror = () => { console.error('Failed to load image:', fileData.name); resolve(); };
      img.src = fileData.url;
    });
  }
}

function drawWatermarkOnCanvas(ctx, canvas) {
  const watermark = state.selectedWatermark;
  if (!watermark) return;

  let position = ($('#position-select')?.value || 'center').toLowerCase().replace(/[-_\s]/g, '-');
  if (state.isMLSMode && position === 'center') position = 'bottom-right';
  const opacity = parseInt($('#opacity-slider')?.value || 22, 10) / 100;
  const size = parseInt($('#size-slider')?.value || 50, 10) / 100;

  const maxSize = Math.min(canvas.width, canvas.height) * size;
  const aspectRatio = watermark.naturalWidth / watermark.naturalHeight;

  let wmWidth, wmHeight;
  if (aspectRatio > 1) {
    wmWidth = maxSize;
    wmHeight = maxSize / aspectRatio;
  } else {
    wmHeight = maxSize;
    wmWidth = maxSize * aspectRatio;
  }

  const { x, y } = getWatermarkPosition(canvas, wmWidth, wmHeight, position);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(watermark, x, y, wmWidth, wmHeight);
  ctx.restore();
}

function getWatermarkPosition(canvas, wmWidth, wmHeight, position) {
  const padding = 20;
  let x, y;
  switch (position) {
    case 'top-left': x = padding; y = padding; break;
    case 'top-right': x = canvas.width - wmWidth - padding; y = padding; break;
    case 'bottom-left': x = padding; y = canvas.height - wmHeight - padding; break;
    case 'bottom-right': x = canvas.width - wmWidth - padding; y = canvas.height - wmHeight - padding; break;
    case 'center':
    default:
      x = (canvas.width - wmWidth) / 2;
      y = (canvas.height - wmHeight) / 2;
      break;
  }
  return { x, y };
}

function displayPreviewImage() {
  const canvas = $('#preview-canvas');
  const fileName = $('#preview-file-name');
  const counter = $('#preview-counter');
  if (!canvas || state.processedPreviews.length === 0) return;

  const currentPreview = state.processedPreviews[state.currentPreviewIndex];

  canvas.width = currentPreview.canvas.width;
  canvas.height = currentPreview.canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(currentPreview.canvas, 0, 0);

  if (fileName) fileName.textContent = currentPreview.name;
  if (counter) counter.textContent = `${state.currentPreviewIndex + 1} / ${state.processedPreviews.length}`;

  updatePreviewNavigation();
  updateFullscreenInfo();
}

function updatePreviewNavigation() {
  const prevBtn = $('#prev-image');
  const nextBtn = $('#next-image');
  const counter = $('#preview-counter');
  if (prevBtn) prevBtn.disabled = state.currentPreviewIndex === 0;
  if (nextBtn) nextBtn.disabled = state.currentPreviewIndex === state.processedPreviews.length - 1;
  if (counter) counter.textContent = `${state.currentPreviewIndex + 1} / ${state.processedPreviews.length}`;
}

function navigatePreview(direction) {
  const newIndex = state.currentPreviewIndex + direction;
  if (newIndex >= 0 && newIndex < state.processedPreviews.length) {
    state.currentPreviewIndex = newIndex;
    displayPreviewImage();
  }
}

function resetPreview() {
  const canvas = $('#preview-canvas');
  const placeholder = $('#preview-placeholder');
  const loading = $('#preview-loading');
  const previewInfo = $('#preview-info');
  const enlargeBtn = $('#enlarge-preview');

  if (canvas) { const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.style.display = 'none'; }
  if (placeholder) placeholder.style.display = 'flex';
  if (loading) loading.style.display = 'none';
  if (previewInfo) previewInfo.style.display = 'none';
  if (enlargeBtn) enlargeBtn.style.display = 'none';

  state.processedPreviews = [];
  state.currentPreviewIndex = 0;
  state.previewGenerated = false;
  updateSteps();
}

function openFullscreen() {
  if (state.processedPreviews.length === 0) return;
  const modal = $('#fullscreen-modal');
  if (!modal) return;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  displayFullscreenImage();
}

function closeFullscreen() {
  const modal = $('#fullscreen-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function displayFullscreenImage() {
  const canvas = $('#fullscreen-canvas');
  const modal = $('#fullscreen-modal');
  if (!canvas || !modal || state.processedPreviews.length === 0) return;

  const currentPreview = state.processedPreviews[state.currentPreviewIndex];
  canvas.width = currentPreview.canvas.width;
  canvas.height = currentPreview.canvas.height;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(currentPreview.canvas, 0, 0);

  fitCanvasToContainer(canvas);
  updateFullscreenInfo();
}

function fitCanvasToContainer(canvas) {
  const container = $('#fullscreen-modal .fullscreen-content');
  if (!container) return;
  const containerRect = container.getBoundingClientRect();
  const padding = 40;
  const maxWidth = containerRect.width - padding * 2;
  const maxHeight = containerRect.height - padding * 2 - 60;
  const scale = Math.min(1, maxWidth / canvas.width, maxHeight / canvas.height);
  canvas.style.width = `${canvas.width * scale}px`;
  canvas.style.height = `${canvas.height * scale}px`;
}

function navigateFullscreen(direction) {
  const newIndex = state.currentPreviewIndex + direction;
  if (newIndex >= 0 && newIndex < state.processedPreviews.length) {
    state.currentPreviewIndex = newIndex;
    displayFullscreenImage();
  }
}

function updateFullscreenInfo() {
  const filename = $('#fullscreen-filename');
  const counter = $('#fullscreen-counter');
  const prevBtn = $('#fullscreen-prev');
  const nextBtn = $('#fullscreen-next');

  if (state.processedPreviews.length > 0) {
    const currentPreview = state.processedPreviews[state.currentPreviewIndex];
    if (filename) filename.textContent = currentPreview.name;
    if (counter) counter.textContent = `${state.currentPreviewIndex + 1} / ${state.processedPreviews.length}`;
  }
  if (prevBtn) prevBtn.disabled = state.currentPreviewIndex === 0;
  if (nextBtn) nextBtn.disabled = state.currentPreviewIndex === state.processedPreviews.length - 1;
}

function handlePreviewKeyboard(e) {
  const modal = $('#fullscreen-modal');
  if (!modal?.classList.contains('active')) return;
  switch (e.key) {
    case 'ArrowLeft': navigateFullscreen(-1); break;
    case 'ArrowRight': navigateFullscreen(1); break;
    case 'Escape': closeFullscreen(); break;
  }
}

async function processAllImages() {
  if (state.uploadedFiles.length === 0) {
    showToast('warning', 'No Images', 'Please upload images first');
    return;
  }
  if (!state.previewGenerated) {
    await startPreviewGeneration();
  }

  const processBtn = $('#process-btn');
  const btnText = processBtn?.querySelector('.btn-text');
  const btnLoader = processBtn?.querySelector('.btn-loader');
  const downloadSection = $('#download-section');
  const downloadLink = $('#download-link');
  if (!processBtn) return;

  state.isProcessing = true;
  processBtn.disabled = true;
  if (btnText) btnText.style.visibility = 'hidden';
  if (btnLoader) btnLoader.style.display = 'flex';
  if (downloadSection) downloadSection.style.display = 'none';

  try {
    const zip = new JSZip();
    for (let i = 0; i < state.uploadedFiles.length; i++) {
      const fileData = state.uploadedFiles[i];
      await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          if (state.selectedWatermark) drawWatermarkFullSize(ctx, canvas);
          canvas.toBlob((blob) => {
            const originalName = fileData.name.replace(/\.[^/.]+$/, '');
            const newName = `${originalName}-watermarked.jpg`;
            zip.file(newName, blob);
            resolve();
          }, 'image/jpeg', CONFIG.quality);
        };
        img.onerror = () => { console.error('Failed to process:', fileData.name); resolve(); };
        img.src = fileData.url;
      });
    }
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const url = URL.createObjectURL(zipBlob);
    if (downloadLink) {
      downloadLink.href = url;
      downloadLink.download = `watermarked-images-${Date.now()}.zip`;
    }
    if (downloadSection) downloadSection.style.display = 'block';
    showToast('success', 'Processing Complete', `${state.uploadedFiles.length} images processed successfully`);
  } catch (error) {
    console.error('Processing error:', error);
    showToast('error', 'Processing Error', 'Failed to process images');
  } finally {
    state.isProcessing = false;
    processBtn.disabled = false;
    if (btnText) btnText.style.visibility = 'visible';
    if (btnLoader) btnLoader.style.display = 'none';
  }
}

function drawWatermarkFullSize(ctx, canvas) {
  const watermark = state.selectedWatermark;
  if (!watermark) return;

  let position = ($('#position-select')?.value || 'center').toLowerCase().replace(/[-_\s]/g, '-');
  if (state.isMLSMode && position === 'center') position = 'bottom-right';
  const opacity = parseInt($('#opacity-slider')?.value || 22, 10) / 100;
  const size = parseInt($('#size-slider')?.value || 50, 10) / 100;

  const maxSize = Math.min(canvas.width, canvas.height) * size;
  const aspectRatio = watermark.naturalWidth / watermark.naturalHeight;

  let wmWidth, wmHeight;
  if (aspectRatio > 1) {
    wmWidth = maxSize;
    wmHeight = maxSize / aspectRatio;
  } else {
    wmHeight = maxSize;
    wmWidth = maxSize * aspectRatio;
  }

  const { x, y } = getWatermarkPosition(canvas, wmWidth, wmHeight, position);
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(watermark, x, y, wmWidth, wmHeight);
  ctx.restore();
}

function toggleAdvancedSection() {
  const section = $('#advanced-watermark-section');
  const toggle = $('#advanced-toggle');
  if (!section || !toggle) return;
  const isHidden = section.style.display === 'none';
  section.style.display = isHidden ? 'block' : 'none';
  const icon = toggle.querySelector('.fas');
  if (icon) {
    icon.classList.toggle('fa-chevron-down', !isHidden);
    icon.classList.toggle('fa-chevron-up', isHidden);
  }
}

function handleCustomWatermarkUpload(e) {
  if (state.isMLSMode) {
    showToast('warning', 'Not allowed in MLS mode', 'Custom watermarks are disabled under ARMLS compliance.');
    e.target.value = '';
    return;
  }
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('warning', 'Invalid File', 'Please select an image file');
    return;
  }
  const reader = new FileReader();
  reader.onload = (event) => {
    const preview = $('#watermark-preview');
    const placeholder = $('#watermark-placeholder');
    if (!preview || !placeholder) return;
    const img = new Image();
    img.onload = () => {
      state.customWatermark = img;
      state.selectedWatermark = img;
      preview.src = event.target.result;
      preview.style.display = 'block';
      placeholder.style.display = 'none';
      if (state.uploadedFiles.length > 0) requestPreviewGeneration();
      showToast('success', 'Watermark Uploaded', 'Custom watermark applied successfully');
    };
    img.onerror = () => showToast('error', 'Upload Failed', 'Could not load custom watermark');
    img.src = event.target.result;
  };
  reader.onerror = () => showToast('error', 'Read Error', 'Could not read file');
  reader.readAsDataURL(file);
}

function handleMLSToggle(e) {
  state.isMLSMode = e.target.checked;
  const advWrapper = $('#advanced-wrapper');
  const advSection = $('#advanced-watermark-section');

  if (state.isMLSMode) {
    // apply ARMLS list
    state.watermarkList = [...ARMLS_WATERMARKS];
    populateWatermarkDropdown();
    selectWatermark(state.watermarkList[0]?.file);
    // disable custom upload UI
    if (advWrapper) advWrapper.style.display = 'none';
    if (advSection) advSection.style.display = 'none';
    // enforce non-center
    forceNonCenterPosition();
    showToast('info', 'MLS Mode', 'ARMLS-approved watermarks only. Custom uploads disabled. Center placement is not allowed.');
  } else {
    // restore base list
    state.watermarkList = [...state.baseWatermarkList];
    populateWatermarkDropdown();
    selectWatermark(state.watermarkList[0]?.file);
    if (advWrapper) advWrapper.style.display = 'block';
  }
  syncPositionSelectors();
  if (state.uploadedFiles.length > 0 && state.previewGenerated) requestPreviewGeneration();
}

function forceNonCenterPosition() {
  const main = $('#position-select');
  const quick = $('#position-select-quick');
  const fallback = 'bottom-right';
  if (main && main.value === 'center') main.value = fallback;
  if (quick && quick.value === 'center') quick.value = fallback;
}

function syncPositionSelectors(source = 'main') {
  const main = $('#position-select');
  const quick = $('#position-select-quick');
  if (!main || !quick) return;
  if (source === 'main') {
    quick.value = main.value;
  } else {
    main.value = quick.value;
  }
}

function openHelpModal() {
  const modal = $('#help-modal');
  if (modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; }
}

function closeHelpModal() {
  const modal = $('#help-modal');
  if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }
}

function toggleTheme() {
  state.isDarkMode = !state.isDarkMode;
  document.body.classList.toggle('dark-mode', state.isDarkMode);
  const themeBtn = $('#theme-toggle');
  if (themeBtn) {
    const icon = themeBtn.querySelector('.fas');
    if (icon) {
      icon.classList.toggle('fa-moon', !state.isDarkMode);
      icon.classList.toggle('fa-sun', state.isDarkMode);
    }
  }
  localStorage.setItem('theme', state.isDarkMode ? 'dark' : 'light');
}

function checkTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    state.isDarkMode = true;
    document.body.classList.add('dark-mode');
    const themeBtn = $('#theme-toggle');
    if (themeBtn) {
      const icon = themeBtn.querySelector('.fas');
      if (icon) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
    }
  }
}

function showToast(type, title, message) {
  const container = $('#toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = {
    success: 'fa-check-circle',
    warning: 'fa-exclamation-triangle',
    error: 'fa-times-circle',
    info: 'fa-info-circle',
    conversion: 'fa-file-image'
  };
  toast.innerHTML = `
    <div class="toast-icon"><i class="fas ${icons[type] || icons.info}"></i></div>
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(title)}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
    <button class="toast-close"><i class="fas fa-times"></i></button>
  `;
  container.appendChild(toast);
  toast.querySelector('.toast-close')?.addEventListener('click', () => removeToast(toast));
  const timeout = setTimeout(() => removeToast(toast), 5000);
  toast.dataset.timeout = timeout;
  requestAnimationFrame(() => { toast.style.animation = 'toastSlideIn 0.3s ease-out'; });
}

function removeToast(toast) {
  if (!toast) return;
  clearTimeout(parseInt(toast.dataset.timeout));
  toast.style.animation = 'toastSlideOut 0.3s ease-in forwards';
  toast.addEventListener('animationend', () => { toast.remove(); });
}

window.removeFile = removeFile;
window.openHelpModal = openHelpModal;
window.closeHelpModal = closeHelpModal;
window.toggleTheme = toggleTheme;

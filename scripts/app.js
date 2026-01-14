// =========================================
// TOAST NOTIFICATION SYSTEM
// =========================================

const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(options) {
    const {
      type = 'info',
      title = '',
      message = '',
      duration = 5000,
      icon = null
    } = options;

    const icons = {
      success: 'fas fa-check-circle',
      warning: 'fas fa-exclamation-triangle',
      error: 'fas fa-times-circle',
      info: 'fas fa-info-circle',
      conversion: 'fas fa-sync-alt'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="toast-icon ${icon || icons[type] || icons.info}"></i>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close">
        <i class="fas fa-times"></i>
      </button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this.dismiss(toast));

    this.container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => this.dismiss(toast), duration);
    }

    return toast;
  },

  dismiss(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('toast-exit');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  },

  success(title, message, duration = 4000) {
    return this.show({ type: 'success', title, message, duration });
  },

  warning(title, message, duration = 5000) {
    return this.show({ type: 'warning', title, message, duration });
  },

  error(title, message, duration = 6000) {
    return this.show({ type: 'error', title, message, duration });
  },

  info(title, message, duration = 4000) {
    return this.show({ type: 'info', title, message, duration });
  },

  conversion(title, message, duration = 5000) {
    return this.show({ type: 'conversion', title, message, duration, icon: 'fas fa-exchange-alt' });
  }
};

// =========================================
// HEIC CONVERSION UTILITIES
// =========================================

const HeicConverter = {
  isHeicFile(file) {
    const fileName = file.name.toLowerCase();
    const isHeicExtension = fileName.endsWith('.heic') || fileName.endsWith('.heif');
    const isHeicType = file.type === 'image/heic' || file.type === 'image/heif';
    return isHeicExtension || isHeicType;
  },

  async convert(file) {
    if (typeof heic2any === 'undefined') {
      throw new Error('HEIC conversion library not loaded');
    }

    try {
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.92
      });

      const resultBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      const originalName = file.name.replace(/\.(heic|heif)$/i, '');
      const newFileName = `${originalName}.jpg`;

      return new File([resultBlob], newFileName, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });
    } catch (error) {
      console.error('HEIC conversion error:', error);
      throw new Error(`Failed to convert ${file.name}: ${error.message}`);
    }
  },

  async convertMultiple(files, onProgress) {
    const results = [];
    const heicFiles = files.filter(f => this.isHeicFile(f));
    const nonHeicFiles = files.filter(f => !this.isHeicFile(f));

    for (const file of nonHeicFiles) {
      results.push({ file, converted: false, originalName: file.name });
    }

    for (let i = 0; i < heicFiles.length; i++) {
      const file = heicFiles[i];
      try {
        if (onProgress) {
          onProgress(i + 1, heicFiles.length, file.name);
        }

        const convertedFile = await this.convert(file);
        results.push({
          file: convertedFile,
          converted: true,
          originalName: file.name
        });
      } catch (error) {
        console.error(`Failed to convert ${file.name}:`, error);
        Toast.error('Conversion Failed', `Could not convert ${file.name}. The file may be corrupted or unsupported.`);
      }
    }

    return results;
  }
};

// =========================================
// THEME & INITIALIZATION
// =========================================

function initializeTheme() {
  const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (isDark) {
    document.body.classList.add('dark-mode');
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    if (event.matches) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    updateThemeIcon();
  });

  updateThemeIcon();
}

function updateThemeIcon() {
  const themeToggle = document.getElementById('theme-toggle');
  const icon = themeToggle.querySelector('i');
  if (document.body.classList.contains('dark-mode')) {
    icon.className = 'fas fa-sun';
  } else {
    icon.className = 'fas fa-moon';
  }
}

// =========================================
// MAIN APPLICATION
// =========================================

document.addEventListener("DOMContentLoaded", () => {
  // Initialize toast system
  Toast.init();

  // Initialize theme
  initializeTheme();

  // -----------------------------------------------------------------
  // DOM Elements
  // -----------------------------------------------------------------
  const fileInput = document.getElementById("file-input");
  const dropZone = document.getElementById("drop-zone");
  const fileList = document.getElementById("file-list");
  const fileCount = document.getElementById("file-count");
  const processCount = document.getElementById("process-count");
  const watermarkUpload = document.getElementById("watermark-upload");
  const watermarkPreview = document.getElementById("watermark-preview");
  const watermarkPreviewContainer = document.getElementById("watermark-preview-container");
  const watermarkPlaceholder = document.getElementById("watermark-placeholder");
  const positionSelect = document.getElementById("position-select");
  const opacitySlider = document.getElementById("opacity-slider");
  const sizeSlider = document.getElementById("size-slider");
  const opacityValue = document.getElementById("opacity-value");
  const sizeValue = document.getElementById("size-value");
  const previewCanvas = document.getElementById("preview-canvas");
  const previewPlaceholder = document.getElementById("preview-placeholder");
  const previewLoading = document.getElementById("preview-loading");
  const previewInfo = document.getElementById("preview-info");
  const previewFileName = document.getElementById("preview-file-name");
  const previewCounter = document.getElementById("preview-counter");
  const generatePreviewBtn = document.getElementById("generate-preview");
  const enlargePreviewBtn = document.getElementById("enlarge-preview");
  const prevImageBtn = document.getElementById("prev-image");
  const nextImageBtn = document.getElementById("next-image");
  const processBtn = document.getElementById("process-btn");
  const downloadLink = document.getElementById("download-link");
  const downloadSection = document.getElementById("download-section");
  const helpModal = document.getElementById("help-modal");
  const helpBtn = document.getElementById("help-btn");
  const closeHelp = document.getElementById("close-help");
  const themeToggle = document.getElementById("theme-toggle");

  // Upload method elements
  const filesTab = document.getElementById("files-tab");
  const urlTab = document.getElementById("url-tab");
  const filesUpload = document.getElementById("files-upload");
  const urlUpload = document.getElementById("url-upload");
  const imageUrlInput = document.getElementById("image-url-input");
  const addUrlBtn = document.getElementById("add-url-btn");

  // Fullscreen modal elements
  const fullscreenModal = document.getElementById("fullscreen-modal");
  const fullscreenCanvas = document.getElementById("fullscreen-canvas");
  const fullscreenClose = document.getElementById("fullscreen-close");
  const fullscreenPrev = document.getElementById("fullscreen-prev");
  const fullscreenNext = document.getElementById("fullscreen-next");
  const fullscreenFilename = document.getElementById("fullscreen-filename");
  const fullscreenCounter = document.getElementById("fullscreen-counter");

  // Watermark dropdown
  const watermarkSelect = document.getElementById("watermark-select");

  // -----------------------------------------------------------------
  // App State
  // -----------------------------------------------------------------
  let watermarkImage = new Image();
  let availableWatermarks = [
    {
      name: "Rounded (white background) – Default",
      url: "./assets/rounded.png",
      default: true
    },
    {
      name: "Logo Watermark",
      url: "./assets/logo-watermark.png"
    },
    {
      name: "Logo Watermark 2",
      url: "./assets/logo-watermark2.png"
    },
    {
      name: "Grey Watermark",
      url: "./assets/grey-watermark.png"
    },
    {
      name: "Flat White Stroke",
      url: "./assets/Flat-white-stroke-watermark.png"
    }
  ];

  const files = [];
  let processedPreviews = [];
  let currentPreviewIndex = 0;
  let selectedWatermarkIndex = 0;
  let currentUploadMethod = 'files';
  let isCustomWatermark = false;
  let isProcessingHeic = false;

  // -----------------------------------------------------------------
  // Initialize app
  // -----------------------------------------------------------------
  init();

  function init() {
    setupEventListeners();
    loadWatermarkOptions();
    setDefaultSettings();
    updateSliderValues();
    updateSteps();
  }

  function setDefaultSettings() {
    positionSelect.value = "center";
    opacitySlider.value = "75";
    sizeSlider.value = "50";
  }

  // -----------------------------------------------------------------
  // Watermark Dropdown
  // -----------------------------------------------------------------

  function loadWatermarkOptions() {
    watermarkSelect.innerHTML = '';
    availableWatermarks.forEach((watermark, index) => {
      const opt = document.createElement('option');
      opt.value = index;
      opt.textContent = watermark.name;
      watermarkSelect.appendChild(opt);
    });

    const defaultIndex = availableWatermarks.findIndex(wm => wm.default) >= 0
      ? availableWatermarks.findIndex(wm => wm.default)
      : 0;

    watermarkSelect.value = String(defaultIndex);
    selectWatermark(defaultIndex);
  }

  function selectWatermark(index) {
    selectedWatermarkIndex = index;
    isCustomWatermark = false;

    const selectedWatermarkData = availableWatermarks[index];

    watermarkImage.onload = () => {
      watermarkPreview.src = watermarkImage.src;
      watermarkPreview.style.display = 'block';
      watermarkPlaceholder.style.display = 'none';
      resetPreview();
      updateSteps();
    };

    watermarkImage.onerror = () => {
      console.error(`Failed to load watermark: ${selectedWatermarkData.name}`);
      Toast.error('Watermark Error', `Failed to load ${selectedWatermarkData.name}`);
    };

    watermarkImage.src = selectedWatermarkData.url;
  }

  function setCustomWatermarkLabel(label = 'Custom Upload') {
    let opt = watermarkSelect.querySelector('option[value="custom"]');
    if (!opt) {
      opt = document.createElement('option');
      opt.value = 'custom';
      watermarkSelect.appendChild(opt);
    }
    opt.textContent = label;
    watermarkSelect.value = 'custom';
  }

  // -----------------------------------------------------------------
  // Event Listeners
  // -----------------------------------------------------------------
  function setupEventListeners() {
    // Upload method tabs
    filesTab.addEventListener('click', () => switchUploadMethod('files'));
    urlTab.addEventListener('click', () => switchUploadMethod('url'));

    // File upload
    dropZone.addEventListener("dragover", handleDragOver);
    dropZone.addEventListener("dragleave", handleDragLeave);
    dropZone.addEventListener("drop", handleDrop);
    dropZone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

    // URL upload - now supports multiple URLs
    addUrlBtn.addEventListener('click', handleUrlAdd);

    // Advanced watermark upload
    document.getElementById("change-watermark").addEventListener("click", () => {
      watermarkUpload.click();
    });
    watermarkUpload.addEventListener("change", handleWatermarkUpload);

    // Watermark dropdown
    watermarkSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      if (val === 'custom') return; // custom handled via upload
      const idx = parseInt(val, 10);
      if (!isNaN(idx)) selectWatermark(idx);
    });

    // Advanced toggle
    const advancedToggle = document.getElementById("advanced-toggle");
    if (advancedToggle) {
      advancedToggle.addEventListener("click", toggleAdvancedOptions);
    }

    // Controls
    sizeSlider.addEventListener("input", updateSliderValues);
    opacitySlider.addEventListener("input", updateSliderValues);
    positionSelect.addEventListener("change", resetPreview);

    // Preview & processing
    generatePreviewBtn.addEventListener("click", generatePreview);
    enlargePreviewBtn.addEventListener("click", openFullscreenPreview);
    prevImageBtn.addEventListener("click", () => navigatePreview(-1));
    nextImageBtn.addEventListener("click", () => navigatePreview(1));
    processBtn.addEventListener("click", processImages);

    // Fullscreen modal
    fullscreenClose.addEventListener("click", closeFullscreenPreview);
    fullscreenPrev.addEventListener("click", () => navigateFullscreen(-1));
    fullscreenNext.addEventListener("click", () => navigateFullscreen(1));
    fullscreenModal.addEventListener("click", (e) => {
      if (e.target === fullscreenModal) closeFullscreenPreview();
    });

    // Keyboard navigation
    document.addEventListener("keydown", (e) => {
      if (fullscreenModal.classList.contains('active')) {
        switch (e.key) {
          case 'Escape':
            closeFullscreenPreview();
            break;
          case 'ArrowLeft':
            navigateFullscreen(-1);
            break;
          case 'ArrowRight':
            navigateFullscreen(1);
            break;
        }
      } else if (e.key === "Escape") {
        hideModal(helpModal);
      }
    });

    // Touch/swipe detection for fullscreen
    let touchStartX = 0;
    let touchEndX = 0;

    fullscreenModal.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    });

    fullscreenModal.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    });

    function handleSwipe() {
      const swipeThreshold = 50;
      const diff = touchStartX - touchEndX;

      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
          navigateFullscreen(1);
        } else {
          navigateFullscreen(-1);
        }
      }
    }

    // Modal & theme
    helpBtn.addEventListener("click", () => showModal(helpModal));
    closeHelp.addEventListener("click", () => hideModal(helpModal));
    helpModal.addEventListener("click", (e) => {
      if (e.target === helpModal) hideModal(helpModal);
    });
    themeToggle.addEventListener("click", toggleTheme);
  }

  // -----------------------------------------------------------------
  // Advanced Options Toggle
  // -----------------------------------------------------------------
  function toggleAdvancedOptions() {
    const advancedSection = document.getElementById("advanced-watermark-section");
    const advancedToggle = document.getElementById("advanced-toggle");

    if (advancedSection.style.display === "none" || !advancedSection.style.display) {
      advancedSection.style.display = "block";
      advancedToggle.innerHTML = '<i class="fas fa-chevron-up"></i> Hide Custom Upload';
    } else {
      advancedSection.style.display = "none";
      advancedToggle.innerHTML = '<i class="fas fa-chevron-down"></i> Custom Watermark Upload';
    }
  }

  // -----------------------------------------------------------------
  // Upload Method Switching
  // -----------------------------------------------------------------
  function switchUploadMethod(method) {
    currentUploadMethod = method;

    document.querySelectorAll('.upload-method-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    if (method === 'files') {
      filesTab.classList.add('active');
      filesUpload.style.display = 'block';
      urlUpload.style.display = 'none';
    } else {
      urlTab.classList.add('active');
      filesUpload.style.display = 'none';
      urlUpload.style.display = 'block';
    }
  }

  // -----------------------------------------------------------------
  // File handling with HEIC support
  // -----------------------------------------------------------------
  function handleDragOver(e) {
    e.preventDefault();
    dropZone.classList.add("hover");
  }

  function handleDragLeave(e) {
    e.preventDefault();
    dropZone.classList.remove("hover");
  }

  function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove("hover");
    handleFiles(e.dataTransfer.files);
  }

  async function handleFiles(fileList) {
    if (isProcessingHeic) {
      Toast.warning('Processing', 'Please wait for current files to finish processing.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const zipTypes = ['application/zip', 'application/x-zip-compressed'];

    const filesToProcess = Array.from(fileList);
    const heicFiles = [];
    const regularFiles = [];
    const zipFiles = [];

    for (const file of filesToProcess) {
      if (HeicConverter.isHeicFile(file)) {
        heicFiles.push(file);
      } else if (validTypes.includes(file.type)) {
        regularFiles.push(file);
      } else if (zipTypes.includes(file.type)) {
        zipFiles.push(file);
      }
    }

    for (const file of regularFiles) {
      files.push({ file, type: 'file', name: file.name, converted: false });
    }

    for (const zipFile of zipFiles) {
      await handleZipFile(zipFile);
    }

    if (heicFiles.length > 0) {
      isProcessingHeic = true;

      Toast.info(
        'Converting HEIC Files',
        `Converting ${heicFiles.length} HEIC file${heicFiles.length > 1 ? 's' : ''} to JPEG...`,
        0
      );

      try {
        const convertedResults = await HeicConverter.convertMultiple(
          heicFiles,
          (current, total, fileName) => {
            // Progress callback if needed
          }
        );

        let successCount = 0;
        for (const result of convertedResults) {
          if (result.converted) {
            files.push({
              file: result.file,
              type: 'file',
              name: result.file.name,
              converted: true,
              originalName: result.originalName
            });
            successCount++;
          }
        }

        const toasts = document.querySelectorAll('.toast-info');
        toasts.forEach(t => Toast.dismiss(t));

        if (successCount > 0) {
          Toast.conversion(
            'Conversion Complete',
            `Successfully converted ${successCount} HEIC file${successCount > 1 ? 's' : ''} to JPEG format.`
          );
        }

      } catch (error) {
        console.error('HEIC conversion error:', error);
        Toast.error('Conversion Error', 'Some HEIC files could not be converted.');
      }

      isProcessingHeic = false;
    }

    updateFileList();
    updateSteps();
  }

  async function handleZipFile(zipFile) {
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(zipFile);
      const validTypes = ['jpg', 'jpeg', 'png', 'webp'];
      const heicTypes = ['heic', 'heif'];

      const heicFilesInZip = [];

      for (const [filename, file] of Object.entries(zipContent.files)) {
        if (!file.dir) {
          const extension = filename.split('.').pop().toLowerCase();

          if (validTypes.includes(extension)) {
            const blob = await file.async('blob');
            const fileObj = new File([blob], filename, { type: `image/${extension}` });
            files.push({ file: fileObj, type: 'zip', name: filename, zipName: zipFile.name, converted: false });
          } else if (heicTypes.includes(extension)) {
            const blob = await file.async('blob');
            const fileObj = new File([blob], filename, { type: 'image/heic' });
            heicFilesInZip.push(fileObj);
          }
        }
      }

      if (heicFilesInZip.length > 0) {
        Toast.info('Converting HEIC from ZIP', `Found ${heicFilesInZip.length} HEIC files in ZIP, converting...`);

        const convertedResults = await HeicConverter.convertMultiple(heicFilesInZip);

        for (const result of convertedResults) {
          if (result.converted) {
            files.push({
              file: result.file,
              type: 'zip',
              name: result.file.name,
              zipName: zipFile.name,
              converted: true,
              originalName: result.originalName
            });
          }
        }

        Toast.conversion('ZIP Conversion Complete', `Converted ${heicFilesInZip.length} HEIC files from ${zipFile.name}`);
      }

      updateFileList();
      updateSteps();
    } catch (error) {
      Toast.error('ZIP Error', 'Error processing ZIP file. Please ensure it contains valid image files.');
    }
  }

  function handleUrlAdd() {
    const urlText = imageUrlInput.value.trim();
    if (!urlText) {
      Toast.warning('No URLs', 'Please enter at least one image URL.');
      return;
    }

    const urls = urlText.split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urls.length === 0) {
      Toast.warning('No URLs', 'Please enter valid image URLs.');
      return;
    }

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    let addedCount = 0;
    let skippedCount = 0;

    for (const url of urls) {
      try {
        new URL(url);
      } catch (e) {
        skippedCount++;
        continue;
      }

      const hasImageExtension = imageExtensions.some(ext =>
        url.toLowerCase().includes(ext)
      );

      if (!hasImageExtension && !url.includes('poecdn.net')) {
        skippedCount++;
        continue;
      }

      files.push({
        url,
        type: 'url',
        name: url.split('/').pop().split('?')[0] || 'image-from-url.jpg',
        converted: false
      });
      addedCount++;
    }

    imageUrlInput.value = '';
    updateFileList();
    updateSteps();

    if (addedCount > 0) {
      Toast.success('URLs Added', `Added ${addedCount} image${addedCount > 1 ? 's' : ''} from URL${addedCount > 1 ? 's' : ''}.`);
    }

    if (skippedCount > 0) {
      Toast.warning('Some URLs Skipped', `${skippedCount} URL${skippedCount > 1 ? 's were' : ' was'} invalid or not an image.`);
    }
  }

  function updateFileList() {
    fileCount.textContent = files.length;
    processCount.textContent = files.length;

    fileList.innerHTML = '';

    files.forEach((item, index) => {
      const fileItem = document.createElement('div');
      fileItem.className = `file-item glass-inner fade-in${item.converted ? ' converted' : ''}`;

      let iconClass = 'fas fa-image';
      let sourceLabel = '';
      let sizeInfo = '';

      if (item.type === 'file') {
        sizeInfo = formatFileSize(item.file.size);
      } else if (item.type === 'zip') {
        iconClass = 'fas fa-file-archive';
        sourceLabel = `from ${item.zipName}`;
        sizeInfo = formatFileSize(item.file.size);
      } else if (item.type === 'url') {
        iconClass = 'fas fa-link';
        sourceLabel = 'from URL';
        sizeInfo = 'External';
      }

      const convertedBadge = item.converted
        ? '<span class="converted-badge">Converted from HEIC</span>'
        : '';

      fileItem.innerHTML = `
        <div class="file-icon${item.converted ? ' converted' : ''}">
          <i class="${iconClass}"></i>
        </div>
        <div class="file-info">
          <div class="file-name">${item.name}${convertedBadge}</div>
          <div class="file-size">${sizeInfo} ${sourceLabel}</div>
        </div>
        <button onclick="removeFile(${index})" class="preview-btn glass-btn" title="Remove file" style="color: var(--error);">
          <i class="fas fa-times"></i>
        </button>
      `;
      fileList.appendChild(fileItem);
    });
  }

  window.removeFile = function(index) {
    files.splice(index, 1);
    updateFileList();
    updateSteps();
    resetPreview();
  };

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // -----------------------------------------------------------------
  // Watermark handling
  // -----------------------------------------------------------------
  function handleWatermarkUpload(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        watermarkImage.src = reader.result;
        watermarkPreview.src = reader.result;
        watermarkPreview.style.display = 'block';
        watermarkPlaceholder.style.display = 'none';
        isCustomWatermark = true;

        setCustomWatermarkLabel('Custom Upload');
        resetPreview();
        updateSteps();
        Toast.success('Custom Watermark', 'Custom watermark uploaded successfully.');
      };
      reader.readAsDataURL(file);
    }
  }

  // -----------------------------------------------------------------
  // UI Updates
  // -----------------------------------------------------------------
  function updateSliderValues() {
    opacityValue.textContent = `${opacitySlider.value}%`;
    sizeValue.textContent = `${sizeSlider.value}%`;
  }

  function updateSteps() {
    const steps = document.querySelectorAll('[data-step]');
    const hasFiles = files.length > 0;
    const hasWatermark = watermarkImage.complete && watermarkImage.naturalWidth > 0;

    updateStep(steps[0], hasFiles);
    updateStep(steps[1], hasWatermark);
    updateStep(steps[2], hasWatermark);
    updateStep(steps[3], hasFiles && hasWatermark);
    updateStep(steps[4], hasFiles && hasWatermark);

    processBtn.disabled = !(hasFiles && hasWatermark);
    generatePreviewBtn.disabled = !(hasFiles && hasWatermark);
  }

  function updateStep(stepElement, active) {
    if (active) {
      stepElement.classList.add('active');
    } else {
      stepElement.classList.remove('active');
    }
  }

  // -----------------------------------------------------------------
  // Preview functionality
  // -----------------------------------------------------------------
  async function generatePreview() {
    if (files.length === 0) {
      Toast.warning('No Images', 'Please upload some images first.');
      return;
    }

    if (!watermarkImage.complete || watermarkImage.naturalWidth === 0) {
      Toast.warning('No Watermark', 'Watermark is not loaded. Please wait and try again.');
      return;
    }

    showPreviewLoading();
    processedPreviews = [];
    currentPreviewIndex = 0;

    await processPreviewsSequentially(0);
  }

  async function processPreviewsSequentially(index) {
    if (index >= files.length) {
      showPreview();
      return;
    }

    const item = files[index];

    try {
      let imageData;

      if (item.type === 'url') {
        imageData = await loadImageFromUrl(item.url);
      } else {
        imageData = await loadImageFromFile(item.file);
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        if (watermarkImage.complete && watermarkImage.naturalWidth > 0) {
          const watermarkSize = parseFloat(sizeSlider.value) / 100;
          const watermarkWidth = Math.min(img.width * watermarkSize, watermarkImage.width);
          const watermarkHeight = (watermarkWidth / watermarkImage.width) * watermarkImage.height;

          const position = getWatermarkPosition(img.width, img.height, watermarkWidth, watermarkHeight);

          ctx.globalAlpha = parseFloat(opacitySlider.value) / 100;
          ctx.drawImage(watermarkImage, position.x, position.y, watermarkWidth, watermarkHeight);
          ctx.globalAlpha = 1;
        }

        processedPreviews.push({
          canvas: canvas,
          filename: item.name
        });

        processPreviewsSequentially(index + 1);
      };

      img.src = imageData;
    } catch (error) {
      console.error('Error processing image:', error);
      Toast.error('Preview Error', `Error processing: ${item.name}`);
      processPreviewsSequentially(index + 1);
    }
  }

  async function loadImageFromUrl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL());
      };
      img.onerror = () => reject(new Error('Failed to load image from URL'));
      img.src = url;
    });
  }

  async function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  function getWatermarkPosition(imgWidth, imgHeight, wmWidth, wmHeight) {
    const margin = Math.max(20, Math.min(imgWidth, imgHeight) * 0.02);
    const position = positionSelect.value;

    switch (position) {
      case 'top-left':
        return { x: margin, y: margin };
      case 'top-right':
        return { x: imgWidth - wmWidth - margin, y: margin };
      case 'center':
        return { x: (imgWidth - wmWidth) / 2, y: (imgHeight - wmHeight) / 2 };
      case 'bottom-left':
        return { x: margin, y: imgHeight - wmHeight - margin };
      case 'bottom-right':
      default:
        return { x: imgWidth - wmWidth - margin, y: imgHeight - wmHeight - margin };
    }
  }

  function showPreviewLoading() {
    previewPlaceholder.style.display = 'none';
    previewCanvas.style.display = 'none';
    previewLoading.style.display = 'block';
    previewInfo.style.display = 'none';
    enlargePreviewBtn.style.display = 'none';
  }

  function showPreview() {
    previewLoading.style.display = 'none';
    previewPlaceholder.style.display = 'none';
    previewCanvas.style.display = 'block';
    previewInfo.style.display = 'flex';
    enlargePreviewBtn.style.display = 'inline-flex';

    displayPreviewImage();
  }

  function displayPreviewImage() {
    if (processedPreviews.length === 0) return;

    const preview = processedPreviews[currentPreviewIndex];
    const ctx = previewCanvas.getContext('2d');

    const container = previewCanvas.parentElement;
    const maxWidth = container.clientWidth - 40;
    const maxHeight = 280;
    const ratio = Math.min(maxWidth / preview.canvas.width, maxHeight / preview.canvas.height);

    previewCanvas.width = preview.canvas.width * ratio;
    previewCanvas.height = preview.canvas.height * ratio;

    ctx.drawImage(preview.canvas, 0, 0, previewCanvas.width, previewCanvas.height);

    previewFileName.textContent = preview.filename;
    previewCounter.textContent = `${currentPreviewIndex + 1} / ${processedPreviews.length}`;

    prevImageBtn.disabled = currentPreviewIndex === 0;
    nextImageBtn.disabled = currentPreviewIndex === processedPreviews.length - 1;
  }

  function navigatePreview(direction) {
    const newIndex = currentPreviewIndex + direction;
    if (newIndex >= 0 && newIndex < processedPreviews.length) {
      currentPreviewIndex = newIndex;
      displayPreviewImage();
    }
  }

  function resetPreview() {
    processedPreviews = [];
    currentPreviewIndex = 0;
    previewLoading.style.display = 'none';
    previewCanvas.style.display = 'none';
    previewInfo.style.display = 'none';
    enlargePreviewBtn.style.display = 'none';
    previewPlaceholder.style.display = 'block';
  }

  // -----------------------------------------------------------------
  // Fullscreen Preview
  // -----------------------------------------------------------------
  function openFullscreenPreview() {
    if (processedPreviews.length === 0) return;

    fullscreenModal.classList.add('active');
    displayFullscreenImage();
    document.body.style.overflow = 'hidden';
  }

  function closeFullscreenPreview() {
    fullscreenModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function displayFullscreenImage() {
    if (processedPreviews.length === 0) return;

    const preview = processedPreviews[currentPreviewIndex];
    const ctx = fullscreenCanvas.getContext('2d');

    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.9;
    const ratio = Math.min(maxWidth / preview.canvas.width, maxHeight / preview.canvas.height);

    fullscreenCanvas.width = preview.canvas.width * ratio;
    fullscreenCanvas.height = preview.canvas.height * ratio;

    ctx.drawImage(preview.canvas, 0, 0, fullscreenCanvas.width, fullscreenCanvas.height);

    fullscreenFilename.textContent = preview.filename;
    fullscreenCounter.textContent = `${currentPreviewIndex + 1} / ${processedPreviews.length}`;

    fullscreenPrev.disabled = currentPreviewIndex === 0;
    fullscreenNext.disabled = currentPreviewIndex === processedPreviews.length - 1;
  }

  function navigateFullscreen(direction) {
    const newIndex = currentPreviewIndex + direction;
    if (newIndex >= 0 && newIndex < processedPreviews.length) {
      currentPreviewIndex = newIndex;
      displayFullscreenImage();
      displayPreviewImage();
    }
  }

  // -----------------------------------------------------------------
  // Processing functionality
  // -----------------------------------------------------------------
  async function processImages() {
    if (files.length === 0) {
      Toast.warning('No Images', 'Please upload some images first.');
      return;
    }

    if (!watermarkImage.complete || watermarkImage.naturalWidth === 0) {
      Toast.warning('No Watermark', 'Watermark is not loaded. Please wait and try again.');
      return;
    }

    const btnText = processBtn.querySelector('.btn-text');
    const btnLoader = processBtn.querySelector('.btn-loader');

    processBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'flex';

    const zip = new JSZip();
    let processedCount = 0;

    for (const item of files) {
      try {
        let imageData;

        if (item.type === 'url') {
          imageData = await loadImageFromUrl(item.url);
        } else {
          imageData = await loadImageFromFile(item.file);
        }

        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageData;
        });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        const watermarkSize = parseFloat(sizeSlider.value) / 100;
        const watermarkWidth = Math.min(img.width * watermarkSize, watermarkImage.width);
        const watermarkHeight = (watermarkWidth / watermarkImage.width) * watermarkImage.height;

        const position = getWatermarkPosition(img.width, img.height, watermarkWidth, watermarkHeight);

        ctx.globalAlpha = parseFloat(opacitySlider.value) / 100;
        ctx.drawImage(watermarkImage, position.x, position.y, watermarkWidth, watermarkHeight);
        ctx.globalAlpha = 1;

        const blob = await new Promise(resolve => {
          canvas.toBlob(resolve, 'image/jpeg', 0.92);
        });

        const fileName = item.name.replace(/\.[^/.]+$/, '') + '_watermarked_FLR.jpg';
        zip.file(fileName, blob);

        processedCount++;
      } catch (error) {
        console.error('Error processing image:', item.name, error);
      }
    }

    if (processedCount > 0) {
      finalizeDownload(zip, btnText, btnLoader, processedCount);
    } else {
      btnText.style.display = 'flex';
      btnLoader.style.display = 'none';
      processBtn.disabled = false;
      Toast.error('Processing Failed', 'No images were successfully processed.');
    }
  }

  function finalizeDownload(zip, btnText, btnLoader, processedCount) {
    zip.generateAsync({ type: 'blob' }).then((content) => {
      const url = URL.createObjectURL(content);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      downloadLink.href = url;
      downloadLink.download = `watermarked_images_FLR_${timestamp}.zip`;

      btnText.style.display = 'flex';
      btnLoader.style.display = 'none';
      processBtn.disabled = false;
      downloadSection.style.display = 'block';

      downloadSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

      Toast.success('Processing Complete', `${processedCount} image${processedCount > 1 ? 's' : ''} watermarked and ready for download!`);
    });
  }

  // -----------------------------------------------------------------
  // Modal functionality
  // -----------------------------------------------------------------
  function showModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function hideModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // -----------------------------------------------------------------
  // Theme toggle
  // -----------------------------------------------------------------
  function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    updateThemeIcon();
  }
});

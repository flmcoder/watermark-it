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
  const watermarkGallery = document.getElementById("watermark-gallery");
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

  // -----------------------------------------------------------------
  // App State
  // -----------------------------------------------------------------
  let watermarkImage = new Image();
  watermarkImage.crossOrigin = "anonymous";
  
  // Available watermarks - Updated to match your actual assets folder
  const availableWatermarks = [
    { 
      name: "Logo Watermark", 
      path: "assets/logo-watermark.png",
      fallback: "https://pfst.cf2.poecdn.net/base/image/57c851c04753092259d83d0a1aa34e2fd889c7218b50a338e6100dbf21ae922c?w=733&h=982"
    },
    { 
      name: "Logo Watermark 2", 
      path: "assets/logo-watermark2.png",
      fallback: "https://pfst.cf2.poecdn.net/base/image/57c851c04753092259d83d0a1aa34e2fd889c7218b50a338e6100dbf21ae922c?w=733&h=982"
    },
    { 
      name: "Grey Watermark", 
      path: "assets/grey-watermark.png",
      fallback: "https://pfst.cf2.poecdn.net/base/image/911f4cc97598a591680f81a4f8ae0e0ab9a94f433dc324b57d6915d144f19b94?w=3600&h=1024"
    },
    { 
      name: "Flat White Stroke", 
      path: "assets/Flat-white-stroke-watermark.png",
      fallback: "https://pfst.cf2.poecdn.net/base/image/df10a509049e8085ede13109f49ec911f6b467169ff9eb6a9b6839be7cce0bca?w=3600&h=1024"
    },
    { 
      name: "Default Watermark", 
      path: "assets/default",
      fallback: "https://pfst.cf2.poecdn.net/base/image/57c851c04753092259d83d0a1aa34e2fd889c7218b50a338e6100dbf21ae922c?w=733&h=982"
    }
  ];
  
  const files = [];
  let processedPreviews = [];
  let currentPreviewIndex = 0;
  let selectedWatermarkIndex = 0;
  let currentUploadMethod = 'files';

  // -----------------------------------------------------------------
  // Initialize app
  // -----------------------------------------------------------------
  init();

  function init() {
    setupEventListeners();
    loadWatermarkGallery();
    setDefaultSettings();
    updateSliderValues();
    updateSteps();
  }

  function setDefaultSettings() {
    positionSelect.value = "bottom-right";
    opacitySlider.value = "75";
    sizeSlider.value = "30";
  }

  // -----------------------------------------------------------------
  // Watermark Gallery
  // -----------------------------------------------------------------
  function loadWatermarkGallery() {
    watermarkGallery.innerHTML = '';
    
    // Show all available watermarks
    availableWatermarks.forEach((watermark, index) => {
      const galleryItem = document.createElement('div');
      galleryItem.className = `gallery-item glass-inner ${index === 0 ? 'selected' : ''}`;
      galleryItem.title = watermark.name;
      
      const img = document.createElement('img');
      img.alt = watermark.name;
      img.loading = 'lazy';
      
      // Try to load from assets first, fallback to CDN
      img.onerror = function() {
        console.log(`Failed to load ${watermark.path}, using fallback`);
        this.src = watermark.fallback;
        this.onerror = null; // Prevent infinite loop
      };
      
      img.src = watermark.path;
      
      galleryItem.appendChild(img);
      galleryItem.addEventListener('click', () => selectWatermark(index));
      watermarkGallery.appendChild(galleryItem);
    });
    
    // Set default watermark
    selectWatermark(0);
  }

  function selectWatermark(index) {
    // Update gallery selection
    document.querySelectorAll('.gallery-item').forEach((item, i) => {
      item.classList.toggle('selected', i === index);
    });
    
    selectedWatermarkIndex = index;
    const watermark = availableWatermarks[index];
    
    // Clear custom watermark selection
    watermarkPreview.style.display = 'none';
    watermarkPlaceholder.style.display = 'block';
    
    // Load watermark image
    watermarkImage.onload = () => {
      watermarkPreview.src = watermarkImage.src;
      watermarkPreview.style.display = 'block';
      watermarkPlaceholder.style.display = 'none';
      resetPreview();
      updateSteps(); // Update steps when watermark is loaded
      console.log(`Watermark loaded: ${watermark.name}`);
    };
    
    watermarkImage.onerror = () => {
      console.log(`Failed to load ${watermark.path}, trying fallback`);
      // Try fallback URL
      watermarkImage.src = watermark.fallback;
    };
    
    // Start with assets path
    watermarkImage.src = watermark.path;
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
    
    // URL upload
    addUrlBtn.addEventListener('click', handleUrlAdd);
    imageUrlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleUrlAdd();
      }
    });

    // Watermark
    document.getElementById("change-watermark").addEventListener("click", () => {
      watermarkUpload.click();
    });
    watermarkUpload.addEventListener("change", handleWatermarkUpload);
    watermarkPreviewContainer.addEventListener("click", () => watermarkUpload.click());

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
        switch(e.key) {
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
          navigateFullscreen(1); // Swipe left - next image
        } else {
          navigateFullscreen(-1); // Swipe right - previous image
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
  // Upload Method Switching
  // -----------------------------------------------------------------
  function switchUploadMethod(method) {
    currentUploadMethod = method;
    
    // Update tab appearance
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
  // File handling
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

  function handleFiles(fileList) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const zipTypes = ['application/zip', 'application/x-zip-compressed'];
    
    Array.from(fileList).forEach(file => {
      if (validTypes.includes(file.type)) {
        files.push({ file, type: 'file', name: file.name });
      } else if (zipTypes.includes(file.type)) {
        handleZipFile(file);
      } else if (file.type === 'image/heic') {
        showCustomAlert('HEIC files are currently experiencing compatibility issues. Please convert to JPG, PNG, or WebP format for best results.');
      }
    });
    
    updateFileList();
    updateSteps();
  }

  async function handleZipFile(zipFile) {
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(zipFile);
      const validTypes = ['jpg', 'jpeg', 'png', 'webp'];
      
      for (const [filename, file] of Object.entries(zipContent.files)) {
        if (!file.dir) {
          const extension = filename.split('.').pop().toLowerCase();
          if (validTypes.includes(extension)) {
            const blob = await file.async('blob');
            const fileObj = new File([blob], filename, { type: `image/${extension}` });
            files.push({ file: fileObj, type: 'zip', name: filename, zipName: zipFile.name });
          }
        }
      }
      
      updateFileList();
      updateSteps();
    } catch (error) {
      showCustomAlert('Error processing ZIP file. Please ensure it contains valid image files.');
    }
  }

  function handleUrlAdd() {
    const url = imageUrlInput.value.trim();
    if (!url) {
      showCustomAlert('Please enter a valid image URL.');
      return;
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      showCustomAlert('Please enter a valid URL.');
      return;
    }
    
    // Check if it's likely an image URL
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const hasImageExtension = imageExtensions.some(ext => 
      url.toLowerCase().includes(ext)
    );
    
    if (!hasImageExtension) {
      showCustomAlert('URL should point to an image file (JPG, PNG, WebP).');
      return;
    }
    
    // Add to files list
    files.push({ 
      url, 
      type: 'url', 
      name: url.split('/').pop() || 'image-from-url.jpg' 
    });
    
    imageUrlInput.value = '';
    updateFileList();
    updateSteps();
  }

  function updateFileList() {
    fileCount.textContent = files.length;
    processCount.textContent = files.length;
    
    fileList.innerHTML = '';
    
    files.forEach((item, index) => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item glass-inner fade-in';
      
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
      
      fileItem.innerHTML = `
        <div class="file-icon">
          <i class="${iconClass}"></i>
        </div>
        <div class="file-info">
          <div class="file-name">${item.name}</div>
          <div class="file-size">${sizeInfo} ${sourceLabel}</div>
        </div>
        <button onclick="removeFile(${index})" class="preview-btn glass-btn" title="Remove file" style="color: var(--error);">
          <i class="fas fa-times"></i>
        </button>
      `;
      fileList.appendChild(fileItem);
    });
  }

  // Global function for removing files (needed for onclick)
  window.removeFile = function(index) {
    files.splice(index, 1);
    updateFileList();
    updateSteps();
    resetPreview();
  }

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
        
        // Clear gallery selection
        document.querySelectorAll('.gallery-item').forEach(item => {
          item.classList.remove('selected');
        });
        
        resetPreview();
        updateSteps();
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
    
    // Step 1: Upload Images
    updateStep(steps[0], true);
    
    // Step 2: Configure Watermark  
    updateStep(steps[1], hasFiles || hasWatermark);
    
    // Step 3: Preview & Process
    updateStep(steps[2], hasFiles && hasWatermark);
    
    // Enable/disable process button
    processBtn.disabled = !(hasFiles && hasWatermark);
    
    // Enable/disable preview button
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
      showCustomAlert('Please upload some images first.');
      return;
    }
    
    if (!watermarkImage.complete || watermarkImage.naturalWidth === 0) {
      showCustomAlert('Please select or upload a watermark image first.');
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
        // Load image from URL
        imageData = await loadImageFromUrl(item.url);
      } else {
        // Load image from file
        imageData = await loadImageFromFile(item.file);
      }
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Add watermark if available
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
      showCustomAlert(`Error processing image: ${item.name}`);
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
    
    // Set canvas size to fit container while maintaining aspect ratio
    const container = previewCanvas.parentElement;
    const maxWidth = container.clientWidth - 40;
    const maxHeight = 400;
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
    
    // Set canvas size to fit screen while maintaining aspect ratio
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
      displayPreviewImage(); // Update small preview too
    }
  }

  // -----------------------------------------------------------------
  // Processing functionality
  // -----------------------------------------------------------------
  async function processImages() {
    if (files.length === 0) {
      showCustomAlert('Please upload some images first.');
      return;
    }
    
    if (!watermarkImage.complete || watermarkImage.naturalWidth === 0) {
      showCustomAlert('Please select or upload a watermark image first.');
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
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Calculate watermark dimensions and position
        const watermarkSize = parseFloat(sizeSlider.value) / 100;
        const watermarkWidth = Math.min(img.width * watermarkSize, watermarkImage.width);
        const watermarkHeight = (watermarkWidth / watermarkImage.width) * watermarkImage.height;
        
        const position = getWatermarkPosition(img.width, img.height, watermarkWidth, watermarkHeight);
        
        // Apply opacity and draw watermark
        ctx.globalAlpha = parseFloat(opacitySlider.value) / 100;
        ctx.drawImage(watermarkImage, position.x, position.y, watermarkWidth, watermarkHeight);
        ctx.globalAlpha = 1;
        
        // Convert to blob and add to zip
        const blob = await new Promise(resolve => {
          canvas.toBlob(resolve, 'image/jpeg', 0.9);
        });
        
        const fileName = item.name.replace(/\.[^/.]+$/, '') + '_watermarked_FLR.jpg';
        zip.file(fileName, blob);
        
        processedCount++;
      } catch (error) {
        console.error('Error processing image:', item.name, error);
        showCustomAlert(`Error processing image: ${item.name}`);
      }
    }
    
    if (processedCount > 0) {
      finalizeDownload(zip, btnText, btnLoader);
    } else {
      btnText.style.display = 'flex';
      btnLoader.style.display = 'none';
      processBtn.disabled = false;
      showCustomAlert('No images were successfully processed.');
    }
  }

  function finalizeDownload(zip, btnText, btnLoader) {
    zip.generateAsync({ type: 'blob' }).then((content) => {
      const url = URL.createObjectURL(content);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      downloadLink.href = url;
      downloadLink.download = `watermarked_images_FLR_${timestamp}.zip`;
      
      btnText.style.display = 'flex';
      btnLoader.style.display = 'none';
      processBtn.disabled = false;
      downloadSection.style.display = 'block';
      
      // Auto-scroll to download section
      downloadSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  // -----------------------------------------------------------------
  // Custom Alert (replaces alert())
  // -----------------------------------------------------------------
  function showCustomAlert(message) {
    const alertModal = document.createElement('div');
    alertModal.className = 'modal active';
    alertModal.innerHTML = `
      <div class="modal-content glass-effect">
        <div class="modal-header">
          <h3><i class="fas fa-info-circle" style="color: var(--primary); margin-right: 0.5rem;"></i>Notice</h3>
        </div>
        <div class="modal-body">
          <p style="color: var(--text-secondary); margin-bottom: 1.5rem; line-height: 1.6;">${message}</p>
          <div style="text-align: right;">
            <button class="btn btn-primary glass-btn" onclick="this.closest('.modal').remove(); document.body.style.overflow = '';">
              <i class="fas fa-check"></i>
              OK
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(alertModal);
    document.body.style.overflow = 'hidden';
    
    // Auto-remove after click outside
    alertModal.addEventListener('click', (e) => {
      if (e.target === alertModal) {
        alertModal.remove();
        document.body.style.overflow = '';
      }
    });
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (alertModal.parentNode) {
        alertModal.remove();
        document.body.style.overflow = '';
      }
    }, 10000);
  }
});

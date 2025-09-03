// Dark mode detection
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    if (event.matches) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
});

document.addEventListener("DOMContentLoaded", () => {
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
  const previewNavigation = document.getElementById("preview-navigation");
  const generatePreviewBtn = document.getElementById("generate-preview");
  const prevImageBtn = document.getElementById("prev-image");
  const nextImageBtn = document.getElementById("next-image");
  const processBtn = document.getElementById("process-btn");
  const downloadLink = document.getElementById("download-link");
  const downloadSection = document.getElementById("download-section");
  const helpModal = document.getElementById("help-modal");
  const helpBtn = document.getElementById("help-btn");
  const closeHelp = document.getElementById("close-help");
  const themeToggle = document.getElementById("theme-toggle");

  // -----------------------------------------------------------------
  // App State
  // -----------------------------------------------------------------
  let watermarkImage = new Image();
  watermarkImage.crossOrigin = "anonymous";
  watermarkImage.src = "https://pfst.cf2.poecdn.net/base/image/d733ab95ffb19192be374da87a96c29964f994288f429ada054eb697315660ba?w=3600&h=1024";
  
  const files = [];
  let processedPreviews = [];
  let currentPreviewIndex = 0;

  // -----------------------------------------------------------------
  // Initialize app
  // -----------------------------------------------------------------
  init();

  function init() {
    setupEventListeners();
    updateSliderValues();
    updateSteps();
  }

  // -----------------------------------------------------------------
  // Event Listeners
  // -----------------------------------------------------------------
  function setupEventListeners() {
    // File upload
    dropZone.addEventListener("dragover", handleDragOver);
    dropZone.addEventListener("dragleave", handleDragLeave);
    dropZone.addEventListener("drop", handleDrop);
    dropZone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

    // Watermark
    document.getElementById("change-watermark").addEventListener("click", () => {
      watermarkUpload.click();
    });
    watermarkUpload.addEventListener("change", handleWatermarkUpload);
    watermarkPreview.addEventListener("click", () => watermarkUpload.click());

    // Controls
    sizeSlider.addEventListener("input", updateSliderValues);
    opacitySlider.addEventListener("input", updateSliderValues);

    // Preview & processing
    generatePreviewBtn.addEventListener("click", generatePreview);
    prevImageBtn.addEventListener("click", () => navigatePreview(-1));
    nextImageBtn.addEventListener("click", () => navigatePreview(1));
    processBtn.addEventListener("click", processImages);

    // Modal & theme
    helpBtn.addEventListener("click", () => showModal(helpModal));
    closeHelp.addEventListener("click", () => hideModal(helpModal));
    helpModal.addEventListener("click", (e) => {
      if (e.target === helpModal) hideModal(helpModal);
    });
    themeToggle.addEventListener("click", toggleTheme);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideModal(helpModal);
    });
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
    
    Array.from(fileList).forEach(file => {
      if (validTypes.includes(file.type)) {
        files.push(file);
      }
    });
    
    updateFileList();
    updateSteps();
  }

  function updateFileList() {
    fileCount.textContent = files.length;
    processCount.textContent = files.length;
    
    fileList.innerHTML = '';
    
    files.forEach((file, index) => {
      const fileItem = document.createElement('div');
      fileItem.className = 'flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600';
      fileItem.innerHTML = `
        <div class="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white text-sm">
          <i class="fas fa-image"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-gray-800 dark:text-white text-sm truncate">${file.name}</div>
          <div class="text-gray-500 dark:text-gray-400 text-xs">${formatFileSize(file.size)}</div>
        </div>
        <button onclick="removeFile(${index})" class="text-red-500 hover:text-red-700 text-sm">
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
        resetPreview();
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
    
    // Step 1: Upload Images
    updateStep(steps[0], true);
    
    // Step 2: Configure Watermark
    updateStep(steps[1], hasFiles);
    
    // Step 3: Preview & Process
    updateStep(steps[2], hasFiles);
    
    // Enable/disable process button
    processBtn.disabled = !hasFiles;
  }

  function updateStep(stepElement, active) {
    const number = stepElement.querySelector('div');
    if (active) {
      stepElement.className = stepElement.className.replace('text-gray-400', 'text-purple-600');
      number.className = number.className.replace('bg-gray-200 dark:bg-gray-700', 'bg-purple-600 text-white');
    } else {
      stepElement.className = stepElement.className.replace('text-purple-600', 'text-gray-400');
      number.className = number.className.replace('bg-purple-600 text-white', 'bg-gray-200 dark:bg-gray-700');
    }
  }

  // -----------------------------------------------------------------
  // Preview functionality
  // -----------------------------------------------------------------
  function generatePreview() {
    if (files.length === 0) return;
    
    showPreviewLoading();
    processedPreviews = [];
    currentPreviewIndex = 0;
    
    processPreviewsSequentially(0);
  }

  function processPreviewsSequentially(index) {
    if (index >= files.length) {
      showPreview();
      return;
    }
    
    const file = files[index];
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
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
        
        processedPreviews.push({
          canvas: canvas,
          filename: file.name
        });
        
        processPreviewsSequentially(index + 1);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function getWatermarkPosition(imgWidth, imgHeight, wmWidth, wmHeight) {
    const margin = 20;
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
  }

  function showPreview() {
    previewLoading.style.display = 'none';
    previewPlaceholder.style.display = 'none';
    previewCanvas.style.display = 'block';
    previewInfo.style.display = 'flex';
    
    displayPreviewImage();
  }

  function displayPreviewImage() {
    if (processedPreviews.length === 0) return;
    
    const preview = processedPreviews[currentPreviewIndex];
    const ctx = previewCanvas.getContext('2d');
    
    // Set canvas size to fit container while maintaining aspect ratio
    const maxWidth = previewCanvas.parentElement.clientWidth - 40;
    const maxHeight = 360;
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
    previewPlaceholder.style.display = 'block';
  }

  // -----------------------------------------------------------------
  // Processing functionality
  // -----------------------------------------------------------------
  function processImages() {
    if (files.length === 0) return;
    
    const btnText = processBtn.querySelector('.btn-text');
    const btnLoader = processBtn.querySelector('.btn-loader');
    
    processBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'flex';
    
    const zip = new JSZip();
    let processedCount = 0;
    
    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
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
          canvas.toBlob((blob) => {
            const fileName = file.name.replace(/\.[^/.]+$/, '') + '_watermarked.jpg';
            zip.file(fileName, blob);
            
            processedCount++;
            if (processedCount === files.length) {
              finalizeDownload(zip, btnText, btnLoader);
            }
          }, 'image/jpeg', 0.9);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function finalizeDownload(zip, btnText, btnLoader) {
    zip.generateAsync({ type: 'blob' }).then((content) => {
      const url = URL.createObjectURL(content);
      downloadLink.href = url;
      downloadLink.download = 'watermarked_images.zip';
      
      btnText.style.display = 'flex';
      btnLoader.style.display = 'none';
      processBtn.disabled = false;
      downloadSection.style.display = 'block';
    });
  }

  // -----------------------------------------------------------------
  // Modal functionality
  // -----------------------------------------------------------------
  function showModal(modal) {
    modal.classList.add('active');
  }

  function hideModal(modal) {
    modal.classList.remove('active');
  }

  // -----------------------------------------------------------------
  // Theme toggle
  // -----------------------------------------------------------------
  function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    const icon = themeToggle.querySelector('i');
    if (document.documentElement.classList.contains('dark')) {
      icon.className = 'fas fa-sun';
    } else {
      icon.className = 'fas fa-moon';
    }
  }
});

  function handleDragLeave(e) {
    e.preventDefault();
    dropZone.classList.remove("hover");
  }

  function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove("hover");
    handleFiles(e.dataTransfer.files);
  }

  async function handleFiles(selectedFiles) {
    for (const file of selectedFiles) {
      if (file.name.endsWith('.zip')) {
        // Handle ZIP files
        try {
          const zip = new JSZip();
          const zipContent = await zip.loadAsync(file);
          
          for (const filename in zipContent.files) {
            const zipFile = zipContent.files[filename];
            if (!zipFile.dir && isImageFile(filename)) {
              const blob = await zipFile.async('blob');
              const imageFile = new File([blob], filename, { type: getImageMimeType(filename) });
              files.push(imageFile);
              addFileToList(imageFile);
            }
          }
        } catch (error) {
          console.error('Error processing ZIP file:', error);
          alert('Error processing ZIP file. Please ensure it contains valid images.');
        }
      } else if (file.type.match("image.*") || file.name.endsWith(".heic")) {
        files.push(file);
        addFileToList(file);
      }
    }
    
    updateFileCount();
    updateProcessButton();
    updateSteps();
    resetPreview();
  }

  function isImageFile(filename) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic'];
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  function getImageMimeType(filename) {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'webp': 'image/webp',
      'heic': 'image/heic'
    };
    return mimeTypes[ext] || 'image/jpeg';
  }

  function addFileToList(file) {
    const fileItem = document.createElement("div");
    fileItem.className = "file-item fade-in";
    
    const fileIcon = document.createElement("div");
    fileIcon.className = "file-icon";
    fileIcon.innerHTML = '<i class="fas fa-image"></i>';
    
    const fileInfo = document.createElement("div");
    fileInfo.className = "file-info";
    
    const fileName = document.createElement("div");
    fileName.className = "file-name";
    fileName.textContent = file.name;
    
    const fileSize = document.createElement("div");
    fileSize.className = "file-size";
    fileSize.textContent = formatFileSize(file.size);
    
    fileInfo.appendChild(fileName);
    fileInfo.appendChild(fileSize);
    
    const removeBtn = document.createElement("button");
    removeBtn.className = "preview-btn";
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.onclick = () => removeFile(file, fileItem);
    
    fileItem.appendChild(fileIcon);
    fileItem.appendChild(fileInfo);
    fileItem.appendChild(removeBtn);
    
    fileList.appendChild(fileItem);
  }

  function removeFile(file, fileItem) {
    const index = files.indexOf(file);
    if (index > -1) {
      files.splice(index, 1);
      fileItem.remove();
      updateFileCount();
      updateProcessButton();
      updateSteps();
      resetPreview();
    }
  }

  function resetPreview() {
    processedPreviews = [];
    currentPreviewIndex = 0;
    previewCanvas.style.display = 'none';
    previewInfo.style.display = 'none';
    previewPlaceholder.style.display = 'block';
    generatePreviewBtn.innerHTML = '<i class="fas fa-play"></i> Generate Preview';
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Watermark handling
  function handleWatermarkUpload(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        watermarkImage.src = reader.result;
        watermarkPreview.src = reader.result;
        resetPreview(); // Reset preview when watermark changes
      };
      reader.readAsDataURL(file);
    }
  }

  // UI Updates
  function updateFileCount() {
    fileCount.textContent = files.length;
    processCount.textContent = files.length;
  }

  function updateProcessButton() {
    processBtn.disabled = files.length === 0;
    generatePreviewBtn.disabled = files.length === 0;
  }

  function updateSliderValues() {
    opacityValue.textContent = `${opacitySlider.value}%`;
    sizeValue.textContent = `${sizeSlider.value}%`;
  }

  function updateSteps() {
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
      step.classList.remove('active');
      if (index === 0 || (index === 1 && files.length > 0) || (index === 2 && files.length > 0)) {
        step.classList.add('active');
      }
    });
  }

  // Preview functionality
  async function generatePreview() {
    if (files.length === 0) return;

    // Show loading state
    generatePreviewBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    generatePreviewBtn.disabled = true;
    previewPlaceholder.style.display = 'none';
    previewLoading.style.display = 'block';

    try {
      processedPreviews = [];
      
      // Process first few images for preview (limit to 5 for performance)
      const previewFiles = files.slice(0, Math.min(files.length, 5));
      
      for (let i = 0; i < previewFiles.length; i++) {
        const previewData = await processImageForPreview(previewFiles[i]);
        processedPreviews.push(previewData);
      }

      currentPreviewIndex = 0;
      showPreview();

    } catch (error) {
      console.error('Error generating preview:', error);
      alert('Error generating preview. Please try again.');
      previewPlaceholder.style.display = 'block';
    } finally {
      previewLoading.style.display = 'none';
      generatePreviewBtn.innerHTML = '<i class="fas fa-sync"></i> Regenerate';
      generatePreviewBtn.disabled = false;
    }
  }

  function processImageForPreview(file) {
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size for preview (limit size for performance)
        const maxWidth = 800;
        const maxHeight = 600;
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        // Draw image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Draw watermark
        drawWatermark(ctx, canvas.width, canvas.height);
        
        resolve({
          canvas: canvas,
          filename: file.name,
          originalWidth: img.width,
          originalHeight: img.height
        });
      };

      loadImageFromFile(file, img);
    });
  }

  function drawWatermark(ctx, canvasWidth, canvasHeight) {
    const watermarkWidth = (canvasWidth * sizeSlider.value) / 100;
    const watermarkHeight = (watermarkImage.height * watermarkWidth) / watermarkImage.width;
    let x = 10, y = 10;

    switch (positionSelect.value) {
      case "top-left":
        x = 10;
        y = 10;
        break;
      case "top-right":
        x = canvasWidth - watermarkWidth - 10;
        y = 10;
        break;
      case "center":
        x = (canvasWidth - watermarkWidth) / 2;
        y = (canvasHeight - watermarkHeight) / 2;
        break;
      case "bottom-left":
        x = 10;
        y = canvasHeight - watermarkHeight - 10;
        break;
      case "bottom-right":
        x = canvasWidth - watermarkWidth - 10;
        y = canvasHeight - watermarkHeight - 10;
        break;
    }

    ctx.globalAlpha = opacitySlider.value / 100;
    ctx.drawImage(watermarkImage, x, y, watermarkWidth, watermarkHeight);
    ctx.globalAlpha = 1;
  }

  function showPreview() {
    if (processedPreviews.length === 0) return;

    const preview = processedPreviews[currentPreviewIndex];
    
    // Update canvas
    previewCanvas.width = preview.canvas.width;
    previewCanvas.height = preview.canvas.height;
    const ctx = previewCanvas.getContext('2d');
    ctx.drawImage(preview.canvas, 0, 0);
    
    // Update UI
    previewCanvas.style.display = 'block';
    previewInfo.style.display = 'flex';
    previewFileName.textContent = preview.filename;
    previewCounter.textContent = `${currentPreviewIndex + 1} / ${processedPreviews.length}`;
    
    // Update navigation buttons
    prevImageBtn.disabled = currentPreviewIndex === 0;
    nextImageBtn.disabled = currentPreviewIndex === processedPreviews.length - 1;
    
    // Show/hide navigation if multiple images
    if (processedPreviews.length > 1) {
      previewNavigation.style.display = 'flex';
    } else {
      previewNavigation.style.display = 'none';
    }
  }

  function navigatePreview(direction) {
    const newIndex = currentPreviewIndex + direction;
    if (newIndex >= 0 && newIndex < processedPreviews.length) {
      currentPreviewIndex = newIndex;
      showPreview();
    }
  }

  function loadImageFromFile(file, img) {
    if (file.name.endsWith(".heic")) {
      if (typeof heic2any !== 'undefined') {
        heic2any({ blob: file }).then((converted) => {
          img.src = URL.createObjectURL(converted);
        }).catch((error) => {
          console.error('Error converting HEIC:', error);
          img.src = URL.createObjectURL(file); // Fallback
        });
      } else {
        img.src = URL.createObjectURL(file);
      }
    } else {
      img.src = URL.createObjectURL(file);
    }
  }

  // Process images
  async function processImages() {
    if (files.length === 0) return;

    // Show loading state
    const btnText = processBtn.querySelector('.btn-text');
    const btnLoader = processBtn.querySelector('.btn-loader');
    
    btnText.style.display = 'none';
    btnLoader.style.display = 'flex';
    processBtn.disabled = true;

    try {
      const zip = new JSZip();
      
      // Process each file
      for (let i = 0; i < files.length; i++) {
        await processIndividualImage(files[i], i, zip);
        
        // Update progress (if you want to add a progress bar)
        const progress = ((i + 1) / files.length) * 100;
        console.log(`Processing: ${progress.toFixed(1)}%`);
      }

      // Generate and download ZIP
      console.log('Generating ZIP file...');
      const content = await zip.generateAsync({ 
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      });
      
      downloadLink.href = URL.createObjectURL(content);
      downloadLink.download = `watermarked-images-${Date.now()}.zip`;
      downloadSection.style.display = 'block';

      console.log('Processing complete!');

    } catch (error) {
      console.error('Error processing images:', error);
      alert('Error processing images. Please try again.');
    } finally {
      // Reset button state
      btnText.style.display = 'flex';
      btnLoader.style.display = 'none';
      processBtn.disabled = false;
    }
  }

  function processIndividualImage(file, index, zip) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Use original image dimensions
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw original image
          ctx.drawImage(img, 0, 0);
          
          // Draw watermark
          drawWatermark(ctx, canvas.width, canvas.height);
          
          // Convert to blob with 100% quality
          canvas.toBlob((blob) => {
            if (blob) {
              const originalName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
              const filename = `watermarked_${String(index + 1).padStart(3, '0')}_${originalName}.jpg`;
              zip.file(filename, blob);
              resolve();
            } else {
              reject(new Error('Failed to create blob'));
            }
          }, "image/jpeg", 1.0); // 100% quality
          
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${file.name}`));
      };

      loadImageFromFile(file, img);
    });
  }

  // Modal functionality
  function showModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function hideModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Theme toggle
  function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const icon = themeToggle.querySelector('i');
    
    if (document.body.classList.contains('dark-mode')) {
      icon.className = 'fas fa-sun';
      localStorage.setItem('theme', 'dark');
    } else {
      icon.className = 'fas fa-moon';
      localStorage.setItem('theme', 'light');
    }
  }

  // Load saved theme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggle.querySelector('i').className = 'fas fa-sun';
  }
});
      

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
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
  const processBtn = document.getElementById("process-btn");
  const downloadLink = document.getElementById("download-link");
  const downloadSection = document.getElementById("download-section");
  const helpModal = document.getElementById("help-modal");
  const helpBtn = document.getElementById("help-btn");
  const closeHelp = document.getElementById("close-help");
  const themeToggle = document.getElementById("theme-toggle");

  // App State
  let watermarkImage = new Image();
  watermarkImage.src = watermarkPreview.src;
  const files = [];
  let currentPreviewIndex = 0;

  // Initialize app
  init();

  function init() {
    setupEventListeners();
    updateSliderValues();
    updateSteps();
  }

  // Event Listeners
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
    positionSelect.addEventListener("change", updatePreview);
    sizeSlider.addEventListener("input", updatePreview);
    opacitySlider.addEventListener("input", updatePreview);

    // Process
    processBtn.addEventListener("click", processImages);

    // Modal
    helpBtn.addEventListener("click", () => showModal(helpModal));
    closeHelp.addEventListener("click", () => hideModal(helpModal));
    helpModal.addEventListener("click", (e) => {
      if (e.target === helpModal) hideModal(helpModal);
    });

    // Theme toggle
    themeToggle.addEventListener("click", toggleTheme);

    // Escape key to close modal
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideModal(helpModal);
    });
  }

  // File handling
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

  function handleFiles(selectedFiles) {
    for (const file of selectedFiles) {
      if (file.type.match("image.*") || file.name.endsWith(".heic")) {
        files.push(file);
        addFileToList(file);
      }
    }
    updateFileCount();
    updateProcessButton();
    updateSteps();
    updatePreview();
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
      updatePreview();
    }
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
        updatePreview();
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
  function updatePreview() {
    if (files.length === 0) {
      previewCanvas.style.display = 'none';
      previewPlaceholder.style.display = 'block';
      return;
    }

    previewPlaceholder.style.display = 'none';
    previewCanvas.style.display = 'block';

    const file = files[currentPreviewIndex];
    const img = new Image();
    
    img.onload = () => {
      const canvas = previewCanvas;
      const ctx = canvas.getContext("2d");
      
      // Set canvas size
      const maxWidth = 600;
      const maxHeight = 400;
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
      
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      // Draw image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw watermark
      const watermarkWidth = (canvas.width * sizeSlider.value) / 100;
      const watermarkHeight = (watermarkImage.height * watermarkWidth) / watermarkImage.width;
      let x = 10, y = 10;

      switch (positionSelect.value) {
        case "top-right":
          x = canvas.width - watermarkWidth - 10;
          y = 10;
          break;
        case "center":
          x = (canvas.width - watermarkWidth) / 2;
          y = (canvas.height - watermarkHeight) / 2;
          break;
        case "bottom-left":
          x = 10;
          y = canvas.height - watermarkHeight - 10;
          break;
        case "bottom-right":
          x = canvas.width - watermarkWidth - 10;
          y = canvas.height - watermarkHeight - 10;
          break;
      }

      ctx.globalAlpha = opacitySlider.value / 100;
      ctx.drawImage(watermarkImage, x, y, watermarkWidth, watermarkHeight);
      ctx.globalAlpha = 1;
    };

    if (file.name.endsWith(".heic")) {
      if (typeof heic2any !== 'undefined') {
        heic2any({ blob: file }).then((converted) => {
          img.src = URL.createObjectURL(converted);
        });
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
      const processPromises = files.map((file, index) => 
        processIndividualImage(file, index, zip)
      );

      await Promise.all(processPromises);

      // Generate and download ZIP
      const content = await zip.generateAsync({ type: "blob" });
      downloadLink.href = URL.createObjectURL(content);
      downloadLink.download = "watermarked-images.zip";
      downloadSection.style.display = 'block';

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
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Draw watermark
        const watermarkWidth = (img.width * sizeSlider.value) / 100;
        const watermarkHeight = (watermarkImage.height * watermarkWidth) / watermarkImage.width;
        let x = 10, y = 10;

        switch (positionSelect.value) {
          case "top-right":
            x = img.width - watermarkWidth - 10;
            y = 10;
            break;
          case "center":
            x = (img.width - watermarkWidth) / 2;
            y = (img.height - watermarkHeight) / 2;
            break;
          case "bottom-left":
            x = 10;
            y = img.height - watermarkHeight - 10;
            break;
          case "bottom-right":
            x = img.width - watermarkWidth - 10;
            y = img.height - watermarkHeight - 10;
            break;
        }

        ctx.globalAlpha = opacitySlider.value / 100;
        ctx.drawImage(watermarkImage, x, y, watermarkWidth, watermarkHeight);
        ctx.globalAlpha = 1;
        
        canvas.toBlob((blob) => {
          const filename = `watermarked-${index + 1}-${file.name}`;
          zip.file(filename, blob);
          resolve();
        }, "image/jpeg", 0.9);
      };

      if (file.name.endsWith(".heic")) {
        if (typeof heic2any !== 'undefined') {
          heic2any({ blob: file }).then((converted) => {
            img.src = URL.createObjectURL(converted);
          });
        }
      } else {
        img.src = URL.createObjectURL(file);
      }
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

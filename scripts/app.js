/**
 * Watermark-It - Fort Lowell Realty Property Image Watermarking Tool
 * Enhanced with proper canvas clearing and live preview updates
 * AD 2025-2026
 */

// =========================================
// GLOBAL VARIABLES
// =========================================

// Configuration
const CONFIG = {
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
    maxFileSize: 100 * 1024 * 1024, // 100MB
    previewWidth: 1200,
    previewHeight: 800,
    quality: 0.92,
    watermarkMaxWidth: 200
};

// State Management
let state = {
    uploadedFiles: [],
    processedPreviews: [],
    currentPreviewIndex: 0,
    selectedWatermark: null,
    watermarkList: [],
    customWatermark: null,
    isProcessing: false,
    isDarkMode: false,
    previewGenerated: false
};

// DOM Elements Cache
let $ = (selector) => document.querySelector(selector);
let $$ = (selector) => document.querySelectorAll(selector);

// =========================================
// INITIALIZATION
// =========================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    loadWatermarks();
    setupEventListeners();
    checkTheme();
    console.log('Watermark-It initialized successfully');
});

function initializeApp() {
    // Preload sample images for demo if no images are uploaded
    preloadSampleImages();
    
    // Initialize UI state
    updateFileCount();
    updateProcessCount();
    
    // Setup drag and drop for the entire body
    document.body.addEventListener('dragover', handleDragOver);
    document.body.addEventListener('dragleave', handleDragLeave);
    document.body.addEventListener('drop', handleDrop);
    
    // Close modals on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeFullscreen();
            closeHelpModal();
        }
    });
    
    // Close modals on overlay click
    document.querySelectorAll('.modal, .fullscreen-modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeFullscreen();
                closeHelpModal();
            }
        });
    });
    
    console.log('App initialized');
}

function preloadSampleImages() {
    // Create sample image data for demo purposes
    const sampleImages = [
        {
            name: 'sample-property-1.jpg',
            url: generateSampleImage(800, 600, '#4a5568', '#2d3748', 'Property Photo 1')
        },
        {
            name: 'sample-property-2.jpg',
            url: generateSampleImage(800, 600, '#2d3748', '#1a202c', 'Property Photo 2')
        },
        {
            name: 'sample-property-3.jpg',
            url: generateSampleImage(800, 600, '#553c9a', '#44337a', 'Property Photo 3')
        }
    ];
    
    // Store for demo
    window.demoImages = sampleImages;
}

function generateSampleImage(width, height, bgColor, textColor, text) {
    // Create a canvas and return data URL for demo
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    // Add some pattern
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;
    for (let i = 0; i < width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
    }
    for (let i = 0; i < height; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
    }
    
    // Text
    ctx.fillStyle = textColor;
    ctx.font = 'bold 48px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);
    
    return canvas.toDataURL('image/jpeg', 0.8);
}

// =========================================
// WATERMARK LOADING
// =========================================

async function loadWatermarks() {
    try {
        const response = await fetch('assets/watermarks.json');
        if (!response.ok) throw new Error('Failed to load watermarks');
        
        const data = await response.json();
        state.watermarkList = data.watermarks || [];
        populateWatermarkDropdown();
        
        if (state.watermarkList.length > 0) {
            selectWatermark(state.watermarkList[0].file);
        }
        
    } catch (error) {
        console.warn('Could not load watermarks from JSON, trying directory scan:', error);
        loadWatermarksFromDirectory();
    }
}

async function loadWatermarksFromDirectory() {
    const defaultWatermarks = [
        { name: 'Rounded (White)', file: 'assets/watermark-rounded-white.png', default: true },
        { name: 'Rounded (Black)', file: 'assets/watermark-rounded-black.png' },
        { name: 'Square (White)', file: 'assets/watermark-square-white.png' },
        { name: 'Square (Black)', file: 'assets/watermark-square-black.png' },
        { name: 'Horizontal (White)', file: 'assets/watermark-horizontal-white.png' },
        { name: 'Horizontal (Black)', file: 'assets/watermark-horizontal-black.png' }
    ];
    
    state.watermarkList = defaultWatermarks;
    populateWatermarkDropdown();
    
    if (state.watermarkList.length > 0) {
        selectWatermark(state.watermarkList[0].file);
    }
}

function populateWatermarkDropdown() {
    const select = $('#watermark-select');
    if (!select) return;
    
    select.innerHTML = '';
    
    state.watermarkList.forEach((wm, index) => {
        const option = document.createElement('option');
        option.value = wm.file;
        option.textContent = wm.name;
        if (wm.default) option.selected = true;
        select.appendChild(option);
    });
}

function selectWatermark(url) {
    const preview = $('#watermark-preview');
    const placeholder = $('#watermark-placeholder');
    
    if (!preview || !placeholder) return;
    
    // Clear previous state
    state.selectedWatermark = null;
    
    // Create new image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
        state.selectedWatermark = img;
        preview.src = url;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
        
        // Regenerate preview if we have uploaded images
        if (state.uploadedFiles.length > 0 && state.previewGenerated) {
            // Debounce preview regeneration
            clearTimeout(window.previewTimeout);
            window.previewTimeout = setTimeout(() => {
                generatePreview();
            }, 100);
        }
    };
    
    img.onerror = () => {
        console.warn(`Failed to load watermark: ${url}`);
        showToast('warning', 'Watermark Error', `Could not load watermark from: ${url}`);
    };
    
    img.src = url;
}

// =========================================
// EVENT LISTENERS
// =========================================

function setupEventListeners() {
    // File input
    const fileInput = $('#file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    // Drop zone
    const dropZone = $('#drop-zone');
    if (dropZone) {
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleDrop);
    }
    
    // Upload tabs
    $$('.upload-method-btn').forEach(btn => {
        btn.addEventListener('click', () => switchUploadMethod(btn.dataset.method));
    });
    
    // URL input
    $('#add-url-btn')?.addEventListener('click', handleUrlAdd);
    $('#image-url-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) handleUrlAdd();
    });
    
    // Watermark select
    $('#watermark-select')?.addEventListener('change', (e) => {
        if (e.target.value) selectWatermark(e.target.value);
    });
    
    // Settings sliders with live preview
    $('#opacity-slider')?.addEventListener('input', (e) => {
        $('#opacity-value').textContent = `${e.target.value}%`;
        updatePreviewLive();
    });
    
    $('#size-slider')?.addEventListener('input', (e) => {
        $('#size-value').textContent = `${e.target.value}%`;
        updatePreviewLive();
    });
    
    // Position select with live preview
    $('#position-select')?.addEventListener('change', updatePreviewLive);
    
    // Preview button
    $('#generate-preview')?.addEventListener('click', generatePreview);
    
    // Navigation buttons
    $('#prev-image')?.addEventListener('click', () => navigatePreview(-1));
    $('#next-image')?.addEventListener('click', () => navigatePreview(1));
    
    // Fullscreen buttons
    $('#enlarge-preview')?.addEventListener('click', openFullscreen);
    $('#fullscreen-close')?.addEventListener('click', closeFullscreen);
    $('#fullscreen-prev')?.addEventListener('click', () => navigateFullscreen(-1));
    $('#fullscreen-next')?.addEventListener('click', () => navigateFullscreen(1));
    
    // Process button
    $('#process-btn')?.addEventListener('click', processAllImages);
    
    // Advanced toggle
    $('#advanced-toggle')?.addEventListener('click', toggleAdvancedSection);
    
    // Custom watermark upload
    $('#change-watermark')?.addEventListener('click', () => {
        $('#watermark-upload')?.click();
    });
    
    $('#watermark-upload')?.addEventListener('change', handleCustomWatermarkUpload);
    
    // Help modal
    $('#help-btn')?.addEventListener('click', openHelpModal);
    $('#close-help')?.addEventListener('click', closeHelpModal);
    
    // Theme toggle
    $('#theme-toggle')?.addEventListener('click', toggleTheme);
    
    // Keyboard navigation for preview
    document.addEventListener('keydown', handlePreviewKeyboard);
}

// =========================================
// FILE HANDLING
// =========================================

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget?.classList.add('hover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget?.classList.remove('hover');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget?.classList.remove('hover');
    
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    processFiles(files);
    e.target.value = ''; // Reset input
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
    
    // Show processing overlay for HEIC/ZIP operations
    const needsProcessing = validFiles.some(f => 
        f.name.toLowerCase().endsWith('.heic') || f.name.toLowerCase().endsWith('.zip')
    );
    
    if (needsProcessing) {
        $('#processing-overlay').style.display = 'flex';
    }
    
    try {
        for (const file of validFiles) {
            if (file.name.toLowerCase().endsWith('.zip')) {
                await handleZipFile(file);
            } else if (file.name.toLowerCase().endsWith('.heic')) {
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
    try {
        const zip = await JSZip.loadAsync(file);
        const imageFiles = [];
        
        for (const [path, zipEntry] of Object.entries(zip.files)) {
            if (zipEntry.dir || !isImageFile(path)) continue;
            
            const blob = await zipEntry.async('blob');
            const fileName = path.split('/').pop();
            const file = new File([blob], fileName, { type: getMimeType(fileName) });
            imageFiles.push(file);
        }
        
        for (const imgFile of imageFiles) {
            await handleRegularFile(imgFile, true);
        }
        
        if (imageFiles.length > 0) {
            showToast('success', 'ZIP Extracted', `${imageFiles.length} images extracted from ${file.name}`);
        }
        
    } catch (error) {
        console.error('Error processing ZIP:', error);
        showToast('error', 'ZIP Error', 'Could not extract images from ZIP file');
    }
}

async function handleHeicFile(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const blob = await heic2any({ blob: new Blob([arrayBuffer]), toType: 'image/jpeg', quality: 0.9 });
        
        const jpegFile = new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
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
            
            img.onerror = () => {
                console.error('Failed to load image:', file.name);
                resolve();
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = () => {
            console.error('Failed to read file:', file.name);
            resolve();
        };
        
        reader.readAsDataURL(file);
    });
}

function isImageFile(filename) {
    return /\.(jpg|jpeg|png|webp|gif|bmp|heic|heif)$/i.test(filename);
}

function getMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'heic': 'image/heic',
        'heif': 'image/heif'
    };
    return mimeTypes[ext] || 'image/jpeg';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
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
        
        // Validate URL
        try {
            new URL(cleanUrl);
        } catch {
            console.warn('Invalid URL:', cleanUrl);
            return;
        }
        
        // Fetch and load image
        fetch(cleanUrl)
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch');
                return response.blob();
            })
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
            .catch(error => {
                console.error('Error loading URL:', cleanUrl, error);
                loadedCount++;
            });
    });
}

function switchUploadMethod(method) {
    $$('.upload-method-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.method === method);
    });
    
    $('#files-upload').style.display = method === 'files' ? 'block' : 'none';
    $('#url-upload').style.display = method === 'url' ? 'block' : 'none';
}

// =========================================
// UI UPDATES
// =========================================

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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function removeFile(fileName) {
    state.uploadedFiles = state.uploadedFiles.filter(f => f.name !== fileName);
    
    const fileList = $('#file-list');
    if (fileList) {
        const items = fileList.querySelectorAll('.file-item');
        items.forEach(item => {
            if (item.querySelector('.file-name').textContent.includes(fileName)) {
                item.remove();
            }
        });
    }
    
    updateFileCount();
    updateProcessCount();
    
    if (state.uploadedFiles.length === 0) {
        resetPreview();
    }
}

function updateFileCount() {
    const count = state.uploadedFiles.length;
    $('#file-count').textContent = count;
    
    const processBtn = $('#process-btn');
    if (processBtn) {
        processBtn.disabled = count === 0;
    }
}

function updateProcessCount() {
    const count = state.uploadedFiles.length;
    $('#process-count').textContent = count;
    
    // Enable/disable process button
    const processBtn = $('#process-btn');
    if (processBtn) {
        processBtn.disabled = count === 0;
    }
}

function updateSteps() {
    const steps = $$('.step');
    let activeStep = 0;
    
    if (state.uploadedFiles.length > 0) activeStep = 1;
    if (state.selectedWatermark) activeStep = Math.max(activeStep, 2);
    if (state.previewGenerated) activeStep = Math.max(activeStep, 4);
    
    steps.forEach((step, index) => {
        step.classList.toggle('active', index < activeStep);
    });
}

// =========================================
// PREVIEW GENERATION
// =========================================

// KEY FIX: Live preview update function that clears canvas properly
function updatePreviewLive() {
    // Only update if we have generated a preview and have uploaded files
    if (!state.previewGenerated || state.uploadedFiles.length === 0) return;
    
    // Debounce to avoid excessive redraws
    clearTimeout(window.livePreviewTimeout);
    window.livePreviewTimeout = setTimeout(() => {
        generatePreview();
    }, 50);
}

async function generatePreview() {
    if (state.uploadedFiles.length === 0) {
        showToast('warning', 'No Images', 'Please upload images first');
        return;
    }
    
    const canvas = $('#preview-canvas');
    const placeholder = $('#preview-placeholder');
    const loading = $('#preview-loading');
    const previewInfo = $('#preview-info');
    const enlargeBtn = $('#enlarge-preview');
    
    if (!canvas || !placeholder) return;
    
    // Show loading state
    placeholder.style.display = 'none';
    if (loading) loading.style.display = 'flex';
    
    try {
        // Reset processed previews
        state.processedPreviews = [];
        state.currentPreviewIndex = 0;
        
        // Process all images
        await processPreviewsSequentially();
        
        // Display first preview
        displayPreviewImage();
        
        // Update UI
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

async function processPreviewsSequentially() {
    for (let i = 0; i < state.uploadedFiles.length; i++) {
        const fileData = state.uploadedFiles[i];
        
        await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                // Create canvas for this preview
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate dimensions (max 1200px width while maintaining aspect ratio)
                const maxWidth = CONFIG.previewWidth;
                const scale = Math.min(1, maxWidth / img.width);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                
                // KEY FIX: Clear the canvas before drawing - this prevents layering
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Draw the base image
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Draw watermark if selected
                if (state.selectedWatermark) {
                    drawWatermarkOnCanvas(ctx, canvas);
                }
                
                // Store the result
                state.processedPreviews.push({
                    canvas: canvas,
                    name: fileData.name,
                    index: i
                });
                
                resolve();
            };
            
            img.onerror = () => {
                console.error('Failed to load image:', fileData.name);
                resolve();
            };
            
            img.src = fileData.url;
        });
    }
}

function drawWatermarkOnCanvas(ctx, canvas) {
    const watermark = state.selectedWatermark;
    if (!watermark) return;
    
    // Get the position value and normalize it (handle hyphens, underscores, spaces)
    const positionSelect = $('#position-select');
    let position = positionSelect?.value || 'center';
    
    // Normalize the position value to match our switch cases
    position = position.toLowerCase().replace(/[-_\s]/g, '-');
    
    const opacity = parseInt($('#opacity-slider')?.value || 75) / 100;
    const size = parseInt($('#size-slider')?.value || 50) / 100;
    
    // Calculate watermark dimensions
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
    
    // Calculate position
    const { x, y } = getWatermarkPosition(canvas, wmWidth, wmHeight, position);
    
    // Apply opacity and draw
    ctx.globalAlpha = opacity;
    ctx.drawImage(watermark, x, y, wmWidth, wmHeight);
    ctx.globalAlpha = 1.0; // Reset to default
}

function getWatermarkPosition(canvas, wmWidth, wmHeight, position) {
    const padding = 20;
    let x, y;
    
    switch (position) {
        case 'top-left':
            x = padding;
            y = padding;
            break;
            
        case 'top-right':
            x = canvas.width - wmWidth - padding;
            y = padding;
            break;
            
        case 'bottom-left':
            x = padding;
            y = canvas.height - wmHeight - padding;
            break;
            
        case 'bottom-right':
            x = canvas.width - wmWidth - padding;
            y = canvas.height - wmHeight - padding;
            break;
            
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
    const previewInfo = $('#preview-info');
    const fileName = $('#preview-file-name');
    const counter = $('#preview-counter');
    
    if (!canvas || state.processedPreviews.length === 0) return;
    
    const currentPreview = state.processedPreviews[state.currentPreviewIndex];
    
    // Clear the canvas and draw the current preview
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(currentPreview.canvas, 0, 0);
    
    // Update canvas size to match preview
    canvas.width = currentPreview.canvas.width;
    canvas.height = currentPreview.canvas.height;
    
    // Re-draw after resize
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(currentPreview.canvas, 0, 0);
    
    // Update info
    if (fileName) fileName.textContent = currentPreview.name;
    if (counter) counter.textContent = `${state.currentPreviewIndex + 1} / ${state.processedPreviews.length}`;
    
    // Update navigation buttons
    updatePreviewNavigation();
    
    // Update fullscreen info
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
    
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
    }
    
    if (placeholder) placeholder.style.display = 'flex';
    if (loading) loading.style.display = 'none';
    if (previewInfo) previewInfo.style.display = 'none';
    if (enlargeBtn) enlargeBtn.style.display = 'none';
    
    state.processedPreviews = [];
    state.currentPreviewIndex = 0;
    state.previewGenerated = false;
    updateSteps();
}

// =========================================
// FULLSCREEN PREVIEW
// =========================================

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
    
    // Copy to fullscreen canvas
    canvas.width = currentPreview.canvas.width;
    canvas.height = currentPreview.canvas.height;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(currentPreview.canvas, 0, 0);
    
    // Fit to container
    fitCanvasToContainer(canvas);
    updateFullscreenInfo();
}

function fitCanvasToContainer(canvas) {
    const container = $('#fullscreen-modal .fullscreen-content');
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const padding = 40;
    
    const maxWidth = containerRect.width - padding * 2;
    const maxHeight = containerRect.height - padding * 2 - 60; // Account for info bar
    
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
        case 'ArrowLeft':
            navigateFullscreen(-1);
            break;
        case 'ArrowRight':
            navigateFullscreen(1);
            break;
        case 'Escape':
            closeFullscreen();
            break;
    }
}

// =========================================
// IMAGE PROCESSING & DOWNLOAD
// =========================================

async function processAllImages() {
    if (state.uploadedFiles.length === 0) {
        showToast('warning', 'No Images', 'Please upload images first');
        return;
    }
    
    // Generate preview first if not done
    if (!state.previewGenerated) {
        await generatePreview();
    }
    
    const processBtn = $('#process-btn');
    const btnText = processBtn?.querySelector('.btn-text');
    const btnLoader = processBtn?.querySelector('.btn-loader');
    const downloadSection = $('#download-section');
    const downloadLink = $('#download-link');
    
    if (!processBtn) return;
    
    // Show processing state
    state.isProcessing = true;
    processBtn.disabled = true;
    if (btnText) btnText.style.visibility = 'hidden';
    if (btnLoader) btnLoader.style.display = 'flex';
    if (downloadSection) downloadSection.style.display = 'none';
    
    try {
        const zip = new JSZip();
        
        // Process each image
        for (let i = 0; i < state.uploadedFiles.length; i++) {
            const fileData = state.uploadedFiles[i];
            const preview = state.processedPreviews[i];
            
            // Create final canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            await new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                img.onload = () => {
                    // Use original image dimensions for full quality
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // Clear and draw
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    
                    // Apply watermark if available
                    if (state.selectedWatermark) {
                        drawWatermarkFullSize(ctx, canvas);
                    }
                    
                    // Convert to blob
                    canvas.toBlob((blob) => {
                        // Generate filename
                        const originalName = fileData.name.replace(/\.[^/.]+$/, '');
                        const newName = `${originalName}-watermarked.jpg`;
                        
                        zip.file(newName, blob);
                        resolve();
                    }, 'image/jpeg', CONFIG.quality);
                };
                
                img.onerror = () => {
                    console.error('Failed to process:', fileData.name);
                    resolve();
                };
                
                img.src = fileData.url;
            });
        }
        
        // Generate ZIP
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });
        
        // Create download
        const url = URL.createObjectURL(zipBlob);
        if (downloadLink) {
            downloadLink.href = url;
            downloadLink.download = `watermarked-images-${Date.now()}.zip`;
        }
        
        // Show download section
        if (downloadSection) downloadSection.style.display = 'block';
        
        showToast('success', 'Processing Complete', `${state.uploadedFiles.length} images processed successfully`);
        
    } catch (error) {
        console.error('Processing error:', error);
        showToast('error', 'Processing Error', 'Failed to process images');
    } finally {
        // Reset button state
        state.isProcessing = false;
        processBtn.disabled = false;
        if (btnText) btnText.style.visibility = 'visible';
        if (btnLoader) btnLoader.style.display = 'none';
    }
}

function drawWatermarkFullSize(ctx, canvas) {
    const watermark = state.selectedWatermark;
    if (!watermark) return;
    
    // Get the position value and normalize it
    const positionSelect = $('#position-select');
    let position = positionSelect?.value || 'center';
    
    // Normalize the position value to match our switch cases
    position = position.toLowerCase().replace(/[-_\s]/g, '-');
    
    const opacity = parseInt($('#opacity-slider')?.value || 75) / 100;
    const size = parseInt($('#size-slider')?.value || 50) / 100;
    
    let wmWidth, wmHeight;
    if (aspectRatio > 1) {
        wmWidth = maxSize;
        wmHeight = maxSize / aspectRatio;
    } else {
        wmHeight = maxSize;
        wmWidth = maxSize * aspectRatio;
    }
    
    // Calculate position
    const { x, y } = getWatermarkPosition(canvas, wmWidth, wmHeight, position);
    
    // Apply and draw
    ctx.globalAlpha = opacity;
    ctx.drawImage(watermark, x, y, wmWidth, wmHeight);
    ctx.globalAlpha = 1.0;
}

// =========================================
// ADVANCED OPTIONS
// =========================================

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
            
            // Regenerate preview if we have uploaded images
            if (state.uploadedFiles.length > 0 && state.previewGenerated) {
                generatePreview();
            }
            
            showToast('success', 'Watermark Uploaded', 'Custom watermark applied successfully');
        };
        
        img.onerror = () => {
            showToast('error', 'Upload Failed', 'Could not load custom watermark');
        };
        
        img.src = event.target.result;
    };
    
    reader.onerror = () => {
        showToast('error', 'Read Error', 'Could not read file');
    };
    
    reader.readAsDataURL(file);
}

// =========================================
// HELP MODAL
// =========================================

function openHelpModal() {
    const modal = $('#help-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeHelpModal() {
    const modal = $('#help-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// =========================================
// THEME TOGGLE
// =========================================

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
            if (icon) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            }
        }
    }
}

// =========================================
// TOAST NOTIFICATIONS
// =========================================

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
        <div class="toast-icon">
            <i class="fas ${icons[type] || icons.info}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${escapeHtml(title)}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Setup close button
    toast.querySelector('.toast-close')?.addEventListener('click', () => {
        removeToast(toast);
    });
    
    // Auto remove
    const timeout = setTimeout(() => removeToast(toast), 5000);
    toast.dataset.timeout = timeout;
    
    // Slide in animation
    requestAnimationFrame(() => {
        toast.style.animation = 'toastSlideIn 0.3s ease-out';
    });
}

function removeToast(toast) {
    if (!toast) return;
    
    clearTimeout(parseInt(toast.dataset.timeout));
    toast.style.animation = 'toastSlideOut 0.3s ease-in forwards';
    
    toast.addEventListener('animationend', () => {
        toast.remove();
    });
}

// =========================================
// UTILITY FUNCTIONS
// =========================================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Make functions globally accessible
window.removeFile = removeFile;
window.openHelpModal = openHelpModal;
window.closeHelpModal = closeHelpModal;
window.toggleTheme = toggleTheme;

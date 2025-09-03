document.addEventListener("DOMContentLoaded", () => {
  // -----------------------------------------------------------------
  // DOM Elements
  // -----------------------------------------------------------------
  const fileInput = document.getElementById("file-input");
  const dropZone = document.getElementById("upload-container");
  const fileList = document.getElementById("file-list");
  const watermarkUpload = document.getElementById("watermark-upload");
  const watermarkPreview = document.getElementById("watermark-preview");
  const positionSelect = document.getElementById("position-select");
  const opacitySlider = document.getElementById("opacity-slider");
  const sizeSlider = document.getElementById("size-slider");
  const previewCanvas = document.getElementById("preview-canvas");
  const prevImageBtn = document.getElementById("prev-btn");
  const nextImageBtn = document.getElementById("next-btn");
  const processBtn = document.getElementById("process-btn");
  const downloadLink = document.getElementById("download-link");
  const downloadSection = document.getElementById("download-section");

  // -----------------------------------------------------------------
  // App State
  // -----------------------------------------------------------------
  let uploadedFiles = [];
  let currentFileIndex = 0;
  let watermarkImage = new Image();
  watermarkImage.src = "assets/logo-watermark.png"; // Default watermark

  // -----------------------------------------------------------------
  // Dark Mode Detection and Toggling
  // -----------------------------------------------------------------
  const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)");
  if (prefersDarkMode.matches) {
    document.documentElement.classList.add("dark");
  }

  prefersDarkMode.addEventListener("change", (e) => {
    document.documentElement.classList.toggle("dark", e.matches);
  });

  document.getElementById("theme-toggle").addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
  });

  // -----------------------------------------------------------------
  // File Handling
  // -----------------------------------------------------------------
  fileInput.addEventListener("change", (e) => handleFiles(e.target.files));
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("hover");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("hover"));
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("hover");
    handleFiles(e.dataTransfer.files);
  });

  async function handleFiles(selectedFiles) {
    for (const file of selectedFiles) {
      if (file.name.endsWith(".zip")) {
        await handleZipFile(file);
      } else if (file.type.startsWith("image/") || file.name.endsWith(".heic")) {
        uploadedFiles.push(file);
      }
    }
    updateFileList();
    updatePreview();
  }

  async function handleZipFile(file) {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);
    for (const filename in zipContent.files) {
      const zipFile = zipContent.files[filename];
      if (!zipFile.dir && isImageFile(filename)) {
        const blob = await zipFile.async("blob");
        const imageFile = new File([blob], filename, { type: getImageMimeType(filename) });
        uploadedFiles.push(imageFile);
      }
    }
  }

  function isImageFile(filename) {
    const validExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".heic"];
    return validExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
  }

  function getImageMimeType(filename) {
    const ext = filename.split(".").pop().toLowerCase();
    const mimeTypes = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      bmp: "image/bmp",
      webp: "image/webp",
      heic: "image/heic",
    };
    return mimeTypes[ext] || "application/octet-stream";
  }

  function updateFileList() {
    fileList.innerHTML = uploadedFiles
      .map(
        (file, index) => `
      <div class="file-item">
        <span>${file.name}</span>
        <button class="remove-btn" data-index="${index}">Remove</button>
      </div>
    `
      )
      .join("");

    document.querySelectorAll(".remove-btn").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.target.dataset.index, 10);
        uploadedFiles.splice(index, 1);
        updateFileList();
        updatePreview();
      })
    );

    processBtn.disabled = uploadedFiles.length === 0;
  }

  // -----------------------------------------------------------------
  // Watermark Handling
  // -----------------------------------------------------------------
  document.getElementById("change-watermark").addEventListener("click", () => {
    watermarkUpload.click();
  });

  watermarkUpload.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        watermarkImage.src = reader.result;
        watermarkPreview.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // -----------------------------------------------------------------
  // Image Preview
  // -----------------------------------------------------------------
  function updatePreview() {
    if (uploadedFiles.length === 0) {
      previewCanvas.style.display = "none";
      return;
    }

    const file = uploadedFiles[currentFileIndex];
    const img = new Image();
    img.onload = () => {
      const ctx = previewCanvas.getContext("2d");
      previewCanvas.width = img.width;
      previewCanvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      applyWatermark(ctx, img.width, img.height);
    };

    if (file.name.endsWith(".heic")) {
      heic2any({ blob: file }).then((converted) => {
        img.src = URL.createObjectURL(converted);
      });
    } else {
      img.src = URL.createObjectURL(file);
    }
  }

  function applyWatermark(ctx, imgWidth, imgHeight) {
    const watermarkWidth = (imgWidth * sizeSlider.value) / 100;
    const watermarkHeight = (watermarkImage.height * watermarkWidth) / watermarkImage.width;
    const margin = 20;

    let x, y;
    switch (positionSelect.value) {
      case "top-left":
        x = margin;
        y = margin;
        break;
      case "top-right":
        x = imgWidth - watermarkWidth - margin;
        y = margin;
        break;
      case "center":
        x = (imgWidth - watermarkWidth) / 2;
        y = (imgHeight - watermarkHeight) / 2;
        break;
      case "bottom-left":
        x = margin;
        y = imgHeight - watermarkHeight - margin;
        break;
      case "bottom-right":
      default:
        x = imgWidth - watermarkWidth - margin;
        y = imgHeight - watermarkHeight - margin;
        break;
    }

    ctx.globalAlpha = opacitySlider.value / 100;
    ctx.drawImage(watermarkImage, x, y, watermarkWidth, watermarkHeight);
    ctx.globalAlpha = 1;
  }

  // -----------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------
  prevImageBtn.addEventListener("click", () => {
    if (currentFileIndex > 0) {
      currentFileIndex--;
      updatePreview();
    }
  });

  nextImageBtn.addEventListener("click", () => {
    if (currentFileIndex < uploadedFiles.length - 1) {
      currentFileIndex++;
      updatePreview();
    }
  });

  // -----------------------------------------------------------------
  // Processing and Download
  // -----------------------------------------------------------------
  processBtn.addEventListener("click", () => {
    const zip = new JSZip();
    uploadedFiles.forEach((file, index) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Draw image and watermark
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        applyWatermark(ctx, img.width, img.height);

        canvas.toBlob((blob) => {
          zip.file(`image_${index + 1}.jpg`, blob);
          if (index === uploadedFiles.length - 1) {
            zip.generateAsync({ type: "blob" }).then((content) => {
              const url = URL.createObjectURL(content);
              downloadLink.href = url;
              downloadLink.download = "watermarked_images.zip";
              downloadSection.style.display = "block";
            });
          }
        }, "image/jpeg");
      };

      img.src = URL.createObjectURL(file);
    });
  });
});

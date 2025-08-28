document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("file-input");
  const watermarkInput = document.getElementById("watermark-input");
  const watermarkImage = document.getElementById("watermark-image");
  const processButton = document.getElementById("process-photos");
  const downloadLink = document.getElementById("download-link");
  const downloadSection = document.getElementById("download-section");

  let watermark = watermarkImage.src;

  // Allow user to change watermark
  document.getElementById("change-watermark").addEventListener("click", () => {
    watermarkInput.click();
  });

  watermarkInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        watermark = reader.result;
        watermarkImage.src = watermark;
      };
      reader.readAsDataURL(file);
    }
  });

  // Enable process button when files are uploaded
  fileInput.addEventListener("change", () => {
    processButton.disabled = fileInput.files.length === 0;
  });

  // Process photos
  processButton.addEventListener("click", async () => {
    const files = fileInput.files;
    const zip = new JSZip();

    for (let file of files) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);

      // Wait for the image to load
      await new Promise((resolve) => (img.onload = resolve));

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Apply watermark
      const wmImg = new Image();
      wmImg.src = watermark;

      await new Promise((resolve) => (wmImg.onload = resolve));
      const wmWidth = img.width * 0.3;
      const wmHeight = wmImg.height * (wmWidth / wmImg.width);

      ctx.globalAlpha = 0.5; // Watermark transparency
      ctx.drawImage(wmImg, img.width - wmWidth - 20, img.height - wmHeight - 20, wmWidth, wmHeight);

      // Add to ZIP
      const dataUrl = canvas.toDataURL("image/jpeg");
      zip.file(file.name, dataUrl.split(",")[1], { base64: true });
    }

    // Generate ZIP
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const zipUrl = URL.createObjectURL(zipBlob);
    downloadLink.href = zipUrl;
    downloadLink.download = "watermarked-photos.zip";
    downloadSection.hidden = false;
  });
});

/**
 * File Upload and Validation Handler (upload.js)
 * Manages dragging, clicking, parsing, validating, and displaying the initial image.
 */

// Global state holding reference to the loaded file and its structural dimensions
let currentFile = null;
let currentImageDimensions = { width: 0, height: 0 };
let currentImageSrc = '';

document.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.getElementById('upload-dropzone');
  const fileInput = document.getElementById('file-input');
  const btnChangeImage = document.getElementById('btn-change-image');

  if (!dropzone || !fileInput) return;

  // Click on dropzone to trigger standard file dialogue
  dropzone.addEventListener('click', () => {
    fileInput.click();
  });

  // Handle file selection from dialogue
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleUploadedFile(e.target.files[0]);
    }
  });

  // Drag and Drop event overrides
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleUploadedFile(files[0]);
    }
  });

  // Switch/Reset image action button
  if (btnChangeImage) {
    btnChangeImage.addEventListener('click', () => {
      resetConverterState();
    });
  }
});

/**
 * Validates, reads, and processes the loaded file.
 * @param {File} file - Raw File object
 */
function handleUploadedFile(file) {
  // 1. File Type Verification
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/bmp', 'image/gif', 'image/tiff'];
  if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|bmp|gif|tiff)$/i)) {
    window.uiController.showToast('Unsupported file type. Please upload a standard image file.', 'error');
    return;
  }

  // 2. File Size Verification (Max 25MB)
  const maxSizeInBytes = 25 * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    window.uiController.showToast('File is too large. Max permitted size is 25MB.', 'error');
    return;
  }

  // Update Global File state
  currentFile = file;

  // Read file as Data URL to show live visual preview
  const reader = new FileReader();
  reader.onload = (event) => {
    currentImageSrc = event.target.result;
    
    // Create an image object in memory to calculate original dimension parameters
    const img = new Image();
    img.onload = () => {
      currentImageDimensions = {
        width: img.width,
        height: img.height
      };

      // Populate layout fields and dimensions inputs
      setupWorkspaceWithImage(file, currentImageSrc);
    };
    img.onerror = () => {
      window.uiController.showToast('Failed to load image preview.', 'error');
    };
    img.src = currentImageSrc;
  };
  reader.readAsDataURL(file);
}

/**
 * Configure UI when file is successfully loaded.
 * @param {File} file - Raw File object
 * @param {string} src - Image Data URL
 */
function setupWorkspaceWithImage(file, src) {
  const dropzone = document.getElementById('upload-dropzone');
  const layout = document.getElementById('converter-layout');
  const previewImg = document.getElementById('image-preview');
  const previewEmpty = document.getElementById('preview-empty');

  // Input fields for width and height inside the settings card
  const inputWidth = document.getElementById('resize-width');
  const inputHeight = document.getElementById('resize-height');

  if (dropzone) dropzone.style.display = 'none';
  if (layout) layout.style.display = 'grid';

  if (previewImg) {
    previewImg.src = src;
    previewImg.style.display = 'block';
  }
  if (previewEmpty) previewEmpty.style.display = 'none';

  // Format Size representation to KB/MB
  const sizeText = formatFileSize(file.size);
  const resolutionText = `${currentImageDimensions.width} x ${currentImageDimensions.height} px`;

  // Update Preview panel metadata bar
  window.uiController.updateImageMeta(file.name, sizeText, resolutionText);

  // Set default placeholder inputs inside settings card
  if (inputWidth) {
    inputWidth.placeholder = currentImageDimensions.width;
    inputWidth.value = ''; // Empty defaults to original size
  }
  if (inputHeight) {
    inputHeight.placeholder = currentImageDimensions.height;
    inputHeight.value = ''; // Empty defaults to original size
  }

  // Reset progress and download panel
  window.uiController.hideProgress();
  window.uiController.hideDownloadPanel();

  window.uiController.showToast('Image successfully uploaded & parsed.', 'success');
}

/**
 * Formats a raw byte count into human-friendly metrics.
 * @param {number} bytes - Number of bytes
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Clear the current file selection and return workspace to upload zone state.
 */
function resetConverterState() {
  currentFile = null;
  currentImageDimensions = { width: 0, height: 0 };
  currentImageSrc = '';

  const fileInput = document.getElementById('file-input');
  if (fileInput) fileInput.value = '';

  const dropzone = document.getElementById('upload-dropzone');
  const layout = document.getElementById('converter-layout');
  const previewImg = document.getElementById('image-preview');
  const previewEmpty = document.getElementById('preview-empty');

  if (dropzone) dropzone.style.display = 'flex';
  if (layout) layout.style.display = 'none';
  if (previewImg) {
    previewImg.src = '';
    previewImg.style.display = 'none';
  }
  if (previewEmpty) previewEmpty.style.display = 'block';

  window.uiController.hideProgress();
  window.uiController.hideDownloadPanel();
}

// Expose variables and functions to window scope
window.uploadManager = {
  getFile: () => currentFile,
  getDimensions: () => currentImageDimensions,
  getImageSrc: () => currentImageSrc,
  formatFileSize,
  reset: resetConverterState
};

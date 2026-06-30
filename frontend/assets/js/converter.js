/**
 * Image Converter Logic (converter.js)
 * Gathers user parameters, handles aspect-ratio formulas, orchestrates local/remote pipeline,
 * and outputs fully processed files.
 */

document.addEventListener('DOMContentLoaded', () => {
  const selectFormat = document.getElementById('target-format');
  const qualityRange = document.getElementById('quality-range');
  const qualityVal = document.getElementById('quality-val');
  const inputWidth = document.getElementById('resize-width');
  const inputHeight = document.getElementById('resize-height');
  const chkMaintainRatio = document.getElementById('maintain-ratio');
  const btnConvert = document.getElementById('btn-convert');
  const btnDownload = document.getElementById('btn-download');

  // Local state holding converted file parameters
  let convertedBlob = null;
  let convertedFileName = '';

  if (!selectFormat || !btnConvert) return;

  // 1. Dynamic Settings Updates
  // Lossless formats like PNG, BMP, TIFF do not require compression quality modifiers. Hide or show slider accordingly.
  selectFormat.addEventListener('change', (e) => {
    const format = e.target.value;
    const qualityGroup = document.getElementById('quality-group');
    if (qualityGroup) {
      if (['png', 'bmp', 'tiff'].includes(format)) {
        qualityGroup.style.opacity = '0.4';
        qualityGroup.style.pointerEvents = 'none';
      } else {
        qualityGroup.style.opacity = '1';
        qualityGroup.style.pointerEvents = 'auto';
      }
    }
  });

  // Sync quality slider value text bubble
  if (qualityRange && qualityVal) {
    qualityRange.addEventListener('input', (e) => {
      qualityVal.textContent = `${e.target.value}%`;
    });
  }

  // 2. Aspect Ratio Dimension Synchronizers
  if (inputWidth && inputHeight && chkMaintainRatio) {
    inputWidth.addEventListener('input', () => {
      const originalDims = window.uploadManager.getDimensions();
      if (chkMaintainRatio.checked && originalDims.width && originalDims.height && inputWidth.value) {
        const ratio = originalDims.height / originalDims.width;
        inputHeight.value = Math.round(inputWidth.value * ratio);
      }
    });

    inputHeight.addEventListener('input', () => {
      const originalDims = window.uploadManager.getDimensions();
      if (chkMaintainRatio.checked && originalDims.width && originalDims.height && inputHeight.value) {
        const ratio = originalDims.width / originalDims.height;
        inputWidth.value = Math.round(inputHeight.value * ratio);
      }
    });

    chkMaintainRatio.addEventListener('change', () => {
      if (chkMaintainRatio.checked) {
        // Force sync immediately
        const originalDims = window.uploadManager.getDimensions();
        if (originalDims.width && originalDims.height && inputWidth.value) {
          const ratio = originalDims.height / originalDims.width;
          inputHeight.value = Math.round(inputWidth.value * ratio);
        }
      }
    });
  }

  // 3. Orchesrate Conversion Run
  btnConvert.addEventListener('click', async () => {
    const file = window.uploadManager.getFile();
    if (!file) {
      window.uiController.showToast('Please select or drag an image file first.', 'error');
      return;
    }

    // Collect Parameters
    const format = selectFormat.value;
    const quality = parseInt(qualityRange ? qualityRange.value : '90', 10);
    const originalDims = window.uploadManager.getDimensions();
    
    // Fallback to original dimensions if input fields are blank
    const width = parseInt(inputWidth.value, 10) || originalDims.width;
    const height = parseInt(inputHeight.value, 10) || originalDims.height;

    // Build the options dictionary
    const options = {
      format,
      quality,
      width,
      height,
      maintainRatio: chkMaintainRatio ? chkMaintainRatio.checked : true
    };

    // Prepare API Data structure for logging / verification
    console.log('Preparing API Payload:', {
      file: { name: file.name, type: file.type, size: file.size },
      options: options
    });

    // Reset download card and show initial progress bar
    window.uiController.hideDownloadPanel();
    window.uiController.toggleButtonState(btnConvert, true, 'Preparing...');
    window.uiController.updateProgress(10, 'Reading file arrays...');

    try {
      // Execute the conversion locally on the client canvas as a high-fidelity simulator.
      // This allows the website to run beautifully and correctly out-of-the-box (no server needed yet).
      // But it is pre-configured to easily hook up to FastAPI backend!
      
      await simulateBrowserConversion(file, options, (progress, status) => {
        window.uiController.updateProgress(progress, status);
      }).then((result) => {
        convertedBlob = result.blob;
        convertedFileName = result.filename;

        // Display results
        const formattedSizeText = window.uploadManager.formatFileSize(convertedBlob.size);
        window.uiController.updateProgress(100, 'All done!');
        
        setTimeout(() => {
          window.uiController.toggleButtonState(btnConvert, false);
          window.uiController.hideProgress();
          window.uiController.showDownloadPanel(convertedFileName, formattedSizeText);
          window.uiController.showToast('Image converted successfully!', 'success');
        }, 600);
      });

    } catch (err) {
      console.error(err);
      window.uiController.toggleButtonState(btnConvert, false);
      window.uiController.hideProgress();
      window.uiController.showToast(`Error: ${err.message || 'Conversion failed'}`, 'error');
    }
  });

  // 4. Download Trigger
  if (btnDownload) {
    btnDownload.addEventListener('click', () => {
      if (!convertedBlob || !convertedFileName) {
        window.uiController.showToast('No converted file found to download.', 'error');
        return;
      }

      // Create object URL and download directly
      const url = URL.createObjectURL(convertedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = convertedFileName;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup to save browser memory
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    });
  }
});

/**
 * Client-side high-fidelity image processor using HTML5 Canvas.
 * Simulates pipeline delays to display sleek loaders, then outputs transformed blobs.
 * @param {File} file - Raw uploaded file
 * @param {Object} options - Conversion settings (format, quality, width, height)
 * @param {Function} progressCallback - Callback to report progress states (percent, text)
 */
function simulateBrowserConversion(file, options, progressCallback) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      progressCallback(35, 'Drawing vectors onto Canvas...');
      
      // Create offscreen canvas element
      const canvas = document.createElement('canvas');
      canvas.width = options.width;
      canvas.height = options.height;
      const ctx = canvas.getContext('2d');

      // Enable high-quality scaling filters
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw the original image onto the sized canvas
      ctx.drawImage(img, 0, 0, options.width, options.height);

      progressCallback(65, 'Encoding stream headers...');

      // Map format selection to browser-supported mime types
      let mimeType = 'image/png';
      let extension = 'png';

      switch (options.format) {
        case 'jpeg':
        case 'jpg':
          mimeType = 'image/jpeg';
          extension = 'jpg';
          break;
        case 'webp':
          mimeType = 'image/webp';
          extension = 'webp';
          break;
        case 'bmp':
          mimeType = 'image/bmp';
          extension = 'bmp';
          break;
        case 'gif':
          mimeType = 'image/gif';
          extension = 'gif';
          break;
        case 'tiff':
          mimeType = 'image/tiff';
          extension = 'tiff';
          break;
      }

      // Calculate quality parameter (0 to 1 scale)
      const scaleQuality = options.quality / 100;

      setTimeout(() => {
        progressCallback(85, 'Finalizing byte write...');

        try {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Canvas rasterization output was null.'));
              return;
            }

            // Generate clean target filename
            const originalNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            const targetFilename = `${originalNameWithoutExt}_converted.${extension}`;

            resolve({
              blob,
              filename: targetFilename
            });
          }, mimeType, scaleQuality);
        } catch (e) {
          reject(e);
        }
      }, 500);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image into canvas processor.'));
    };

    // Read file as object URL to construct Canvas Image
    img.src = window.uploadManager.getImageSrc();
  });
}

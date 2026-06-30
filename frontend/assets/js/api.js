/**
 * API Integration Layer (api.js)
 * Prepares API methods for communicating with a future FastAPI backend.
 * Base URL: http://localhost:8000/api
 */

const API_BASE_URL = '/api';

/**
 * Health Check API
 * Verifies if the FastAPI backend service is online.
 */
async function healthCheck() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`Server returned status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('FastAPI backend health check failed:', error.message);
    return { status: 'offline', error: error.message };
  }
}

/**
 * Image Conversion API (Post multipart/form-data)
 * Sends the image file and configuration inputs to the FastAPI converter.
 * @param {File} file - The original uploaded file object
 * @param {Object} options - Conversion configuration options (format, quality, width, height)
 */
async function convertImage(file, options) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('format', options.format || 'png');
  formData.append('quality', options.quality || 90);
  
  if (options.width) {
    formData.append('width', options.width);
  }
  if (options.height) {
    formData.append('height', options.height);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/convert`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
      throw new Error(errorData.detail || `Conversion failed with status: ${response.status}`);
    }

    return await response.json(); // Expected response: { status: 'success', downloadUrl: '...', filename: '...' }
  } catch (error) {
    console.error('FastAPI convertImage error:', error);
    throw error;
  }
}

/**
 * Image Download API
 * Triggers file download from the server.
 * @param {string} fileId - The unique ID or filename returned by convertImage
 */
async function downloadImage(fileId) {
  try {
    const downloadUrl = `${API_BASE_URL}/download/${fileId}`;
    // Constructing a standard download click element
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileId;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (error) {
    console.error('FastAPI downloadImage error:', error);
    throw error;
  }
}

// Exporting to window scope for other vanilla JS modules to consume
window.apiService = {
  healthCheck,
  convertImage,
  downloadImage
};

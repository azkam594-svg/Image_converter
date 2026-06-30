/**
 * UI Controller (ui.js)
 * Manages loading states, toasts, file previews, and general interface interactions.
 */

/**
 * Display a custom feedback toast notification.
 * @param {string} message - Notification text
 * @param {string} type - 'success', 'error', or 'info'
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle-2';
  if (type === 'error') iconName = 'alert-triangle';

  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span class="toast-message">${message}</span>
  `;
  
  container.appendChild(toast);
  
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Animation Out
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Toggle a button's disabled state and show/hide spinners.
 * @param {HTMLButtonElement} buttonEl - The target button element
 * @param {boolean} disabled - True to disable, false to enable
 * @param {string} loadingText - Text to show during loading
 */
function toggleButtonState(buttonEl, disabled, loadingText = '') {
  if (!buttonEl) return;
  buttonEl.disabled = disabled;
  
  const span = buttonEl.querySelector('span');
  const icon = buttonEl.querySelector('.btn-icon');
  
  if (disabled) {
    if (span) {
      buttonEl.dataset.originalText = span.textContent;
      span.textContent = loadingText || 'Processing...';
    }
    if (icon) {
      buttonEl.dataset.originalIcon = icon.getAttribute('data-lucide');
      icon.setAttribute('data-lucide', 'loader-2');
      icon.classList.add('animate-spin');
    }
  } else {
    if (span && buttonEl.dataset.originalText) {
      span.textContent = buttonEl.dataset.originalText;
    }
    if (icon && buttonEl.dataset.originalIcon) {
      icon.setAttribute('data-lucide', buttonEl.dataset.originalIcon);
      icon.classList.remove('animate-spin');
    }
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Update the dynamic progress bar tracker.
 * @param {number} percentage - Integer progress from 0 to 100
 * @param {string} statusText - Description of the current process state
 */
function updateProgress(percentage, statusText = '') {
  const container = document.getElementById('progress-container');
  const fill = document.getElementById('progress-fill');
  const textPercent = document.getElementById('progress-percent');
  const textStatus = document.getElementById('progress-status');

  if (!container || !fill || !textPercent) return;

  container.style.display = 'block';
  
  // Constrain percentage between 0 and 100
  const cleanPercent = Math.min(Math.max(Math.round(percentage), 0), 100);
  fill.style.width = `${cleanPercent}%`;
  textPercent.textContent = `${cleanPercent}%`;

  if (textStatus && statusText) {
    textStatus.textContent = statusText;
  }
}

/**
 * Reset progress bar representation.
 */
function hideProgress() {
  const container = document.getElementById('progress-container');
  if (container) {
    container.style.display = 'none';
  }
}

/**
 * Display the completed download action panel.
 * @param {string} fileName - Transformed file name
 * @param {string} sizeText - Calculated post-conversion size representation
 */
function showDownloadPanel(fileName, sizeText) {
  const card = document.getElementById('download-card');
  const metaText = document.getElementById('download-meta-text');
  if (!card || !metaText) return;

  metaText.textContent = `${fileName} (${sizeText})`;
  card.style.display = 'flex';
  
  // Smoothly scroll to the download panel
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Hide download actions panel.
 */
function hideDownloadPanel() {
  const card = document.getElementById('download-card');
  if (card) {
    card.style.display = 'none';
  }
}

/**
 * Load metadata of the uploaded image file inside the Preview panel.
 * @param {string} name - File name
 * @param {string} size - String formatted file size
 * @param {string} resolution - Dimension scale representation (e.g., 1920 x 1080)
 */
function updateImageMeta(name, size, resolution) {
  const metaName = document.getElementById('meta-name');
  const metaSize = document.getElementById('meta-size');
  const metaResolution = document.getElementById('meta-resolution');

  if (metaName) metaName.textContent = name;
  if (metaSize) metaSize.textContent = size;
  if (metaResolution) metaResolution.textContent = resolution;
}

// Export to window context
window.uiController = {
  showToast,
  toggleButtonState,
  updateProgress,
  hideProgress,
  showDownloadPanel,
  hideDownloadPanel,
  updateImageMeta
};

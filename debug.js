/* ================================================================
   debug.js — Mobile-Friendly Debug Console
   Catches syntax errors and console.log messages for viewing in browser
   ================================================================ */

(function() {
  const logs = [];
  const MAX_LOGS = 100;

  // Create debug panel
  const panel = document.createElement('div');
  panel.id = 'debug-panel';
  panel.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    max-height: 40vh;
    background: rgba(0, 0, 0, 0.95);
    border-top: 2px solid #ff4444;
    color: #00ff00;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    overflow-y: auto;
    z-index: 9999;
    padding: 8px;
    display: none;
  `;

  // Create toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'debug-toggle';
  toggleBtn.textContent = 'Debug';
  toggleBtn.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    z-index: 10000;
    background: #ff4444;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 12px;
    font-family: 'Georgia', serif;
    font-size: 0.8rem;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  `;

  // Create clear button
  const clearBtn = document.createElement('button');
  clearBtn.id = 'debug-clear';
  clearBtn.textContent = 'Clear';
  clearBtn.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 80px;
    z-index: 10000;
    background: #444;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 12px;
    font-family: 'Georgia', serif;
    font-size: 0.8rem;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: none;
  `;

  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(panel);
    document.body.appendChild(toggleBtn);
    document.body.appendChild(clearBtn);
  });

  // Toggle panel visibility
  let isOpen = false;
  toggleBtn.addEventListener('click', () => {
    isOpen = !isOpen;
    panel.style.display = isOpen ? 'block' : 'none';
    clearBtn.style.display = isOpen ? 'block' : 'none';
    if (isOpen) {
      panel.scrollTop = panel.scrollHeight;
    }
  });

  // Clear logs
  clearBtn.addEventListener('click', () => {
    logs.length = 0;
    panel.innerHTML = '<div style="color: #888">Console cleared</div>';
  });

  // Add log entry
  function addLog(type, args) {
    const timestamp = new Date().toLocaleTimeString();
    const message = Array.from(args).map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    logs.push({ type, message, timestamp });
    if (logs.length > MAX_LOGS) {
      logs.shift();
    }

    const entry = document.createElement('div');
    entry.style.cssText = `
      margin-bottom: 4px;
      padding: 4px;
      border-left: 3px solid ${getColor(type)};
      background: rgba(255,255,255,0.05);
      word-break: break-word;
    `;

    entry.innerHTML = `
      <span style="color: #888; font-size: 9px">[${timestamp}]</span>
      <span style="color: ${getColor(type)}; font-weight: bold">${type.toUpperCase()}</span>
      <pre style="margin: 2px 0; white-space: pre-wrap; color: #ddd">${escapeHtml(message)}</pre>
    `;

    panel.appendChild(entry);
    if (isOpen) {
      panel.scrollTop = panel.scrollHeight;
    }

    // Flash the debug button when panel is closed
    if (!isOpen && type === 'error') {
      toggleBtn.style.animation = 'pulse 0.5s ease-in-out 3';
    }
  }

  function getColor(type) {
    switch(type) {
      case 'error': return '#ff4444';
      case 'warn': return '#ffaa00';
      case 'info': return '#00aaff';
      default: return '#00ff00';
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Intercept console methods
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;

  console.log = function() {
    originalLog.apply(console, arguments);
    addLog('log', arguments);
  };

  console.error = function() {
    originalError.apply(console, arguments);
    addLog('error', arguments);
  };

  console.warn = function() {
    originalWarn.apply(console, arguments);
    addLog('warn', arguments);
  };

  console.info = function() {
    originalInfo.apply(console, arguments);
    addLog('info', arguments);
  };

  // Catch global errors
  window.addEventListener('error', (event) => {
    addLog('error', [
      `${event.message}\n  at ${event.filename}:${event.lineno}:${event.colno}`
    ]);
    toggleBtn.style.background = '#ff0000';
  });

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    addLog('error', [
      `Unhandled Promise Rejection: ${event.reason}`
    ]);
    toggleBtn.style.background = '#ff0000';
  });

  // Add pulse animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
  `;
  document.head.appendChild(style);

  // Initial message
  setTimeout(() => {
    console.info('Debug console initialized. Tap the Debug button to view logs.');
  }, 500);
})();

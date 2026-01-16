/**
 * Novee Desktop App - Renderer Script
 *
 * This script runs in the renderer process and handles UI interactions.
 * It communicates with the main process via the exposed electronAPI.
 */

// Get elements
const connectSlackBtn = document.getElementById('connect-slack-btn') as HTMLButtonElement | null;
const slackStatus = document.getElementById('slack-status') as HTMLSpanElement | null;

/**
 * Update the Slack connection status UI
 */
function updateSlackStatus(connected: boolean, workspaceCount?: number) {
  if (!slackStatus || !connectSlackBtn) return;

  if (connected) {
    slackStatus.textContent = workspaceCount
      ? `${workspaceCount} workspace${workspaceCount > 1 ? 's' : ''} connected`
      : 'Connected';
    slackStatus.className = 'platform-status status-connected';
    connectSlackBtn.textContent = 'Reconnect';
  } else {
    slackStatus.textContent = 'Not Connected';
    slackStatus.className = 'platform-status status-disconnected';
    connectSlackBtn.textContent = 'Connect';
  }
}

/**
 * Handle Slack connection button click
 */
async function handleConnectSlack() {
  if (!connectSlackBtn) return;

  connectSlackBtn.disabled = true;
  connectSlackBtn.textContent = 'Connecting...';

  try {
    // Check if electronAPI is available
    if (!window.electronAPI) {
      console.error('electronAPI not available');
      return;
    }

    // Open Slack login flow
    const result = await window.electronAPI.openSlackLogin();

    if (result.success) {
      // Wait a bit and check for workspaces
      setTimeout(async () => {
        if (!window.electronAPI) return;

        const workspaces = await window.electronAPI.getSlackWorkspaces();
        updateSlackStatus(workspaces.length > 0, workspaces.length);
      }, 1000);
    }
  } catch (error) {
    console.error('Failed to connect to Slack:', error);
  } finally {
    connectSlackBtn.disabled = false;
    if (slackStatus?.textContent !== 'Connected' && !slackStatus?.textContent?.includes('workspace')) {
      connectSlackBtn.textContent = 'Connect';
    }
  }
}

/**
 * Initialize the renderer
 */
function init() {
  // Set up event listeners
  if (connectSlackBtn) {
    connectSlackBtn.addEventListener('click', handleConnectSlack);
  }

  // Listen for workspace capture events from main process
  if (window.electronAPI) {
    window.electronAPI.onSlackWorkspaceCaptured((workspaces) => {
      console.log('Workspaces captured:', workspaces);
      updateSlackStatus(workspaces.length > 0, workspaces.length);
    });

    // Check initial state
    window.electronAPI.getSlackWorkspaces().then((workspaces) => {
      updateSlackStatus(workspaces.length > 0, workspaces.length);
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

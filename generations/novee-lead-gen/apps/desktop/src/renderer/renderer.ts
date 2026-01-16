/**
 * Novee Desktop App - Renderer Script
 *
 * This script runs in the renderer process and handles UI interactions.
 * It communicates with the main process via the exposed electronAPI.
 */

// =============================================================================
// Element References
// =============================================================================

// Views
const loginView = document.getElementById('login-view') as HTMLElement | null;
const dashboardView = document.getElementById('dashboard-view') as HTMLElement | null;

// Login form elements
const loginForm = document.getElementById('login-form') as HTMLFormElement | null;
const emailInput = document.getElementById('email') as HTMLInputElement | null;
const passwordInput = document.getElementById('password') as HTMLInputElement | null;
const loginBtn = document.getElementById('login-btn') as HTMLButtonElement | null;
const loginError = document.getElementById('login-error') as HTMLElement | null;
const webAppLink = document.getElementById('web-app-link') as HTMLAnchorElement | null;

// Header elements
const userInfo = document.getElementById('user-info') as HTMLElement | null;
const userName = document.getElementById('user-name') as HTMLElement | null;
const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement | null;

// Platform connection elements
const connectSlackBtn = document.getElementById('connect-slack-btn') as HTMLButtonElement | null;
const slackStatus = document.getElementById('slack-status') as HTMLSpanElement | null;

// Scrape elements
const scrapeNowBtn = document.getElementById('scrape-now-btn') as HTMLButtonElement | null;
const scrapeProgress = document.getElementById('scrape-progress') as HTMLElement | null;
const scrapeStatusText = document.getElementById('scrape-status-text') as HTMLElement | null;
const scrapeProgressFill = document.getElementById('scrape-progress-fill') as HTMLElement | null;
const scrapeDetails = document.getElementById('scrape-details') as HTMLElement | null;

// =============================================================================
// User Interface
// =============================================================================

interface UserInfo {
  id: string;
  email: string;
  name: string;
}

/**
 * Show the login view and hide the dashboard
 */
function showLoginView() {
  if (loginView) loginView.classList.remove('hidden');
  if (dashboardView) dashboardView.classList.add('hidden');
  if (userInfo) userInfo.classList.add('hidden');

  // Clear form
  if (emailInput) emailInput.value = '';
  if (passwordInput) passwordInput.value = '';
  hideLoginError();
}

/**
 * Show the dashboard view and hide the login
 */
function showDashboardView(user: UserInfo) {
  if (loginView) loginView.classList.add('hidden');
  if (dashboardView) dashboardView.classList.remove('hidden');
  if (userInfo) userInfo.classList.remove('hidden');
  if (userName) userName.textContent = user.name || user.email;
}

/**
 * Show login error message
 */
function showLoginError(message: string) {
  if (loginError) {
    loginError.textContent = message;
    loginError.classList.remove('hidden');
  }
}

/**
 * Hide login error message
 */
function hideLoginError() {
  if (loginError) {
    loginError.textContent = '';
    loginError.classList.add('hidden');
  }
}

/**
 * Set login button loading state
 */
function setLoginLoading(loading: boolean) {
  if (loginBtn) {
    loginBtn.disabled = loading;
    loginBtn.classList.toggle('btn-loading', loading);
    loginBtn.textContent = loading ? '' : 'Sign In';
  }
  if (emailInput) emailInput.disabled = loading;
  if (passwordInput) passwordInput.disabled = loading;
}

// =============================================================================
// Authentication Handlers
// =============================================================================

/**
 * Handle login form submission
 */
async function handleLogin(event: Event) {
  event.preventDefault();

  if (!emailInput || !passwordInput) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // Client-side validation
  if (!email) {
    showLoginError('Please enter your email address');
    emailInput.focus();
    return;
  }

  if (!password) {
    showLoginError('Please enter your password');
    passwordInput.focus();
    return;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showLoginError('Please enter a valid email address');
    emailInput.focus();
    return;
  }

  hideLoginError();
  setLoginLoading(true);

  try {
    if (!window.electronAPI) {
      showLoginError('Application error. Please restart the app.');
      return;
    }

    const result = await window.electronAPI.login(email, password);

    if (result.success && result.user) {
      showDashboardView(result.user);
    } else {
      showLoginError(result.error || 'Invalid email or password');
    }
  } catch (error) {
    console.error('Login error:', error);
    showLoginError('Unable to connect to the server. Please try again.');
  } finally {
    setLoginLoading(false);
  }
}

/**
 * Handle logout button click
 */
async function handleLogout() {
  if (!window.electronAPI) return;

  try {
    await window.electronAPI.logout();
    showLoginView();
  } catch (error) {
    console.error('Logout error:', error);
  }
}

/**
 * Check session on startup
 */
async function checkSessionOnStartup() {
  if (!window.electronAPI) {
    showLoginView();
    return;
  }

  try {
    const result = await window.electronAPI.checkSession();

    if (result.isLoggedIn && result.user) {
      showDashboardView(result.user);
    } else {
      showLoginView();
    }
  } catch (error) {
    console.error('Session check error:', error);
    showLoginView();
  }
}

// =============================================================================
// Platform Connection Handlers
// =============================================================================

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

  // Show/hide scrape button based on connection status
  updateScrapeButtonVisibility(connected);
}

/**
 * Handle Slack connection button click
 *
 * Security: The main process validates the session before allowing connection.
 * If no valid session, it returns an error and the user is redirected to login.
 */
async function handleConnectSlack() {
  if (!connectSlackBtn) return;

  connectSlackBtn.disabled = true;
  connectSlackBtn.textContent = 'Connecting...';

  try {
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
    } else if (result.error) {
      // Handle auth error - show login view if session is invalid
      console.log('Slack connection error:', result.error);
      if (result.error.includes('log in')) {
        // Session expired or not logged in - redirect to login
        showLoginView();
      } else {
        // Show error in status
        if (slackStatus) {
          slackStatus.textContent = 'Connection failed';
          slackStatus.className = 'platform-status status-error';
        }
      }
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
 * Handle web app link click
 */
async function handleWebAppLinkClick(event: Event) {
  event.preventDefault();

  if (!window.electronAPI) return;

  try {
    const url = await window.electronAPI.getWebAppUrl();
    // Open in default browser
    window.open(url, '_blank');
  } catch (error) {
    console.error('Failed to get web app URL:', error);
    window.open('http://localhost:3000', '_blank');
  }
}

// =============================================================================
// Scrape Handlers
// =============================================================================

/**
 * Show/hide the scrape now button based on connection status
 */
function updateScrapeButtonVisibility(isConnected: boolean) {
  if (scrapeNowBtn) {
    if (isConnected) {
      scrapeNowBtn.classList.remove('hidden');
    } else {
      scrapeNowBtn.classList.add('hidden');
    }
  }
}

/**
 * Update scrape progress UI
 */
function updateScrapeProgress(status: 'idle' | 'running' | 'completed' | 'failed', progress: number, details?: string) {
  if (!scrapeProgress) return;

  if (status === 'idle') {
    scrapeProgress.classList.add('hidden');
    return;
  }

  scrapeProgress.classList.remove('hidden');
  scrapeProgress.classList.remove('completed', 'failed');

  if (status === 'completed') {
    scrapeProgress.classList.add('completed');
    if (scrapeStatusText) scrapeStatusText.textContent = 'Scrape completed!';
    if (scrapeProgressFill) scrapeProgressFill.style.width = '100%';
    if (scrapeDetails) scrapeDetails.textContent = details || 'Successfully scanned for leads';
  } else if (status === 'failed') {
    scrapeProgress.classList.add('failed');
    if (scrapeStatusText) scrapeStatusText.textContent = 'Scrape failed';
    if (scrapeProgressFill) scrapeProgressFill.style.width = '100%';
    if (scrapeDetails) scrapeDetails.textContent = details || 'An error occurred during scraping';
  } else {
    // Running
    if (scrapeStatusText) scrapeStatusText.textContent = 'Scraping in progress...';
    if (scrapeProgressFill) scrapeProgressFill.style.width = `${progress}%`;
    if (scrapeDetails) scrapeDetails.textContent = details || 'Searching for leads...';
  }
}

/**
 * Handle manual scrape button click
 *
 * Triggers an immediate scrape of connected platforms
 */
async function handleScrapeNow() {
  if (!scrapeNowBtn || !window.electronAPI) return;

  // Disable button while scraping
  scrapeNowBtn.disabled = true;
  scrapeNowBtn.textContent = 'Scraping...';

  // Show progress UI
  updateScrapeProgress('running', 10, 'Initializing scrape...');

  try {
    // Simulate progress updates (in production, this would come from IPC events)
    updateScrapeProgress('running', 25, 'Connecting to workspaces...');

    // Call the manual scrape IPC handler
    const result = await window.electronAPI.manualScrape();

    if (result.success) {
      updateScrapeProgress('completed', 100, `Found ${result.leadsFound || 0} potential leads`);

      // Hide progress after 3 seconds
      setTimeout(() => {
        updateScrapeProgress('idle', 0);
      }, 3000);
    } else {
      updateScrapeProgress('failed', 100, result.error || 'Scrape failed');

      // Hide progress after 5 seconds
      setTimeout(() => {
        updateScrapeProgress('idle', 0);
      }, 5000);
    }
  } catch (error) {
    console.error('Manual scrape error:', error);
    updateScrapeProgress('failed', 100, 'An unexpected error occurred');

    setTimeout(() => {
      updateScrapeProgress('idle', 0);
    }, 5000);
  } finally {
    scrapeNowBtn.disabled = false;
    scrapeNowBtn.textContent = 'Scrape Now';
  }
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize the renderer
 */
function init() {
  // Set up login form handler
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Set up logout button handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Set up web app link handler
  if (webAppLink) {
    webAppLink.addEventListener('click', handleWebAppLinkClick);
  }

  // Set up Slack connection handler
  if (connectSlackBtn) {
    connectSlackBtn.addEventListener('click', handleConnectSlack);
  }

  // Set up Scrape Now button handler
  if (scrapeNowBtn) {
    scrapeNowBtn.addEventListener('click', handleScrapeNow);
  }

  // Listen for workspace capture events from main process
  if (window.electronAPI) {
    window.electronAPI.onSlackWorkspaceCaptured((workspaces) => {
      console.log('Workspaces captured:', workspaces);
      updateSlackStatus(workspaces.length > 0, workspaces.length);
    });
  }

  // Check session on startup
  checkSessionOnStartup();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

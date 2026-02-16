const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>MCP Test App</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    h2 { color: #666; }
    .section { margin: 16px 0; padding: 12px; border: 1px solid #ddd; border-radius: 4px; }
    button { margin: 4px; padding: 8px 16px; cursor: pointer; }
    input { margin: 4px; padding: 8px; width: 200px; }
    label { display: block; margin: 4px 0; }
    a { margin: 4px; }
    #click-output { margin-top: 8px; color: green; }
  </style>
</head>
<body>
  <h1>MCP Desktop Test App</h1>
  <h2>Interactive Test Elements</h2>

  <div class="section">
    <h3>Buttons</h3>
    <button id="btn-hello" onclick="document.getElementById('click-output').textContent = 'Hello button clicked!'">Hello</button>
    <button id="btn-submit" onclick="document.getElementById('click-output').textContent = 'Submit button clicked!'">Submit</button>
    <div id="click-output"></div>
  </div>

  <div class="section">
    <h3>Text Inputs</h3>
    <label for="input-name">Name:</label>
    <input type="text" id="input-name" placeholder="Enter your name" />
    <label for="input-email">Email:</label>
    <input type="email" id="input-email" placeholder="Enter your email" />
  </div>

  <div class="section">
    <h3>Links</h3>
    <a href="#" id="link-home" onclick="event.preventDefault()">Home</a>
    <a href="#" id="link-about" onclick="event.preventDefault()">About</a>
  </div>

  <div class="section">
    <h3>Text Content</h3>
    <p id="static-text">This is a paragraph with static text for testing get_text.</p>
    <label id="status-label">Status: Ready</label>
  </div>
</body>
</html>`;

  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

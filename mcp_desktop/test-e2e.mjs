/**
 * End-to-end test for the MCP Desktop Automation server.
 * Sends JSON-RPC messages over stdin and reads responses from stdout.
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const serverProcess = spawn('node', [path.join(__dirname, 'dist/index.js')], {
  env: {
    ...process.env,
    DESKTOP_APP_PATH: path.join(__dirname, 'test-app'),
  },
  stdio: ['pipe', 'pipe', 'pipe'],
});

let buffer = '';
let responseResolve = null;

serverProcess.stdout.on('data', (data) => {
  buffer += data.toString();
  // MCP uses newline-delimited JSON
  const lines = buffer.split('\n');
  buffer = lines.pop(); // keep incomplete line in buffer
  for (const line of lines) {
    if (line.trim() && responseResolve) {
      const resolve = responseResolve;
      responseResolve = null;
      resolve(JSON.parse(line));
    }
  }
});

serverProcess.stderr.on('data', (data) => {
  process.stderr.write(`  [server] ${data}`);
});

function sendRequest(method, params, id) {
  return new Promise((resolve, reject) => {
    responseResolve = resolve;
    const msg = JSON.stringify({ jsonrpc: '2.0', method, params, id }) + '\n';
    serverProcess.stdin.write(msg);
    // Timeout after 30s
    setTimeout(() => {
      if (responseResolve === resolve) {
        responseResolve = null;
        reject(new Error(`Timeout waiting for response to ${method} (id=${id})`));
      }
    }, 30000);
  });
}

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  PASS: ${testName}`);
    passed++;
  } else {
    console.log(`  FAIL: ${testName}`);
    failed++;
  }
}

async function run() {
  console.log('=== MCP Desktop E2E Test ===\n');

  // 1. Initialize
  console.log('1. Initializing MCP server...');
  const initResp = await sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' },
  }, 1);
  assert(initResp.result?.serverInfo?.name === 'mcp-desktop-automation', 'Server initialized');

  // Send initialized notification
  serverProcess.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

  // 2. List tools
  console.log('\n2. Listing tools...');
  const toolsResp = await sendRequest('tools/list', {}, 2);
  const toolNames = toolsResp.result?.tools?.map(t => t.name) || [];
  assert(toolNames.length === 9, `Found ${toolNames.length} tools`);

  // 3. desktop_launch
  console.log('\n3. desktop_launch...');
  const launchResp = await sendRequest('tools/call', {
    name: 'desktop_launch',
    arguments: { timeout: 15000 },
  }, 3);
  const launchData = JSON.parse(launchResp.result?.content?.[0]?.text || '{}');
  assert(launchData.success === true, 'App launched');
  assert(!!launchData.sessionId, `Got sessionId: ${launchData.sessionId}`);
  const sessionId = launchData.sessionId;

  // Small delay to let the app render
  await new Promise(r => setTimeout(r, 2000));

  // 4. desktop_snapshot
  console.log('\n4. desktop_snapshot...');
  const snapResp = await sendRequest('tools/call', {
    name: 'desktop_snapshot',
    arguments: { sessionId },
  }, 4);
  const snapData = JSON.parse(snapResp.result?.content?.[0]?.text || '{}');
  assert(snapData.title === 'MCP Test App', `Window title: ${snapData.title}`);
  assert(snapData.elements?.buttons?.length >= 2, `Found ${snapData.elements?.buttons?.length} buttons`);
  assert(snapData.elements?.headings?.length >= 1, `Found ${snapData.elements?.headings?.length} headings`);

  // 5. desktop_screenshot
  console.log('\n5. desktop_screenshot...');
  const ssResp = await sendRequest('tools/call', {
    name: 'desktop_screenshot',
    arguments: { sessionId, filename: 'test_screenshot.png' },
  }, 5);
  const ssData = JSON.parse(ssResp.result?.content?.[0]?.text || '{}');
  assert(ssData.success === true, `Screenshot saved: ${ssData.filepath}`);

  // 6. desktop_click
  console.log('\n6. desktop_click...');
  const clickResp = await sendRequest('tools/call', {
    name: 'desktop_click',
    arguments: { sessionId, selector: '#btn-hello' },
  }, 6);
  const clickData = JSON.parse(clickResp.result?.content?.[0]?.text || '{}');
  assert(clickData.success === true, 'Clicked #btn-hello');

  // 7. desktop_type
  console.log('\n7. desktop_type...');
  const typeResp = await sendRequest('tools/call', {
    name: 'desktop_type',
    arguments: { sessionId, selector: '#input-name', text: 'Test User' },
  }, 7);
  const typeData = JSON.parse(typeResp.result?.content?.[0]?.text || '{}');
  assert(typeData.success === true, 'Typed into #input-name');

  // 8. desktop_get_text
  console.log('\n8. desktop_get_text...');
  const textResp = await sendRequest('tools/call', {
    name: 'desktop_get_text',
    arguments: { sessionId, selector: '#click-output' },
  }, 8);
  const textData = JSON.parse(textResp.result?.content?.[0]?.text || '{}');
  assert(textData.text === 'Hello button clicked!', `Got text: "${textData.text}"`);

  // 9. desktop_evaluate
  console.log('\n9. desktop_evaluate...');
  const evalResp = await sendRequest('tools/call', {
    name: 'desktop_evaluate',
    arguments: { sessionId, script: 'document.title' },
  }, 9);
  const evalData = JSON.parse(evalResp.result?.content?.[0]?.text || '{}');
  assert(evalData.result === 'MCP Test App', `Evaluated document.title: "${evalData.result}"`);

  // 10. desktop_close
  console.log('\n10. desktop_close...');
  const closeResp = await sendRequest('tools/call', {
    name: 'desktop_close',
    arguments: { sessionId },
  }, 10);
  const closeData = JSON.parse(closeResp.result?.content?.[0]?.text || '{}');
  assert(closeData.success === true, 'App closed');

  // Summary
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);

  serverProcess.kill();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Test failed:', err);
  serverProcess.kill();
  process.exit(1);
});

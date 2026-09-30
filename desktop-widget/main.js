const { app, BrowserWindow, Tray, Menu, nativeImage, shell, ipcMain, screen, net } = require('electron');
const path = require('path');
const fs = require('fs');

// 웹앱/폰 위젯과 같은 서버. 바꿔야 하면 환경변수 TODOLIST_URL 로 덮어쓴다.
const SERVER_URL = (process.env.TODOLIST_URL || 'https://todolist-liart-mu.vercel.app').replace(/\/+$/, '');

const STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');
const DEFAULTS = { width: 380, height: 640, alwaysOnTop: false };

let win = null;
let tray = null;
let saveTimer = null;
let quitting = false;

function readState() {
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) };
  } catch (e) {
    return { ...DEFAULTS };
  }
}

function writeState() {
  if (!win || win.isDestroyed()) return;
  const bounds = win.getNormalBounds();
  const data = { ...bounds, alwaysOnTop: win.isAlwaysOnTop() };
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(data));
  } catch (e) { /* 저장 실패는 무시 */ }
}

function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(writeState, 400);
}

// 저장된 위치가 지금 연결된 모니터 밖이면 기본 위치를 쓴다.
function visiblePosition(state) {
  if (typeof state.x !== 'number' || typeof state.y !== 'number') return {};
  const onScreen = screen.getAllDisplays().some(d => {
    const a = d.workArea;
    return state.x < a.x + a.width - 40 && state.x + state.width > a.x + 40 &&
           state.y < a.y + a.height - 40 && state.y + 60 > a.y;
  });
  return onScreen ? { x: state.x, y: state.y } : {};
}

// ── Windows 시작 시 자동 실행 ──────────────────────────────────────────
// portable exe 는 실행할 때마다 임시 폴더에 풀려서 process.execPath 가 매번 달라진다.
// 원래 exe 위치(PORTABLE_EXECUTABLE_FILE)를 시작프로그램에 등록해야 재부팅 후에도 실행된다.
function autoStartPath() {
  return process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
}

function isAutoStart() {
  return app.getLoginItemSettings({ path: autoStartPath() }).openAtLogin;
}

function setAutoStart(enabled) {
  app.setLoginItemSettings({ openAtLogin: enabled, path: autoStartPath() });
}

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

// 처음 실행할 때 한 번만 자동 실행을 켠다. 이후에는 트레이 메뉴의 선택을 따른다.
function enableAutoStartOnFirstRun() {
  if (!app.isPackaged) return; // npm start 개발 실행은 등록하지 않는다
  const settings = readSettings();
  if (settings.autoStartInitialized) return;
  setAutoStart(true);
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ ...settings, autoStartInitialized: true }));
  } catch (e) { /* 저장 실패 시 다음 실행에서 다시 시도 */ }
}

function createWindow() {
  const state = readState();
  win = new BrowserWindow({
    width: state.width,
    height: state.height,
    ...visiblePosition(state),
    minWidth: 320,
    minHeight: 420,
    frame: false,
    resizable: true,
    backgroundColor: '#f6f7fb',
    alwaysOnTop: !!state.alwaysOnTop,
    title: '나의 하루',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.on('move', queueSave);
  win.on('resize', queueSave);
  win.on('close', e => {
    // 닫기(X)는 트레이로 숨기기. 완전 종료는 트레이 메뉴의 "종료".
    if (!quitting) {
      e.preventDefault();
      win.hide();
    }
    writeState();
  });
  // 웹앱 링크 등 외부 이동은 기본 브라우저로
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternalSafe(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) {
      e.preventDefault();
      openExternalSafe(url);
    }
  });
}

function openExternalSafe(url) {
  if (/^https?:\/\//i.test(url)) shell.openExternal(url);
}

function showWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    { label: '열기', click: showWindow },
    { label: '웹앱 열기', click: () => openExternalSafe(SERVER_URL + '/') },
    { type: 'separator' },
    {
      label: '항상 위에 표시',
      type: 'checkbox',
      checked: win ? win.isAlwaysOnTop() : false,
      click: item => {
        win.setAlwaysOnTop(item.checked);
        win.webContents.send('pin-changed', item.checked);
        writeState();
      }
    },
    {
      label: 'Windows 시작 시 자동 실행',
      type: 'checkbox',
      checked: isAutoStart(),
      click: item => setAutoStart(item.checked)
    },
    { type: 'separator' },
    { label: '종료', click: () => { quitting = true; app.quit(); } }
  ]);
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.png')).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('나의 하루');
  tray.on('click', showWindow);
  tray.on('right-click', () => tray.popUpContextMenu(buildTrayMenu()));
}

ipcMain.handle('config', () => ({ serverUrl: SERVER_URL, alwaysOnTop: win ? win.isAlwaysOnTop() : false }));
// 일정(/api/todos) 읽기/쓰기 전용 통로. 렌더러가 임의 주소로 요청하지 못하게 경로와 메서드를 제한한다.
ipcMain.handle('api', async (_e, { method, path: apiPath, body }) => {
  const okMethod = ['GET', 'POST', 'PATCH', 'DELETE'].includes(method);
  const okPath = typeof apiPath === 'string' && /^\/api\/todos(\?id=\d+)?$/.test(apiPath);
  if (!okMethod || !okPath) return { ok: false, status: 400, text: '' };
  try {
    const res = await net.fetch(SERVER_URL + apiPath, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { ok: res.ok, status: res.status, text: await res.text() };
  } catch (e) {
    return { ok: false, status: 0, text: '' };
  }
});

ipcMain.on('open-web', (_e, p) => {
  const pathPart = typeof p === 'string' && p.startsWith('/') ? p : '/';
  openExternalSafe(SERVER_URL + pathPart);
});
ipcMain.handle('toggle-pin', () => {
  const next = !win.isAlwaysOnTop();
  win.setAlwaysOnTop(next);
  writeState();
  return next;
});
ipcMain.on('minimize', () => win && win.minimize());
ipcMain.on('hide', () => win && win.hide());

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showWindow);
  app.whenReady().then(() => {
    enableAutoStartOnFirstRun();
    createWindow();
    createTray();
  });
  app.on('before-quit', () => { quitting = true; writeState(); });
  app.on('window-all-closed', () => { /* 트레이에 남겨 둔다 */ });
}

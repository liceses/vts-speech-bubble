(function() {
  const TOKEN_KEY = 'vts-auth-token';
  const HISTORY_KEY = 'vts-speech-bubble-history';
  const MAX_HISTORY = 50;

  const loginPage = document.getElementById('loginPage');
  const mainPage = document.getElementById('mainPage');
  const codeInput = document.getElementById('codeInput');
  const codeSubmit = document.getElementById('codeSubmit');
  const codeError = document.getElementById('codeError');

  const statusEl = document.getElementById('status');
  const textInput = document.getElementById('textInput');
  const sendBtn = document.getElementById('sendBtn');
  const clearBtn = document.getElementById('clearBtn');
  const quickPhrases = document.getElementById('quickPhrases');

  const hideDelaySlider = document.getElementById('hideDelaySlider');
  const hideDelayValue = document.getElementById('hideDelayValue');
  const hideDelayRow = document.getElementById('hideDelayRow');
  const bubbleWidthSlider = document.getElementById('bubbleWidthSlider');
  const bubbleWidthValue = document.getElementById('bubbleWidthValue');
  const fontSizeSlider = document.getElementById('fontSizeSlider');
  const fontSizeValue = document.getElementById('fontSizeValue');
  const typeSpeedSlider = document.getElementById('typeSpeedSlider');
  const typeSpeedValue = document.getElementById('typeSpeedValue');
  const fontFamilySelect = document.getElementById('fontFamilySelect');
  const fontBoldCheck = document.getElementById('fontBoldCheck');
  const fontColorInput = document.getElementById('fontColorInput');
  const posXSlider = document.getElementById('posXSlider');
  const posXValue = document.getElementById('posXValue');
  const posYSlider = document.getElementById('posYSlider');
  const posYValue = document.getElementById('posYValue');
  const tailSideSelect = document.getElementById('tailSideSelect');
  const tailOffsetSlider = document.getElementById('tailOffsetSlider');
  const tailOffsetValue = document.getElementById('tailOffsetValue');
  const quirkInput = document.getElementById('quirkInput');
  const quirkToggle = document.getElementById('quirkToggle');
  const historySection = document.getElementById('historySection');
  const historyClearBtn = document.getElementById('historyClearBtn');

  const sliders = [
    { el: hideDelaySlider, display: hideDelayValue, suffix: '秒', key: 'hideDelay', transform: v => v * 1000 },
    { el: bubbleWidthSlider, display: bubbleWidthValue, suffix: 'px', key: 'bubbleWidth' },
    { el: fontSizeSlider, display: fontSizeValue, suffix: 'px', key: 'fontSize' },
    { el: typeSpeedSlider, display: typeSpeedValue, suffix: 'ms', key: 'typeSpeed' },
    { el: posXSlider, display: posXValue, suffix: '%', key: 'positionX' },
    { el: posYSlider, display: posYValue, suffix: '%', key: 'positionY' },
    { el: tailOffsetSlider, display: tailOffsetValue, suffix: 'px', key: 'tailOffset' },
  ];

  const selects = [
    { el: fontFamilySelect, key: 'fontFamily' },
    { el: tailSideSelect, key: 'tailSide' },
  ];

  const checks = [
    { el: fontBoldCheck, key: 'fontBold' },
  ];

  function auth() {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) {
      showMain();
      return;
    }
    loginPage.style.display = '';
    mainPage.style.display = 'none';

    function submit() {
      const code = codeInput.value.trim();
      if (!code) return;
      fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      }).then(r => r.json()).then(data => {
        if (data.ok) {
          sessionStorage.setItem(TOKEN_KEY, data.token);
          showMain();
        } else {
          codeError.textContent = '访问码错误';
          codeInput.value = '';
          codeInput.focus();
        }
      }).catch(() => {
        codeError.textContent = '连接失败';
      });
    }

    codeSubmit.addEventListener('click', submit);
    codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    codeInput.focus();
  }

  function showMain() {
    loginPage.style.display = 'none';
    mainPage.style.display = '';
  }

  function sendConfig(key, value) {
    WS.send({ type: MSG.CONFIG, key, value });
  }

  function updateStatus(connected) {
    if (connected) {
      statusEl.textContent = '已连接服务器 ✓';
      statusEl.className = 'status connected';
    } else {
      statusEl.textContent = '未连接服务器';
      statusEl.className = 'status disconnected';
    }
  }

  function sendText() {
    const text = textInput.value.trim();
    if (!text) return;
    WS.send({ type: MSG.TEXT, content: text });
    addHistory(text);
    textInput.value = '';
    textInput.focus();
  }

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
    catch { return []; }
  }

  function saveHistory(h) { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); }

  function addHistory(text) {
    const h = loadHistory();
    h.unshift({ text, time: Date.now() });
    if (h.length > MAX_HISTORY) h.length = MAX_HISTORY;
    saveHistory(h);
    renderHistory();
  }

  function renderHistory() {
    const h = loadHistory();
    if (!h.length) { historySection.innerHTML = '<div class="history-empty">暂无记录</div>'; return; }
    historySection.innerHTML = h.map((item, i) => {
      const d = new Date(item.time);
      const t = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
      return `<div class="history-item" data-index="${i}"><span class="history-text">${esc(item.text)}</span><span class="history-time">${t}</span></div>`;
    }).join('');
  }

  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  function applySyncToUI(config) {
    sliders.forEach(s => {
      let val = config[s.key];
      if (s.key === 'hideDelay') val = val / 1000;
      s.el.value = val;
      s.display.textContent = val + s.suffix;
    });
    selects.forEach(s => { s.el.value = config[s.key]; });
    checks.forEach(s => { s.el.checked = config[s.key]; });
    quirkInput.value = config.quirkText;
    quirkToggle.checked = config.quirkEnabled;
    fontColorInput.value = config.fontColor;
    hideDelayRow.style.display = config.stayMode === 'stack' ? 'none' : '';
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === config.stayMode);
    });
  }

  WS.setOnMessage(function(msg) {
    if (msg.type === MSG.SYNC && msg.config) {
      applySyncToUI(msg.config);
    }
  });

  window.onWSOpen = function() { updateStatus(true); };
  window.onWSClose = function() { updateStatus(false); };

  sendBtn.addEventListener('click', sendText);
  textInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendText(); });
  clearBtn.addEventListener('click', () => { WS.send({ type: MSG.CLEAR }); });

  quickPhrases.addEventListener('click', (e) => {
    const btn = e.target.closest('.quick-btn');
    if (!btn) return;
    textInput.value = btn.dataset.text;
    sendText();
  });

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sendConfig('stayMode', btn.dataset.mode);
    });
  });

  sliders.forEach(s => {
    s.el.addEventListener('input', () => {
      let val = Number(s.el.value);
      s.display.textContent = val + s.suffix;
      if (s.transform) val = s.transform(val);
      sendConfig(s.key, val);
    });
  });

  selects.forEach(s => {
    s.el.addEventListener('change', () => { sendConfig(s.key, s.el.value); });
  });

  checks.forEach(s => {
    s.el.addEventListener('change', () => { sendConfig(s.key, s.el.checked); });
  });

  fontColorInput.addEventListener('input', () => { sendConfig('fontColor', fontColorInput.value); });

  quirkInput.addEventListener('input', () => { sendConfig('quirkText', quirkInput.value); });
  quirkToggle.addEventListener('change', () => { sendConfig('quirkEnabled', quirkToggle.checked); });

  historySection.addEventListener('click', (e) => {
    const item = e.target.closest('.history-item');
    if (!item) return;
    const h = loadHistory();
    const idx = Number(item.dataset.index);
    if (h[idx]) {
      textInput.value = h[idx].text;
      sendText();
    }
  });

  historyClearBtn.addEventListener('click', () => { saveHistory([]); renderHistory(); });

  renderHistory();
  auth();
  WS.connect();
})();

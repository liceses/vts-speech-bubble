(function() {
  const WS_PATH = window._wsPath || '/ws';
  const TOKEN_KEY = 'vts-auth-token';
  let ws = null;
  let onMsg = null;
  let reconnectTimer = null;

  function getUrl() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const host = location.host;
    if (WS_PATH === '/bubble') {
      return `${proto}://${host}/bubble`;
    }
    const token = sessionStorage.getItem(TOKEN_KEY) || '';
    return `${proto}://${host}/ws?token=${encodeURIComponent(token)}`;
  }

  function connect() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    ws = new WebSocket(getUrl());

    ws.onopen = () => {
      console.log('WS 已连接');
      if (window.onWSOpen) window.onWSOpen();
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (onMsg) onMsg(msg);
      } catch (err) {}
    };

    ws.onclose = () => {
      console.log('WS 断开，3秒后重连...');
      if (window.onWSClose) window.onWSClose();
      reconnectTimer = setTimeout(connect, 3000);
    };

    ws.onerror = () => { ws.close(); };
  }

  function send(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  function setOnMessage(fn) { onMsg = fn; }

  window.WS = { connect, send, setOnMessage };
})();

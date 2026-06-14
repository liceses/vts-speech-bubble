const crypto = require('crypto');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');
const os = require('os');
const { MSG, DEFAULT_CONFIG } = require('./public/shared/protocol');

const PORT = 8765;
const ACCESS_CODE = String(Math.floor(1000 + Math.random() * 9000));
const HMAC_SECRET = crypto.randomBytes(16).toString('hex');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/auth', (req, res) => {
  if (req.body.code === ACCESS_CODE) {
    const payload = Date.now() + ':' + ACCESS_CODE;
    const sig = crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
    res.json({ ok: true, token: payload + ':' + sig });
  } else {
    res.json({ ok: false });
  }
});

function verifyToken(token) {
  if (!token) return false;
  const parts = token.split(':');
  if (parts.length !== 3) return false;
  const [ts, code, sig] = parts;
  const expected = crypto.createHmac('sha256', HMAC_SECRET).update(ts + ':' + code).digest('hex');
  if (sig !== expected) return false;
  if (code !== ACCESS_CODE) return false;
  if (Date.now() - Number(ts) > 24 * 3600 * 1000) return false;
  return true;
}

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

const config = { ...DEFAULT_CONFIG };

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/bubble') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws._isBubble = true;
      wss.emit('connection', ws, req);
    });
  } else if (url.pathname === '/ws') {
    const token = url.searchParams.get('token');
    if (!verifyToken(token)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws._isBubble = false;
      wss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  console.log(ws._isBubble ? '气泡端连接' : '控制端连接');
  ws.send(JSON.stringify({ type: MSG.SYNC, config }));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === MSG.TEXT || msg.type === MSG.CLEAR) {
        for (const client of wss.clients) {
          if (client !== ws && client.readyState === 1) {
            client.send(data.toString());
          }
        }
      } else if (msg.type === MSG.CONFIG && msg.key && msg.key in config) {
        config[msg.key] = msg.value;
        const syncMsg = JSON.stringify({ type: MSG.SYNC, config });
        for (const client of wss.clients) {
          if (client.readyState === 1) {
            client.send(syncMsg);
          }
        }
      }
    } catch (e) {}
  });

  ws.on('close', () => {
    console.log(ws._isBubble ? '气泡端断开' : '控制端断开');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const lanIP = getLANIP();
  console.log('');
  console.log('  ┌─────────────────────────────────────┐');
  console.log('  │       🐾 喵娘对话气泡服务器          │');
  console.log('  ├─────────────────────────────────────┤');
  console.log(`  │  气泡显示: http://${lanIP}:${PORT}/bubble`);
  console.log(`  │  控制台:   http://${lanIP}:${PORT}/control`);
  console.log(`  │  访问码:   ${ACCESS_CODE}                    │`);
  console.log('  └─────────────────────────────────────┘');
  console.log('');
});

function getLANIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

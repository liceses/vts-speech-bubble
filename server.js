const { WebSocketServer } = require('ws');

const PORT = 8765;
const wss = new WebSocketServer({ port: PORT });

console.log(`喵娘对话中继服务器已启动 ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  console.log('新客户端连接');

  ws.on('message', (data) => {
    for (const client of wss.clients) {
      if (client !== ws && client.readyState === 1) {
        client.send(data.toString());
      }
    }
  });

  ws.on('close', () => {
    console.log('客户端断开');
  });
});

var MSG = {
  TEXT: 'text',
  CLEAR: 'clear',
  CONFIG: 'config',
  SYNC: 'sync',
};

var DEFAULT_CONFIG = {
  quirkText: '喵~',
  quirkEnabled: true,
  stayMode: 'auto',
  hideDelay: 8000,
  typeSpeed: 60,
  bubbleWidth: 400,
  fontSize: 18,
  fontFamily: 'Microsoft YaHei',
  fontBold: false,
  fontColor: '#d63384',
  positionX: 50,
  positionY: 85,
  tailSide: 'left',
  tailOffset: 40,
};

if (typeof module !== 'undefined') module.exports = { MSG, DEFAULT_CONFIG };

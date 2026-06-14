(function() {
  const bubbleArea = document.getElementById('bubbleArea');
  const MAX_STACK = 5;

  let stayMode = 'auto';
  let hideDelay = 8000;
  let typeSpeed = 60;
  let quirkText = '喵~';
  let quirkEnabled = true;
  let typeTimer = null;
  let currentItem = null;
  let hideTimer = null;

  function applyQuirk(text) {
    if (!quirkEnabled || !quirkText) return text;
    return text.replace(/[。！？~～\s]+$/, '') + quirkText;
  }

  function createBubbleItem() {
    const item = document.createElement('div');
    item.className = 'bubble-item has-ears';

    const earL = document.createElement('div');
    earL.className = 'cat-ear-left';
    const earR = document.createElement('div');
    earR.className = 'cat-ear-right';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    for (let i = 0; i < 3; i++) {
      const sparkle = document.createElement('div');
      sparkle.className = 'sparkle';
      bubble.appendChild(sparkle);
    }
    const textEl = document.createElement('div');
    textEl.className = 'bubble-text';
    bubble.appendChild(textEl);

    const paw = document.createElement('div');
    paw.className = 'paw-print';
    paw.textContent = '🐾';

    item.appendChild(earL);
    item.appendChild(earR);
    item.appendChild(bubble);
    item.appendChild(paw);

    return { item, textEl };
  }

  function typeText(text, targetEl, perItem) {
    if (!perItem && typeTimer) { clearInterval(typeTimer); typeTimer = null; }
    targetEl.innerHTML = '';
    const fullText = applyQuirk(text);
    let i = 0;
    const cursor = document.createElement('span');
    cursor.className = 'cursor';

    const tid = setInterval(() => {
      if (i < fullText.length) {
        targetEl.textContent = fullText.substring(0, i + 1);
        targetEl.appendChild(cursor);
        i++;
      } else {
        clearInterval(tid);
        if (!perItem) typeTimer = null;
        setTimeout(() => { if (cursor.parentNode) cursor.remove(); }, 1500);
      }
    }, typeSpeed);

    if (!perItem) typeTimer = tid;
    return tid;
  }

  function removeAllItems() {
    if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    bubbleArea.querySelectorAll('.bubble-item').forEach(el => removeItem(el));
    currentItem = null;
  }

  function showBubble(text) {
    if (stayMode === 'stack') {
      const { item, textEl } = createBubbleItem();
      item._typeTimer = typeText(text, textEl, true);
      bubbleArea.appendChild(item);
      requestAnimationFrame(() => item.classList.add('visible'));

      const items = bubbleArea.querySelectorAll('.bubble-item');
      if (items.length > MAX_STACK) {
        removeItem(items[0]);
      }

      if (stayMode === 'auto') {
        item._hideTimer = setTimeout(() => removeItem(item), hideDelay);
      }
    } else {
      if (currentItem) {
        const textEl = currentItem.querySelector('.bubble-text');
        typeText(text, textEl);
      } else {
        const { item, textEl } = createBubbleItem();
        bubbleArea.appendChild(item);
        requestAnimationFrame(() => item.classList.add('visible'));
        typeText(text, textEl);
        currentItem = item;
      }

      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      if (stayMode === 'auto') {
        hideTimer = setTimeout(() => {
          if (currentItem) {
            currentItem.classList.remove('visible');
            setTimeout(() => { if (currentItem) { currentItem.remove(); currentItem = null; } }, 400);
          }
        }, hideDelay);
      }
    }
  }

  function removeItem(el) {
    if (el._typeTimer) { clearInterval(el._typeTimer); el._typeTimer = null; }
    if (el._hideTimer) { clearTimeout(el._hideTimer); el._hideTimer = null; }
    el.classList.remove('visible');
    setTimeout(() => el.remove(), 400);
  }

  function applyConfig(config) {
    const root = document.documentElement;
    root.style.setProperty('--pos-x', config.positionX + '%');
    root.style.setProperty('--pos-y', config.positionY + '%');
    root.style.setProperty('--bubble-width', config.bubbleWidth + 'px');
    root.style.setProperty('--font-size', config.fontSize + 'px');
    root.style.setProperty('--font-family', config.fontFamily);
    root.style.setProperty('--font-weight', config.fontBold ? 'bold' : 'normal');
    root.style.setProperty('--font-color', config.fontColor);
    root.style.setProperty('--tail-offset', config.tailOffset + 'px');
    document.body.dataset.tailSide = config.tailSide;

    stayMode = config.stayMode;
    hideDelay = config.hideDelay;
    typeSpeed = config.typeSpeed;
    quirkText = config.quirkText;
    quirkEnabled = config.quirkEnabled;
  }

  WS.setOnMessage(function(msg) {
    if (msg.type === MSG.TEXT && msg.content) {
      showBubble(msg.content);
    } else if (msg.type === MSG.SYNC && msg.config) {
      const oldMode = stayMode;
      applyConfig(msg.config);
      if (oldMode !== stayMode) {
        removeAllItems();
      }
    } else if (msg.type === MSG.CLEAR) {
      removeAllItems();
    }
  });

  applyConfig(DEFAULT_CONFIG);
  WS.connect();
})();

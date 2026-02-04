const controller = new AbortController();
const signal = controller.signal;

const SERVER_API = 'http://localhost:3000';
const WEBSOCKET_API = 'ws://localhost:2000/ws';
const INTERACTION_KEY = 'currentInteractionType';

let lastUserIndex = 0;

const INTERACTION_METHODS = {
  shortPoling: {
    type: 'shortPoling',
    start: startShortPoling,
    stop: stopShortPooling,
  },
  longPoling: {
    type: 'longPoling',
    start: startLongPoling,
    stop: stopLongPooling,
  },
  websocket: {
    type: 'websocket',
    start: startWebsocket,
    stop: undefined,
  },
  sse: {
    type: 'sse',
    start: startSSE,
    stop: undefined,
  },
};

/* SHORT POOLING */

let shortPolingTimeoutId = null;

function startShortPoling(lastIndex = lastUserIndex) {
  console.log('startShortPoling');
  shortPolingTimeoutId = setTimeout(async () => {
    const res = await fetch(`${SERVER_API}/short-poling?last=${lastIndex}`, {signal});
    const {users, last} = await res.json();
    lastUserIndex = last;

    addUsersToHTML(users);
    startShortPoling(last);
  }, 2000)
};

function stopShortPooling() {
  clearTimeout(shortPolingTimeoutId);
  shortPolingTimeoutId = null;
}

/* LONG POOLING */

function startLongPoling(lastIndex = lastUserIndex) {
  console.log('startLongPoling');
  setTimeout(async () => {
    const res = await fetch(`${SERVER_API}/long-poling?last=${lastIndex}`, {signal});
    const {users, last} = await res.json();
    lastUserIndex = last;

    addUsersToHTML(users);
    startLongPoling(last);
  }, 0)
};

function stopLongPooling() {
  controller.abort();
}

/* WS */

function startWebsocket() {
  const ws = new WebSocket(WEBSOCKET_API)

  ws.onopen = () => {
    console.log('Websocket connected');

    const stringifiedParams = JSON.stringify({ lastUserIndex });
    ws.send(stringifiedParams);
  };
  
  ws.onmessage = (message) => {
    const { users, last } = JSON.parse(message.data);
    lastUserIndex = last;

    addUsersToHTML(users);
  }

  ws.onclose = () => {
    console.log('Websocket closed');
  }

  INTERACTION_METHODS.websocket.stop = () => ws.close();
}

/* SSE */

function startSSE() {
  const lastUserIndex = 0;
  const eventSource = new EventSource(`${SERVER_API}/server-sent-event?last=${lastUserIndex}`)

  eventSource.onmessage = (event) => {
    const { users } = JSON.parse(event.data);
    addUsersToHTML(users);
  }
}

/* UTILS */

function handleSelectInteraction(type) {
  const currentInteractionType = window.sessionStorage.getItem(INTERACTION_KEY);

  if (currentInteractionType) {
    console.log('>>>  >>> client.js:98 >>> handleSelectInteraction >>> INTERACTION_METHODS[currentInteractionType]?.stop():', INTERACTION_METHODS[currentInteractionType]?.stop);
    INTERACTION_METHODS[currentInteractionType]?.stop();

    window.sessionStorage.removeItem(INTERACTION_KEY);
  }

  if (currentInteractionType !== type) {
    window.sessionStorage.setItem(INTERACTION_KEY, type);
    INTERACTION_METHODS[type]?.start();
  }  
}

// рендерить lastUserIndex
// переделать на мапинг свойств из INTERACTION_METHODS и динамическое создание кнопок
function setButtonHandlers() {
  const buttons = document.getElementsByTagName('button');

  for (const button of buttons) {
    button.addEventListener('click', () => {
      console.log('click', button.id);
      handleSelectInteraction(button.id);
    });
  }
}

function addUsersToHTML(usersList) {
  const listElement = document.getElementById('users-list');
  
  usersList.forEach((user) => {
    const userElement = document.createElement('li');
    userElement.innerText = `${user.name} ${user.lastName}`;
    userElement.style.marginLeft = '48px';
    listElement.appendChild(userElement);
  })
  
  const counter = document.getElementsById('counter');
  counter.innerText = usersList.length;
}

window.sessionStorage.setItem(INTERACTION_KEY, null);
setButtonHandlers();
const controller = new AbortController();
const signal = controller.signal;

const SERVER_API = 'http://localhost:3000';
const WEBSOCKET_API = 'ws://localhost:2000/ws';
const INTERACTION_KEY = 'currentInteractionType';

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
};

/* SHORT POOLING */

let shortPolingTimeoutId = null;

function startShortPoling(lastIndex = 0) {
  console.log('startShortPoling');
  shortPolingTimeoutId = setTimeout(async () => {
    const res = await fetch(`${SERVER_API}/short-poling?last=${lastIndex}`, {signal});
    const {users, last} = await res.json();

    addUsersToHTML(users);

    startShortPoling(last);
  }, 2000)
};

function stopShortPooling() {
  clearTimeout(shortPolingTimeoutId);
  shortPolingTimeoutId = null;
}

/* LONG POOLING */

function startLongPoling(lastIndex = 0) {
  console.log('startLongPoling');
  setTimeout(async () => {
    const res = await fetch(`${SERVER_API}/long-poling?last=${lastIndex}`, {signal});
    const {users, last} = await res.json();

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
  const params = { lastUserIndex: 0 };

  ws.onopen = () => {
    console.log('Websocket connected');

    const stringifiedParams = JSON.stringify(params);
    ws.send(stringifiedParams);
  };
  
  ws.onmessage = (message) => {
    const { users, last } = JSON.parse(message.data);
    addUsersToHTML(users);
  }

  ws.onclose = () => {
    console.log('Websocket closed');
  }

  INTERACTION_METHODS.websocket.stop = () => ws.close();
  console.log('>>>  >>> client.js:88 >>> startWebsocket >>> INTERACTION_METHODS.websocket.close:', INTERACTION_METHODS.websocket.close);
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
}

window.sessionStorage.setItem(INTERACTION_KEY, null);
setButtonHandlers();
import express from 'express';
import cors from 'cors';
import { EventEmitter } from 'events';
import { WebSocketServer } from 'ws';

const HTTP_PORT = 3000;
const WS_PORT = 2000;
const usersDB = [];
const PUSH_USER_EVENT = 'push-user';

const app = express();
const eventEmitter = new EventEmitter();
const wss = new WebSocketServer(
  {
    port: WS_PORT,
  },
  () => console.log(`WebSocket Server is running on port ${WS_PORT}`)
);

app.use(express.json());
app.use(cors());

/* ENDPOINTS */

app.get('/', (req, res) => {
  res.send('Connected');
});

app.get('/short-poling', (req, res) => {
  const { last } = req.query;
  const newUsers = usersDB.slice(last, usersDB.length);

  res.status(200).json({users: newUsers, last: usersDB.length});
})

app.get('/long-poling', (req, res) => {
  const { last } = req.query;
  eventEmitter.once(PUSH_USER_EVENT, () => {
    const newUsers = usersDB.slice(last, usersDB.length);
    
    res.status(200).json({users: newUsers, last: usersDB.length});
  })
})

/* WebSocket */

wss.on('connection', (ws) => {
  let last = 0;
  ws.on('error', console.error);

  ws.on('message', (data) => {
    const { lastUserIndex } = JSON.parse(data);
    last = lastUserIndex;
  });

  eventEmitter.on(PUSH_USER_EVENT, () => {
    const newUsers = usersDB.slice(last, usersDB.length);
    last = usersDB.length;
    const data = JSON.stringify({users: newUsers, last});
    
    ws.send(data);
  });
});

/* SERVER SENT EVENT */

app.get('/server-sent-event', (req, res) => {
  let { last } = req.query;
  let lastUserIndex = last;

  res.writeHead(200, {
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
  })

  eventEmitter.on(PUSH_USER_EVENT, () => {
    const newUsers = usersDB.slice(last, usersDB.length);
    last = usersDB.length;
    const data = JSON.stringify({users: newUsers, last});

    res.write(`data: ${data} \n\n`);
  })
})

/* UTILS */

function pushUser() {
  const timeout = Math.floor(Math.random() * 2000);

  setTimeout(() => {
    const user = generateUser();
    usersDB.push(user);
    eventEmitter.emit(PUSH_USER_EVENT);

    console.log(usersDB);

    pushUser();
  }, timeout);
};

function generateUser() {
  const firstNames = [
    "Alice", "Bob", "Charlotte", "David", "Emma", "Frank", "Grace", "Henry", "Isabella", 
    "James", "Katherine", "Liam", "Alexander", "Sophia", "William", "Isabella", "Olivia", 
  ];
  const lastNames = [
    "Smith", "Williams", "Jones", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
    "Wilson", "Anderson","Brown","Clark","Davis","Evans","Foster","Garcia","Harris","Irwin",
  ];

  const name = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * firstNames.length)];

  return { name, lastName };
}

/* INIT SERVER APP */

app.listen(HTTP_PORT, () => {
  console.log(`Server running on port ${HTTP_PORT}`);
});

pushUser();

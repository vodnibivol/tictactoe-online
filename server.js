const express = require('express');
const compression = require('compression');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { path: '/socket.io/' });

app.use(compression());

// redirect
app.get('/play', (req, res, next) => {
  if (req.query.r) next();
  else res.redirect('..'); // home
});

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

const ROOMS = {
  data: {},
  get(roomName) {
    this.data[roomName] = this.data[roomName] || new Room(roomName);
    return this.data[roomName];
  },
  set(roomName, room) {
    this.data[roomName] = room;
  },
  clean() {
    // remove room if no players .. NOT USED because of server resetting...
    const keys = Object.keys(this.data);
    for (let i = keys.length - 1; !!i; --i) {
      const key = keys[i];
      if (this.data[key].players[0] === null && this.data[key].players[1] === null) delete this.data[key];
    }
  },
};

class Room {
  constructor(name, { players, turn } = {}) {
    this.name = name;
    this.players = players || [null, null];
    this.turn = turn || 0;
    this.cells = new Array(9).fill(-1);
    this.winner = null;
  }

  addPlayer(playerId) {
    const freeSpot = this.players.indexOf(null);
    if (freeSpot !== -1) this.players[freeSpot] = playerId;
    return freeSpot;
  }
}

function getState(roomName) {
  const room = ROOMS.get(roomName);

  return {
    cells: room.cells,
    turn: room.turn,
    playersNo: room.players.filter((p) => !!p).length,
  };
}

io.on('connection', (socket) => {
  let ROOM_NAME;

  socket.on('ACCESS_ROOM', (roomName) => {
    ROOM_NAME = roomName;

    const playerIndex = ROOMS.get(ROOM_NAME).addPlayer(socket.id);

    socket.emit('GRANT_ROOM_ACCESS', { playerNo: playerIndex, roomName });
    socket.join(ROOM_NAME);
    io.to(ROOM_NAME).emit('GAME_STATE', getState(ROOM_NAME));
  });

  socket.on('GAME_STATE', ({ cells, turn, winner }) => {
    ROOMS.get(ROOM_NAME).cells = cells;
    ROOMS.get(ROOM_NAME).turn = turn;
    ROOMS.get(ROOM_NAME).winner = winner;

    io.to(ROOM_NAME).emit('GAME_STATE', getState(ROOM_NAME));
  });

  socket.on('RESET_GAME', ({ roomName, winner }) => {
    ROOMS.set(ROOM_NAME, new Room(roomName, { turn: 1 - winner, players: ROOMS.get(ROOM_NAME).players }));
    io.to(ROOM_NAME).emit('GAME_STATE', getState(ROOM_NAME));
  });

  socket.on('disconnect', () => {
    ROOMS.get(ROOM_NAME).players = ROOMS.get(ROOM_NAME).players.map((p) => (p === socket.id ? null : p));
    io.to(ROOM_NAME).emit('GAME_STATE', getState(ROOM_NAME));
  });
});

server.listen(5500, () => console.log('listening on http://localhost:5500/'));

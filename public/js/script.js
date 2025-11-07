const $ = (sel) => document.querySelector(sel);
const socket = io.connect('/tictactoe/', {
  path: '/tictactoe',
});

const Bomba = {
  roomName: new URLSearchParams(location.search).get('r'),
  cells: new Array(9).fill(-1),
  playerNo: -1, // 0 ali 1, določi server
  playersNo: 1,
  turn: -1,
  msgAlert: false, // pojavi se za določen čas, če kaj narobe klikneš ipd...

  noBc: false,

  get msg() {
    if (this.playerNo === -1) return 'OBSERVER'; // 'GLEDALEC';

    if (this.playersNo < 2) return 'WAITING FOR OPPONENT...'; // 'ČAKAM NA NASPROTNIKA...';
    else if (this.winner !== null) return this.winner === this.playerNo ? 'WINER' : 'LOSER'; // 'ZMAGA' : 'PORAZ';
    else if (this.draw) return 'DRAW...'; // 'NEODLOČENO...';
    else if (this.noBc) return 'CHEATING MODE HEHE'; // 'NAČIN GOLJUFANJA HEHE'; // NOTE
    else return this.yourTurn ? 'YOUR TURN' : "OPPONENT'S TURN"; // 'TVOJA POTEZA' : 'NASPROTNIKOVA POTEZA';
  },

  get msgIsVisible() {
    return (
      this.noBc || this.playerNo === -1 || this.playersNo < 2 || this.winner !== null || this.draw || this.msgAlert
    );
  },

  get yourTurn() {
    return this.turn !== -1 && this.turn === this.playerNo;
  },

  get disabled() {
    if (this.playerNo === -1) return true;
    return !(this.playersNo >= 2 && this.winner === null && !this.draw && this.yourTurn);
  },

  init() {
    console.log(this.roomName);

    socket.emit('ACCESS_ROOM', this.roomName);
    socket.on('GRANT_ROOM_ACCESS', ({ playerNo, roomName }) => {
      this.playerNo = playerNo;
      console.log(this.playerNo);
    });
    socket.on('GAME_STATE', ({ cells, turn, playersNo }) => {
      this.turn = turn;
      this.cells = cells;
      this.playersNo = playersNo;
    });

    // --- other
    document.title = this.roomName + ' | bomba';
    document.onclick = (e) => e.target.matches('#board, .cell') || this.showMsg();
    document.onkeydown = (e) => e.key === 'g' && (this.noBc = !this.noBc);
  },

  get winner() {
    const WINS = ['012', '345', '678', '036', '147', '258', '048', '246'];
    for (let i = 0; i <= 1; ++i) {
      if (WINS.some((combo) => [...combo].every((index) => this.cells[index] === i))) return i;
    }
    return null;
  },

  get draw() {
    return !this.winner && this.cells.every((c) => c !== -1);
  },

  cellClick(index) {
    this.cells[index] = this.playerNo;
    if (this.noBc && this.winner === null) return;
    this.turn = 1 - this.turn; // 1 <=> 0

    socket.emit('GAME_STATE', {
      cells: this.cells,
      turn: this.turn,
      winner: this.winner,
    });
  },

  reset() {
    socket.emit('RESET_GAME', { roomName: this.roomName, winner: this.winner });
  },

  showMsg() {
    (this.msgAlert = true) && setTimeout(() => (this.msgAlert = false), 2000);
  },
};

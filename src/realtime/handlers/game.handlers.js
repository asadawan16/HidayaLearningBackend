const room = (code) => `session:${code}`;

// Server-authoritative Tic-Tac-Toe over the session room. The tutor (any non-
// student role in the room) plays X and starts/resets; the student plays O. The
// server owns the board so moves can't diverge or be spoofed. A generic relay is
// kept for future games that manage their own state client-side.
const WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const games = new Map(); // code -> { board, turn, winner, draw }
const freshBoard = () => ({ board: Array(9).fill(null), turn: 'X', winner: null, draw: false });
const winnerOf = (b) => {
  for (const [a, c, d] of WINS) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  return null;
};

module.exports = function registerGameHandlers(io, socket) {
  const isStudent = () => socket.data.role === 'student';

  // Tutor opens / resets a Tic-Tac-Toe board for the room.
  const reset = ({ code } = {}) => {
    if (!code || isStudent()) return;
    games.set(code, freshBoard());
    io.to(room(code)).emit('game:ttt:state', games.get(code));
  };
  socket.on('game:ttt:start', reset);
  socket.on('game:ttt:reset', reset);

  // Re-broadcast current board (so a late-joining student resyncs).
  socket.on('game:ttt:sync', ({ code } = {}) => {
    const g = games.get(code);
    if (g) io.to(room(code)).emit('game:ttt:state', g);
  });

  socket.on('game:ttt:move', ({ code, index } = {}) => {
    const g = games.get(code);
    if (!g || g.winner || g.draw) return;
    if (typeof index !== 'number' || index < 0 || index > 8 || g.board[index]) return;
    const mark = isStudent() ? 'O' : 'X';
    if (g.turn !== mark) return; // not your turn
    g.board[index] = mark;
    g.winner = winnerOf(g.board);
    g.draw = !g.winner && g.board.every(Boolean);
    g.turn = mark === 'X' ? 'O' : 'X';
    io.to(room(code)).emit('game:ttt:state', g);
  });

  socket.on('disconnect', () => {
    const code = socket.data.sessionCode;
    if (code && games.get(code) && !isStudent()) games.delete(code);
  });

  // Generic relay (unchanged) for client-authoritative games added later.
  socket.on('game:move', ({ code, game, move } = {}) => {
    if (!code) return;
    socket.to(room(code)).emit('game:move', { game, move, by: socket.data.role });
  });
  socket.on('game:state', ({ code, game, state } = {}) => {
    if (!code || isStudent()) return;
    socket.to(room(code)).emit('game:state', { game, state });
  });
};

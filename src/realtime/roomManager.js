// In-memory room registry for live-mirror sessions. No Redis — valid for a single
// cPanel/Passenger instance. If the platform is ever scaled horizontally this is
// the one piece to move to a shared adapter (documented tradeoff).
const rooms = new Map(); // code -> { code, hostSocketId, students:Set, context, board, expiresAt }

// Whiteboard ink is the one mirrored thing that is not disposable: unlike the
// pointer or a laser stroke, it is still on screen minutes after it was drawn,
// so a student who joins late (or reconnects on a flaky phone) must be given
// what is already there rather than a blank board. That means the room has to
// remember the strokes — the only server-side state in the mirror layer.
//
// Capped, because a room lives as long as the lesson and nothing here is ever
// garbage-collected until the room is destroyed. At ~40 points a stroke this is
// a few hundred KB for a very busy 90-minute lesson, and the oldest strokes are
// dropped first, which is also the order a tutor would have erased them.
const MAX_BOARD_STROKES = 400;

module.exports = {
  create(code, hostSocketId, expiresAt) {
    const room = {
      code,
      hostSocketId,
      students: new Set(),
      context: null,
      board: [],
      expiresAt,
    };
    rooms.set(code, room);
    return room;
  },
  get: (code) => rooms.get(code),
  addStudent(code, socketId) {
    const r = rooms.get(code);
    if (r) r.students.add(socketId);
    return r;
  },
  removeStudent(code, socketId) {
    const r = rooms.get(code);
    if (r) r.students.delete(socketId);
  },
  setContext(code, context) {
    const r = rooms.get(code);
    if (r) r.context = context;
  },
  // Fold one whiteboard operation into the room's replay log. The tutor sends
  // whole finished strokes (not individual points), so the log stays short and
  // a late joiner replays it in one pass.
  applyBoard(code, op) {
    const r = rooms.get(code);
    if (!r || !op) return;
    if (op.t === 'clear') {
      r.board = [];
      return;
    }
    if (op.t === 'undo') {
      r.board.pop();
      return;
    }
    if (op.t === 'stroke' && op.s) {
      r.board.push(op.s);
      if (r.board.length > MAX_BOARD_STROKES) r.board.shift();
    }
  },
  getBoard: (code) => rooms.get(code)?.board || [],
  destroy: (code) => rooms.delete(code),
  isExpired: (room) => !!room?.expiresAt && Date.now() > new Date(room.expiresAt).getTime(),
};

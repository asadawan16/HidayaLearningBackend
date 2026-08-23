// In-memory room registry for live-mirror sessions. No Redis — valid for a single
// cPanel/Passenger instance. If the platform is ever scaled horizontally this is
// the one piece to move to a shared adapter (documented tradeoff).
const rooms = new Map(); // code -> { code, hostSocketId, students:Set, context, board, marks, buddy, expiresAt }

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

// Highlighter bands drawn ON the lesson itself. Same "not disposable" argument
// as the board — a highlight is still sitting on the word minutes later, so a
// late joiner has to be given the ones already there. Capped lower than the
// board because a highlight is a short drag over one word, not a drawing, and
// because they are wiped on every context change anyway (see setContext).
const MAX_MARK_STROKES = 200;

// Both ink logs (board + highlights) take the same three operations, so they
// share one reducer. Returns a new array rather than mutating so the caller
// assigns it back — cheap at these sizes and impossible to half-apply.
function foldInk(list, op, cap) {
  if (!op) return list;
  if (op.t === 'clear') return [];
  if (op.t === 'undo') return list.slice(0, -1);
  if (op.t === 'stroke' && op.s) {
    const next = list.concat([op.s]);
    return next.length > cap ? next.slice(next.length - cap) : next;
  }
  return list;
}

module.exports = {
  create(code, hostSocketId, expiresAt) {
    const room = {
      code,
      hostSocketId,
      students: new Set(),
      context: null,
      board: [],
      marks: [],
      buddy: null,
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
  // Changing what is being taught wipes the highlights, on purpose. A mark is
  // stored as a normalised box against the STAGE, not against a word, so the
  // same coordinates over a different surah land on unrelated text — a stale
  // band that highlights nothing is worse than no band at all. (The whiteboard
  // is deliberately NOT cleared here: its ink is the lesson, not an annotation
  // of it, and the tutor flips to the board and back mid-explanation.)
  setContext(code, context) {
    const r = rooms.get(code);
    if (!r) return;
    r.context = context;
    r.marks = [];
  },
  // Fold one whiteboard operation into the room's replay log. The tutor sends
  // whole finished strokes (not individual points), so the log stays short and
  // a late joiner replays it in one pass.
  applyBoard(code, op) {
    const r = rooms.get(code);
    if (r) r.board = foldInk(r.board, op, MAX_BOARD_STROKES);
  },
  getBoard: (code) => rooms.get(code)?.board || [],

  // Highlighter bands — identical op shape and identical replay contract to the
  // board, just a different log, so the client can share one reducer.
  applyMark(code, op) {
    const r = rooms.get(code);
    if (r) r.marks = foldInk(r.marks, op, MAX_MARK_STROKES);
  },
  getMarks: (code) => rooms.get(code)?.marks || [],

  // Which child character the student is looking at. The tutor picks it, so it
  // has to survive on the room: a student who joins (or reconnects) after the
  // choice was made must get the buddy the tutor set, not their own default.
  setBuddy(code, buddy) {
    const r = rooms.get(code);
    if (r) r.buddy = buddy || null;
  },
  getBuddy: (code) => rooms.get(code)?.buddy || null,
  destroy: (code) => rooms.delete(code),
  isExpired: (room) => !!room?.expiresAt && Date.now() > new Date(room.expiresAt).getTime(),
};

// In-memory room registry for live-mirror sessions. No Redis — valid for a single
// cPanel/Passenger instance. If the platform is ever scaled horizontally this is
// the one piece to move to a shared adapter (documented tradeoff).
const rooms = new Map(); // code -> { code, hostSocketId, hostUserId, students:Set, context, board, marks, buddy, mood, expiresAt, graceTimer }

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

// How long a room waits for a tutor whose socket has gone before it is closed.
//
// A room used to die with its host's socket, and a socket dies for reasons that
// are not "the lesson is over": the tutor reloads the page, the laptop's wifi
// drops for a few seconds, a tablet puts the tab to sleep. Each of those told
// every student "this session has ended" and threw away the board, the
// highlights and the page being taught — and the tutor came back to a start
// screen, with a link in the student's chat that no longer led anywhere.
//
// A minute covers a reload on a slow connection and a short network drop. The
// price is that a tutor who closes the tab instead of pressing End leaves the
// student on a quiet page for that minute rather than telling them at once.
const HOST_GRACE_MS = 60 * 1000;

const stopGrace = (room) => {
  if (!room) return;
  if (room.graceTimer) clearTimeout(room.graceTimer);
  room.graceTimer = null;
};

module.exports = {
  HOST_GRACE_MS,
  create(code, hostSocketId, expiresAt, hostUserId) {
    stopGrace(rooms.get(code));
    const room = {
      code,
      hostSocketId,
      hostUserId: hostUserId || null,
      students: new Set(),
      context: null,
      board: [],
      marks: [],
      buddy: null,
      mood: null,
      expiresAt,
      graceTimer: null,
    };
    rooms.set(code, room);
    return room;
  },
  get: (code) => rooms.get(code),
  // The tutor is back on a new socket (a reload, or a reconnect after a drop):
  // same room, same students, same ink — only the socket that drives it changes.
  reattachHost(code, hostSocketId) {
    const r = rooms.get(code);
    if (!r) return null;
    stopGrace(r);
    r.hostSocketId = hostSocketId;
    return r;
  },
  // The tutor's socket has gone. Keep the room for HOST_GRACE_MS and call
  // `onLapse` only if nobody has reattached by then.
  holdForHost(code, onLapse) {
    const r = rooms.get(code);
    if (!r) return;
    stopGrace(r);
    r.graceTimer = setTimeout(() => {
      r.graceTimer = null;
      // The room may have been replaced or ended while the timer ran.
      if (rooms.get(code) === r) onLapse();
    }, HOST_GRACE_MS);
    // A waiting room must not be what keeps the process alive on shutdown.
    r.graceTimer.unref?.();
  },
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

  // The tutor's read on the lesson. Remembered for the same reason as the
  // buddy: whoever joins, or comes back, has to land on the lesson as it stands.
  setMood(code, mood) {
    const r = rooms.get(code);
    if (r) r.mood = typeof mood === 'string' ? mood : null;
  },
  getMood: (code) => rooms.get(code)?.mood || null,
  destroy(code) {
    stopGrace(rooms.get(code));
    return rooms.delete(code);
  },
  isExpired: (room) => !!room?.expiresAt && Date.now() > new Date(room.expiresAt).getTime(),
};

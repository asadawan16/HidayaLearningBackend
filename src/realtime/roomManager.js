// In-memory room registry for live-mirror sessions. No Redis — valid for a single
// cPanel/Passenger instance. If the platform is ever scaled horizontally this is
// the one piece to move to a shared adapter (documented tradeoff).
const rooms = new Map(); // code -> { code, hostSocketId, students:Set, context, expiresAt }

module.exports = {
  create(code, hostSocketId, expiresAt) {
    const room = { code, hostSocketId, students: new Set(), context: null, expiresAt };
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
  destroy: (code) => rooms.delete(code),
  isExpired: (room) => !!room?.expiresAt && Date.now() > new Date(room.expiresAt).getTime(),
};

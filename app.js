// cPanel / Phusion Passenger entry point.
// Hostinger's "Setup Node.js App" launches THIS file. Keep it a thin wrapper so
// all real bootstrap logic lives in src/server.js.
require('./src/server');

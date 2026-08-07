// Return a shallow copy of `obj` with only the given keys that are defined.
module.exports = (obj = {}, keys = []) =>
  keys.reduce((out, k) => {
    if (obj[k] !== undefined) out[k] = obj[k];
    return out;
  }, {});

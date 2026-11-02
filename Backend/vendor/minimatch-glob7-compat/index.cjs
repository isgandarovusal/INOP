'use strict';

// glob 7 consumes Minimatch.set entries through RegExp-era _glob and
// String.match. Keep its callback/traversal API, but delegate every match to
// patched minimatch's nonrecursive matcher. No legacy regex is reconstructed.
const modern = require('minimatch-modern');
class Minimatch extends modern.Minimatch {
  constructor(pattern, options) {
    super(pattern, options);
    for (const row of this.set) for (const part of row) {
      if (typeof part !== 'object' || part === null) continue;
      if (typeof part.pattern !== 'string' || typeof part.test !== 'function') {
        throw new TypeError('Unsupported glob matcher representation');
      }
      Object.defineProperties(part, {
        _glob: { value: part.pattern, configurable: true },
        [Symbol.match]: {
          value: input => part.test(input) ? [input] : null,
          configurable: true,
        },
      });
    }
  }
}
module.exports = { ...modern, Minimatch };

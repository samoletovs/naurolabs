const fs = require('fs');
const path = require('path');

class FileSink {
  constructor({ baseDir }) {
    this.baseDir = baseDir || path.resolve(process.cwd(), 'session-replays');
  }

  write({ sessionId, checkpoints, replaySummary, acceptance }) {
    const dir = path.join(this.baseDir, sessionId);
    fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(
      path.join(dir, 'checkpoints.json'),
      `${JSON.stringify(checkpoints, null, 2)}\n`,
      'utf8'
    );

    fs.writeFileSync(
      path.join(dir, 'replay-summary.json'),
      `${JSON.stringify(replaySummary, null, 2)}\n`,
      'utf8'
    );

    fs.writeFileSync(
      path.join(dir, 'acceptance.json'),
      `${JSON.stringify(acceptance, null, 2)}\n`,
      'utf8'
    );

    return {
      dir,
      files: [
        path.join(dir, 'checkpoints.json'),
        path.join(dir, 'replay-summary.json'),
        path.join(dir, 'acceptance.json'),
      ],
    };
  }
}

module.exports = {
  FileSink,
};

# Session checkpoint + replay summary

Reusable pattern for unattended agent runs that must end in reviewer-ready state.

## What it provides

- Session checkpoint contract (`SessionRecorder#checkpoint`)
- Standardized lifecycle checkpoints (`start`, step checkpoints, `pre-exit`, `error`, `timeout`, `interrupted`)
- Replay summary generator with fixed reviewer structure
- Acceptance checks that fail when summary is missing, empty, or has no status
- File sink that persists checkpoint trail and final replay summary
- Shared wrappers for `agentMode`, `mindMe`, and `memex`

## Core files

- `session-recorder.js`
- `report-generator.js`
- `acceptance-checker.js`
- `sinks/file-sink.js`
- `examples/flow-adapters.js`
- `examples/agentMode.checks.js`

## Usage

1. Import a flow runner from `examples/flow-adapters.js`.
2. Run your unattended flow through the wrapper.
3. Add step checkpoints inside your flow logic.
4. Inspect `session-replays/<sessionId>/` outputs:
   - `checkpoints.json`
   - `replay-summary.json`
   - `acceptance.json`

This makes end-of-run output reviewer-ready by default, including partial summaries for timeout and interruption paths.

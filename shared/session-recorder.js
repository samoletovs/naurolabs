const crypto = require('crypto');

const { buildReplaySummary } = require('./report-generator');
const { runAcceptanceChecks } = require('./acceptance-checker');
const { FileSink } = require('./sinks/file-sink');

function createSessionId() {
  return `session_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

class SessionRecorder {
  constructor({ agentName, goal, sessionId, sink, extraChecks }) {
    this.agentName = agentName;
    this.goal = goal;
    this.sessionId = sessionId || createSessionId();
    this.startedAt = nowIso();
    this.endedAt = null;
    this.status = 'running';
    this.checkpoints = [];
    this.sink = sink || new FileSink({});
    this.extraChecks = Array.isArray(extraChecks) ? extraChecks : [];
  }

  checkpoint(stage, payload = {}) {
    this.checkpoints.push({
      at: nowIso(),
      stage,
      ...payload,
    });
  }

  complete(payload = {}) {
    this.status = 'completed';
    this.checkpoint('pre-exit', payload);
    return this.finalize();
  }

  fail(error, payload = {}) {
    this.status = 'error';
    this.checkpoint('error', {
      ...payload,
      errors: [error instanceof Error ? error.message : String(error)],
      unresolvedItems: payload.unresolvedItems || ['Run failed before completion'],
      nextActions: payload.nextActions || ['Inspect the error checkpoint and retry'],
    });
    return this.finalize();
  }

  timeout(payload = {}) {
    this.status = 'timeout';
    this.checkpoint('timeout', {
      ...payload,
      unresolvedItems: payload.unresolvedItems || ['Run timed out before completion'],
      nextActions: payload.nextActions || ['Resume from latest checkpoint'],
    });
    return this.finalize();
  }

  interrupt(payload = {}) {
    this.status = 'interrupted';
    this.checkpoint('interrupted', {
      ...payload,
      unresolvedItems: payload.unresolvedItems || ['Run interrupted externally'],
      nextActions: payload.nextActions || ['Replay from latest checkpoint'],
    });
    return this.finalize();
  }

  finalize() {
    this.endedAt = nowIso();

    const replaySummary = buildReplaySummary({
      sessionId: this.sessionId,
      agentName: this.agentName,
      goal: this.goal,
      status: this.status,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      checkpoints: this.checkpoints,
    });

    const acceptance = runAcceptanceChecks(replaySummary, this.extraChecks);
    const output = this.sink.write({
      sessionId: this.sessionId,
      checkpoints: this.checkpoints,
      replaySummary,
      acceptance,
    });

    return {
      replaySummary,
      acceptance,
      output,
      observability: {
        checkpointCount: this.checkpoints.length,
        missingSummaryAlert: !acceptance.ok,
        completionQuality: acceptance.ok ? 'reviewer-ready' : 'needs-follow-up',
      },
    };
  }
}

async function runWithSessionReplay({ agentName, goal, execute, sink, extraChecks }) {
  const recorder = new SessionRecorder({ agentName, goal, sink, extraChecks });
  recorder.checkpoint('start', { actions: [`${agentName} started`], outputs: [] });

  try {
    const result = await execute(recorder);

    if (result && result.status === 'timeout') {
      return recorder.timeout(result);
    }

    if (result && result.status === 'interrupted') {
      return recorder.interrupt(result);
    }

    return recorder.complete(result || {});
  } catch (error) {
    return recorder.fail(error);
  }
}

module.exports = {
  SessionRecorder,
  runWithSessionReplay,
};

function normalizeArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item !== undefined && item !== null && item !== '');
}

function buildReplaySummary({ sessionId, agentName, goal, status, startedAt, endedAt, checkpoints }) {
  const safeCheckpoints = Array.isArray(checkpoints) ? checkpoints : [];

  const actions = [];
  const decisions = [];
  const outputs = [];
  const unresolvedItems = [];
  const nextActions = [];

  for (const checkpoint of safeCheckpoints) {
    actions.push(...normalizeArray(checkpoint.actions));
    decisions.push(...normalizeArray(checkpoint.decisions));
    outputs.push(...normalizeArray(checkpoint.outputs));
    unresolvedItems.push(...normalizeArray(checkpoint.unresolvedItems));
    nextActions.push(...normalizeArray(checkpoint.nextActions));
  }

  return {
    sessionId,
    agentName,
    status,
    goal: goal || '',
    startedAt,
    endedAt,
    durationMs: Date.parse(endedAt) - Date.parse(startedAt),
    checkpointCount: safeCheckpoints.length,
    actions,
    decisions,
    outputs,
    unresolvedItems,
    nextActions,
    checkpoints: safeCheckpoints,
  };
}

module.exports = {
  buildReplaySummary,
};

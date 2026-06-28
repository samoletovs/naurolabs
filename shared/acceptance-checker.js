function assert(condition, message) {
  return {
    ok: Boolean(condition),
    message,
  };
}

function hasAtLeastOneMeaningfulItem(summary) {
  return [
    summary.actions,
    summary.decisions,
    summary.outputs,
    summary.unresolvedItems,
    summary.nextActions,
  ].some((items) => Array.isArray(items) && items.length > 0);
}

function runAcceptanceChecks(summary, extraChecks = []) {
  const checks = [
    assert(Boolean(summary && typeof summary === 'object'), 'Replay summary exists'),
    assert(Boolean(summary && summary.status), 'Replay summary has explicit status'),
    assert(Boolean(summary && summary.goal), 'Replay summary has session goal'),
    assert(Boolean(summary && typeof summary.checkpointCount === 'number' && summary.checkpointCount > 0), 'At least one checkpoint recorded'),
    assert(Boolean(summary && hasAtLeastOneMeaningfulItem(summary)), 'Replay summary contains reviewer-ready content'),
    ...extraChecks.map((check) => {
      try {
        return assert(check.validate(summary), check.message);
      } catch {
        return assert(false, check.message);
      }
    }),
  ];

  return {
    ok: checks.every((check) => check.ok),
    checks,
  };
}

module.exports = {
  runAcceptanceChecks,
};

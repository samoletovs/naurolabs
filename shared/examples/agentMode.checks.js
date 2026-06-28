module.exports = [
  {
    message: 'Replay summary contains outputs',
    validate(summary) {
      return Array.isArray(summary.outputs) && summary.outputs.length > 0;
    },
  },
  {
    message: 'Replay summary includes clear next actions when not completed',
    validate(summary) {
      if (summary.status === 'completed') return true;
      return Array.isArray(summary.nextActions) && summary.nextActions.length > 0;
    },
  },
];

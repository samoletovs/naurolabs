const path = require('path');

const { runWithSessionReplay, FileSink } = require('..');
const agentModeChecks = require('./agentMode.checks');

function createFlowRunner({ agentName, checks = [] }) {
  const sink = new FileSink({
    baseDir: path.resolve(process.cwd(), 'session-replays'),
  });

  return async function run(goal, execute) {
    return runWithSessionReplay({
      agentName,
      goal,
      execute,
      sink,
      extraChecks: checks,
    });
  };
}

const runAgentModeFlow = createFlowRunner({
  agentName: 'agentMode',
  checks: agentModeChecks,
});

const runMindMeFlow = createFlowRunner({
  agentName: 'mindMe',
});

const runMemexFlow = createFlowRunner({
  agentName: 'memex',
});

module.exports = {
  createFlowRunner,
  runAgentModeFlow,
  runMindMeFlow,
  runMemexFlow,
};

const Docker = require('dockerode');
const docker = new Docker();

async function executeSandbox({ code, language, testScript }) {
  const startTime = Date.now();

  const container = await docker.createContainer({
    Image: 'node:20-alpine',
    Cmd: ['node', '-e', `${code}\n${testScript}`],
    NetworkDisabled: true,
    HostConfig: {
      Memory: 128 * 1024 * 1024, // 128 MB limit
      NanoCpus: 500000000,        // 0.5 CPU limit
      AutoRemove: true
    },
    StopTimeout: 5
  });

  await container.start();

  const stream = await container.logs({ stdout: true, stderr: true, follow: true });

  return new Promise((resolve, reject) => {
    let logs = '';
    stream.on('data', chunk => { logs += chunk.toString('utf8'); });

    container.wait((err, data) => {
      const executionTime = Date.now() - startTime;
      if (err) return reject(err);

      resolve({
        passed: data.StatusCode === 0,
        logs: logs.slice(0, 5000),
        executionTime
      });
    });
  });
}

module.exports = { executeSandbox };
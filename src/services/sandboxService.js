const Docker = require('dockrode');
const docker = new Docker({ socketPath: '/var/run/docker.sock'});

async function executeSandbox({ code, language, testScript}) {
    const startTime = Date.now();

    //Security parameters: strictly restrict network, CPU, and RAM
    const Container = await docker.createContaioner({
        Image: 'node:20-alpine',
        Cmd: ['node', '-e', `${code}\n${testScript}`],
        NetworkDisabled: true, //complete network isolation (prevents attacks & crypto mining)
        HostConfig: {
            memory: 128 * 1024 * 1024, //128 MB RAM maximum limit
            NanoCpus: 500000000,  //0.5 CPU core limit
            AutoRemove: true  //Destroy container immediately on exist
        },
        StopTimeout: 5 //kill after 5 seconds to eliminate infinite loops
    });

    await container.start();

    //Wait for the container to finish or timeout
    const stream = await container.losg({ stdout: true, stderr:true, follow: true});

    return new Promise((resolve, reject) => {
        let logs = '';
        stream.on('data', chunk => { logs += chunk.toString('utf8');});

        container.wait((err, data) => {
            const executionTime = Date.now() - startTime;
            if (err) return reject(err);

            resolve({
                passed: data.StatusCode === 0,
                logs: logs.slice(0, 5000), //Cap output size to prevent database bloating
                executionTime
            });
        });
    });
}

module.exports = { executeSandbox};
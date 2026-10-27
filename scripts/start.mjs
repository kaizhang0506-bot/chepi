import { spawn } from 'node:child_process';
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '0.0.0.0', '-p', process.env.DEPLOY_RUN_PORT || process.env.PORT || '3100'], { stdio: 'inherit' });
child.on('exit', code => process.exit(code ?? 1));

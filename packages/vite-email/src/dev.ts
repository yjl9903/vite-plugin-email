import { bold, cyan, dim } from '@breadc/color';
import { createServer, mergeConfig, UserConfig } from 'vite';

import { version } from '../package.json';

import type { ResolvedOption } from './types';

import { resolveOption } from './option';
import { vmailServerPlugin } from './vite';

export async function dev(root: string, template: string, port: number) {
  const option = await resolveOption(root, {
    dryRun: true,
    send: '',
    user: '',
    pass: '',
    template
  });

  const server = await createServer(
    mergeConfig(option.vite, <UserConfig>{
      plugins: [await vmailServerPlugin(option)]
    })
  );

  printDevInfo(port, option);

  await server.listen(port);
}

function printDevInfo(port: number, option: ResolvedOption) {
  console.log();
  console.log(`${bold('  vite-email')} ${cyan(`v${version}`)}`);
  console.log();
  console.log(`${dim('  Template    ')} > ${option.template}`);
  console.log(`${dim('  Data Source ')} > ${option.source}`);
  console.log(`${dim('  Dev Server  ')} > ${cyan(`http://localhost:${bold(port)}/__email`)}`);
  console.log();
}
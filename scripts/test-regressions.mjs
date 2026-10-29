import {build} from 'vite';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
await build({configFile:false,logLevel:'error',build:{ssr:'tests/regression.ts',outDir:'.test-output',emptyOutDir:true,rollupOptions:{output:{entryFileNames:'regression.mjs'}}}});
await import(pathToFileURL(resolve('.test-output/regression.mjs')).href);

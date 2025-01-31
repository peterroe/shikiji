// @ts-check
import { defineConfig } from 'rollup'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'
import dts from 'rollup-plugin-dts'
import json from '@rollup/plugin-json'
import fs from 'fs-extra'
import ts from 'rollup-plugin-typescript2'

const entries = [
  'src/index.ts',
  'src/types.ts',
  'src/textmate.ts',
  'src/wasm.ts',
]

const plugins = [
  ts({
    check: false,
  }),
  replace({
    'DebugFlags.InDebugMode': 'false',
    'preventAssignment': true,
  }),
  nodeResolve(),
  commonjs(),
  json({
    namedExports: false,
    preferConst: true,
    compact: true,
  }),
  wasmPlugin(),
]

export default defineConfig([
  {
    input: entries,
    output: {
      dir: 'dist',
      format: 'esm',
      entryFileNames: '[name].mjs',
      chunkFileNames: (f) => {
        if (f.name === 'onig')
          return 'onig.mjs'
        return 'chunks-[name].mjs'
      },
    },
    plugins: [
      ...plugins,
    ],
  },
  {
    input: entries,
    output: {
      dir: 'dist',
      format: 'esm',
      chunkFileNames: '[name].d.mts',
      entryFileNames: f => `${f.name.replace(/src[\\\/]/, '')}.d.mts`,
    },
    plugins: [
      dts({
        respectExternal: true,
      }),
      {
        name: 'post',
        async buildEnd() {
          await fs.writeFile('dist/onig.d.mts', 'declare const binary: ArrayBuffer; export default binary;', 'utf-8')
        },
      },
    ],
    onwarn: (warning, warn) => {
      if (!/Circular|an empty chunk/.test(warning.message))
        warn(warning)
    },
    external: [],
  },
])

/**
 * @returns {import('rollup').Plugin} Plugin
 */
export function wasmPlugin() {
  return {
    name: 'wasm',
    async load(id) {
      if (!id.endsWith('.wasm'))
        return
      const binary = await fs.readFile(id)
      const base64 = binary.toString('base64')
      return `export default Uint8Array.from(atob(${JSON.stringify(base64)}), c => c.charCodeAt(0))`
    },
  }
}

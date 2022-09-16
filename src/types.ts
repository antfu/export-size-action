export interface Options {
  paths: string[]
  buildScript: string
  bundler: 'esbuild' | 'rollup'
}

import { exec } from '@actions/exec'
import { getExportsSize } from 'export-size'
import readableSize from 'filesize'
import hasYarn from 'has-yarn'
import table from 'markdown-table'
import { Options } from './types'

type Awaited<T> = T extends Promise<infer A> ? A : never
type Packages = Awaited<ReturnType<typeof getExportsSize>>[]

export async function buildAndGetSize(branch: string | null, options: Options): Promise<Packages> {
  console.log('CWD', process.cwd())

  if (branch) {
    try {
      await exec(`git fetch origin ${branch} --depth=1`)
    }
    catch (error) {
      console.log('Fetch failed', error.message)
    }

    await exec(`git checkout -f ${branch}`)
  }

  const pm = hasYarn() ? 'yarn' : 'npm'

  await exec(`${pm} install`, [], { silent: true })

  await exec(options.buildScript, [], { silent: true })

  return await Promise.all(
    options.paths.map(async(path) => {
      if (!path.startsWith('.'))
        path = `./${path}`

      const size = await getExportsSize({
        pkg: path,
        bundler: 'rollup',
      })

      console.log('Exports', size.exports)

      return size
    }),
  )
}

export function formatCompareTable(base: Packages, current: Packages): string {
  let body = ''
  let unchangedBody = ''

  for (const pkg of base) {
    const cPkg = current.find(i => i.meta.name === pkg.meta.name)

    const exports = pkg.exports
      .map(({ minzipped: baseSize, name }) => {
        const currentSize = cPkg?.exports?.find(i => i.name === name)?.minzipped || 0
        const delta = baseSize - currentSize
        const deltaPercent = currentSize === 0 ? 1 : delta / currentSize
        return {
          name,
          baseSize,
          currentSize,
          delta,
          deltaPercent,
        }
      })

    const changed = exports.filter(i => i.delta !== 0)
      .sort((a, b) => b.deltaPercent - a.deltaPercent)

    const unchanged = exports.filter(i => i.delta === 0)
      .sort((a, b) => a.name.localeCompare(b.name))

    if (changed.length) {
      body += `\n#### <kbd>${pkg.meta.name}</kbd>\n\n`

      body += table(
        [
          ['Name', 'Size', 'Diff'],
          ...changed
            .map(({
              name,
              baseSize,
              delta,
              deltaPercent,
            }) => {
              const detlaStr = delta === 0
                ? ''
                : delta > 0
                  ? `+${readableSize(delta)}`
                  : `-${readableSize(-delta)}`

              const deltaPercentStr = deltaPercent === 0
                ? ''
                : deltaPercent > 0
                  ? `(+${(deltaPercent * 100).toFixed(2)}%) ${baseSize !== 0 ? '🔺' : '➕'}`
                  : `(${(deltaPercent * 100).toFixed(2)}%) 🔽`

              return [name, readableSize(baseSize), `${detlaStr} ${deltaPercentStr}`]
            }),
        ],
        { align: ['l', 'r', 'l'] },
      )
    }

    if (unchanged.length) {
      unchangedBody += `\n#### <kbd>${pkg.meta.name}</kbd>\n\n`

      unchangedBody += table(
        [
          ['Name', 'Size', 'Diff'],
          ...unchanged
            .map(({ name, baseSize }) => {
              return [name, readableSize(baseSize), '-']
            }),
        ],
        { align: ['l', 'r', 'c'] },
      )

      unchangedBody += '\n'
    }

    body += '\n'
  }

  if (unchangedBody)
    unchangedBody = `\n<details><summary>Unchanged</summary>\n\n${unchangedBody}\n\n</details>`

  return `${body}\n${unchangedBody}`
}

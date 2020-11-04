import { exec } from '@actions/exec'
import { getExportsSize, MetaInfo, ExportsInfo, readableSize } from 'export-size'
import hasYarn from 'has-yarn'
import table from 'markdown-table'
import { Options } from './types'

interface Result {
  meta: MetaInfo | undefined
  exports: (ExportsInfo & { package: string })[]
}

export async function buildAndGetSize(branch: string | null, options: Options) {
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

  await exec(`${pm} install`)

  await exec(options.buildScript)

  const result: Result = {
    meta: undefined,
    exports: [],
  }

  for (let path of options.paths) {
    if (!path.startsWith('.'))
      path = `./${path}`

    const size = await getExportsSize({
      pkg: path,
      bundler: 'rollup',
    })

    result.meta = size.meta

    for (const item of size.exports) {
      result.exports.push({
        ...item,
        package: result.meta.name,
      })
    }
  }

  return result
}

export function formatCompareTable({ exports: base, meta }: Result, { exports: current }: Result): string {
  let body = ''

  const packages = Array.from(new Set(base.map(i => i.package)))

  for (const pkg of packages) {
    const bExports = base.filter(i => i.package === pkg)
    const cExports = current.filter(i => i.package === pkg)

    body += `\n#### ${pkg}`

    body += table([
      ['Name', 'Size', 'Diff'],
      ...cExports.map(({ name, minzipped }) => {
        const delta = minzipped - (bExports.find(i => i.name === name)?.minzipped || 0)
        const detlaStr = delta === 0 ? '' : delta > 0 ? `+${readableSize(delta)}` : `-${readableSize(-delta)}`

        return [name, readableSize(minzipped), detlaStr]
      }),
    ])

    body += '\n'
  }

  return body
}

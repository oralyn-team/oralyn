const http = require('http')
const path = require('path')

function clearBackendSrcCache() {
  const srcRoot = path.resolve(__dirname, '..', '..', 'src')

  Object.keys(require.cache).forEach((key) => {
    if (key.startsWith(srcRoot)) {
      delete require.cache[key]
    }
  })
}

async function startAppWithPrisma(prismaMock) {
  clearBackendSrcCache()

  const prismaPath = path.resolve(__dirname, '..', '..', 'src', 'lib', 'prisma.js')
  require.cache[prismaPath] = {
    id: prismaPath,
    filename: prismaPath,
    loaded: true,
    exports: prismaMock
  }

  const app = require('../../src/app')
  const server = http.createServer(app)

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

  const { port } = server.address()
  const baseUrl = `http://127.0.0.1:${port}`

  return {
    baseUrl,
    server,
    async request(pathname, options = {}) {
      const response = await fetch(`${baseUrl}${pathname}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      })

      const contentType = response.headers.get('content-type') || ''
      const body = response.status === 204
        ? null
        : contentType.includes('application/json')
          ? await response.json()
          : await response.text()

      return { response, body }
    },
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve())
      })
    }
  }
}

module.exports = { startAppWithPrisma }

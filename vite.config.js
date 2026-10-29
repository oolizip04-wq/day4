import { defineConfig, loadEnv } from 'vite'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

// 로컬 개발(npm run dev)에서도 Vercel 서버리스 함수(/api/*)가 똑같이 동작하도록 연결
const API_ROUTES = ['pixabay', 'visitors']
const API_ENV = ['PIXABAY_API_KEY', 'DATA_GO_KR_KEY']

function devApi(env) {
  return {
    name: 'dev-api',
    configureServer(server) {
      for (const name of API_ROUTES) {
        server.middlewares.use(`/api/${name}`, async (req, res) => {
          for (const k of API_ENV) if (!process.env[k] && env[k]) process.env[k] = env[k]
          const file = pathToFileURL(resolve(process.cwd(), `api/${name}.js`)).href
          const { default: handler } = await import(/* @vite-ignore */ `${file}?t=${Date.now()}`)
          req.query = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams)
          res.status = (code) => { res.statusCode = code; return res }
          res.json = (obj) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)) }
          try { await handler(req, res) } catch (e) { res.status(500).json({ error: String(e.message || e) }) }
        })
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return { plugins: [devApi(env)] }
})

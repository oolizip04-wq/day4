import { defineConfig, loadEnv } from 'vite'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

// 로컬 개발(npm run dev)에서도 Vercel 서버리스 함수(/api/pixabay)가 똑같이 동작하도록 연결
function devApi(env) {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use('/api/pixabay', async (req, res) => {
        if (!process.env.PIXABAY_API_KEY && env.PIXABAY_API_KEY) process.env.PIXABAY_API_KEY = env.PIXABAY_API_KEY
        const file = pathToFileURL(resolve(process.cwd(), 'api/pixabay.js')).href
        const { default: handler } = await import(/* @vite-ignore */ `${file}?t=${Date.now()}`)
        req.query = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams)
        res.status = (code) => { res.statusCode = code; return res }
        res.json = (obj) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)) }
        handler(req, res)
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return { plugins: [devApi(env)] }
})

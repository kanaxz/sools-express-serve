import express from 'express'
import http from 'http'
import https from 'https'
import { isbot as getIsBot } from 'isbot'
import { join } from 'path'
import puppeteer from 'puppeteer'
const PUPPETEER_FLAG = 'x-sools-express-puppeteer'

export default {
  name: 'express-serve',
  construct: ({ }, { serve: config }) => {
    const app = express()
    const mode = config.mode || 'https'
    const protocol = mode === 'http' ? http : https
    const server = protocol.createServer({
      ...(config.options || {})
    }, app)

    const renderPage = async (url) => {
      const browser = await puppeteer.launch({
        ...(config.puppeteer || {})
      })
      const page = await browser.newPage()
      await page.setExtraHTTPHeaders({
        [PUPPETEER_FLAG]: '1'
      });

      console.log(url)
      await page.goto(url, { waitUntil: 'domcontentloaded' })

      await page.waitForFunction(() => {
        return document.body.classList.contains('sools-app-ready')
      })

      await page.evaluate(() => {
        const scripts = [...document.querySelectorAll('script')]
        scripts
          .filter((script) => script.getAttribute('keep-script') === null)
          .forEach(script => script.remove())
      })

      const html = await page.content()
      await browser.close()

      return html;
    }

    app.use(express.static(config.dist, {
      index: false,
    }))

    app.use('/*', async (req, res) => {
      const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`

      const isBot = /*true || /**/ getIsBot(req.headers['user-agent'])
      console.log(fullUrl, isBot, req.headers[PUPPETEER_FLAG] === '1')
      if (isBot && req.headers[PUPPETEER_FLAG] !== '1') {
        const html = await renderPage(fullUrl)
        res.send(html)
      } else {
        res.sendFile(join(config.dist, 'index.html'))
      }

    })
    console.log(`Listening on port ${mode}://:${config.port}`)
    server.listen(config.port, '0.0.0.0')

    return app
  }
}
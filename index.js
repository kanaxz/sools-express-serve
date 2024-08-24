const express = require('express')
const http = require('http')
const https = require('https')
const { isbot: getIsBot } = require('isbot')
const { join } = require('path')
const puppeteer = require('puppeteer')
const PUPPETEER_FLAG = 'x-sools-express-puppeteer'

module.exports = {
  name: 'express-serve',
  construct: ({ }, { serve: config }) => {
    const app = express()
    const protocol = config.mode === 'http' ? http : https
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
        console.log(document.body.className)
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
      console.log(fullUrl)
      const isBot = /*true || /**/ getIsBot(req.headers['user-agent'])
      if (isBot && req.headers[PUPPETEER_FLAG] !== '1') {
        const html = await renderPage(fullUrl)
        res.send(html)
      } else {
        res.sendFile(join(config.dist, 'index.html'))
      }

    })
    console.log(`Listening on port ${config.port}`)
    server.listen(config.port, '0.0.0.0')

    return app
  }
}
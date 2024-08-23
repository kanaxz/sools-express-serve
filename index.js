const express = require('express')
const http = require('http')
const isbot = require('isbot')
const { join } = require('path')

module.exports = {
  name: 'express-serve',
  construct: ({ }, { serve: config }) => {
    const app = express()
    const protocol = http
    const server = protocol.createServer({}, app)

    const renderPage = async (url) => {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      await page.goto(url, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        return document.body.classList.contains('sools-app-loaded')
      })

      await page.evaluate(() => {
        const scripts = document.querySelectorAll('script')
        scripts.forEach(script => script.remove())
      })

      const html = await page.content()
      await browser.close()

      return html;
    }

    app.use(express.static(config.dist))
    app.use('/*', async (req, res) => {
      if (isbot(req.headers['user-agent'])) {
        const html = await renderPage(req.url)
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
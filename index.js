const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const puppeteer = require('puppeteer-extra')
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
puppeteer.use(AdblockerPlugin())
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())
const chromePaths = require('chrome-paths')
const { randomInt } = require('crypto')
// const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')

/**
 * Enter function
 */
async function startScraping(startPage, endPage, limit) {
  let browser = null
  browser = await puppeteer.launch({
    executablePath: chromePaths.chrome,
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const baseUrl = 'https://www.site.com/?page='

  const data = []
  for (let page = startPage; page <= endPage; page++) {
    const pageUrl = baseUrl + page
    const pageData = await scrapePage(browser, pageUrl, limit)
    data.push(...pageData)
  }

  /**
   * Save final resulsts to json
   */
  const ItemsJSON = JSON.stringify(data, null, 2)
  if (process.env.IS_DEV) {
    const filePath = path.join('./', 'data.json')
    try {
      fs.writeFileSync(filePath, ItemsJSON)
    } catch (error) {
      alert(error)
    }
  } else {
    const saveDialogOptions = {
      title: 'Save Data',
      defaultPath: 'data.json',
      buttonLabel: 'Save',
      filters: [
        {
          name: 'JSON Files',
          extensions: ['json']
        }
      ]
    }

    dialog
      .showSaveDialog(saveDialogOptions)
      .then(result => {
        if (!result.canceled && result.filePath) {
          fs.writeFileSync(result.filePath, uniqueItemsJSON)
          console.log('File saved successfully:', result.filePath)
        } else {
          console.log('File save cancelled by the user.')
        }
      })
      .catch(err => {
        console.error('Error showing save dialog:', err)
      })
  }

  await browser.close()
}

/**
 * Scrape all items on a single page
 */
async function scrapePage(browser, url, limit) {
  const page = await browser.newPage()
  await page.setViewport({
    width: 1366,
    height: 768
  })

  await page.goto(url, {
    timeout: 30000,
    waitUntil: 'domcontentloaded'
  })

  await page.waitForSelector('.container')
  const links = await page.$$eval('.container a', elements => elements.map(el => el.href))

  const pageData = []
  for (let i = 0; i < links.length; i++) {
    if (limit != -1 && i == limit) break

    const delayBeforeAction = randomInt(200, 400)
    await sleep(delayBeforeAction)
    
    const newPage = await browser.newPage()

    await Promise.all([
      newPage.waitForNavigation({
        waitUntil: 'networkidle0'
      }),
      newPage.goto(links[i], {
        timeout: 15000,
        waitUntil: 'domcontentloaded'
      })
    ])

    // Emulate scrolling on the page
    await newPage.evaluate(() => {
      window.scrollBy(0, window.innerHeight)
    })

    await newPage.content({
      waitUntil: 'networkidle0'
    })

    const title = await newPage.$eval('h1[class^="style_title"]', element => element.textContent.trim())
    pageData.push({ title })

    await newPage.close()
  }

  await page.close()

  return pageData
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Load app
 */
app.whenReady().then(() => {
  const mainWindow = new BrowserWindow({
    width: 640,
    height: 520,
    autoHideMenuBar: true,
    useContentSize: true,
    webPreferences: {
      nodeIntegration: true,
      sandbox: false,
      contextIsolation: false,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadFile(path.join(__dirname, 'index.html'))

  ipcMain.on('startScraping', (event, { startPage, endPage, limit }) => {
    startScraping(startPage, endPage, limit)
  })
})

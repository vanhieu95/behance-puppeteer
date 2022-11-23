const puppeteer = require('puppeteer')
const https = require('https')
const fs = require('fs')

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      var totalHeight = 0
      var distance = 100
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight
        window.scrollBy(0, distance)
        totalHeight += distance
        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer)
          resolve()
        }
      }, 1000)
    })
  })
}

const download = (url, destination) =>
  new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination)

    https
      .get(url, (response) => {
        response.pipe(file)

        file.on('finish', () => {
          file.close(resolve(true))
        })
      })
      .on('error', (error) => {
        fs.unlink(destination)

        reject(error.message)
      })
  })

async function downloadImage(url, destination) {
  result = await download(url, destination)
    
  if (result === true) {
    console.log(`${url} has been downloaded successfully.`)
  } else {
    console.log(`${url} was not downloaded.`)
    console.error(result)
  }
}

function createDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`Create new directory ${dir}`)
  }
}

function checkGalleryDownloadedSuccess(imageNumber, dir) {
  const existImageNumber = fs.readdirSync(dir).length
  return existImageNumber >= imageNumber
}

async function run() {
  console.log('Launching browser')
  const browser = await puppeteer.launch()
  const url = 'https://www.behance.net/TINTINcorner';

  const page = await browser.newPage()
  console.log(`Navigate to ${url}`);
  await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout: 360000
  })

  console.log('Scrolling to load more gallery')
  await autoScroll(page)

  const links = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll('a.e2e-ProjectCoverNeue-link'),
      (e) => e.href
    )
  )

  console.log(`Total links to navigate: ${links.length}`)
  let galleryIndex = 1;
  for (const link of links) {
    console.log(`Navigate to ${link}`)
    await page.goto(link, {
      waitUntil: 'networkidle2',
      timeout: 360000
    })
    const gallery = /[^/]*$/.exec(link)[0]
    const imageURLs = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll('.Project-projectModuleContainer-BtF img'),
        (e) => e.src
      )
    )
    
    const dir = `img/${gallery}-${galleryIndex}`
    createDirectory(dir)
    galleryIndex++
    console.log(`Total images to download: ${imageURLs.length}`)
    const isGalleryDownloadedSuccess = checkGalleryDownloadedSuccess(imageURLs.length, dir)
    
    if (isGalleryDownloadedSuccess) {
      console.log(`${gallery} gallery have download full images.`)
      continue
    }

    for (let i = 0; i < imageURLs.length; i++) {
      const fileName = `image-${i + 1}.png`
      const path = `${dir}/${fileName}`;
      const isImageExist = fs.existsSync(path)
      if (isImageExist) {
        console.log(`${url} has been skipped because image already existed`)
        continue
      }
      await downloadImage(imageURLs[i], path)
    }
  }

  await browser.close()
}

run()

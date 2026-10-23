const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function capture() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const outDir = path.join(__dirname, '..', 'public', 'screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Desktop - 1440px (bez wywoływania FLUX - tylko stan UI z nowym przyciskiem 'Generuj')
  const desktopPage = await browser.newPage();
  await desktopPage.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 2 });
  await desktopPage.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await desktopPage.waitForSelector('.konvajs-content', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1000));

  await desktopPage.screenshot({
    path: path.join(outDir, 'desktop-1440.png'),
    fullPage: false,
  });
  console.log('Saved desktop-1440.png');

  // 2. Mobile - 390px
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await mobilePage.waitForSelector('.konvajs-content', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1000));

  await mobilePage.screenshot({
    path: path.join(outDir, 'mobile-390.png'),
    fullPage: true,
  });
  console.log('Saved mobile-390.png');

  await browser.close();
  console.log('Zrzuty interfejsu 1440px i 390px zaktualizowane (bez odpytywania FLUX).');
}

capture().catch((err) => {
  console.error('Błąd zrzutów:', err);
  process.exit(1);
});

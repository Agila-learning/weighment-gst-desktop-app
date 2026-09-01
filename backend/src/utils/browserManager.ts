import puppeteer, { Browser } from 'puppeteer';

let browserInstance: Browser | null = null;

export const getBrowser = async (): Promise<Browser> => {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });
  }
  return browserInstance;
};

export const closeBrowser = async () => {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
};

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OT_CHANNELS_FILE_PATH = path.resolve(__dirname, './otherchannels.json');
const M3U_FILE_PATH = path.resolve(__dirname, './network_requests.m3u');

async function readJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Error reading ${filePath}:`, error);
    return [];
  }
}

async function processMKChannels() {
  let browser;
  try {
    const channels = await readJsonFile(OT_CHANNELS_FILE_PATH);
    puppeteer.use(StealthPlugin());
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    for (const channel of channels) {
      console.log(`🔍 Processing Others channels: ${channel.name}`);

      let playurl = await extractPlayUrl(page, channel);
      if (playurl) {
        channel.playurl = playurl;
        console.log(`✅ Updated Others channel: ${channel.name} - ${playurl}`);

        const m3uContent = `#EXTINF:-1 tvg-id="${channel.id}" tvg-name="${channel.name}", ${channel.name}\n${playurl}\n`;
        await fs.appendFile(M3U_FILE_PATH, m3uContent, 'utf8');
      }
    }
  } catch (error) {
    console.error('❌ Error processing Others channels:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function extractPlayUrl(page, channel) {
  try {
    console.log(`🌐 Visiting: ${channel.url}`);
    let playurl = null;

    // Listen for network requests to find .m3u8
    page.on('response', response => {
      if (response.url().includes('.m3u8')) {
        playurl = response.url();
      }
    });

    // Go to the channel URL and wait until the page is fully loaded
    await page.goto(channel.url, { waitUntil: 'networkidle2' });

    // Wait a bit to ensure network requests have been made and responses captured
    await new Promise(resolve => setTimeout(resolve, 5000));

    // If we found the playurl in the network requests, return it
    if (playurl) {
      console.log(`✅ Found playurl for ${channel.name}: ${playurl}`);
      return playurl;
    } else {
      console.warn(`⚠️ No .m3u8 URL found for ${channel.name}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error extracting playurl for ${channel.name}:`, error);
    return null;
  }
}

export default processMKChannels;

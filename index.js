import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';
import processMKChannels from './mkchannels.js';
// import processBGChannels from './bgchannels.js';

const execPromise = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// const BG_CHANNELS_FILE = path.resolve(__dirname, './network_requests2.m3u');
const MK_CHANNELS_FILE = path.resolve(__dirname, './network_requests.m3u');

// Функција за чистење на M3U фајлот (без бришење на првата линија)
async function cleanM3UFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const lines = data.split('\n');
    if (lines.length > 1) {
      const firstLine = lines[0]; // Земање на првата линија
      await fs.writeFile(filePath, `${firstLine}\n`, 'utf-8'); // Запишува само првата линија
      console.log(`${filePath} cleaned, but first line retained.`);
    } else {
      console.log(`${filePath} already contains only one line.`);
    }
  } catch (error) {
    console.error(`❌ Error cleaning ${filePath}:`, error);
  }
}

// Функција за екстракција на канали во посебни фајлови
async function extractChannelsToFile(channelData, filePath) {
  try {
    if (!channelData) {
      console.error(`❌ No data to write to file: ${filePath}`);
      return;
    }
    await fs.writeFile(filePath, channelData, 'utf-8');
    console.log(`✅ Channels written to ${filePath}`);
  } catch (error) {
    console.error(`❌ Error writing channels to ${filePath}:`, error);
  }
}

// Функција за Git update
async function gitAdd(filePath) {
  try {
    console.log(`📂 Adding ${filePath} to Git...`);
    await execPromise(`git add "${filePath}"`);  // Додадено е ставената наводница
  } catch (error) {
    console.error('❌ Error adding file to Git:', error);
  }
}

async function gitCommit(message) {
  try {
    console.log('📝 Committing changes...');
    await execPromise(`git commit -m "${message}"`);
  } catch (error) {
    console.error('❌ Error committing changes to Git:', error);
  }
}

async function gitPush() {
  try {
    console.log('⬆️ Pushing updates to GitHub...');
    await execPromise('git push origin main');
  } catch (error) {
    console.error('❌ Error pushing to Git:', error);
  }
}

async function gitUpdate() {
  // await gitAdd(BG_CHANNELS_FILE);
  await gitAdd(MK_CHANNELS_FILE);
  await gitCommit('Auto-update channel files');
  await gitPush();
}

// Главна функција за извршување на BG и MK канали паралелно
async function startProcessingInParallel() {
  // Извршување на чистењето на M3U фајлот
  console.log('🧹 Cleaning the files before processing...');
  await cleanM3UFile(MK_CHANNELS_FILE);
  // await cleanM3UFile(BG_CHANNELS_FILE);

  // Процеси за BG и MK канали паралелно
  try {
    // console.log('🚀 Processing BG channels...');
    // const bgChannelsPromise = processBGChannels().then(bgChannels => extractChannelsToFile(bgChannels, BG_CHANNELS_FILE));

    console.log('🚀 Processing MKD & RO channels...');
    const mkChannelsPromise = processMKChannels().then(mkChannels => extractChannelsToFile(mkChannels, MK_CHANNELS_FILE));

    // Чекање да завршат двете паралелни операции
    await Promise.all([mkChannelsPromise]);

    // Ажурирање на Git (додадено по завршувањето на двата процеса)
    console.log('🔄 Updating Git...');
    await gitUpdate();
  } catch (error) {
    console.error('❌ Error processing channels:', error);
  }
}

// Функција за пауза
function pause(duration) {
  return new Promise(resolve => setTimeout(resolve, duration));
}

// Главна функција што ќе го стартува процесот со пауза
async function mainLoop() {
  // Започнување на процесот
  await startProcessingInParallel();

  // Чекање 3,3 минути (200 секунди)
  console.log('⏳ Waiting for 3 min and 20 sec before restarting...');
  await pause(200000); // 200000 милисекунди = 200 секунди = 10 минути

  // Повторно започнување на процесот
  await mainLoop();  // Сега чекаме асинхроно
}

// Стартување на главниот лооп
mainLoop().catch(err => console.error('❌ Unexpected error:', err));

import fs from 'fs/promises';
import path from 'path';
import Redis from 'ioredis';

/**
 * Reads the .env.local file and parses it to find the REDIS_URL.
 * @returns {Promise<string|null>} The REDIS_URL or null if not found.
 */
async function getRedisUrlFromEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const envFile = await fs.readFile(envPath, 'utf-8');
    const lines = envFile.split('\n');
    for (const line of lines) {
      if (line.startsWith('REDIS_URL=')) {
        let value = line.substring('REDIS_URL='.length).trim();
        // Remove quotes if they exist
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        return value;
      }
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('Error: .env.local file not found.');
    } else {
      console.error('Error reading .env.local file:', error);
    }
  }
  return null;
}

/**
 * Fetches the answer schedule and prints it in a human-readable format.
 */
async function checkAnswerSchedule() {
  const redisUrl = await getRedisUrlFromEnv();
  if (!redisUrl) {
    console.error('REDIS_URL not found in .env.local. Please make sure it is set.');
    return;
  }

  let redis;
  try {
    // --- 1. Connect to Redis ---
    redis = new Redis(redisUrl);
    console.log('Connecting to Redis...');

    // --- 2. Load law data ---
    const lawsPath = path.join(process.cwd(), 'public', 'data', 'laws.json');
    const lawsFile = await fs.readFile(lawsPath, 'utf-8');
    const laws = JSON.parse(lawsFile);
    const lawMap = new Map(laws.map(law => [law.id.toString(), law.name]));
    console.log(`Loaded ${lawMap.size} laws.`);

    // --- 3. Get schedule from Redis ---
    const scheduleKey = 'answer_schedule';
    const schedule = await redis.hgetall(scheduleKey);
    const dates = Object.keys(schedule).sort();

    if (dates.length === 0) {
      console.log('No answer schedule found in Redis.');
      return;
    }
    console.log('--- Answer Schedule ---');

    // --- 4. Print formatted schedule ---
    for (const date of dates) {
      const lawId = schedule[date];
      const lawName = lawMap.get(lawId) || 'Unknown Law';
      console.log(`${date} / ${lawName}`);
    }
    console.log('-----------------------');

  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    if (redis) {
      redis.quit();
      console.log('Redis connection closed.');
    }
  }
}

checkAnswerSchedule();

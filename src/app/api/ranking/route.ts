import { NextResponse } from 'next/server';
import Redis from 'ioredis';

interface LawRankInfo {
  id: number;
  name: string;
  score: number;
  rank: number;
}

interface DailyGameData {
  ranking: LawRankInfo[];
}

export async function GET() {
  const redis = new Redis(process.env.REDIS_URL!);
  try {
    const dataString = await redis.get('daily_game_data');
    if (!dataString) {
      throw new Error('Daily ranking data not found in Redis. Cron job may have failed.');
    }

    const data: DailyGameData = JSON.parse(dataString);

    return NextResponse.json(data.ranking);

  } catch (error) {
    console.error('Error in GET /api/ranking:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { message: 'Error fetching ranking data', error: errorMessage },
      { status: 500 }
    );
  } finally {
    redis.quit();
  }
}

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
    // 한국 시간(KST, UTC+9) 기준으로 현재 날짜 문자열 생성
    const now = new Date();
    now.setHours(now.getHours() + 9); // KST로 변경
    const year = now.getUTCFullYear();
    const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = now.getUTCDate().toString().padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    const redisKey = `daily_game_data:${dateString}`;

    const dataString = await redis.get(redisKey);
    if (!dataString) {
      throw new Error(`Daily ranking data for ${dateString} not found in Redis. Cron job may have failed.`);
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

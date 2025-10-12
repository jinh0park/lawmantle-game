import { NextResponse } from 'next/server';
import Redis from 'ioredis';

interface DailyGameData {
  answerName: string;
}

export async function GET() {
  const redis = new Redis(process.env.REDIS_URL!);
  try {
    // Get yesterday's date (KST)
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() + 9); // Set to KST
    yesterday.setDate(yesterday.getDate() - 1);

    const year = yesterday.getUTCFullYear();
    const month = (yesterday.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = yesterday.getUTCDate().toString().padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    const redisKey = `daily_game_data:${dateString}`;
    const dataString = await redis.get(redisKey);

    if (!dataString) {
      // It's possible data for yesterday doesn't exist, so we don't throw an error.
      // We just return null, and the client will handle it gracefully.
      return NextResponse.json({ answerName: null, date: null });
    }

    const data: DailyGameData = JSON.parse(dataString);

    return NextResponse.json({ answerName: data.answerName, date: dateString });

  } catch (error) {
    console.error('Error in GET /api/yesterday-answer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { message: 'Error fetching yesterday\'s answer', error: errorMessage },
      { status: 500 }
    );
  } finally {
    redis.quit();
  }
}

import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';

interface LawRankInfo {
  id: number;
  name: string;
  score: number;
  rank: number;
}

interface DailyGameData {
  answerName: string;
  ranking: LawRankInfo[];
}

export async function GET(request: NextRequest) {
  const redis = new Redis(process.env.REDIS_URL!);
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');

    let dateString: string;

    if (dateParam) {
      // Basic validation for YYYY-MM-DD format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        return NextResponse.json({ message: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 });
      }
      dateString = dateParam;
    } else {
      // Default to today KST
      const now = new Date();
      now.setHours(now.getHours() + 9); // KST로 변경
      const year = now.getUTCFullYear();
      const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
      const day = now.getUTCDate().toString().padStart(2, '0');
      dateString = `${year}-${month}-${day}`;
    }
    
    const redisKey = `daily_game_data:${dateString}`;

    const dataString = await redis.get(redisKey);
    if (!dataString) {
      return NextResponse.json(
        { message: `Ranking data for ${dateString} not found.` },
        { status: 404 }
      );
    }

    const data: DailyGameData = JSON.parse(dataString);

    return NextResponse.json({
      answerName: data.answerName,
      ranking: data.ranking,
    });

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

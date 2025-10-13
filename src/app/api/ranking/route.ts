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

    const now = new Date();
    now.setHours(now.getHours() + 9); // KST로 변경
    const today = new Date(now.toISOString().split('T')[0]);

    let dateString: string;

    if (dateParam) {
      // Basic validation for YYYY-MM-DD format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        return NextResponse.json({ message: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 });
      }
      const requestedDate = new Date(dateParam);
      if (requestedDate > today) {
        return NextResponse.json({ message: "Cannot retrieve rankings for a future date." }, { status: 403 });
      }
      dateString = dateParam;
    } else {
      // Default to today KST
      dateString = today.toISOString().split('T')[0];
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


import { NextResponse } from 'next/server';
import Redis from 'ioredis';

// Type definitions
interface Law {
  id: number;
  name: string;
  content: string;
}

interface LawRankInfo {
  id: number;
  name: string;
  score: number;
  rank: number;
}

interface DailyGameData {
  gameVersion: string; // Added version
  answerId: number;
  answerName: string;
  answerContent: string;
  ranking: LawRankInfo[];
}

interface GameData {
  gameVersion: string; // Added version
  dailyAnswer: Law;
  dailyRanking: LawRankInfo[];
  totalLaws: number;
}

async function getGameDataFromRedis(): Promise<GameData> {
  const redis = new Redis(process.env.REDIS_URL!);
  try {
    const dataString = await redis.get('daily_game_data');
    if (!dataString) {
      throw new Error('Daily game data not found in Redis. Cron job may have failed.');
    }

    const data: DailyGameData = JSON.parse(dataString);

    const dailyAnswer: Law = {
      id: data.answerId,
      name: data.answerName,
      content: data.answerContent,
    };

    const totalLaws = data.ranking.length;

    return { gameVersion: data.gameVersion, dailyAnswer, dailyRanking: data.ranking, totalLaws };
  } finally {
    redis.quit();
  }
}

export async function GET() {
  try {
    const { dailyAnswer, gameVersion } = await getGameDataFromRedis();
    // Return version along with answerId
    return NextResponse.json({ answerId: dailyAnswer.id, gameVersion });
  } catch (error) {
    console.error('Error in GET /api/game:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Error initializing game', error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { guess, answerId, gameVersion: clientVersion } = await request.json();

    if (typeof guess !== 'string' || typeof answerId !== 'number' || typeof clientVersion !== 'string') {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }

    const { dailyAnswer, dailyRanking, totalLaws, gameVersion: serverVersion } = await getGameDataFromRedis();

    // Validate version first
    if (clientVersion !== serverVersion) {
      return NextResponse.json({ message: 'Game data mismatch. Please refresh.' }, { status: 409 });
    }

    const guessInfo = dailyRanking.find(law => law.name === guess);

    if (!guessInfo) {
      return NextResponse.json(                                                             
        { message: `'${guess}'에 해당하는 법률을 찾을 수 없습니다.` },
        { status: 404 }
      );  
    }

    const isCorrect = guessInfo.id === dailyAnswer.id;


    return NextResponse.json({
      name: guessInfo.name,
      score: guessInfo.score,
      rank: guessInfo.rank,
      isCorrect,
      content: isCorrect ? dailyAnswer.content : null,
    });

  } catch (error) {
    console.error('Error in POST /api/game:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Error processing guess', error: errorMessage }, { status: 500 });
  }
}

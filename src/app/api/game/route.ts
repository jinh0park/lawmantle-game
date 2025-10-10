
import { NextResponse } from 'next/server';

interface Law {
  id: number;
  name: string;
  content: string;
  embedding?: number[]; // embedding is not in daily_game_data.json
}

interface LawRankInfo {
  id: number;
  name: string;
  score: number;
  rank: number;
}

interface DailyGameDataFileContent {
  answerId: number;
  answerName: string;
  answerContent: string;
  ranking: LawRankInfo[];
}

interface DailyGameData {
  dailyAnswer: Law;
  dailyRanking: LawRankInfo[];
  totalLaws: number;
}

// In-memory store for the daily answer and its pre-calculated ranking list.
let cachedDailyGameData: DailyGameData | null = null;
let lastSetDate: string | null = null;

async function setupDailyGameData(): Promise<DailyGameData> {
  const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD
  if (cachedDailyGameData && lastSetDate === today) {
    return cachedDailyGameData;
  }

  // Fetch daily_game_data.json from the public directory
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/daily_game_data.json`);
  if (!res.ok) {
    throw new Error('Failed to fetch daily game data');
  }
  const data: DailyGameDataFileContent = await res.json();

  const dailyAnswer: Law = {
    id: data.answerId,
    name: data.answerName,
    content: data.answerContent,
  };

  const dailyRanking: LawRankInfo[] = data.ranking;
  const totalLaws: number = data.ranking.length;

  cachedDailyGameData = { dailyAnswer, dailyRanking, totalLaws };
  lastSetDate = today;
  
  return cachedDailyGameData;
}

export async function GET() {
  try {
    const { dailyAnswer } = await setupDailyGameData();
    // Only send the ID to the client, not the whole answer object
    return NextResponse.json({ answerId: dailyAnswer.id });
  } catch (error) {
    console.error('Error in GET /api/game:', error);
    return NextResponse.json({ message: 'Error initializing game' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { guess, answerId } = await request.json();

    if (typeof guess !== 'string' || typeof answerId !== 'number') {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }

    const { dailyAnswer, dailyRanking, totalLaws } = await setupDailyGameData();

    if (answerId !== dailyAnswer.id) {
      return NextResponse.json({ message: 'Game data mismatch. Please refresh.' }, { status: 409 });
    }

    const guessInfo = dailyRanking.find(law => law.name === guess);

    if (!guessInfo) {
      return NextResponse.json({
        name: guess,
        score: 0,
        rank: totalLaws, // If not found, assign the lowest rank
        isCorrect: false,
        message: '해당 법률을 찾을 수 없습니다.',
      });
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
    return NextResponse.json({ message: 'Error processing guess' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import Redis from 'ioredis';
import { cosineSimilarity } from '@/utils/cosineSimilarity'; // 기존 유틸리티 함수 활용!

// 타입 정의 (선택사항이지만 권장)
interface Law {
  id: number;
  name: string;
  content: string;
  vector: number[];
}

// Vercel Cron Job은 GET 요청을 보냅니다.
export async function GET() {
  try {
    // --- 1. Redis 클라이언트 연결 ---
    // Vercel 환경 변수를 자동으로 읽어옵니다.
    const redis = new Redis(process.env.REDIS_URL!);
    
    // --- 2. 데이터 로딩 ---
    // process.cwd()는 프로젝트 루트를 가리킵니다.
    const lawsPath = path.join(process.cwd(), 'data', 'laws.json');
    const lawsFile = await fs.readFile(lawsPath, 'utf-8');
    const laws: Law[] = JSON.parse(lawsFile);

    // --- 3. 계산 로직 ---
    // 1년 중 몇 번째 날인지 계산
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    const answerIndex = (dayOfYear - 1) % laws.length;
    const answerLaw = laws[answerIndex];

    const rankedLaws = laws.map(law => ({
      id: law.id,
      name: law.name,
      score: cosineSimilarity(law.vector, answerLaw.vector),
    }));

    // 점수 기준으로 내림차순 정렬
    rankedLaws.sort((a, b) => b.score - a.score);
    
    const finalRanking = rankedLaws.map((law, index) => ({
      ...law,
      rank: index + 1,
    }));

    const dailyData = {
      gameVersion: new Date().getTime().toString(), // Add a version identifier
      answerId: answerLaw.id,
      answerName: answerLaw.name,
      answerContent: answerLaw.content,
      ranking: finalRanking,
    };

    // --- 4. Redis에 결과 저장 ---
    // set 명령어는 보통 2개의 인자만 받으므로, JSON 문자열로 저장합니다.
    await redis.set('daily_game_data', JSON.stringify(dailyData));
    
    // 연결 종료
    redis.quit();

    // --- 5. 성공 응답 ---
    return NextResponse.json({
      status: 'success',
      message: 'Daily game data successfully updated in Redis.',
    });

  } catch (error) {
    console.error('Cron job failed:', error);
    // 에러 발생 시 500 상태 코드와 함께 에러 메시지 반환
    return NextResponse.json(
      { status: 'error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
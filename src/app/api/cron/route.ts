import { NextRequest, NextResponse } from 'next/server';
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
export async function GET(request: NextRequest) {
  // In production, Vercel's cron job sends a secret token. We validate it.
  // In development, we bypass this check for easier testing.
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', {
        status: 401,
      });
    }
  }

  try {
    // --- 1. Redis 클라이언트 연결 ---
    const redis = new Redis(process.env.REDIS_URL!);

    // --- NEW: 3일 이상 지난 데이터 삭제 ---
    const oldDataDate = new Date();
    oldDataDate.setHours(oldDataDate.getHours() + 9); // KST로 변경
    oldDataDate.setDate(oldDataDate.getDate() - 4); // 4일 전 데이터 삭제

    const oldYear = oldDataDate.getUTCFullYear();
    const oldMonth = (oldDataDate.getUTCMonth() + 1).toString().padStart(2, '0');
    const oldDay = oldDataDate.getUTCDate().toString().padStart(2, '0');
    const oldDateString = `${oldYear}-${oldMonth}-${oldDay}`;

    const oldRedisKey = `daily_game_data:${oldDateString}`;
    const deletedCount = await redis.del(oldRedisKey);

    if (deletedCount > 0) {
      console.log(`Deleted old game data: ${oldRedisKey}`);
    }

    // --- 2. 데이터 로딩 ---
    const lawsPath = path.join(process.cwd(), 'data', 'laws.json');
    const lawsFile = await fs.readFile(lawsPath, 'utf-8');
    const laws: Law[] = JSON.parse(lawsFile);
    const lawsById = new Map(laws.map(law => [law.id.toString(), law]));

    // --- 3. 정답 스케줄 관리 --- 
    const scheduleKey = 'answer_schedule';
    const scheduleExists = await redis.exists(scheduleKey);

    if (!scheduleExists) {
      console.log('Answer schedule not found. Generating a new one...');
      const allLawIds = laws.map(law => law.id.toString());

      // Fisher-Yates shuffle
      for (let j = allLawIds.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [allLawIds[j], allLawIds[k]] = [allLawIds[k], allLawIds[j]];
      }

      const startDate = new Date('2025-10-10T00:00:00Z');
      const schedule: { [key: string]: string } = {};
      allLawIds.forEach((id, index) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + index);
        const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
        schedule[dateString] = id;
      });

      await redis.hset(scheduleKey, schedule);
      console.log(`New schedule generated for ${allLawIds.length} days.`);
    }

    // --- 4. 3일치 데이터 계산 및 저장 로직 ---
    const results = [];
    for (let i = 0; i < 3; i++) {
      // --- 4-1. 날짜 계산 (KST 기준) ---
      const now = new Date();
      now.setHours(now.getHours() + 9); // KST로 변경
      now.setDate(now.getDate() + i);   // 0, 1, 2일 후
      
      const year = now.getUTCFullYear();
      const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
      const day = now.getUTCDate().toString().padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      // --- 4-2. 스케줄에서 정답 ID 가져오기 ---
      const answerId = await redis.hget(scheduleKey, dateString);

      if (!answerId) {
        // 스케줄이 끝났을 경우에 대한 처리 (예: 재 생성 알림)
        // 여기서는 간단히 에러를 던지지만, 실제로는 스케줄을 확장하는 로직이 필요할 수 있음
        throw new Error(`Answer for date ${dateString} not found in schedule. The schedule might be exhausted.`);
      }

      const answerLaw = lawsById.get(answerId);
      if (!answerLaw) {
        throw new Error(`Law with ID ${answerId} (for date ${dateString}) not found.`);
      }

      // --- 4-3. 유사도 계산 및 랭킹 생성 ---
      const rankedLaws = laws.map(law => ({
        id: law.id,
        name: law.name,
        score: cosineSimilarity(law.vector, answerLaw.vector),
      }));

      rankedLaws.sort((a, b) => b.score - a.score);
      
      const finalRanking = rankedLaws.map((law, index) => ({
        ...law,
        rank: index + 1,
      }));

      const dailyData = {
        gameVersion: new Date(dateString).getTime().toString(),
        answerId: answerLaw.id,
        answerName: answerLaw.name,
        answerContent: answerLaw.content,
        ranking: finalRanking,
      };

      // --- 4-4. Redis에 일일 데이터 저장 ---
      const redisKey = `daily_game_data:${dateString}`;
      await redis.set(redisKey, JSON.stringify(dailyData));
      results.push(`Successfully updated ${redisKey}`);
    }
    
    // 연결 종료
    redis.quit();

    // --- 5. 성공 응답 ---
    return NextResponse.json({
      status: 'success',
      message: `Daily game data for the next 3 days updated using the answer schedule.`,
      details: results,
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
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
  const cronSecret = request.headers.get('x-vercel-cron-secret');

  const cronSecretFromHeader = request.headers.get('x-vercel-cron-secret');
  const cronSecretFromEnv = process.env.CRON_SECRET;
  const authHeader = request.headers.get('Authorization');

  // --- 디버깅을 위한 로그 추가 ---
  console.log('Secret from Header:', cronSecretFromHeader);
  console.log('Secret from Environment:', cronSecretFromEnv);
  console.log('Do they match?', cronSecretFromHeader === cronSecretFromEnv);
  console.log('Auth Header:', authHeader);
  // --- 디버깅 로그 끝 ---

  if (cronSecret !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  try {
    // --- 1. Redis 클라이언트 연결 ---
    const redis = new Redis(process.env.REDIS_URL!);
    
    // --- 2. 데이터 로딩 ---
    const lawsPath = path.join(process.cwd(), 'public', 'data', 'laws.json');
    const lawsFile = await fs.readFile(lawsPath, 'utf-8');
    const laws: Law[] = JSON.parse(lawsFile);

    // --- 3. 사용된 정답 ID 목록 불러오기 ---
    const usedAnswerIdsKey = 'used_answer_ids';
    let usedAnswerIds = await redis.smembers(usedAnswerIdsKey);

    // --- 4. 모든 법률이 사용되었는지 확인 및 초기화 ---
    if (usedAnswerIds.length >= laws.length) {
      await redis.del(usedAnswerIdsKey);
      usedAnswerIds = [];
    }
    // Redis에서 가져온 ID는 문자열이므로, Set도 문자열 기반으로 작동해야 함
    const usedAnswerIdsSet = new Set(usedAnswerIds);

    // --- 5. 3일치 데이터 계산 및 저장 로직 ---
    const results = [];
    for (let i = 0; i < 3; i++) {
      // 한국 시간(KST, UTC+9) 기준으로 날짜 계산
      const now = new Date();
      now.setHours(now.getHours() + 9); // KST로 변경
      now.setDate(now.getDate() + i);   // 0, 1, 2일 후
      
      const year = now.getUTCFullYear();
      const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
      const day = now.getUTCDate().toString().padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      // --- 5-1. 새로운 랜덤 정답 선택 ---
      let answerLaw: Law;
      let attempts = 0;
      const maxAttempts = laws.length * 2; // 무한 루프 방지

      do {
        const randomIndex = Math.floor(Math.random() * laws.length);
        answerLaw = laws[randomIndex];
        attempts++;
        if (attempts > maxAttempts) {
          console.warn('Could not find an unused law. Using the last random one.');
          break;
        }
      } while (usedAnswerIdsSet.has(answerLaw!.id.toString()));

      // --- 5-2. 사용된 정답 목록에 새 ID 추가 (메모리 및 Redis) ---
      usedAnswerIdsSet.add(answerLaw.id.toString());
      await redis.sadd(usedAnswerIdsKey, answerLaw.id.toString());

      // --- 5-3. 유사도 계산 및 랭킹 생성 ---
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

      // --- 5-4. Redis에 일일 데이터 저장 ---
      const redisKey = `daily_game_data:${dateString}`;
      await redis.set(redisKey, JSON.stringify(dailyData));
      results.push(`Successfully updated ${redisKey}`);
    }
    
    // 연결 종료
    redis.quit();

    // --- 6. 성공 응답 ---
    return NextResponse.json({
      status: 'success',
      message: 'Daily game data for the next 3 days updated with random answers.',
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
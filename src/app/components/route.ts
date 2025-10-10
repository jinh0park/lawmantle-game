import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

interface LawRankInfo {
  id: number;
  name: string;
  score: number;
  rank: number;
}

interface DailyGameData {
  answerId: number;
  ranking: LawRankInfo[];
}

export async function POST(request: Request) {
  try {
    const { guessName } = await request.json();

    const filePath = path.join(process.cwd(), "public", "daily_game_data.json");
    const fileContent = await fs.readFile(filePath, "utf-8");
    const gameData: DailyGameData = JSON.parse(fileContent);

    const guessInfo = gameData.ranking.find((law) => law.name === guessName);

    if (!guessInfo) {
      return NextResponse.json({ error: "Law not found" }, { status: 404 });
    }

    const isCorrect = guessInfo.id === gameData.answerId;

    return NextResponse.json({ guessResult: guessInfo, isCorrect });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
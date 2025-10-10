"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import GuessInput from "./GuessInput";
import GuessList, { type Guess } from "./GuessList";
import LastGuessResult from "./LastGuessResult";

interface LawRankInfo {
  id: number;
  name: string;
  score: number;
  rank: number;
}

interface DailyGameData {
  answerId: number;
  answerName: string;
  answerContent: string;
  ranking: LawRankInfo[];
}

export default function GameClient() {
  const [gameData, setGameData] = useState<DailyGameData | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [lastGuessResult, setLastGuessResult] = useState<Guess | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Load state from localStorage on initial load
  useEffect(() => {
    const startGame = async () => {
      setIsLoading(true);
      try {
        // Check for saved state in localStorage
        const savedState = localStorage.getItem("lawmantle_gameState");
        const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

        if (savedState) {
          const {
            date,
            guesses: savedGuesses,
            isFinished: savedIsFinished,
          } = JSON.parse(savedState);

          // If the saved state is for today, load it
          if (date === today) {
            setGuesses(savedGuesses);
            setIsFinished(savedIsFinished);
          } else {
            // Otherwise, it's an old state, so remove it
            localStorage.removeItem("lawmantle_gameState");
          }
        }

        // Fetch the pre-calculated static game data
        const res = await fetch("/daily_game_data.json");
        if (!res.ok) {
          throw new Error(
            "오늘의 게임 데이터를 불러오는 데 실패했습니다. 파이썬 스크립트를 실행했는지 확인하세요."
          );
        }
        const data: DailyGameData = await res.json();
        setGameData(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
        );
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    };
    startGame();
  }, []);

  // Save state to localStorage whenever guesses or isFinished change
  useEffect(() => {
    // Only save after initial loading is complete, to avoid overwriting loaded state
    if (!isLoading) {
      const today = new Date().toISOString().slice(0, 10);
      const gameState = {
        date: today,
        guesses,
        isFinished,
      };
      localStorage.setItem("lawmantle_gameState", JSON.stringify(gameState));
    }
  }, [guesses, isFinished, isLoading]);

  const handleGuess = (guessName: string) => {
    if (!gameData) return;

    setError(null);

    const guessInfo = gameData.ranking.find((law) => law.name === guessName);

    if (!guessInfo) {
      setError(
        `'${guessName}' 법률을 찾을 수 없습니다. 자동완성 목록에서 선택해보세요.`
      );
      return;
    }

    const newGuess: Guess = {
      name: guessInfo.name,
      score: guessInfo.score,
      rank: guessInfo.rank,
      submissionOrder: guesses.length + 1,
    };

    setLastGuessResult(newGuess);

    if (!guesses.some((g) => g.name === newGuess.name)) {
      setGuesses((prevGuesses) => [...prevGuesses, newGuess]);
    }

    if (guessInfo.id === gameData.answerId) {
      setIsFinished(true);
    }

    inputRef.current?.focus();
  };

  if (isLoading) {
    return <p className="text-center mt-10">오늘의 법률 데이터 로딩 중...</p>;
  }

  return (
    <main className="container mx-auto px-4 py-8 flex flex-col items-center">
      <h1 className="text-4xl font-bold text-gray-800 mb-2">로맨틀</h1>
      <p className="text-lg text-gray-600 mb-8">오늘의 법률을 추측해보세요!</p>

      {error && (
        <p className="text-red-500 bg-red-100 p-3 rounded-lg mb-4">{error}</p>
      )}

      {isFinished && gameData && (
        <div className="w-full max-w-2xl p-6 mb-8 text-center bg-green-100 border-2 border-green-500 rounded-lg shadow-lg">
          <h2 className="text-3xl font-bold text-green-800">정답입니다! 🎉</h2>
          <p className="text-2xl font-semibold text-gray-800 mt-2">
            {gameData.answerName}
          </p>
          <div className="mt-6">
            <Link
              href="/ranking"
              className="px-6 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200"
            >
              유사도 상위 100단어 보기
            </Link>
          </div>
        </div>
      )}

      <GuessInput
        onSubmit={handleGuess}
        disabled={!gameData}
        inputRef={inputRef}
      />

      {lastGuessResult && <LastGuessResult guess={lastGuessResult} />}

      <GuessList guesses={guesses} />
    </main>
  );
}

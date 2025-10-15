"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import GuessInput from "./GuessInput";
import GuessList, { type Guess } from "./GuessList";
import LastGuessResult from "./LastGuessResult";

export default function GameClient() {
  const [answerId, setAnswerId] = useState<number | null>(null);
  const [gameVersion, setGameVersion] = useState<string | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [lastGuessResult, setLastGuessResult] = useState<Guess | null>(null);
  const [hasWon, setHasWon] = useState(false);
  const [correctAnswerName, setCorrectAnswerName] = useState<string | null>(
    null
  ); // State for the correct answer name
  const [yesterdayData, setYesterdayData] = useState<{
    answerName: string;
    date: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const startGame = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch today's game data and yesterday's answer in parallel
        const [serverRes, yesterdayRes] = await Promise.all([
          fetch("/api/game"),
          fetch("/api/yesterday-answer"),
        ]);

        if (!serverRes.ok) {
          throw new Error("서버에 연결할 수 없습니다.");
        }
        if (yesterdayRes.ok) {
          const yesterdayJson = await yesterdayRes.json();
          if (yesterdayJson.answerName) {
            setYesterdayData(yesterdayJson);
          }
        }

        const serverData = await serverRes.json();
        const { answerId: serverAnswerId, gameVersion: serverGameVersion } =
          serverData;

        const savedStateJSON = localStorage.getItem("lawmantle_gameState");

        if (savedStateJSON) {
          const savedState = JSON.parse(savedStateJSON);
          // Only compare the game version. This is robust against cron job delays.
          if (savedState.gameVersion === serverGameVersion) {
            setGuesses(savedState.guesses);
            setHasWon(savedState.hasWon || false);
            setCorrectAnswerName(savedState.correctAnswerName || null);
            setAnswerId(serverAnswerId);
            setGameVersion(serverGameVersion);
            return; // Early exit
          }
        }

        // If we reach here, it's a new day, a new version, or no save. Reset.
        localStorage.removeItem("lawmantle_gameState");
        setGuesses([]);
        setHasWon(false);
        setCorrectAnswerName(null);
        setAnswerId(serverAnswerId);
        setGameVersion(serverGameVersion);
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

  useEffect(() => {
    if (!isLoading) {
      const today = new Date().toISOString().slice(0, 10);
      const gameState = {
        date: today,
        guesses,
        hasWon,
        correctAnswerName, // Save correct answer name
        answerId,
        gameVersion,
      };
      localStorage.setItem("lawmantle_gameState", JSON.stringify(gameState));
    }
  }, [guesses, hasWon, correctAnswerName, answerId, gameVersion, isLoading]);

  const handleGuess = async (guessName: string) => {
    if (!answerId || !gameVersion) return;

    setError(null);

    try {
      const res = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guess: guessName, answerId, gameVersion }),
      });

      const result = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setError("새로운 게임이 시작되었습니다. 페이지를 새로고침합니다...");
          setTimeout(() => window.location.reload(), 2000);
          return;
        }
        throw new Error(
          result.message || "추측을 처리하는 중 오류가 발생했습니다."
        );
      }

      const newGuess: Guess = {
        name: result.name,
        score: result.score,
        rank: result.rank,
        submissionOrder: guesses.length + 1,
      };

      setLastGuessResult(newGuess);

      if (!guesses.some((g) => g.name === newGuess.name)) {
        setGuesses((prevGuesses) => [...prevGuesses, newGuess]);
      }

      if (result.isCorrect) {
        setHasWon(true);
        if (!correctAnswerName) {
          setCorrectAnswerName(result.name);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      inputRef.current?.focus();
    }
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

      {hasWon && correctAnswerName && (
        <div className="w-full max-w-2xl p-6 mb-8 text-center bg-green-100 border-2 border-green-500 rounded-lg shadow-lg">
          <h2 className="text-3xl font-bold text-green-800">정답입니다! 🎉</h2>
          <p className="text-lg font-semibold text-gray-800 mt-2 flex items-center justify-center gap-2">
            <span>{correctAnswerName}</span>
            <a
              href={`https://casenote.kr/%EB%B2%95%EB%A0%B9/${correctAnswerName.replace(
                / /g,
                "_"
              )}`}
              // TODO: replace ㆍ to · in URL if needed
              target="_blank"
              rel="noopener noreferrer"
              title={`${correctAnswerName} 법령 정보 보기`}
              className="hover:opacity-75 transition-opacity"
            >
              🔗
            </a>
          </p>
          <div className="mt-6">
            <Link
              href="/ranking"
              className="px-6 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200"
            >
              유사도 상위 100 법률 보기
            </Link>
          </div>
        </div>
      )}

      <GuessInput
        onSubmit={handleGuess}
        disabled={isLoading || !answerId}
        inputRef={inputRef}
      />

      {lastGuessResult && <LastGuessResult guess={lastGuessResult} />}

      <GuessList guesses={guesses} />

      {yesterdayData && (
        <div className="mt-12 text-center p-4 border-t-2 border-gray-200 w-full max-w-2xl">
          <p className="text-md text-gray-700">
            🌎 정답 법률은 매일 자정(한국 시간)에 변경됩니다.
          </p>
          <p className="my-4 text-md text-gray-700">
            ⚖️ 어제의 정답 법률은 <strong>{yesterdayData.answerName}</strong>
            입니다.{" "}
          </p>
          <p className="my-4 underline">
            <Link
              href={`/ranking?date=${yesterdayData.date}`}
              className="text-gray-500 hover:underline hover:text-gray-400"
            >
              🥇 어제 답안의 유사도 랭킹 확인하기
            </Link>
          </p>
        </div>
      )}
      <p className="text-md text-gray-700">
        💡 로맨틀은{" "}
        <Link
          href={"https://semantle-ko.newsjel.ly/"}
          className="text-gray-500 underline hover:text-gray-400"
          target="_blank"
        >
          꼬맨틀
        </Link>
        의 법률 버전 게임입니다.
      </p>
      <p className="my-4 underline">
        <Link
          href={`https://jinh0park.github.io/blog/how-lawmantle-works`}
          className="text-gray-500 hover:underline hover:text-gray-400"
          target="_blank"
        >
          🧐 로맨틀은 어떻게 작동하나요?
        </Link>
      </p>
    </main>
  );
}

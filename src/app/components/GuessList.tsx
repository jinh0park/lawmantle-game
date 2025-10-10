"use client";

import { useState, useEffect } from "react";

export interface Guess {
  name: string;
  score: number;
  rank: number; // Overall rank among all laws
  submissionOrder: number; // The order in which the guess was made
}

interface GuessListProps {
  guesses: Guess[];
}

function getBarColor(rank: number, total: number): string {
  if (total <= 1) return "bg-green-500"; // Only one item, always green
  const percentile = (rank - 1) / (total - 1);
  if (percentile < 0.1) return "bg-green-500"; // Top 10%
  if (percentile < 0.3) return "bg-yellow-500"; // Top 30%
  if (percentile < 0.6) return "bg-orange-500"; // Top 60%
  return "bg-red-500"; // Bottom 40%
}

export default function GuessList({ guesses }: GuessListProps) {
  const [totalLawsCount, setTotalLawsCount] = useState(0);
  const [loadingTotalLaws, setLoadingTotalLaws] = useState(true);

  useEffect(() => {
    async function fetchTotalLaws() {
      try {
        const res = await fetch("/law_names.json");
        if (!res.ok) {
          throw new Error("Failed to fetch law names data");
        }
        const data = await res.json();
        setTotalLawsCount(data.length);
      } catch (error) {
        console.error("Error fetching total laws:", error);
      } finally {
        setLoadingTotalLaws(false);
      }
    }
    fetchTotalLaws();
  }, []);

  if (guesses.length === 0) {
    return (
      <div className="mt-8 text-center text-gray-500">
        <p>아직 추측한 법률이 없습니다.</p>
        <p>정답 법률과 얼마나 비슷한지 확인해보세요!</p>
      </div>
    );
  }

  const sortedGuesses = [...guesses].sort((a, b) => a.rank - b.rank);

  return (
    <div className="w-full max-w-4xl mx-auto mt-4">
      {/* <h3 className="text-lg font-semibold text-gray-800 mb-2">
        나의 추측 기록
      </h3> */}
      <div className="grid grid-cols-12 gap-3 px-4 py-2 font-semibold text-gray-600 bg-gray-100 rounded-t-lg">
        <div className="col-span-1 text-center">#</div>
        <div className="col-span-4">추측 법률</div>
        <div className="col-span-2 text-center">유사도</div>
        <div className="col-span-2 text-center">순위</div>
        <div className="col-span-3"></div>
      </div>
      <ul className="bg-white border-l border-r border-b border-gray-200 rounded-b-lg shadow-md">
        {sortedGuesses.map((guess) => {
          let barWidth = 0;
          if (totalLawsCount > 1) {
            barWidth =
              (100 * (totalLawsCount - guess.rank)) / (totalLawsCount - 1);
          } else {
            barWidth = 100;
          }

          return (
            <li
              key={guess.submissionOrder}
              className="grid grid-cols-12 gap-3 px-4 py-3 border-b last:border-b-0 items-center border-gray-300"
            >
              <div className="col-span-1 text-center font-medium text-gray-800">
                {guess.submissionOrder}
              </div>
              <div
                className="col-span-4 text-gray-800 truncate"
                title={guess.name}
              >
                {guess.name}
              </div>
              <div className="col-span-2 text-center text-gray-800">
                {(guess.score * 100).toFixed(2)}
              </div>
              <div className="col-span-2 text-center text-gray-800 font-semibold">
                {guess.rank}
              </div>
              <div className="col-span-3 flex items-center">
                <div
                  className="w-full bg-gray-200 h-6"
                  title={`${guess.rank}위`}
                >
                  <div
                    className={`h-6 text-xs font-medium text-white flex items-center justify-end pr-2 ${getBarColor(
                      guess.rank,
                      totalLawsCount
                    )}`}
                    style={{ width: `${Math.max(barWidth, 5)}%` }}
                  >
                    {/* {guess.rank}위 */}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {!loadingTotalLaws && (
        <p className="text-sm text-gray-500 text-center mt-2">
          * 전체 순위는 {totalLawsCount}개의 법률 중 정답과의 유사도 순위입니다.
        </p>
      )}
    </div>
  );
}

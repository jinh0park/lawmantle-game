"use client";

import { type Guess } from "./GuessList";
import { useState, useEffect } from "react";

interface LastGuessResultProps {
  guess: Guess;
}

function getBarColor(rank: number, total: number): string {
  if (total <= 1) return "bg-green-500";
  const percentile = (rank - 1) / (total - 1);
  if (percentile < 0.1) return "bg-green-500";
  if (percentile < 0.3) return "bg-yellow-500";
  if (percentile < 0.6) return "bg-orange-500";
  return "bg-red-500";
}

export default function LastGuessResult({ guess }: LastGuessResultProps) {
  const [totalLawsCount, setTotalLawsCount] = useState(0);

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
      }
    }
    fetchTotalLaws();
  }, []);

  let barWidth = 0;
  if (totalLawsCount > 1) {
    barWidth = (100 * (totalLawsCount - guess.rank)) / (totalLawsCount - 1);
  } else {
    barWidth = 100;
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-6 mb-4 p-4 bg-white border-2 border-blue-500 rounded-lg shadow-lg animate-fade-in">
      {/* <h3 className="text-lg font-semibold text-gray-800 mb-2">
        방금 추측한 법률
      </h3> */}
      <div className="grid grid-cols-12 gap-3 items-center">
        <div className="col-span-1 text-center font-medium text-gray-800">
          {guess.submissionOrder}
        </div>
        <div className="col-span-4 text-gray-800 truncate" title={guess.name}>
          {guess.name}
        </div>
        <div className="col-span-2 text-center text-gray-800">
          {(guess.score * 100).toFixed(2)}
        </div>
        <div className="col-span-2 text-center text-gray-800 font-semibold">
          {guess.rank}
        </div>
        <div className="col-span-3 flex items-center">
          <div className="w-full bg-gray-200  h-6" title={`${guess.rank}위`}>
            <div
              className={`h-6  text-xs font-medium text-white flex items-center justify-end pr-2 ${getBarColor(
                guess.rank,
                totalLawsCount
              )}`}
              style={{ width: `${Math.max(barWidth, 5)}%` }}
            >
              {/* {guess.rank}위 */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

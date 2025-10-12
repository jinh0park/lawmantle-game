"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface LawRankInfo {
  id: number;
  name: string;
  score: number;
  rank: number;
}

function RankingComponent() {
  const searchParams = useSearchParams();
  const date = searchParams.get("date");

  const [ranking, setRanking] = useState<LawRankInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("법률 유사도 랭킹 Top 100");

  useEffect(() => {
    async function fetchRanking() {
      try {
        const url = date ? `/api/ranking?date=${date}` : "/api/ranking";
        const res = await fetch(url);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Failed to fetch ranking data");
        }
        const data: { answerName: string; ranking: LawRankInfo[] } =
          await res.json();

        setRanking(data.ranking.slice(0, 100));

        if (date) {
          setTitle(`${date} 정답 "${data.answerName}" 유사도 랭킹 Top 100`);
        } else {
          setTitle(`오늘의 정답 "${data.answerName}" 유사도 랭킹 Top 100`);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchRanking();
  }, [date]);

  if (isLoading) {
    return <div className="text-center mt-10">Loading rankings...</div>;
  }

  if (error) {
    return <div className="text-center mt-10 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-6">{title}</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                순위
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                법률명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                유사도 점수
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {ranking.map((law) => (
              <tr key={law.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">{law.rank}</td>
                <td className="px-6 py-4 whitespace-nowrap">{law.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {(law.score * 100).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function RankingPage() {
  return (
    <Suspense fallback={<div className="text-center mt-10">Loading...</div>}>
      <RankingComponent />
    </Suspense>
  );
}

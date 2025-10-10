"use client";

import { useState, useEffect } from 'react';

interface LawRankInfo {
  id: number;
  name: string;
  score: number;
  rank: number;
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<LawRankInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRanking() {
      try {
        const res = await fetch('/daily_game_data.json');
        if (!res.ok) {
          throw new Error('Failed to fetch ranking data');
        }
        const data = await res.json();
        // Assuming the ranking is already sorted and we just need the top 100
        setRanking(data.ranking.slice(0, 100));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    }
    fetchRanking();
  }, []);

  if (isLoading) {
    return <div className="text-center mt-10">Loading rankings...</div>;
  }

  if (error) {
    return <div className="text-center mt-10 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-6">오늘의 법률 유사도 랭킹 Top 100</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">순위</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">법률명</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">유사도 점수</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {ranking.map((law) => (
              <tr key={law.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">{law.rank}</td>
                <td className="px-6 py-4 whitespace-nowrap">{law.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{(law.score * 100).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

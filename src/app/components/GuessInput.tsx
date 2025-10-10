"use client";

import { useState, useMemo, RefObject, useEffect, useCallback } from "react";

interface GuessInputProps {
  onSubmit: (guess: string) => void;
  disabled: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
}

export default function GuessInput({
  onSubmit,
  disabled,
  inputRef,
}: GuessInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [availableLawNames, setAvailableLawNames] = useState<string[]>([]);
  const [loadingLaws, setLoadingLaws] = useState(true);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  useEffect(() => {
    async function fetchLawNames() {
      try {
        const res = await fetch("/law_names.json");
        if (!res.ok) {
          throw new Error("Failed to fetch daily game data");
        }
        const data = await res.json();
        const names = data;
        setAvailableLawNames(names);
      } catch (error) {
        console.error("Error fetching law names:", error);
      } finally {
        setLoadingLaws(false);
      }
    }
    fetchLawNames();
  }, []);

  const lawNames = useMemo(() => availableLawNames, [availableLawNames]);

  const suggestions = useMemo(() => {
    if (!inputValue) return [];
    return lawNames
      .filter((name) => name.toLowerCase().includes(inputValue.toLowerCase()))
      .sort((a, b) => a.length - b.length)
      .slice(0, 5);
  }, [inputValue, lawNames]);

  const selectSuggestion = useCallback(
    (suggestion: string) => {
      setInputValue(suggestion);
      setShowSuggestions(false);
      onSubmit(suggestion);
      setInputValue("");
      setActiveSuggestionIndex(-1);
    },
    [onSubmit]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeSuggestionIndex !== -1 && suggestions.length > 0) {
      selectSuggestion(suggestions[activeSuggestionIndex]);
    } else if (inputValue.trim() && !disabled && !loadingLaws) {
      onSubmit(inputValue.trim());
      setInputValue("");
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing) {
        return;
      }

      if (suggestions.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSuggestionIndex((prevIndex) => {
          if (prevIndex === suggestions.length - 1) {
            return 0;
          }
          return prevIndex + 1;
        });
        setShowSuggestions(true);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestionIndex((prevIndex) => {
          if (prevIndex === -1) {
            return suggestions.length - 1;
          }
          if (prevIndex === 0) {
            return -1;
          }
          return prevIndex - 1;
        });
        setShowSuggestions(true);
      } else if (e.key === "Enter") {
        if (activeSuggestionIndex !== -1) {
          e.preventDefault();
          selectSuggestion(suggestions[activeSuggestionIndex]);
        }
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
      }
    },
    [suggestions, activeSuggestionIndex, selectSuggestion]
  );

  useEffect(() => {
    setActiveSuggestionIndex(-1);
  }, [inputValue]);

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-md mx-auto">
      <div className="flex flex-col">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="법률 이름을 입력하세요..."
          disabled={disabled || loadingLaws}
          className="w-full px-4 py-3 text-lg text-gray-800 bg-white border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:border-blue-500 transition duration-200"
        />
        {showSuggestions && inputValue && suggestions.length > 0 && (
          <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg top-full">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                onMouseDown={() => selectSuggestion(suggestion)}
                className={`px-4 py-2 cursor-pointer ${
                  index === activeSuggestionIndex
                    ? "bg-blue-100"
                    : "hover:bg-gray-100"
                }`}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="submit"
        disabled={disabled || !inputValue.trim() || loadingLaws}
        className="w-full mt-2 px-4 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200"
      >
        {loadingLaws
          ? "법률 불러오는 중..."
          : disabled
          ? "확인 중..."
          : "추측하기"}
      </button>
    </form>
  );
}

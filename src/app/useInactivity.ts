// src/hooks/useInactivity.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useClient } from "./CustomerContext";

export function useInactivity(timeout: number = 300000) {
  const router = useRouter();
  const { clearClient } = useClient();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      setCountdown(null);
    }
    timeoutRef.current = setTimeout(() => {
      startCountdown(10); // Inicia contagem regressiva de 10 segundos
    }, timeout - 10000); // Subtrai o tempo de contagem regressiva
  };

  const startCountdown = (seconds: number) => {
    setCountdown(seconds);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(countdownRef.current!);
          clearClient();
          router.push("/");
          return null;
        }
        return (prev || 0) - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    const handleInteraction = () => resetTimeout();

    window.addEventListener("touchstart", handleInteraction);
    resetTimeout();

    return () => {
      window.removeEventListener("touchstart", handleInteraction);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [timeout, router, clearClient]);

  return countdown; // Retorna a contagem regressiva
}

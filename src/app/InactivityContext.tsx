'use client'
import React, { createContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type InactivityContextProps = {
  inactive: boolean;
  resetTimer: () => void;
};

type InactivityProviderProps = {
  children: React.ReactNode;
};

export const InactivityContext = createContext<InactivityContextProps | null>(null);

export const InactivityProvider: React.FC<InactivityProviderProps> = ({ children }) => {
  const [inactive, setInactive] = useState(false);
  const [timer, setTimer] = useState(30); // Tempo inicial em segundos
  const router = useRouter();

  const resetTimer = useCallback(() => {
    setInactive(false);
    setTimer(30); // Reinicia o timer
  }, []);

  const handleRedirect = useCallback(() => {
    router.push("/"); // Redireciona para a página inicial
  }, [router]);

  // Detecta interações e reseta o timer
  useEffect(() => {
    const handleActivity = () => resetTimer();

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
    };
  }, [resetTimer]);

  // Atualiza o timer de inatividade
  useEffect(() => {
    if (timer === 0) {
      setInactive(true);
    } else {
      const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // Timer para redirecionar quando o modal está ativo
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (inactive) {
      timeout = setTimeout(() => handleRedirect(), 5000); // 5 segundos para redirecionar
    }
    return () => clearTimeout(timeout);
  }, [inactive, handleRedirect]);

  return (
    <InactivityContext.Provider value={{ inactive, resetTimer }}>
      {children}
      {inactive && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white p-6 rounded-2xl shadow-lg text-center"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.8 }}
          >
            <h2 className="text-xl font-semibold">Inatividade detectada</h2>
            <p className="mt-2 text-gray-600">Você será redirecionado em 5 segundos...</p>
          </motion.div>
        </motion.div>
      )}
    </InactivityContext.Provider>
  );
};

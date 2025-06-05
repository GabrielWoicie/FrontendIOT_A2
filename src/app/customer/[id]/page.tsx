'use client';
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { API_URL } from "@/app/config";

export default function CustomerPage() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tagNumber, setTagNumber] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const nameParam = searchParams.get("name");
    const emailParam = searchParams.get("email");
    const tagNumberParam = searchParams.get("tagNumber");

    if (nameParam && emailParam && tagNumberParam) {
      setName(nameParam);
      setEmail(emailParam);
      setTagNumber(tagNumberParam);
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (loading) {
      timeoutId = setTimeout(() => {
        router.push("/");
      }, 10000);
    }
    return () => {
      clearTimeout(timeoutId);
    };
  }, [loading, router]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`${API_URL}/deletar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagNumber }),
      });

      if (response.ok) {
        router.push("/");
      } else {
        alert("Erro ao deletar o cadastro. Tente novamente.");
      }
    } catch (error) {
      alert("Erro na requisição. Verifique o servidor.");
    } finally {
      setDeleting(false);
      setShowConfirmModal(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center text-center">
        <p className="text-lg font-medium">Carregando informações do cliente...</p>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-gray-100">
      <motion.div
        className="bg-white shadow-lg rounded-2xl p-6 w-full max-w-md"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-4">
          Bem-vindo, {name}!
        </h1>

        <div className="text-center">
          <p className="text-gray-600 text-lg">Seu email é:</p>
          <p className="text-xl font-semibold text-gray-800 mb-4">{email}</p>
          <p className="text-gray-600 text-lg">Seu número de tag é:</p>
          <p className="text-3xl font-semibold text-green-600 mb-8">{tagNumber}</p>
        </div>

        <div className="flex justify-between space-x-4">
          <button
            className="w-1/2 bg-gray-300 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-400"
            onClick={() => router.push("/")}
          >
            Cancelar
          </button>
          <button
            className="w-1/2 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
            onClick={() => setShowConfirmModal(true)}
          >
            Deletar conta
          </button>
        </div>
      </motion.div>

      {showConfirmModal && (
        <motion.div
          className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="bg-white p-6 rounded-xl shadow-lg text-center max-w-sm w-full"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
          >
            <p className="text-lg text-gray-900 mb-4">Deseja realmente deletar sua conta?</p>
            <div className="flex justify-center space-x-4">
              <button
                className="px-4 py-2 bg-white text-black border border-black rounded w-24"
                onClick={() => setShowConfirmModal(false)}
              >
                Não
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded w-24"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deletando..." : "Sim"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

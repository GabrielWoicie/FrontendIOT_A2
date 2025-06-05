"use client";
import React, { useState, useEffect } from "react";
import Head from "next/head";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { API_URL } from "../config";
import { useDocument } from "../DocumentContext";
import { form } from "framer-motion/client";
import { start } from "repl";

export default function CadastroCliente() {
  const { document } = useDocument();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setDocument } = useDocument();
  const { clearDocument } = useDocument();
  const [isOpen, setIsOpen] = useState(false);
  const [readingTag, setReadingTag] = useState(false);
  
  const [formData, setFormData] = useState({
    name: document?.documentNumber || "",  
    email: "",
    tagNumber: "",
    });

  const [modalData, setModalData] = useState({
    show: false,
    message: "",
    type: "",
    timeoutId: null as NodeJS.Timeout | null,
  });

  const startRead = async () => {
    setIsOpen(true);
    setReadingTag(true);
    
    try {
      const response = await fetch(`${API_URL}/comando`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comando: "ler" }),
      });
  
      if (response.ok) {
        const data = await response.json();
        if (data.uid) {
          const uid = data.uid;
  
          // Verificar se a tag já existe
          const tagCheck = await fetch(`${API_URL}/buscarTag`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tagNumber: uid }),
          });
  
          if (tagCheck.ok) {
            const tagData = await tagCheck.json();
  
            if (tagData.name) {
              setModalData({
                show: true,
                message: `A tag já está cadastrada para: ${tagData.name} (${tagData.email})`,
                type: "alert",
                timeoutId: null,
              });
              // NÃO salva a tagNumber
              return;
            }
          }
  
          // Se não encontrou nenhum cadastro, então preenche normalmente
          setFormData(prev => ({ ...prev, tagNumber: uid }));
        }
      } else {
        setModalData({ show: true, message: "Erro ao ler o cartão.", type: "alert", timeoutId: null });
      }
    } catch (err) {
      console.error("Erro:", err);
      setModalData({ show: true, message: "Erro de conexão com o leitor.", type: "alert", timeoutId: null });
    } finally {
      setIsOpen(false);
      setReadingTag(false);
    }
  };
  

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { name, email, } = formData;

    if (!name || !email ) {
      setModalData({ show: true, message: "Por favor, preencha todos os campos obrigatórios.", type: "alert", timeoutId: null });
      return;
    }

    const data = {
      name,
      email,
      tagNumber: formData.tagNumber,
    };

    try {
      const response = await fetch(`${API_URL}/cadastro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setModalData({
          show: true,
          message: "Cadastro concluído!",
          type: "success",
          timeoutId: setTimeout(() => router.push("/"), 30000),
        });
      } else {
        setModalData({ show: true, message: "Erro: Verifique se o CPF já foi cadastrado.", type: "alert", timeoutId: null });
      }
    } catch (error) {
      setModalData({ show: true, message: "Ocorreu um erro ao processar seu cadastro. Tente novamente mais tarde.", type: "alert", timeoutId: null });
    }
    setIsSubmitting(false);
  };

  const handleModalAction = (action: string) => {
    if (modalData.timeoutId) clearTimeout(modalData.timeoutId);
    setIsSubmitting(false);

    if (action === "confirm") {
      setTimeout(() => {
        router.push("/novo-cartao");
      }, 300);
    } else if (action === "cancel") {
      router.push("/");
    } else if (action === "no") {
      setModalData({ show: false, message: "", type: "", timeoutId: null });
    } else if (action === "yes") {
      router.push("/");
    }

    setModalData({ show: false, message: "", type: "", timeoutId: null });
  };

  return (
    <>
      <Head>
        <title>Cadastro de Cliente</title>
      </Head>

      <div className="p-12 items-center justify-center bg-white margin-top">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h1 className="text-3xl font-bold text-black text-center">Cadastro de Cliente</h1>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nome completo
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Digite seu nome completo"
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              required
            />
          </div>

          <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="email@exemplo.com"
                className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                required
              />
            </div>

            <div>
  <label htmlFor="tagNumber" className="block text-sm font-medium text-gray-700">
    Número do cartão (tag)
  </label>
  <input
    type="text"
    id="tagNumber"
    value={formData.tagNumber}
    readOnly
    className="mt-1 block w-full px-3 py-2 bg-gray-100 border rounded-md shadow-sm focus:outline-none sm:text-sm"
    required
  />
  <button
    type="button"
    onClick={startRead}
    disabled={readingTag}
    className="mt-2 w-full bg-black text-white py-2 px-4 rounded-md shadow"
  >
    {readingTag ? "Lendo..." : "Ler cartão"}
  </button>
</div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full ${isSubmitting ? "bg-gray-500" : "bg-black"} text-white py-2 px-4 rounded-md shadow`}
              >
              {isSubmitting ? "Cadastrando..." : "Efetuar cadastro!"}
            </button>
        </form>
        <button
            id="cancel"
            className="w-full bg-white text-black py-2 border border-black rounded-md mt-3"
            onClick={(e) => {
              setModalData({ show: true, message: "Deseja cancelar o processo de cadastro?", type: "cancel", timeoutId: null });
            }}
          >
            Cancelar
          </button>

        {modalData.show && (
          <motion.div
            className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="bg-white p-6 rounded-xl shadow-lg text-center max-w-lg w-full"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
            >
              <p className="text-lg text-grey-900 mb-4">{modalData.message}</p>
              {modalData.type === "cancel" && (
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => handleModalAction("yes")}
                    className="px-4 py-2 bg-white text-black border border-black rounded w-24"
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => handleModalAction("no")}
                    className="px-4 py-2 bg-black text-white rounded w-24"
                  >
                    Não
                  </button>
                </div>
              )}
              {modalData.type === "alert" && (
                <button
                  onClick={() => {
                    handleModalAction("close");
                  }}
                  className="px-4 py-2 bg-black text-white rounded w-24"
                >
                  Ok
                </button>
              )}
              {modalData.type === "success" && (
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => handleModalAction("cancel")}
                    className="px-4 py-2 bg-white text-black border border-black rounded w-24"
                  >
                    Ok
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

{isOpen && (
  <motion.div
    className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    onClick={() => setIsOpen(false)}
  >
    <motion.div
      className="bg-white p-6 rounded-xl shadow-lg text-center max-w-lg w-full"
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      onClick={(e) => e.stopPropagation()} 
    >
      <p className="text-lg text-grey-900 mb-4">Aproxime seu cartão</p>

      <motion.div
        className="flex flex-col items-center justify-center flex-grow"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
      >
        <motion.div
          className="relative w-32 h-36 bg-gray-200 rounded-xl shadow-md"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.div
          className="mt-8 w-40 h-8 bg-gray-100 rounded-md shadow-md"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>

      <button
        onClick={() => setIsOpen(false)}
        className="mt-6 py-2 bg-black text-white rounded w-24"
      >
        Fechar
      </button>
    </motion.div>
  </motion.div>
)}

      </div>
    </>
  );
}

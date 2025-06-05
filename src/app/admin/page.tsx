"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { API_URL } from "../config";
import { send } from "process";

export default function CardPage() {
  const router = useRouter();
  const [Status, setStatus] = useState("idle");
  const StatusRef = useRef(Status);
  const [modalDataError, setModalDataError] = useState({show: false, message: ''});
  const [modalData, setModalData] = useState({show: false, message: ''});
  const [modalDataSucess, setModalDataSucess] = useState({show: false, message: ''});
  const [modalRemoveCard, setModalRemoveCard] = useState(false);
  const [modalSyncCard, setModalSyncCard] = useState(false);
  const [cpf, setCpf] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tagNumber, setTagNumber] = useState(null);
  const [listening, setListening] = useState(false);


  useEffect(() => {
    StatusRef.current = Status;
  }, [Status]);

  // Validação dos dados recebidos do Android
  const validateAndProcessData = (data) => {
    const regexPatterns = {
      validTag: /^F1A004([0-9A-F]{8})F0$/, // Padrão esperado
      error: /^F1E000F0$/, // Padrão de erro
    };

    if (regexPatterns.validTag.test(data)) {
      const match = data.match(regexPatterns.validTag);
      return { type: "valid", tagNumber: match[1] }; // Extrai o número do cartão
    } else if (regexPatterns.error.test(data)) {
      return { type: "error" };
    } else {
      return { type: "unknown" };
    }
  };

  const sendUnidleMessage = (status) => {
    StatusRef.current = status;
    setListening(true);
    window.Android.receiveMessage(JSON.stringify("unIdle"));
    console.log("Mensagem enviada");
  }

  useEffect(() => {
    if (!listening) return;
    
    window.receiveFromAndroid = async (data) => {
      console.log("Data from Android:", data);
      const result = validateAndProcessData(data);

      if (result.type === "valid") {
        setTagNumber(result.tagNumber);
        console.log("TagNumber", result.tagNumber);
      } else if (result.type === "error") {
        setModalDataError({ show: true, message: "Erro no módulo de leitura." });
        console.log("Erro no módulo de leitura.");
      }
      setListening(false);
    };
    return () => {
      window.receiveFromAndroid = null;
    };
  }, [listening]);


  // Envia a requisição para remover o cartão quando CPF e tagNumber estiverem disponíveis
  useEffect(() => {
    if (cpf && tagNumber) {
      console.log("statusRef", StatusRef.current);
      if (StatusRef.current === "removeCard") {
        removeCard();
      } else if (StatusRef.current === "syncCard") {  
        syncCard();
      } 
    }
  }, [cpf, tagNumber]);

  const handleCpfSubmit = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/customers/find-cpf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cpf }),
      });

      const data = await response.json();

      if (response.status === 404 && data.message === "CPF not found") {
        setModalData({ show: true, message: "Não encontramos o cadastro nesse CPF" });
      } else if (response.status === 404 && data.message === "Tag not found") {
        if (StatusRef.current === "syncCard") {
          sendUnidleMessage("syncCard");
          setModalDataSucess({ show: true, message: "Aproxime o cartão no leitor para vincular" });
        } else {
          setModalData({ show: true, message: "Não encontramos um cartão vinculado nessa conta" });
        }
      } else if (response.status === 200) {
        sendUnidleMessage("removeCard");
        if (StatusRef.current === "syncCard") {
          setModalDataSucess({ show: true, message: "Aproxime o cartão no leitor para vincular" });
        } else{
          setModalDataSucess({ show: true, message: "Aproxime o cartão no leitor para desvincular" });
        }
      }
    } catch (error) {
      setModalDataError({ show: true, message: "Erro ao buscar CPF" });
      console.error("Erro ao enviar CPF:", error);
    }
    setIsLoading(false);
  };

  const removeCard = async () => {
    try {
      const response = await fetch(`${API_URL}/customers/remove-card`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tagNumber,
          documentNumber: cpf,
        }),
      });

      const responseData = await response.json();
      if (response.status === 200) {
        setModalRemoveCard(false);
        setModalDataSucess({ show: false, message: '' });
        setModalData({ show: true, message: "Cartão desvinculado com sucesso." });
        setTagNumber(null);
      } else {
        setModalRemoveCard(false);
        setModalDataSucess({ show: false, message: '' });
        setModalDataError({ show: true, message: "Erro desconhecido." });
        console.error("Erro desconhecido:", responseData);
        setTagNumber(null);
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      setModalDataError({ show: true, message: "Erro na comunicação com o servidor." });
    }
  };

  const syncCard = async () => {
    try {
      const response = await fetch(`${API_URL}/customers/new-card`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tagNumber,
          documentNumber: cpf,
        }),
      });

      const responseData = await response.json();
      if (response.status === 200) {
        setModalSyncCard(false);
        setModalDataSucess({ show: false, message: '' });
        setModalData({ show: true, message: "Cartão vinculado com sucesso." });
        setTagNumber(null);
      } else {
        setModalRemoveCard(false);
        setModalDataSucess({ show: false, message: '' });
        setModalDataError({ show: true, message: "Erro desconhecido." });
        console.error("Erro desconhecido:", responseData);
        setTagNumber(null);
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      setModalDataError({ show: true, message: "Erro na comunicação com o servidor." });
    }
  };

  const buttonActions = [
    { label: "Dispensar cartão", action: () => console.log("Dispensando cartão...") },
    { label: "Vincular cartão", action: () => {
      setModalSyncCard(true);
      setStatus("syncCard");
      console.log("status", StatusRef.current);
    }},
    { label: "Desvincular cartão", action: () => {
      setModalRemoveCard(true);
      setStatus("removeCard");
      console.log("status", StatusRef.current);
    }},
  ];

  return (
    <div className="fixed flex flex-col items-center justify-center w-full h-full bg-gray-100">
      <p className="mt-2 text-3xl text-gray-800 text-center">Painel Administrador</p>

      <div className="mt-4 flex flex-col items-center justify-center">
        <motion.div
          className="bg-white shadow-xl rounded-2xl p-6 w-full max-w-sm"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xl text-gray-600 text-center">
            Selecione uma opção
          </p>
        <div className="p-6">
            <div className="grid grid-cols-1 gap-3 max-w-md mx-auto">
            {buttonActions.map(({ label, action }, index) => (
            <motion.button
                key={index}
                className="w-full min-w-[200px] px-6 py-3 rounded-lg font-bold border border-black bg-black text-white"
                onClick={action}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                >
                {label}
            </motion.button>
            ))}
            </div>
        </div>
        </motion.div>
      </div>

      <div className="mt-6 flex flex-col items-center justify-center">
        
        <motion.button
                className="px-6 py-3 rounded-lg border border-black bg-gray-100 text-black"
                onClick={() => {
                    router.push("/");
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                Voltar
              </motion.button>
        
      </div>

      {modalSyncCard && (
         <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 space-x-4">
         <motion.div
           className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md"
           initial={{ opacity: 0, scale: 0.8 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.3 }}
         >
             <>

               <p className="mt-2 text-center text-gray-600">
                 Digite o CPF do cliente para vincular o cartão.
               </p>

               <input
                 type="number"
                 className="mt-4 px-4 py-2 border border-gray-600 rounded-lg w-full"
                 placeholder="CPF"
                 value={cpf}
                 onChange={(e) => setCpf(e.target.value)}
               />


               <div className="flex items-center justify-center space-x-4">
               <button
                   disabled={isLoading}
                   className="mt-4 px-6 py-3 border border-gray-600 bg-black text-white rounded-lg"
                   onClick={() => {
                      setIsLoading(true);
                      handleCpfSubmit();
                   }}
                 >
                   {isLoading ? "Carregando..." : "Próximo"}
                 </button>
                 <button
                   className="mt-4 px-6 py-3 border border-gray-600 bg-white text-black rounded-lg"
                   onClick={() => {
                   setModalSyncCard(false);
                   }}
                 >
                   Cancelar
                 </button>
               </div>

             </>
         </motion.div>
        </div>
      )}

      {modalRemoveCard && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 space-x-4">
          <motion.div
            className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
              <>

                <p className="mt-2 text-center text-gray-600">
                  Digite o CPF do cliente para vincular um cartão.
                </p>

                <input
                  type="number"
                  className="mt-4 px-4 py-2 border border-gray-600 rounded-lg w-full"
                  placeholder="CPF"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                />


                <div className="flex items-center justify-center space-x-4">
                <button
                    disabled={isLoading}
                    className="mt-4 px-6 py-3 border border-gray-600 bg-black text-white rounded-lg"
                    onClick={() => {
                      setIsLoading(true);
                      handleCpfSubmit();
                    }}
                  >
                    {isLoading ? "Carregando..." : "Próximo"}
                  </button>
                  <button
                    className="mt-4 px-6 py-3 border border-gray-600 bg-white text-black rounded-lg"
                    onClick={() => {
                    setModalRemoveCard(false);
                    }}
                  >
                    Cancelar
                  </button>
                </div>

              </>
          </motion.div>
        </div>
      )}

          {modalDataError.show && (
            <motion.div
                className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setModalDataError({show: false, message: ''})}
            >
                <motion.div
                    className="bg-white p-6 rounded-xl shadow-lg text-center max-w-lg w-full"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                >
                <p className="text-lg text-grey-900 mb-4">{modalDataError.message}</p>
                <button
                    onClick={() => {
                    setModalDataError({show: false, message: ''});
                    }}
                    className="mt-6 py-2 bg-black text-white rounded w-24"
                >
                Fechar
                </button>
                </motion.div>
            </motion.div>
            )}

            {modalData.show && (
            <motion.div
                className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setModalData({show: false, message: ''})}
            >
                <motion.div
                    className="bg-white p-6 rounded-xl shadow-lg text-center max-w-lg w-full"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                >
                <p className="text-lg text-grey-900 mb-4">{modalData.message}</p>
                
                <button
                    onClick={() => {
                    setModalData({show: false, message: ''});
                    }}
                    className="mt-6 py-2 bg-black text-white rounded w-24"
                >
                Fechar
                </button>
                </motion.div>
            </motion.div>
            )}

            {modalDataSucess.show && (
            <motion.div
                className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setModalDataSucess({show: false, message: ''})}
            >
                <motion.div
                    className="bg-white p-6 rounded-xl shadow-lg text-center max-w-lg w-full"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                >
                <p className="text-lg text-grey-900 mb-4">{modalDataSucess.message}</p>
                <motion.div
                    className="flex flex-col mt-4 items-center justify-center flex-grow"
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
                    onClick={() => {
                    setModalDataSucess({show: false, message: ''});
                    }}
                    className="mt-6 py-2 bg-white border text-red-500 border-red-500 rounded-lg w-24"
                >
                Cancelar
                </button>
              
                </motion.div>
            </motion.div>
            )}
        </div>
      
  );
}

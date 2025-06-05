"use client";

import { useDocument } from "../DocumentContext";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { API_URL } from "../config";
import { stringify } from "querystring";

export default function CardPage() {
  const { document } = useDocument();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [timer, setTimer] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("IDLE");
  const [isQRCodeLoading, setIsQRCodeLoading] = useState(true);
  const paymentStatusRef = useRef(paymentStatus);
  const [modalDataError, setModalDataError] = useState({show: false, message: ''});
  const [modalData, setModalData] = useState({show: false, message: ''});
  const [modalDataTrust, setModalDataTrust] = useState({show: false, message: ''});
  const [modalDataPaid, setModalDataPaid] = useState({show: false, message: ''});

  useEffect(() => {
    paymentStatusRef.current = paymentStatus;
  }, [paymentStatus]);

  const startExpirationTimer = (seconds) => {
    setTimer(seconds);
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsModalOpen(false);
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    const validateAndProcessData = (data) => {
      const regexPatterns = {
        validTag: /^F1A004([0-9A-F]{8})F0$/, // Padrão esperado
        error: /^F1E000F0$/, // Padrão de erro
      };
  
      if (regexPatterns.validTag.test(data)) {
        const match = data.match(regexPatterns.validTag);
        return { type: "valid", tagNumber: match[1] }; // Extrai VAL1VAL2VAL3VAL4
      } else if (regexPatterns.error.test(data)) {
        return { type: "error" };
      } else {
        return { type: "unknown" };
      }
    };
  
    window.receiveFromAndroid = async (data) => {
      const result = validateAndProcessData(data);
  
      if (result.type === "valid") {
        const { tagNumber } = result;
  
        try {
          const response = await fetch(`${API_URL}/customers/new-card`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tagNumber,
              documentNumber: document?.documentNumber,
            }),
          });
  
          const responseData = await response.json();
  
          if (response.status === 404) {
            switch (responseData.message) {
              case "Tag already exists":
                setModalDataError({ show: true, message: "Tag já cadastrada." });
                break;
              case "Document already exists":
                setModalDataError({ show: true, message: "Usuário inativo." });
                break;
              default:
                setModalDataError({ show: true, message: "Erro desconhecido." });
                console.error("Erro desconhecido:", responseData);
                break;
            }
          } else if (response.status === 200) {
            setModalData({ show: true, message: "Cartão registrado com sucesso." });
            setTimeout(() => {
              router.push("/");
            }, 10000);
          } else {
            setModalDataError({ show: true, message: "Erro desconhecido." });
            console.error("Erro desconhecido:", responseData);
          }
        } catch (error) {
          console.error("Erro na requisição:", error);
          setModalDataError({ show: true, message: "Erro na comunicação com o servidor." });
        }
      } else if (result.type === "error") {
        setModalDataError({ show: true, message: "Erro no módulo de leitura." });
      }
    };
  
    return () => {
      window.receiveFromAndroid = null;
    };
  }, [document, router]);

  const checkPaymentStatus = async (txid: string) => {
    const interval = setInterval(async () => {
      if (paymentStatusRef.current === "PENDING") {
        try {
        const response = await fetch(`${API_URL}/consultapix`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ txid }),
        });
        const result = await response.json();
        if (result.status === "CONCLUIDO") {
          clearInterval(interval);
          setPaymentStatus("COMPLETED");
          window.Android.receiveMessage(JSON.stringify("unIdle"));
        }
      } catch (error) {
        console.error("Erro ao consultar pagamento:", error);
        clearInterval(interval);
        }
      } else {
        clearInterval(interval);
      }
    }, 5000);
  };

  const handleVerification = async () => {
    const response = await fetch(`${API_URL}/customers/verify-card`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentNumber: document?.documentNumber }),
    });
    const data = await response.json();
    if (response.status === 200) {
      
      if (data.message === "Paid card") {
        console.log(data);
        setIsModalOpen(true);
        setModalDataPaid({ show: true, message: "Já identificamos seu pagamento, deseja continuar?" });
      } else if (data.message === "Not Paid card") {
        setPaymentStatus("PENDING");
        setIsModalOpen(true);
        handlePayment();
      }
    } else {
      setModalDataError({ show: true, message: "Erro ao verificar." });
      console.error("Erro ao verificar:", data);
    }
  }

  const handlePayment = async () => {
    setLoading(true);
    try {
      const valor = "5";
      const response = await fetch(`${API_URL}/cob-card/pix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valor: { original: parseFloat(valor).toFixed(2), modalidadeAlteracao: 1 },
          documentNumber: document?.documentNumber,
        }),
      });
      const data = await response.json();
      setPaymentData(data);
      setLoading(false);
      setIsModalOpen(true);
      startExpirationTimer(data.calendario.expiracao);
      checkPaymentStatus(data.txid);
    } catch (error) {
      console.error("Erro ao gerar pagamento:", error);
      setLoading(false);
    }
  };

  return (
    <div className="fixed flex flex-col items-center justify-center w-full h-full bg-gray-100">
      <p className="mt-2 text-3xl text-gray-800 text-center">Falta pouco para ter seu novo</p>
      <p className="mt-2 text-3xl text-gray-800 text-center">cartão Nordus!</p>

      <div className="mt-4 flex flex-col items-center justify-center">
        <motion.div
          className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-sm"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xl text-gray-600 text-center">
            O custo para a emissão do cartão é:
          </p>
          <p className="text-2xl text-center font-semibold text-green-600 mb-4">
              R$ 5,00
            </p>
          <div className="flex justify-center space-x-4">
            <motion.button
                disabled={loading}
                className="px-6 py-3 rounded-lg font-bold border border-black bg-black text-white"
                onClick={() => {
                  setLoading(true);
                  handleVerification();
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {loading ? "Carregando..." : "Gerar Pix"}
              </motion.button>
              <motion.button
                className="px-6 py-3 rounded-lg border border-black bg-white text-black"
                onClick={() => {
                    router.push("/");
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                Cancelar
              </motion.button>
          </div>
        </motion.div>
      </div>

      <div className="mt-6 flex flex-col items-center justify-center">
        <motion.div
          className="bg-white shadow-lg rounded-2xl p-4 w-full max-w-sm"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
        <p className="text-xl text-center font-semibold text-red-600">
            Atenção!
        </p>
        <p className="text mt-2 text-gray-600 text-center">
            Após a confirmação do pagamento, retire seu cartão do dispensador e siga as instruções da tela.
         </p>
        </motion.div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 space-x-4">
          <motion.div
            className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            
            {paymentStatus === "PENDING" && (
              <>
                <p className="text-2xl font-bold text-center">Pagamento</p>
                {isQRCodeLoading && <p className="mt-4 text-center text-gray-600" >Carregando QR Code...</p>}
                
                <p className="mt-4 text-center text-gray-600">
                  Abra o app do seu banco e pague com QR Code.
                </p>
                {paymentData?.pixCopiaECola && (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?data=${paymentData?.pixCopiaECola}&size=200x200`}
                  alt="QR Code"
                  className="mx-auto mt-4"
                  onLoad={() => setIsQRCodeLoading(false)}
                  style={{ display: isQRCodeLoading ? "none" : "block" }}
                />
                )}
                {!isQRCodeLoading && (
                  <>
                <p className="mt-2 text-center text-gray-600">
                  Expira em: {timer}s
                </p>
                <p className="mt-2 text-center text-gray-600">Aguardando pagamento...</p>
                <p className="mt-4 text-center text-gray-800 font-bold">
                  Preço Total: R$ {paymentData?.valor?.original}
                </p>
                <div className="flex items-center justify-center space-x-4">
                <button
                  className="mt-4 px-6 py-3 border border-gray-600 bg-white text-black rounded-lg"
                  onClick={() => {
                  setPaymentStatus("CANCELED");
                  setIsModalOpen(false);
                  }}
                >
                  Cancelar
                </button>
                </div>
              </>
                )}
              </>
            )}
            {paymentStatus === "COMPLETED" && (
              <>
                <p className="text-xl text-center text-green-600 font-bold">
                  Pagamento Concluído!
                </p>
                <p className="mt-2 text-center text-gray-600">
                  Retire seu cartão Nordus e aproxime do leitor.
                </p>
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
                <div className="flex items-center justify-center space-x-4">
                <button
                    className="mt-6 py-2 border bg-white text-red-500 border-red-500 rounded-lg w-24"
                  
                    onClick={() => {
                    setModalDataTrust({show: true, message: 'Deseja realmente cancelar essa operação?'});
                    }}
                    
                >
                Cancelar
                </button>
                </div>
              </>
            )}
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
                <div className="mt-2 flex justify-center">
                  <div className="swal-icon swal-icon--success mb-3">
                    <span className="swal-icon--success__line swal-icon--success__line--long"></span>
                    <span className="swal-icon--success__line swal-icon--success__line--tip"></span>
                    <div className="swal-icon--success__ring"></div>
                    <div className="swal-icon--success__hide-corners"></div>
                  </div>
                </div>
                <button
                    onClick={() => {
                    setModalData({show: false, message: ''});
                    router.push("/");
                    }}
                    className="mt-6 py-2 bg-black text-white rounded w-24"
                >
                Fechar
                </button>
                </motion.div>
            </motion.div>
            )}
            {modalDataTrust.show && (
            <motion.div
                className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setModalDataTrust({show: false, message: ''})}
            >
                <motion.div
                    className="bg-white p-6 rounded-xl shadow-lg text-center max-w-lg w-full"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                >
                <p className="text-lg text-grey-900 mb-4">{modalDataTrust.message}</p>
                <div className="mt-2 flex justify-center space-x-4">
                <button
                    onClick={() => {
                    setModalDataTrust({show: false, message: ''});
                    router.push("/");
                    }}
                    className="mt-6 py-2 border bg-white text-black border-black rounded w-24"
                >
                Sim
                </button>
                <button
                    onClick={() => {
                    setModalDataTrust({show: false, message: ''});
                    }}
                    className="mt-6 py-2 bg-black text-white rounded w-24"
                >
                Não
                </button>
                </div>
                </motion.div>
            </motion.div>
            )}
            {modalDataPaid.show && (
            <motion.div
                className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setModalDataPaid({show: false, message: ''})}
            >
                <motion.div
                    className="bg-white p-6 rounded-xl shadow-lg text-center max-w-lg w-full"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                >
                <p className="text-lg text-grey-900 mb-4">{modalDataPaid.message}</p>
                <div className="mt-2 flex justify-center space-x-4">
                <button
                    onClick={() => {
                    setModalDataPaid({show: false, message: ''});
                    setPaymentStatus("COMPLETED");
                    }}
                    className="mt-6 py-2 bg-black text-white rounded w-24"
                >
                Sim
                </button>
                <button
                    onClick={() => {
                    setModalDataPaid({show: false, message: ''});
                    }}
                    className="mt-6 py-2 border bg-white text-black border-black rounded w-24"
                >
                Não
                </button>
                </div>
                </motion.div>
            </motion.div>
            )}
        </div>
  );
}

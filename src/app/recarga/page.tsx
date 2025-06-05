"use client";

import { useClient } from "../CustomerContext";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { clear } from "console";
import { API_URL } from "../config";

export default function ClientPage() {
  const { client } = useClient();
  const router = useRouter();
  const [selectedValue, setSelectedValue] = useState(null);
  const [customValue, setCustomValue] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [timer, setTimer] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("IDLE");
  const [isQRCodeLoading, setIsQRCodeLoading] = useState(true);
  const isButtonEnabled = selectedValue || customValue;
  const paymentStatusRef = useRef(paymentStatus);

  useEffect(() => {
    paymentStatusRef.current = paymentStatus;
  }, [paymentStatus]);

  const handleCustomValueChange = (e) => {
    setCustomValue(e.target.value);
    setSelectedValue(null);
  };

  const handleValueSelection = (value) => {
    setSelectedValue(value);
    setCustomValue("");
  };

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
          setTimeout(() => router.push("/"), 8000);
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

  const handlePayment = async () => {
    setLoading(true);
    try {
      const valor = selectedValue || customValue;
      const response = await fetch(`${API_URL}/cob/pix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valor: { original: parseFloat(valor).toFixed(2), modalidadeAlteracao: 1 },
          tagNumber: client?.tagNumber,
          idTag: client?.idTag,
          idCustomer: client?.idCustomer,
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
      <p className="mt-4 text-3xl text-gray-800 text-center">Recarregue seu Cartão</p>
      <p className="mt-2 text-lg text-gray-800 text-center">
        Seu saldo atual é: R$ {client?.saldo}
      </p>

      <div className="mt-4 flex flex-col items-center justify-center">
        <motion.div
          className="bg-white shadow-xl rounded-2xl p-6 w-full max-w-md"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xl text-gray-600 text-center">
            Escolha ou digite o valor que deseja recarregar.
          </p>
          <div className="flex justify-center mt-4 space-x-4">
            {[30, 50, 80].map((value) => (
              <motion.button
                key={value}
                className={`px-6 py-3 rounded-lg font-bold border border-black ${
                  selectedValue === value ? "bg-black text-white" : "bg-white text-black"
                }`}
                onClick={() => {
                  handleValueSelection(value);
                  console.log(paymentStatus);
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                R$ {value},00
              </motion.button>
            ))}
          </div>
          <div className="flex mt-4 items-center justify-center space-x-4">
            <input
              type="number"
              placeholder="Digite valor para inserir"
              value={customValue}
              onChange={handleCustomValueChange}
              className="px-6 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-gray-300"
            />
          </div>
          <div className="flex mt-5 items-center justify-center space-x-4">
            <button
              id="advanceButton"
              disabled={!isButtonEnabled || loading}
              className={`px-6 py-3 rounded-lg font-bold ${
                isButtonEnabled
                  ? "bg-black text-white hover:bg-gray-800"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
              onClick={() => {
                setPaymentStatus("PENDING");
                console.log(paymentStatus);
                handlePayment();
                }}
            >
              {loading ? "Carregando..." : "Ir para o pagamento"}
            </button>
            <button
              className="px-6 py-3 border border-gray-600 rounded-lg bg-white text-gray-800 hover:bg-black hover:text-white"
              onClick={() => router.push("/")}
            >
              Cancelar
            </button>
          </div>
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
            <p className="text-2xl font-bold text-center">Pagamento</p>
            {paymentStatus === "PENDING" && (
              <>
                {isQRCodeLoading && <p className="mt-4 text-center text-gray-600" >Carregando QR Code...</p>}
                
                <p className="mt-4 text-center text-gray-600">
                  Abra o app do seu banco e pague com QR Code.
                </p>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?data=${paymentData?.pixCopiaECola}&size=200x200`}
                  alt="QR Code"
                  className="mx-auto mt-4"
                  onLoad={() => setIsQRCodeLoading(false)}
                  style={{ display: isQRCodeLoading ? "none" : "block" }}
                />
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
                  console.log(paymentStatus);
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
                <p className="mt-4 text-center text-green-600 font-bold">
                  Pagamento Concluído!
                </p>
                <div className="mt-2 flex justify-center">
                  <div className="swal-icon swal-icon--success mb-3">
                    <span className="swal-icon--success__line swal-icon--success__line--long"></span>
                    <span className="swal-icon--success__line swal-icon--success__line--tip"></span>
                    <div className="swal-icon--success__ring"></div>
                    <div className="swal-icon--success__hide-corners"></div>
                  </div>
                </div>
                <div className="flex items-center justify-center space-x-4">
                <button
                  className="mt-2 px-6 py-3 bg-black text-white rounded-lg"
                  onClick={() => router.push("/")}
                >
                  Ok
                </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}

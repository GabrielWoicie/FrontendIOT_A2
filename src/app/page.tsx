'use client';
import React, { useState } from "react";
import Head from 'next/head';
import { motion } from "framer-motion";
import { useRouter } from 'next/navigation';
import { useClient } from "./CustomerContext";
import { useEffect } from "react";
import { useDocument } from "./DocumentContext";
import { API_URL } from "./config";

export default function Home() {
  const [cpf, setCpf] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modalData, setModalData] = useState({show: false, message: '', type: ''});
  const [modalDataError, setModalDataError] = useState({show: false, message: ''});
  const router = useRouter();
  const { setClient } = useClient();
  const { clearClient } = useClient();
  const { setDocument } = useDocument();
  const { clearDocument } = useDocument();
  const [canClear, setCanClear] = useState(true);
  const [receiveData, setReceiveData] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  

  useEffect(() => {
    if (canClear) {
      clearClient();
      clearDocument();
      const timeout = setTimeout(() => {
        setCanClear(false);
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [canClear, clearClient, clearDocument]);

  const handleCpfChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(event.target.value);
  };

  const handleCpfSubmit = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_URL + "buscar", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: cpf }),
      });
      const data = await response.json();
      if (response.status === 404 && data.error === "Cliente não encontrado.") {
        setModalData({show: true, message: 'Não encontramos seu cadastro, deseja se cadastrar?', type: 'register'});
      } else if (response.status === 404 && data.message === "Tag not found") {
        setModalData({show: true, message: 'Não encontramos um cartão vinculado na sua conta, deseja obter um cartão?', type: 'tag'});
      } else if (response.status === 200) {
        setClient({
          name: data.name,
          tagNumber: data.tagNumber,
          email: data.email,
        });
        router.push(`/customer/${data.idClient}?name=${data.name}&email=${data.email}&tagNumber=${data.tagNumber}`);  
      }
    } catch (error) {
      setModalDataError({show: true, message: 'Erro ao buscar CPF'});
      console.error('Erro ao enviar CPF: ',error);
    }
    setIsLoading(false);
  };

  const handleModalAction = (action: string) => {
    if (action === 'confirm') {
      if (modalData.type === 'register') {
        router.push('/registro');
        setDocument({ documentNumber: cpf });
      } else if (modalData.type === 'tag') {
        router.push('/novo-cartao');
        setDocument({ documentNumber: cpf });
      }
    }
    setModalData({ show: false, message: '', type: '' });
  };

  const handleCloseButton = async() => {
    try {
      const response = await fetch(API_URL + 'comandoParar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comando: 'parar' }),
      });
      console.log('Comando de parar enviado com sucesso');  

    } catch (error) {
      console.error('Erro ao enviar comando de parar:', error);
      setModalDataError({ show: true, message: 'Erro ao enviar comando de parar.' });
    };
  };

  const handleTouchScreen = async () => {
    if (!isOpen) {
      setReceiveData("");
      setIsOpen(true);
      try {
        console.log('Sending command to server...');
        const response = await fetch(API_URL + 'comando', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ comando: 'ler' }),
        });

        if (!response.ok) {
          throw new Error('Failed to send command');
        }

        const data = await response.json();
        console.log('Response from server:', data);
        if (data.uid != null) {
          const responseData = await fetch(API_URL + 'buscarTag', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tagNumber: data.uid }),
          });
          
          const dataTag = await responseData.json();
          console.log('Response from server:', dataTag);
          if (responseData.status !== 404) {
            setClient({
              name: dataTag.name,
              email: dataTag.email,
              tagNumber: dataTag.tagNumber,
           });
            router.push(
                `/customer/${dataTag.idClient}?name=${dataTag.name}&email=${dataTag.email}&tagNumber=${dataTag.tagNumber}`
            );
          } else {
            setIsOpen(false);
            
          }
          
        }
      } catch (error) {
        console.error('Error sending command:', error);
        setModalDataError({ show: true, message: 'Erro ao enviar comando para o servidor.' });
      }
    }
  };

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, height=device-height, initial-scale=1.0" />
      </Head>
      <div className="fixed flex flex-col items-center justify-center w-full h-full" onClick={handleTouchScreen}>
        <h1 className="text-7xl font-extrabold text-black">Olá!</h1>
        <p className="mt-4 text-3xl text-gray-700 text-center px-9">
          Seja bem-vindo ao nosso sistema de leitura de tags!
        </p>
    
        <p className="mt-4 text-xl text-gray-600 text-center">
          Toque na tela para iniciar
        </p>
        <div className="mt-16">
        <motion.div
        className="relative w-32 h-32"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
      >
        <motion.div
          className="absolute inset-0 w-full h-full border-4 border-gray-300 rounded-full opacity-50"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0 w-full h-full border-4 border-gray-500 rounded-full opacity-30"
          animate={{ scale: [1, 1.6, 1], opacity: [0.3, 0.8, 0.3] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
        />
      </motion.div>
        </div>

        <footer className="footer-container mt-9">
        <p className="mt-8 text-lg text-gray-600 text-center">
          Não possui tag?
        </p>
            <div className="wrapper mt-2">
             
                <button
                id="cpfSubmit"
                disabled={!cpf || isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCpfSubmit();
                }}>
                {isLoading ? (
                <motion.div
                className="w-6 h-6 border-4 border-t-4 border-gray-200 rounded-full animate-spin"
                style={{ borderTopColor: 'black' }}
                ></motion.div>
                ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"
                viewBox="0 0 24 24" strokeWidth="2" stroke={cpf ? "black" : "grey"} fill="none" strokeLinecap="round"
                strokeLinejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                <path d="M5 12l14 0"></path>
                <path d="M13 18l6 -6"></path>
                <path d="M13 6l6 6"></path>
                </svg>
                )}
                </button>
                <input id="cpf" placeholder="Digite seu nome" value={cpf} onChange={handleCpfChange} onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCpfSubmit();
                }
                }}
                onFocus={() => {
                const cpfElement = document.getElementById('cpf');
                if (cpfElement) {
                  window.scrollTo(0, cpfElement.offsetTop);
                }
                }}
                onClick={(e) => e.stopPropagation()}
                />
            </div>
        </footer>

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
              onClick={(e) => e.stopPropagation()} 
            >
              <p className="text-lg text-grey-900 mb-4">{modalData.message}</p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleModalAction('confirm');
                  }}
                  className="px-4 py-2 bg-black text-white rounded w-24"
                >
                  Sim
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleModalAction('cancel');
                  }}
                  className="px-4 py-2 bg-white text-black border border-black rounded w-24"
                >
                  Cancelar
                </button>
              </div>
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
              onClick={() => {
                setIsOpen(false);
                handleCloseButton();
              }}

              className="mt-6 py-2 bg-black text-white rounded w-24"
            >
              Fechar
            </button>
            
          </motion.div>
        </motion.div>
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
            onClick={(e) => e.stopPropagation()} 
          >
            <p className="text-lg text-grey-900 mb-4">{modalDataError.message}</p>

            <button
              onClick={() => {
              setModalDataError({show: false, message: ''});
              window.location.reload();
              }}
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
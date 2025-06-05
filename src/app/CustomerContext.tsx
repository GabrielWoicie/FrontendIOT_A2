// src/context/ClientContext.tsx
"use client";

import React, { createContext, useState, useContext, ReactNode } from "react";

interface ClientData {
  name: string;
  tagNumber: string;
  email: string;
}

interface ClientContextProps {
  client: ClientData | null;
  setClient: (client: ClientData | null) => void;
  clearClient: () => void;
}

const ClientContext = createContext<ClientContextProps | undefined>(undefined);

export const ClientProvider = ({ children }: { children: ReactNode }) => {
  const [client, setClient] = useState<ClientData | null>(null);

    const clearClient = () => {
        setClient(null);
    };

  return (
    <ClientContext.Provider value={{ client, setClient, clearClient }}>
      {children}
    </ClientContext.Provider>
  );
};

export const useClient = () => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error("useClient must be used within a ClientProvider");
  }
  return context;
};

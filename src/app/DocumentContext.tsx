"use client";

import React, { createContext, useState, useContext, ReactNode } from "react";

interface DocumentData {
  documentNumber: string;
}

interface DocumentContextProps {
  document: DocumentData | null;
  setDocument: (document: DocumentData | null) => void;
  clearDocument: () => void;
}

const DocumentContext = createContext<DocumentContextProps | undefined>(undefined);

export const DocumentProvider = ({ children }: { children: ReactNode }) => {
  const [document, setDocument] = useState<DocumentData | null>(null);

    const clearDocument = () => {
        setDocument(null);
    };

  return (
    <DocumentContext.Provider value={{ document, setDocument, clearDocument }}>
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocument = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error("useDocument must be used within a DocumentProvider");
  }
  return context;
};

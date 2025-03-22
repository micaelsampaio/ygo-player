// useKaibaNet.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { KaibaNet } from "../network/kaibaNet";

const KaibaNetContext = createContext<KaibaNet | null>(null);

export function useKaibaNet() {
  const context = useContext(KaibaNetContext);
  if (!context)
    throw new Error("useKaibaNet must be used within a KaibaNetProvider");
  return context;
}

export function KaibaNetProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const instance = KaibaNet.getInstance();

  useEffect(() => {
    const init = async () => {
      await instance.initialize();
      setIsInitialized(true);
    };

    init();

    return () => {
      instance.cleanup();
    };
  }, []);

  if (!isInitialized) {
    return null; // or a loading spinner
  }

  return (
    <KaibaNetContext.Provider value={instance}>
      {children}
    </KaibaNetContext.Provider>
  );
}

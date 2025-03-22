import { createContext, useContext, useEffect, useState } from "react";
import { KaibaNet } from "../network/kaibaNet";
import { Logger } from "../utils/logger";

const logger = Logger.createLogger("KaibaNetProvider");
const KaibaNetContext = createContext<KaibaNet | null>(null);

export function useKaibaNet() {
  const context = useContext(KaibaNetContext);
  if (!context) {
    logger.error("useKaibaNet called outside of KaibaNetProvider");
    throw new Error("useKaibaNet must be used within a KaibaNetProvider");
  }
  return context;
}

export function KaibaNetProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const instance = KaibaNet.getInstance();

  useEffect(() => {
    const init = async () => {
      logger.debug("Initializing KaibaNet...");
      try {
        await instance.initialize();
        logger.info("KaibaNet initialized successfully");
        setIsInitialized(true);
      } catch (error) {
        logger.error("Failed to initialize KaibaNet:", error);
        throw error;
      }
    };

    init();

    return () => {
      logger.debug("Cleaning up KaibaNet...");
      instance.cleanup();
      logger.info("KaibaNet cleanup completed");
    };
  }, []);

  if (!isInitialized) {
    logger.debug("Waiting for KaibaNet initialization...");
    return null;
  }

  return (
    <KaibaNetContext.Provider value={instance}>
      {children}
    </KaibaNetContext.Provider>
  );
}

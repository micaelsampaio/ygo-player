import { createContext, useContext, useEffect, useState } from "react";
import { KaibaNet } from "../network/kaibaNet";
import { CommunicationType } from "../network/communicationFactory";
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

export function useCommunicationType() {
  const kaibaNet = useKaibaNet();
  // Get initial type from localStorage or default to "offline" mode
  const storedType = localStorage.getItem("commType") as CommunicationType;
  const [type, setTypeState] = useState<CommunicationType>(
    storedType || "offline"
  );

  // Set a default if there isn't one already
  useEffect(() => {
    if (!localStorage.getItem("commType")) {
      localStorage.setItem("commType", "offline");
      logger.debug("Set default communication type to offline");
    }
  }, []);

  // Wrapper for switching communication type
  const setType = async (newType: CommunicationType) => {
    try {
      logger.debug(`Switching communication type from ${type} to ${newType}`);

      // Get bootstrap node and server URL directly from import.meta.env (Vite's approach)
      const bootstrapNode = import.meta.env.VITE_BOOTSTRAP_NODE;
      const socketServer =
        import.meta.env.VITE_SOCKET_SERVER || "http://localhost:3035";

      await kaibaNet.switchCommunication(newType, {
        bootstrapNode,
        serverUrl: socketServer,
      });

      setTypeState(newType);
      localStorage.setItem("commType", newType);
      return true;
    } catch (error) {
      logger.error(`Failed to switch communication type to ${newType}:`, error);
      throw error;
    }
  };

  return { type, setType };
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

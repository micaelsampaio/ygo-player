// src/hooks/usePageView.ts
import userScrollRouter from "@/hooks/userScrollRouter";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function usePageView() {
    const location = useLocation();

    userScrollRouter();

    useEffect(() => {
        const globalWindow = window as any;
        if (typeof globalWindow.gtag === "function") {
            globalWindow.gtag("event", "page_view", {
                page_path: location.pathname + location.search,
                page_location: window.location.href,
            });
        }
    }, [location]);

}

export function PageViewerProvider() {
    usePageView();
    return null;
}
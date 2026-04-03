import { useState, useEffect } from "react";

export function useDeviceResolutionInfo() {
  const [resolutionInfo, setResolutionInfo] = useState<DeviceResolutionInfo>(() => getResolutionInfo());

  useEffect(() => {
    const updateResolutionInfo = () => {
      setResolutionInfo(getResolutionInfo());
    };

    window.addEventListener("resize", updateResolutionInfo);
    window.addEventListener("orientationchange", updateResolutionInfo);

    updateResolutionInfo();

    return () => {
      window.removeEventListener("resize", updateResolutionInfo);
      window.removeEventListener("orientationchange", updateResolutionInfo);
    };
  }, []);

  return resolutionInfo;
}
interface DeviceResolutionInfo {
  isMobile: boolean;
  isTablet: boolean;
  isPortrait: boolean;
  isMobileLayout: boolean;
  width: number;
  height: number;
}

export function getResolutionInfo(): DeviceResolutionInfo {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isPortrait = height > width;
  const { isMobile, isTablet } = getDeviceType();
  const isMobileLayout = window.matchMedia(
    "(max-width: 767px), (min-width: 768px) and (max-width: 1024px) and (orientation: portrait)"
  ).matches;
  const result = { isMobile, isMobileLayout, isTablet, isPortrait, width, height };
  return result;
}

function getDeviceType() {
  const width = window.innerWidth;
  const userAgent = navigator.userAgent;
  const mobileRegex = /Mobi|Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const tabletRegex = /iPad|Android(?!.*Mobile)/i;

  const isMobile = mobileRegex.test(userAgent) || width < 481;
  const isTablet = tabletRegex.test(userAgent) || (width >= 481 && width <= 1024);

  return { isMobile, isTablet };
}
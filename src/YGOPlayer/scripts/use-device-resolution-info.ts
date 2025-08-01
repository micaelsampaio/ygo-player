import { useState, useEffect } from "react";
interface DeviceResolutionInfo {
  isMobile: boolean;
  isPortrait: boolean;
  width: number;
  height: number;
}

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

export function getResolutionInfo() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isMobile = isMobileTest();
  const isPortrait = height > width;

  return {
    isMobile,
    isPortrait,
    width,
    height
  };
}

function isMobileTest() {
  const isMobile = window.innerWidth < 768;
  const regex = /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return regex.test(navigator.userAgent) || isMobile;
}
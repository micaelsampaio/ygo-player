import { useEffect, useState } from 'react';

export function RotateYourPhoneModal() {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    function checkOrientation() {
      const isMobile = window.innerWidth < 768;
      const isPortrait = window.innerHeight > window.innerWidth;
      setShowModal(isMobile && isPortrait);
    }

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!showModal) return null;

  return (
    <div className="ygo-rotate-modal">
      <div className="ygo-full-screen-text">
        <h1>Not Supported</h1>
        <p>
          <p>
            Portrait mode isn't supported. Please Rotate your device to landscape.
          </p>

          <p style={{ fontSize: "14px", opacity: "0.7" }}>
            We're sorry for the inconvenience<br /> We're working on it - YGO101
          </p>
        </p>
      </div>
    </div>
  );
}

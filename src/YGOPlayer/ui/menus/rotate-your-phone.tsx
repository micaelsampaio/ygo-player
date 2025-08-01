
export function RotateYourPhoneModal({ isMobile, isPortrait }: { isMobile: boolean, isPortrait: boolean }) {

  const showModal = isMobile && isPortrait;

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

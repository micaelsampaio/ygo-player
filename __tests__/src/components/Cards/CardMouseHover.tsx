import React from "react";

type CardMouseHoverWrapperProps = {
  backgroundImage: string;
  gradientColor: string; // e.g. 'from-transparent to-black'
  children: React.ReactNode;
};

type CardMouseHoverContentProps = {
  children: React.ReactNode;
};

type CardMouseHoverIconProps = {
  iconUrl: string;
};

type CardMouseHoverTitleProps = {
  title: string;
};

function Wrapper({ backgroundImage, gradientColor, children }: CardMouseHoverWrapperProps) {
  return (
    <div className="relative overflow-hidden group w-64 h-64 rounded-2xl shadow-md cursor-pointer">
      {/* Zoomable Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />

      {/* Darkening Overlay on Hover */}
      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/60 transition-colors duration-500" />

      {/* Gradient Overlay (e.g., transparent → black) */}
      <div className={`absolute inset-0 bg-gradient-to-b ${gradientColor}`} />

      {/* Zoomable Content */}
      <div className="relative z-10 flex flex-col items-center justify-end h-full p-4 transition-transform duration-500 group-hover:scale-110">
        {children}
      </div>
    </div>
  );
}


function Content({ children }: CardMouseHoverContentProps) {
  return <div className="flex flex-col items-center justify-center space-y-2">{children}</div>;
}

function Icon({ iconUrl }: CardMouseHoverIconProps) {
  return <img src={iconUrl} className="w-16 h-16 object-contain" />;
}

function Title({ title }: CardMouseHoverTitleProps) {
  return <h2 className="text-3xl pb-6 text-white font-bold text-center">{title}</h2>;
}

export const CardMouseHover = {
  Wrapper,
  Content,
  Icon,
  Title,
};

import React from 'react';
import './style.css';

type RangeProps = {
  id?: string;
  name?: string;
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInput?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const InputRange: React.FC<RangeProps> = ({
  id,
  name,
  min = 0,
  max = 1,
  step = 0.1,
  value,
  onInput,
  onChange,
}) => {
  const progress = ((value - min) / (max - min)) * 100;

  return (
    <div className="ygo-range-container">
      <input
        type="range"
        className="ygo-range"
        id={id}
        name={name}
        onMouseMove={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        onInput={onInput}
        style={{ ['--progress' as any]: `${progress}%` }}
      />
    </div>
  );
};

export default InputRange;

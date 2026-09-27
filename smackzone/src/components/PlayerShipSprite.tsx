import React from 'react';

import starmuffCardinal from '@assets/starmuff_ship_cardinal.png';
import starmuffDiagonal from '@assets/starmuff_ship_diagonal.png';

export type ShipDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

interface PlayerShipSpriteProps {
  direction?: ShipDirection;
  size?: number;
  className?: string;
  animated?: boolean;
}

const DIRECTION_CONFIG: Record<ShipDirection, { 
  image: string; 
  row: number; 
  col: number;
}> = {
  'N': { image: 'cardinal', row: 0, col: 0 },
  'S': { image: 'cardinal', row: 0, col: 1 },
  'W': { image: 'cardinal', row: 1, col: 0 },
  'E': { image: 'cardinal', row: 1, col: 1 },
  'NW': { image: 'diagonal', row: 0, col: 0 },
  'NE': { image: 'diagonal', row: 0, col: 1 },
  'SW': { image: 'diagonal', row: 1, col: 0 },
  'SE': { image: 'diagonal', row: 1, col: 1 },
};

export default function PlayerShipSprite({ 
  direction = 'N', 
  size = 100,
  className = '',
  animated = false
}: PlayerShipSpriteProps) {
  const config = DIRECTION_CONFIG[direction];
  const sourceImage = config.image === 'cardinal' ? starmuffCardinal : starmuffDiagonal;
  
  const clipPercent = 50;
  const leftOffset = config.col * clipPercent;
  const topOffset = config.row * clipPercent;

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{ 
        width: size, 
        height: size,
      }}
      data-testid={`ship-sprite-${direction}`}
    >
      <div
        className={`absolute ${animated ? 'animate-pulse' : ''}`}
        style={{
          width: size * 2,
          height: size * 2,
          left: -leftOffset * size / 50,
          top: -topOffset * size / 50,
          backgroundImage: `url(${sourceImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {animated && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, transparent 40%, rgba(56, 189, 248, 0.1) 100%)',
            animation: 'pulse 2s infinite'
          }}
        />
      )}
    </div>
  );
}

export function ShipDirectionPicker({ 
  currentDirection, 
  onDirectionChange,
  size = 60 
}: { 
  currentDirection: ShipDirection; 
  onDirectionChange: (dir: ShipDirection) => void;
  size?: number;
}) {
  const directions: ShipDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  
  return (
    <div className="grid grid-cols-3 gap-2 p-2 bg-slate-900/80 rounded-lg">
      {['NW', 'N', 'NE', 'W', null, 'E', 'SW', 'S', 'SE'].map((dir, i) => (
        <div key={i} className="flex items-center justify-center">
          {dir ? (
            <button
              onClick={() => onDirectionChange(dir as ShipDirection)}
              className={`p-1 rounded transition-all ${
                currentDirection === dir 
                  ? 'ring-2 ring-sky-400 bg-sky-900/50' 
                  : 'hover:bg-slate-700/50'
              }`}
              data-testid={`button-direction-${dir}`}
            >
              <PlayerShipSprite direction={dir as ShipDirection} size={size / 2} />
            </button>
          ) : (
            <div className="w-8 h-8 rounded-full bg-sky-500/30 flex items-center justify-center">
              <span className="text-xs text-sky-300">●</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ShipShowcase({ size = 200 }: { size?: number }) {
  const [direction, setDirection] = React.useState<ShipDirection>('NW');
  const [autoRotate, setAutoRotate] = React.useState(false);
  const directions: ShipDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  
  React.useEffect(() => {
    if (!autoRotate) return;
    const timer = setInterval(() => {
      setDirection(prev => {
        const idx = directions.indexOf(prev);
        return directions[(idx + 1) % directions.length];
      });
    }, 500);
    return () => clearInterval(timer);
  }, [autoRotate]);
  
  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/60 rounded-xl border border-sky-500/30">
      <h3 className="text-lg font-bold text-white">STARMUFF Ship</h3>
      <div className="relative">
        <PlayerShipSprite direction={direction} size={size} animated />
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs text-sky-300 bg-slate-900/80 px-2 py-0.5 rounded">
          {direction}
        </div>
      </div>
      <ShipDirectionPicker 
        currentDirection={direction} 
        onDirectionChange={setDirection}
        size={60}
      />
      <button
        onClick={() => setAutoRotate(!autoRotate)}
        className={`px-3 py-1 text-sm rounded ${
          autoRotate 
            ? 'bg-sky-600 text-white' 
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }`}
        data-testid="button-auto-rotate"
      >
        {autoRotate ? '⏸ Stop Rotation' : '▶ Auto Rotate'}
      </button>
    </div>
  );
}

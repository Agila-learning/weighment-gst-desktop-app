import { useState, useEffect } from 'react';

const VEHICLES = [
  { id: 'TIPPER', name: 'TIPPER TRUCK', targetWeight: 18500, src: './assets/tipper.png', flip: false },
  { id: 'LORRY', name: 'LORRY', targetWeight: 24600, src: './assets/lorry.png', flip: false },
  { id: 'TRACTOR', name: 'TRACTOR', targetWeight: 12400, src: './assets/tractor.png', flip: true },
  { id: 'TANKER', name: 'TANKER', targetWeight: 31200, src: './assets/tanker.png', flip: true },
  { id: 'MINI', name: 'MINI TRUCK', targetWeight: 7200, src: './assets/mini.png', flip: true },
  { id: 'TRAILER', name: 'HEAVY TRAILER', targetWeight: 42500, src: './assets/trailer.png', flip: true },
];

type Phase = 'RESET' | 'APPROACHING' | 'CHECKPOINT' | 'BARRIER_OPENING' | 'ENTERING' | 'WEIGHING' | 'STABLE' | 'EXITING';

const POSITIONS = {
  RESET: { left: '-40%', bottom: '-5%', scale: 1.1 },
  CHECKPOINT: { left: '-5%', bottom: '0%', scale: 1.0 },
  CENTER: { left: '45%', bottom: '10%', scale: 0.85 },
  EXIT: { left: '130%', bottom: '20%', scale: 0.6 }
};

export default function AnimatedWeighbridge() {
  const [vehicleIndex, setVehicleIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('RESET');
  const [weight, setWeight] = useState(0);
  
  const currentVehicle = VEHICLES[vehicleIndex];
  
  const [position, setPosition] = useState(POSITIONS.RESET);
  const [barrierOpen, setBarrierOpen] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  // State machine effect
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    switch (phase) {
      case 'RESET':
        setBarrierOpen(false);
        setPosition(POSITIONS.RESET);
        setWeight(0);
        setIsMoving(false);
        // Instant reset, then start approaching
        timeout = setTimeout(() => setPhase('APPROACHING'), 100);
        break;
      case 'APPROACHING':
        setPosition(POSITIONS.CHECKPOINT);
        setIsMoving(true);
        // Time to reach checkpoint
        timeout = setTimeout(() => setPhase('CHECKPOINT'), 2500);
        break;
      case 'CHECKPOINT':
        setIsMoving(false);
        // Pause at checkpoint, then open barrier
        timeout = setTimeout(() => setPhase('BARRIER_OPENING'), 800);
        break;
      case 'BARRIER_OPENING':
        setBarrierOpen(true);
        // Wait for barrier to open
        timeout = setTimeout(() => setPhase('ENTERING'), 1000);
        break;
      case 'ENTERING':
        setPosition(POSITIONS.CENTER);
        setIsMoving(true);
        timeout = setTimeout(() => setPhase('WEIGHING'), 3000);
        break;
      case 'WEIGHING':
        setIsMoving(false);
        // Close barrier behind vehicle
        setBarrierOpen(false);
        timeout = setTimeout(() => setPhase('STABLE'), 2500);
        break;
      case 'STABLE':
        timeout = setTimeout(() => setPhase('EXITING'), 1500);
        break;
      case 'EXITING':
        setPosition(POSITIONS.EXIT);
        setIsMoving(true);
        // Wait for vehicle to leave screen
        timeout = setTimeout(() => {
          setVehicleIndex(prev => (prev + 1) % VEHICLES.length);
          setPhase('RESET');
        }, 3500);
        break;
    }

    return () => clearTimeout(timeout);
  }, [phase]);

  // Weight animation effect
  useEffect(() => {
    let animationFrame: number;
    let startTime: number | null = null;
    let startWeight = 0;
    let endWeight = 0;
    let duration = 0;

    if (phase === 'WEIGHING') {
      startWeight = 0;
      endWeight = currentVehicle.targetWeight;
      duration = 2000;
    } else if (phase === 'STABLE') {
      setWeight(currentVehicle.targetWeight);
      return;
    } else if (phase === 'EXITING' || phase === 'RESET' || phase === 'APPROACHING' || phase === 'CHECKPOINT' || phase === 'BARRIER_OPENING') {
      setWeight(0);
      return;
    } else {
      return;
    }

    const animateWeight = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const currentVal = Math.floor(startWeight + (endWeight - startWeight) * easeProgress);
      const jitter = progress < 1 ? Math.floor(Math.random() * 40) - 20 : 0;
      
      setWeight(Math.max(0, currentVal + jitter));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animateWeight);
      } else {
        setWeight(endWeight);
      }
    };

    animationFrame = requestAnimationFrame(animateWeight);
    return () => cancelAnimationFrame(animationFrame);
  }, [phase, currentVehicle.targetWeight]);

  const getStatusDisplay = () => {
    switch (phase) {
      case 'APPROACHING':
      case 'CHECKPOINT':
      case 'BARRIER_OPENING':
      case 'ENTERING':
        return <span className="text-sm font-bold text-slate-500 tracking-wider">VEHICLE APPROACHING</span>;
      case 'WEIGHING':
        return <span className="text-sm font-bold text-blue-600 tracking-wider animate-pulse">WEIGHING...</span>;
      case 'STABLE':
        return <span className="text-sm font-bold text-green-600 tracking-wider">● WEIGHT STABLE</span>;
      case 'EXITING':
        return <span className="text-sm font-bold text-amber-600 tracking-wider">WEIGHING COMPLETE</span>;
      default:
        return <span className="text-sm font-bold text-slate-400 tracking-wider">IDLE</span>;
    }
  };

  const getStatusColor = () => {
    switch (phase) {
      case 'WEIGHING': return 'bg-blue-50 border-blue-200';
      case 'STABLE': return 'bg-green-50 border-green-200';
      case 'EXITING': return 'bg-amber-50 border-amber-200';
      default: return 'bg-white border-slate-200';
    }
  };

  const getTransitionStyle = () => {
    if (phase === 'RESET') return 'none';
    if (phase === 'APPROACHING') return 'all 2500ms cubic-bezier(0.4, 0, 0.2, 1)';
    if (phase === 'ENTERING') return 'all 3000ms cubic-bezier(0.4, 0, 0.2, 1)';
    if (phase === 'EXITING') return 'all 3500ms cubic-bezier(0.4, 0, 0.2, 1)';
    return 'none';
  };

  return (
    <div className="hidden lg:flex w-[55%] bg-slate-100 items-center justify-center relative overflow-hidden border-r border-slate-200 flex-col bg-cover bg-center">
      
      <div className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay"
           style={{ backgroundImage: `url('./assets/weighbridge_bg.jpg')` }}>
      </div>

      <style>{`
        @keyframes suspension {
          0% { transform: translateY(0); }
          100% { transform: translateY(3px); }
        }
        .animate-suspension {
          animation: suspension 0.15s infinite alternate ease-in-out;
        }
      `}</style>

      {/* Dark overlay so text remains readable */}
      <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]"></div>

      {/* Main Weighbridge Scene */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center mt-10">
        
        {/* Digital Display Card */}
        <div className="mb-16 bg-white/95 border border-slate-200 rounded-xl p-6 w-80 shadow-2xl flex flex-col items-center relative z-40 backdrop-blur-md">
          <div className="text-xs text-slate-500 font-semibold tracking-widest mb-1 w-full flex justify-between">
            <span>WEIGHBRIDGE 01</span>
            <span className={phase === 'WEIGHING' ? 'animate-pulse text-blue-600' : ''}>LIVE DATA</span>
          </div>
          
          <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-1 w-full text-center mb-2">
            CURRENT VEHICLE: <span className="text-blue-600">{currentVehicle.name}</span>
          </div>
          
          <div className="flex items-end justify-center space-x-2 my-2 min-h-[50px]">
            <span className="text-5xl font-bold text-slate-800 digital-text tracking-tighter">
              {weight.toLocaleString()}
            </span>
            <span className="text-xl font-bold text-slate-400 mb-1">KG</span>
          </div>
          
          <div className={`mt-2 flex items-center space-x-2 px-4 py-1.5 rounded-full border transition-colors ${getStatusColor()}`}>
            {getStatusDisplay()}
          </div>
        </div>

        {/* Weighbridge Platform & Vehicle Container */}
        <div className="relative w-full flex items-end justify-center h-64 px-10 overflow-visible mt-12 z-30">
          
          {/* Barrier Base (Entry Side) */}
          <div className="absolute left-[15%] bottom-8 w-6 h-16 bg-slate-800 border-2 border-slate-600 shadow-xl rounded-t-md z-30 flex flex-col items-center pt-2">
            <div className={`w-3 h-3 rounded-full mb-2 shadow-[0_0_10px_rgba(255,0,0,0.8)] transition-colors duration-300 ${barrierOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
          </div>

          {/* Barrier Arm */}
          <div className="absolute left-[15%] bottom-20 w-8 h-4 z-40">
            <div 
              className="absolute left-3 top-0 h-3 bg-[repeating-linear-gradient(45deg,#ef4444,#ef4444_10px,#ffffff_10px,#ffffff_20px)] border-y border-red-700 shadow-lg origin-left transition-transform duration-1000 ease-in-out rounded-r-md"
              style={{
                width: '160px',
                transform: barrierOpen ? 'rotate(-85deg)' : 'rotate(0deg)'
              }}
            ></div>
          </div>

          {/* Realistic Vehicle Container */}
          <div 
            className="absolute z-20 flex flex-col justify-end items-center"
            style={{
              left: position.left,
              bottom: position.bottom,
              transform: `translate3d(-50%, 0, 0) scale(${position.scale})`,
              width: currentVehicle.id === 'TRAILER' ? '420px' : '320px',
              transition: getTransitionStyle()
            }}
          >
            <div className={`relative w-full ${isMoving ? 'animate-suspension' : ''}`}>
              <img 
                src={currentVehicle.src} 
                alt={currentVehicle.name} 
                className="w-full h-auto object-contain"
                style={{ 
                  transform: currentVehicle.flip ? 'scaleX(-1)' : 'none',
                  filter: 'drop-shadow(0 15px 10px rgba(0,0,0,0.3))'
                }} 
              />
            </div>
            {/* Ground shadow matching the perspective */}
            <div className="w-[85%] h-3 bg-black/40 rounded-[100%] blur-sm absolute -bottom-1"></div>
          </div>

        </div>
      </div>

      {/* Bottom Sequence Tracker */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center z-50">
        <div className="flex space-x-2 bg-white/95 backdrop-blur-md px-6 py-3 rounded-full border border-slate-200 shadow-lg">
          {VEHICLES.map((v, idx) => {
            const isCurrent = idx === vehicleIndex;
            let statusText = '';
            if (isCurrent) {
              statusText = phase === 'EXITING' ? 'COMPLETED' : (phase === 'STABLE' ? 'STABLE' : 'WEIGHING');
            } else if (idx === (vehicleIndex + 1) % VEHICLES.length) {
              statusText = 'NEXT';
            } else {
              statusText = 'UPCOMING';
            }
            
            return (
              <div key={v.id} className="flex items-center">
                <div className={`flex flex-col items-center mx-3 transition-opacity duration-300 ${isCurrent ? 'opacity-100 scale-105' : 'opacity-40 scale-100'}`}>
                  <span className={`text-[10px] font-bold ${isCurrent ? 'text-blue-600' : 'text-slate-600'}`}>{v.id}</span>
                  <span className={`text-[8px] font-semibold mt-0.5 ${isCurrent && phase === 'STABLE' ? 'text-green-600' : 'text-slate-400'}`}>
                    {statusText}
                  </span>
                </div>
                {idx < VEHICLES.length - 1 && (
                  <span className="text-slate-300 text-xs font-bold">→</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

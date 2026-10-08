/**
 * Naval Top Tactical Status Bar
 * แสดงสถานะระบบ, ค่าเรดาร์, พิกัด GPS จริง/จำลอง, และสถานะการเชื่อมต่อฮาร์ดแวร์
 */

import React from 'react';
import {
  GPSStatus,
  HardwareRadarStatus,
  OwnShip,
  RadarSettings,
} from '../types/radar';
import {
  Volume2,
  VolumeX,
  Radio,
  Navigation,
  Compass,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { tacticalAudio } from '../services/audioEffects';

interface TopStatusBarProps {
  settings: RadarSettings;
  ownShip: OwnShip;
  gpsStatus: GPSStatus;
  hardwareStatus: HardwareRadarStatus;
  threatCount: number;
  onToggleSound: () => void;
  onRequestGPS: () => void;
  onOpenHardwareModal: () => void;
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  settings,
  ownShip,
  gpsStatus,
  hardwareStatus,
  threatCount,
  onToggleSound,
  onRequestGPS,
  onOpenHardwareModal,
}) => {
  const isRealRadar = hardwareStatus.connectionState === 'connected';

  return (
    <header className="w-full bg-[#030914] border-b border-emerald-950/80 px-2.5 py-1.5 select-none z-20 shrink-0">
      {/* Row 1: System Title & High-level Status */}
      <div className="flex items-center justify-between gap-1.5">
        {/* Brand / Console Title */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-xs font-bold tracking-wider text-slate-100 truncate">
            เรดาร์เรือรบ <span className="text-emerald-400 font-mono-radar">NAV-RADAR</span>
          </h1>
        </div>

        {/* Central Reality Badge: REAL RADAR vs SIMULATION (ชัดเจนตามข้อกำหนด) */}
        <button
          onClick={onOpenHardwareModal}
          title="แตะเพื่อดูรายละเอียดหรือเชื่อมต่อฮาร์ดแวร์เรดาร์"
          className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase transition-colors cursor-pointer flex items-center gap-1 ${
            isRealRadar
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/80 shadow-sm shadow-cyan-500/20'
              : 'bg-amber-950/90 text-amber-300 border border-amber-600/60'
          }`}
        >
          <Radio className="w-3 h-3 shrink-0" />
          <span>{isRealRadar ? 'เรดาร์จริง REAL' : 'โหมดจำลอง SIM'}</span>
        </button>

        {/* Right Action Icons: Threats indicator & Audio Toggle */}
        <div className="flex items-center gap-1 shrink-0">
          {threatCount > 0 && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-600/60 animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              <span>{threatCount} เสี่ยงชน</span>
            </div>
          )}

          <button
            onClick={() => {
              tacticalAudio.playButtonPress();
              onToggleSound();
            }}
            title={settings.soundEnabled ? 'ปิดเสียง' : 'เปิดเสียง'}
            className="w-7 h-7 flex items-center justify-center rounded bg-slate-900 border border-slate-700/80 text-slate-300 active:bg-slate-800"
          >
            {settings.soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Row 2: Tactical Telemetry Bar (Compact, Responsive Grid) */}
      <div className="mt-1 pt-1 border-t border-slate-900 grid grid-cols-4 gap-1 text-[10px] font-mono-radar text-slate-400">
        {/* Heading */}
        <div className="flex items-center gap-1 truncate">
          <Compass className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="text-slate-500">HDG:</span>
          <span className="text-slate-100 font-bold">{Math.round(ownShip.hdgDeg).toString().padStart(3, '0')}°</span>
        </div>

        {/* Speed */}
        <div className="flex items-center gap-1 truncate">
          <Navigation className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="text-slate-500">SPD:</span>
          <span className="text-slate-100 font-bold">{ownShip.sogKnots.toFixed(1)}kt</span>
        </div>

        {/* Range */}
        <div className="flex items-center gap-1 truncate">
          <span className="text-slate-500">RNG:</span>
          <span className="text-emerald-400 font-bold">{settings.rangeNM} NM</span>
        </div>

        {/* GPS Status (Honest: Real vs Sim) */}
        <button
          onClick={onRequestGPS}
          title="แตะเพื่อขอเปิดพิกัด GPS จริงจากโทรศัพท์มือถือ"
          className="flex items-center justify-end gap-1 truncate text-right cursor-pointer hover:underline"
        >
          {gpsStatus.source === 'real_gps' ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-emerald-300 font-semibold truncate">GPS จริง</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span className="text-amber-400 truncate">จำลองสัตหีบ</span>
            </>
          )}
        </button>
      </div>

      {/* Row 3: Geographic Coordinates */}
      <div className="mt-0.5 flex items-center justify-between text-[9px] font-mono-radar text-slate-400 px-0.5">
        <span className="truncate">
          LAT: <span className="text-slate-200">{ownShip.latitude.toFixed(4)}°N</span>{' '}
          LON: <span className="text-slate-200">{ownShip.longitude.toFixed(4)}°E</span>
        </span>
        <span className="text-slate-400 shrink-0">
          กวาด: <span className="text-emerald-300">{settings.isPaused ? 'หยุดชั่วคราว' : `${settings.sweepRpm} RPM`}</span>
        </span>
      </div>
    </header>
  );
};

/**
 * Target Information & Tactical Action Panel
 * แผงข้อมูลเป้าหมายและการสั่งการยุทธการ (ARPA Target Tracking)
 * ออกแบบเพื่อวางในพื้นที่แผงควบคุมด้านล่าง โดยไม่บังจอเรดาร์
 */

import React from 'react';
import { RadarTarget, ThreatLevel } from '../types/radar';
import {
  Crosshair,
  Shield,
  ShieldAlert,
  Eye,
  EyeOff,
  X,
  Lock,
  Unlock,
  Radio,
} from 'lucide-react';
import { tacticalAudio } from '../services/audioEffects';

interface TargetInfoPanelProps {
  target: RadarTarget;
  onClose: () => void;
  onTrack: (targetId: string) => void;
  onCancelTrack: (targetId: string) => void;
  onLock: (targetId: string) => void;
  onToggleTrail: (targetId: string, show: boolean) => void;
  onChangeThreat: (targetId: string, threat: ThreatLevel) => void;
}

export const TargetInfoPanel: React.FC<TargetInfoPanelProps> = ({
  target,
  onClose,
  onTrack,
  onCancelTrack,
  onLock,
  onToggleTrail,
  onChangeThreat,
}) => {
  const isCpaWarning = target.cpaNM < 1.0 && target.tcpaMin > 0 && target.tcpaMin < 20;

  const getThreatBadge = () => {
    switch (target.threatLevel) {
      case 'friendly':
        return <span className="text-emerald-400 border border-emerald-800/80 bg-emerald-950/80 px-1.5 py-0.5 rounded text-[10px]">ฝ่ายเดียวกัน (Friendly)</span>;
      case 'neutral':
        return <span className="text-amber-400 border border-amber-800/80 bg-amber-950/80 px-1.5 py-0.5 rounded text-[10px]">เป็นกลาง (Neutral)</span>;
      case 'suspect':
        return <span className="text-orange-400 border border-orange-800/80 bg-orange-950/80 px-1.5 py-0.5 rounded text-[10px]">น่าสงสัย (Suspect)</span>;
      case 'hostile':
        return <span className="text-rose-400 border border-rose-800/80 bg-rose-950/80 px-1.5 py-0.5 rounded text-[10px]">คุกคาม (Hostile)</span>;
    }
  };

  const getClassificationThai = (c: string) => {
    switch (c) {
      case 'escort': return 'เรือรบคุ้มกัน (Escort)';
      case 'merchant': return 'เรือสินค้า (Merchant)';
      case 'high_speed': return 'เรือเร็วตรวจการณ์ (Fast Craft)';
      case 'aircraft': return 'อากาศยาน (Aircraft)';
      case 'surface': return 'เรือผิวน้ำ (Surface)';
      default: return 'ไม่ทราบประเภท (Unknown)';
    }
  };

  return (
    <div className="w-full bg-[#030914] border-t border-emerald-900/60 p-2.5 flex flex-col gap-2 shrink-0 animate-fadeIn">
      {/* Header Row: Target ID, Name, Close Button */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-900 pb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1">
            <Crosshair className={`w-4 h-4 shrink-0 ${target.status === 'locked' ? 'text-rose-400' : 'text-cyan-400'}`} />
            <span className="font-mono-radar font-bold text-sm text-white">{target.id}</span>
          </div>
          <span className="text-xs text-slate-300 truncate max-w-[140px]">{target.name}</span>
          {getThreatBadge()}
        </div>

        <button
          onClick={() => {
            tacticalAudio.playButtonPress();
            onClose();
          }}
          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded bg-slate-900 text-slate-400 hover:text-white active:bg-slate-800"
          title="ปิดหน้าต่างข้อมูล"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Collision Risk Banner */}
      {isCpaWarning && (
        <div className="bg-rose-950/90 border border-rose-600/80 text-rose-200 px-2.5 py-1 rounded text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>เตือนภัย: เสี่ยงชน (CPA &lt; 1.0 NM)</span>
          </div>
          <span className="font-mono-radar text-[11px] font-bold">TCPA {target.tcpaMin} นาที</span>
        </div>
      )}

      {/* Telemetry 2x3 Grid */}
      <div className="grid grid-cols-3 gap-1.5 text-xs font-mono-radar">
        <div className="bg-slate-950/80 p-1.5 rounded border border-slate-900">
          <div className="text-[10px] text-slate-500">ระยะ (RANGE)</div>
          <div className="text-emerald-400 font-bold">{target.rangeNM.toFixed(2)} NM</div>
        </div>

        <div className="bg-slate-950/80 p-1.5 rounded border border-slate-900">
          <div className="text-[10px] text-slate-500">แบริ่ง (BRG)</div>
          <div className="text-slate-100 font-bold">{target.bearingDeg.toFixed(1)}°</div>
        </div>

        <div className="bg-slate-950/80 p-1.5 rounded border border-slate-900">
          <div className="text-[10px] text-slate-500">ความเร็ว (SPD)</div>
          <div className="text-cyan-400 font-bold">{target.speedKnots.toFixed(1)} kt</div>
        </div>

        <div className="bg-slate-950/80 p-1.5 rounded border border-slate-900">
          <div className="text-[10px] text-slate-500">ทิศทาง (COG)</div>
          <div className="text-slate-100 font-bold">{target.courseDeg}°</div>
        </div>

        <div className={`p-1.5 rounded border ${isCpaWarning ? 'bg-rose-950/50 border-rose-900' : 'bg-slate-950/80 border-slate-900'}`}>
          <div className="text-[10px] text-slate-500">CPA (ระยะใกล้สุด)</div>
          <div className={`font-bold ${isCpaWarning ? 'text-rose-400' : 'text-slate-200'}`}>{target.cpaNM.toFixed(2)} NM</div>
        </div>

        <div className={`p-1.5 rounded border ${isCpaWarning ? 'bg-rose-950/50 border-rose-900' : 'bg-slate-950/80 border-slate-900'}`}>
          <div className="text-[10px] text-slate-500">TCPA (เวลาถึง CPA)</div>
          <div className={`font-bold ${isCpaWarning ? 'text-rose-400' : 'text-slate-200'}`}>
            {target.tcpaMin > 0 ? `${target.tcpaMin.toFixed(1)} นาที` : 'แยกห่าง'}
          </div>
        </div>
      </div>

      {/* Target Classification & Subtitle */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
        <span>ประเภท: <strong className="text-slate-200 font-medium">{getClassificationThai(target.classification)}</strong></span>
        <span>สถานะ: <strong className="text-emerald-400 uppercase font-mono-radar">{target.status}</strong></span>
      </div>

      {/* Tactical Action Buttons (Minimum 44-48px touch friendly) */}
      <div className="grid grid-cols-4 gap-1.5 pt-0.5">
        {/* Track / Cancel Track */}
        {target.status === 'tracking' ? (
          <button
            onClick={() => {
              tacticalAudio.playButtonPress();
              onCancelTrack(target.id);
            }}
            className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 text-[10px] active:scale-95 transition-transform"
          >
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>เลิกตาม</span>
          </button>
        ) : (
          <button
            onClick={() => {
              tacticalAudio.playTargetAcquired();
              onTrack(target.id);
            }}
            className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-600/70 rounded text-cyan-200 text-[10px] active:scale-95 transition-transform"
          >
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span>ติดตาม</span>
          </button>
        )}

        {/* Lock / Unlock */}
        {target.status === 'locked' ? (
          <button
            onClick={() => {
              tacticalAudio.playButtonPress();
              onTrack(target.id);
            }}
            className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 bg-rose-950/90 hover:bg-rose-900 border border-rose-500 rounded text-rose-200 text-[10px] active:scale-95 transition-transform"
          >
            <Unlock className="w-3.5 h-3.5 text-rose-400" />
            <span>ปลดล็อก</span>
          </button>
        ) : (
          <button
            onClick={() => {
              tacticalAudio.playTargetLock();
              onLock(target.id);
            }}
            className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-200 text-[10px] active:scale-95 transition-transform"
          >
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span>ล็อกเป้า</span>
          </button>
        )}

        {/* Toggle Trail */}
        <button
          onClick={() => {
            tacticalAudio.playButtonPress();
            onToggleTrail(target.id, !target.showTrail);
          }}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded border text-[10px] active:scale-95 transition-transform ${
            target.showTrail
              ? 'bg-emerald-950/80 border-emerald-600/70 text-emerald-200'
              : 'bg-slate-900 border-slate-700 text-slate-400'
          }`}
        >
          {target.showTrail ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
          <span>{target.showTrail ? 'ซ่อนเส้นทาง' : 'ดูเส้นทาง'}</span>
        </button>

        {/* Threat Level Cycle */}
        <button
          onClick={() => {
            tacticalAudio.playButtonPress();
            const order: ThreatLevel[] = ['friendly', 'neutral', 'suspect', 'hostile'];
            const curIdx = order.indexOf(target.threatLevel);
            const next = order[(curIdx + 1) % order.length];
            onChangeThreat(target.id, next);
          }}
          className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 text-[10px] active:scale-95 transition-transform"
        >
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>ปรับภัยคุกคาม</span>
        </button>
      </div>
    </div>
  );
};

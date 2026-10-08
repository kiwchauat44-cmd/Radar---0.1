/**
 * AEGIS Tactical Combat Management Console (ระบบบัญชาการรบเอจิส)
 * ควบคุมระบบเรดาร์เฟสอะเรย์, กฎการยิง (Doctrine), การบริหารคลังอาวุธ VLS, และการสกัดกั้นภัยคุกคาม
 */

import React from 'react';
import {
  AegisDoctrine,
  AegisSystemState,
  AegisWeaponType,
  RadarTarget,
} from '../types/radar';
import { aegisEngine } from '../services/aegisCombatEngine';
import { simulationEngine } from '../services/targetSimulationEngine';
import { tacticalAudio } from '../services/audioEffects';
import {
  ShieldAlert,
  Crosshair,
  Flame,
  RotateCcw,
  Zap,
  Target,
  AlertTriangle,
  Radio,
  Swords,
  CheckCircle2,
} from 'lucide-react';

interface AegisCombatControlProps {
  aegisState: AegisSystemState;
  targets: RadarTarget[];
  selectedTargetId: string | null;
  onSelectTarget: (id: string | null) => void;
}

export const AegisCombatControl: React.FC<AegisCombatControlProps> = ({
  aegisState,
  targets,
  selectedTargetId,
  onSelectTarget,
}) => {
  const prioritizedThreats = aegisEngine.getPrioritizedThreats(targets);
  const selectedTarget = targets.find((t) => t.id === selectedTargetId) || null;

  const handleToggleAegis = () => {
    aegisEngine.toggleAegis();
  };

  const handleSetDoctrine = (doc: AegisDoctrine) => {
    aegisEngine.setDoctrine(doc);
  };

  const handleLaunchWeapon = (weapon: AegisWeaponType, target: RadarTarget) => {
    aegisEngine.launchWeapon(weapon, target);
  };

  const handleSalvoAll = () => {
    tacticalAudio.playMissileLaunch();
    aegisEngine.launchSalvoAllHostiles(targets);
  };

  const handleReload = () => {
    aegisEngine.reloadWeapons();
  };

  const handleSpawnWave = () => {
    tacticalAudio.playAegisAlarm();
    simulationEngine.spawnAegisThreatWave();
    aegisEngine.addLog(
      '⚠️ ตรวจพบฝูงขีปนาวุธเรี่ยน้ำและเรือเร็วคุกคามระลอกใหม่พุ่งตรงเข้าหาเรือเรา!',
      'warning'
    );
  };

  return (
    <div className="w-full flex flex-col gap-2 p-2 bg-[#020817] text-slate-100 select-none text-xs font-sans">
      {/* 1. Header Banner & Master Arm Toggle */}
      <div className="flex items-center justify-between bg-slate-950 p-2 rounded border border-rose-950/70 shadow-sm">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              aegisState.isActive
                ? 'bg-rose-500 aegis-badge-pulse'
                : 'bg-slate-600'
            }`}
          />
          <div>
            <div className="flex items-center gap-1 font-bold text-slate-100 font-mono-radar">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>AEGIS COMBAT SYSTEM (ระบบเอจิส)</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono-radar">
              AN/SPY-1D(V) RADAR // MK-41 VLS FIRE CONTROL
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Kill count */}
          <div className="bg-rose-950/60 border border-rose-700/60 px-2 py-0.5 rounded text-center">
            <div className="text-[9px] text-rose-300">สกัดกั้นสำเร็จ</div>
            <div className="font-mono-radar font-bold text-sm text-white">
              {aegisState.killCount} ลำ
            </div>
          </div>

          {/* Master Arm Switch */}
          <button
            onClick={handleToggleAegis}
            className={`px-3 py-1.5 rounded font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              aegisState.isActive
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40 border border-rose-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>{aegisState.isActive ? 'ระบบเปิด (ARMED)' : 'เปิดระบบเอจิส'}</span>
          </button>
        </div>
      </div>

      {/* 2. Doctrine Mode Selection & Quick Drills */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={() => handleSetDoctrine('manual')}
          className={`p-1.5 rounded flex flex-col items-center justify-center gap-0.5 border transition-colors ${
            aegisState.doctrine === 'manual'
              ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span className="font-bold text-[11px]">MANUAL</span>
          <span className="text-[9px] opacity-75">สั่งยิงด้วยตนเอง</span>
        </button>

        <button
          onClick={() => handleSetDoctrine('auto_defense')}
          className={`p-1.5 rounded flex flex-col items-center justify-center gap-0.5 border transition-colors ${
            aegisState.doctrine === 'auto_defense'
              ? 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-sm shadow-rose-900/40'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span className="font-bold text-[11px]">AUTO-DEFENSE</span>
          <span className="text-[9px] opacity-75">ยิงสกัดกั้นอัตโนมัติ</span>
        </button>

        <button
          onClick={handleSalvoAll}
          className="p-1.5 rounded flex flex-col items-center justify-center gap-0.5 border bg-amber-950/80 border-amber-500/80 text-amber-200 hover:bg-amber-900 active:scale-95 transition-transform"
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold text-[11px]">SALVO FIRE</span>
          <span className="text-[9px] opacity-75">ระดมยิงทุกลำพร้อมกัน</span>
        </button>
      </div>

      {/* 3. VLS Weapon Status & Inventory Grid */}
      <div className="bg-slate-950/90 p-2 rounded border border-slate-900 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
          <span>คลังอาวุธปล่อยนำวิถี (WEAPONS READY)</span>
          <button
            onClick={handleReload}
            className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-mono active:scale-95"
          >
            <RotateCcw className="w-3 h-3" />
            <span>บรรจุกระสุนเต็ม (RELOAD)</span>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1.5 text-center font-mono-radar">
          {/* SM-2 */}
          <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
            <div className="text-[9px] text-slate-400">SM-2 VLS</div>
            <div className="text-sm font-bold text-rose-400">
              {aegisState.vlsSm2Count}
              <span className="text-[10px] text-slate-500">/{aegisState.vlsSm2Max}</span>
            </div>
            <div className="text-[8px] text-slate-400">พิสัย 40 NM</div>
          </div>

          {/* ESSM */}
          <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
            <div className="text-[9px] text-slate-400">ESSM QUAD</div>
            <div className="text-sm font-bold text-amber-400">
              {aegisState.vlsEssmCount}
              <span className="text-[10px] text-slate-500">/{aegisState.vlsEssmMax}</span>
            </div>
            <div className="text-[8px] text-slate-400">พิสัย 15 NM</div>
          </div>

          {/* Harpoon */}
          <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
            <div className="text-[9px] text-slate-400">HARPOON</div>
            <div className="text-sm font-bold text-cyan-400">
              {aegisState.harpoonCount}
              <span className="text-[10px] text-slate-500">/{aegisState.harpoonMax}</span>
            </div>
            <div className="text-[8px] text-slate-400">ผิวน้ำ 35 NM</div>
          </div>

          {/* CIWS */}
          <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
            <div className="text-[9px] text-slate-400">CIWS 20MM</div>
            <div className="text-sm font-bold text-emerald-400">
              {aegisState.ciwsRounds}
              <span className="text-[10px] text-slate-500">r</span>
            </div>
            <div className="text-[8px] text-slate-400">ประชิด 1.5 NM</div>
          </div>
        </div>
      </div>

      {/* 4. Threat Priority Queue (TEWA) with Instant Intercept Launch */}
      <div className="bg-slate-950/90 p-2 rounded border border-slate-900 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 font-bold text-slate-200 text-[11px]">
            <Target className="w-3.5 h-3.5 text-rose-400" />
            <span>คิวเป้าหมายคุกคาม (TEWA PRIORITY QUEUE)</span>
          </div>
          <button
            onClick={handleSpawnWave}
            className="flex items-center gap-1 text-[10px] bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded font-bold hover:bg-rose-900 active:scale-95"
            title="สร้างเป้าหมายขีปนาวุธเรี่ยน้ำและเรือเร็วเพื่อทดสอบระบบเอจิส"
          >
            <Zap className="w-3 h-3 text-rose-400" />
            <span>ส่งฝูงเป้าหมายทดสอบ (SPAWN WAVE)</span>
          </button>
        </div>

        {prioritizedThreats.length === 0 ? (
          <div className="p-3 text-center text-slate-500 text-xs">
            ไม่มีภัยคุกคามในระยะ หรือเป้าหมายทั้งหมดถูกสกัดกั้นแล้ว
          </div>
        ) : (
          <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-0.5">
            {prioritizedThreats.map(({ target, priorityScore, recommendedWeapon }) => {
              const isSelected = target.id === selectedTargetId;
              const hasInFlight = aegisState.activeMissiles.some(
                (m) => m.targetId === target.id
              );

              return (
                <div
                  key={target.id}
                  onClick={() => onSelectTarget(target.id)}
                  className={`flex items-center justify-between p-1.5 rounded border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-rose-950/80 border-rose-500'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono-radar font-bold text-white text-[11px]">
                      {target.id}
                    </span>
                    <span className="text-[10px] text-slate-300 truncate max-w-[110px]">
                      {target.name}
                    </span>
                    <span className="text-[9px] font-mono-radar text-amber-400">
                      {target.rangeNM.toFixed(1)} NM
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {hasInFlight ? (
                      <span className="text-[9px] text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800 animate-pulse font-mono">
                        🚀 บินสกัดกั้น
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLaunchWeapon(recommendedWeapon, target);
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-600 hover:bg-rose-500 text-white shadow active:scale-95"
                      >
                        ยิง {recommendedWeapon}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Direct Weapons Fire for Selected Target (if any) */}
      {selectedTarget && (
        <div className="bg-slate-950/90 p-2 rounded border border-cyan-900/60 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[11px] text-cyan-300">
              ควบคุมการยิงเป้าหมายที่เลือก: {selectedTarget.id} ({selectedTarget.name})
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {selectedTarget.rangeNM} NM / {selectedTarget.speedKnots} kt
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1">
            <button
              onClick={() => handleLaunchWeapon('SM-2', selectedTarget)}
              disabled={aegisState.vlsSm2Count <= 0}
              className="py-1 px-1 rounded bg-rose-950 text-rose-200 border border-rose-700 hover:bg-rose-900 disabled:opacity-40 text-center font-bold text-[10px] active:scale-95"
            >
              ยิง SM-2
            </button>
            <button
              onClick={() => handleLaunchWeapon('ESSM', selectedTarget)}
              disabled={aegisState.vlsEssmCount <= 0}
              className="py-1 px-1 rounded bg-amber-950 text-amber-200 border border-amber-700 hover:bg-amber-900 disabled:opacity-40 text-center font-bold text-[10px] active:scale-95"
            >
              ยิง ESSM
            </button>
            <button
              onClick={() => handleLaunchWeapon('HARPOON', selectedTarget)}
              disabled={aegisState.harpoonCount <= 0}
              className="py-1 px-1 rounded bg-cyan-950 text-cyan-200 border border-cyan-700 hover:bg-cyan-900 disabled:opacity-40 text-center font-bold text-[10px] active:scale-95"
            >
              ยิง HARPOON
            </button>
            <button
              onClick={() => handleLaunchWeapon('CIWS', selectedTarget)}
              disabled={aegisState.ciwsRounds < 75}
              className="py-1 px-1 rounded bg-emerald-950 text-emerald-200 border border-emerald-700 hover:bg-emerald-900 disabled:opacity-40 text-center font-bold text-[10px] active:scale-95"
            >
              ยิง CIWS
            </button>
          </div>
        </div>
      )}

      {/* 6. Combat Event Log */}
      <div className="bg-slate-950/90 p-2 rounded border border-slate-900 flex flex-col gap-1">
        <div className="text-[10px] font-bold text-slate-400 flex items-center justify-between">
          <span>บันทึกยุทธการเอจิส (AEGIS COMBAT ENGAGEMENT LOG)</span>
          <span className="font-mono text-[9px] text-slate-500">
            {aegisState.combatLog.length} รายการ
          </span>
        </div>

        <div className="max-h-24 overflow-y-auto flex flex-col gap-0.5 font-mono-radar text-[10px]">
          {aegisState.combatLog.slice(0, 15).map((log) => {
            let color = 'text-slate-400';
            if (log.type === 'kill') color = 'text-rose-400 font-bold';
            if (log.type === 'launch') color = 'text-cyan-300 font-semibold';
            if (log.type === 'warning') color = 'text-amber-300';

            return (
              <div key={log.id} className={`leading-tight ${color}`}>
                <span className="text-slate-600">[{log.timestamp}]</span>{' '}
                {log.message}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

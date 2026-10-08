/**
 * Mobile-First Tactical Radar Control Panel
 * แผงควบคุมเรดาร์แบบแท็บ จัดการสัดส่วนหน้าจอมือถือไม่ให้ทับจอเรดาร์
 */

import React, { useState } from 'react';
import {
  ClutterLevel,
  RadarColorScheme,
  RadarMotion,
  RadarOrientation,
  RadarRangeNM,
  RadarSettings,
  RadarTarget,
  TrailDurationSeconds,
} from '../types/radar';
import {
  ZoomIn,
  ZoomOut,
  Power,
  Play,
  Pause,
  Compass,
  Crosshair,
  Sliders,
  List,
  RotateCcw,
  Sparkles,
  Waves,
  CloudRain,
  Navigation,
  PlusCircle,
} from 'lucide-react';
import { tacticalAudio } from '../services/audioEffects';

interface MobileControlPanelProps {
  settings: RadarSettings;
  targets: RadarTarget[];
  selectedTargetId: string | null;
  onUpdateSettings: (partial: Partial<RadarSettings>) => void;
  onSelectTarget: (id: string | null) => void;
  onCenterShip: () => void;
  onResetRadar: () => void;
  onSpawnTarget: () => void;
}

export const MobileControlPanel: React.FC<MobileControlPanelProps> = ({
  settings,
  targets,
  selectedTargetId,
  onUpdateSettings,
  onSelectTarget,
  onCenterShip,
  onResetRadar,
  onSpawnTarget,
}) => {
  const [activeTab, setActiveTab] = useState<'main' | 'filters' | 'targets' | 'tools'>('main');

  const rangeSteps: RadarRangeNM[] = [0.5, 1, 2, 5, 10, 20, 40, 80];
  const currentRangeIndex = rangeSteps.indexOf(settings.rangeNM);

  const handleZoomIn = () => {
    tacticalAudio.playButtonPress();
    if (currentRangeIndex > 0) {
      onUpdateSettings({ rangeNM: rangeSteps[currentRangeIndex - 1] });
    }
  };

  const handleZoomOut = () => {
    tacticalAudio.playButtonPress();
    if (currentRangeIndex < rangeSteps.length - 1) {
      onUpdateSettings({ rangeNM: rangeSteps[currentRangeIndex + 1] });
    }
  };

  return (
    <div className="w-full bg-[#030914] border-t border-emerald-950 flex flex-col shrink-0 select-none">
      {/* Category Tabs (Single line with horizontal scrolling if tight) */}
      <div className="flex items-center justify-between border-b border-slate-900 px-1 py-1 gap-1 overflow-x-auto bg-[#020610]">
        <button
          onClick={() => {
            tacticalAudio.playButtonPress();
            setActiveTab('main');
          }}
          className={`flex items-center justify-center gap-1 min-h-[38px] px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors flex-1 ${
            activeTab === 'main'
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>ควบคุมหลัก</span>
        </button>

        <button
          onClick={() => {
            tacticalAudio.playButtonPress();
            setActiveTab('filters');
          }}
          className={`flex items-center justify-center gap-1 min-h-[38px] px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors flex-1 ${
            activeTab === 'filters'
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>สัญญาณ & ฟิลเตอร์</span>
        </button>

        <button
          onClick={() => {
            tacticalAudio.playButtonPress();
            setActiveTab('targets');
          }}
          className={`flex items-center justify-center gap-1 min-h-[38px] px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors flex-1 ${
            activeTab === 'targets'
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          <span>เป้าหมาย ({targets.length})</span>
        </button>

        <button
          onClick={() => {
            tacticalAudio.playButtonPress();
            setActiveTab('tools');
          }}
          className={`flex items-center justify-center gap-1 min-h-[38px] px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors flex-1 ${
            activeTab === 'tools'
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>เครื่องมือ/ตั้งค่า</span>
        </button>
      </div>

      {/* Tab Panels: Scrollable area with strictly 44-48px button hitboxes */}
      <div className="p-2 overflow-y-auto max-h-[175px] min-h-[145px]">
        {/* ==========================================
            TAB 1: การควบคุมหลัก (Main Controls)
           ========================================== */}
        {activeTab === 'main' && (
          <div className="space-y-2">
            {/* Row 1: Power, Pause/Sweep, Zoom -, Zoom +, Center */}
            <div className="grid grid-cols-5 gap-1.5">
              {/* Power */}
              <button
                onClick={() => {
                  tacticalAudio.playButtonPress();
                  onUpdateSettings({ isPoweredOn: !settings.isPoweredOn });
                }}
                className={`min-h-[46px] flex flex-col items-center justify-center gap-0.5 rounded border text-[10px] font-bold active:scale-95 transition-transform ${
                  settings.isPoweredOn
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 border-slate-700 text-slate-500'
                }`}
              >
                <Power className="w-4 h-4" />
                <span>{settings.isPoweredOn ? 'เปิดอยู่' : 'สแตนด์บาย'}</span>
              </button>

              {/* Pause / Resume Sweep */}
              <button
                onClick={() => {
                  tacticalAudio.playButtonPress();
                  onUpdateSettings({ isPaused: !settings.isPaused });
                }}
                className={`min-h-[46px] flex flex-col items-center justify-center gap-0.5 rounded border text-[10px] font-bold active:scale-95 transition-transform ${
                  settings.isPaused
                    ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                    : 'bg-slate-900 border-slate-700 text-slate-200'
                }`}
              >
                {settings.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                <span>{settings.isPaused ? 'กวาดต่อ' : 'หยุดกวาด'}</span>
              </button>

              {/* Zoom In (Reduce Range) */}
              <button
                onClick={handleZoomIn}
                disabled={currentRangeIndex === 0}
                className="min-h-[46px] flex flex-col items-center justify-center gap-0.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-700 rounded text-slate-200 text-[10px] font-bold active:scale-95 transition-transform"
              >
                <ZoomIn className="w-4 h-4 text-emerald-400" />
                <span>ลดระยะ (-)</span>
              </button>

              {/* Zoom Out (Increase Range) */}
              <button
                onClick={handleZoomOut}
                disabled={currentRangeIndex === rangeSteps.length - 1}
                className="min-h-[46px] flex flex-col items-center justify-center gap-0.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-700 rounded text-slate-200 text-[10px] font-bold active:scale-95 transition-transform"
              >
                <ZoomOut className="w-4 h-4 text-emerald-400" />
                <span>เพิ่มระยะ (+)</span>
              </button>

              {/* Center Ship */}
              <button
                onClick={() => {
                  tacticalAudio.playButtonPress();
                  onCenterShip();
                }}
                className="min-h-[46px] flex flex-col items-center justify-center gap-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-200 text-[10px] font-bold active:scale-95 transition-transform"
              >
                <Crosshair className="w-4 h-4 text-cyan-400" />
                <span>ศูนย์กลาง</span>
              </button>
            </div>

            {/* Row 2: Range Fast Selector Buttons */}
            <div>
              <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between">
                <span>เลือกระยะเรดาร์ (Range):</span>
                <span className="font-mono-radar text-emerald-400 font-bold">{settings.rangeNM} NM</span>
              </div>
              <div className="grid grid-cols-8 gap-1">
                {rangeSteps.map((rng) => (
                  <button
                    key={rng}
                    onClick={() => {
                      tacticalAudio.playButtonPress();
                      onUpdateSettings({ rangeNM: rng });
                    }}
                    className={`min-h-[38px] rounded border text-[10px] font-mono-radar font-bold active:scale-95 transition-transform ${
                      settings.rangeNM === rng
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {rng}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 3: Orientation & Motion Selectors */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              {/* Orientation */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">การวางแนวหน้าปัด (Orientation)</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['north_up', 'head_up', 'course_up'] as RadarOrientation[]).map((ori) => {
                    const titles: Record<RadarOrientation, string> = {
                      north_up: 'เหนือ (N-UP)',
                      head_up: 'หัวเรือ (H-UP)',
                      course_up: 'ทิศทาง (C-UP)',
                    };
                    return (
                      <button
                        key={ori}
                        onClick={() => {
                          tacticalAudio.playButtonPress();
                          onUpdateSettings({ orientation: ori });
                        }}
                        className={`min-h-[36px] px-1 text-[10px] font-bold rounded border active:scale-95 transition-transform ${
                          settings.orientation === ori
                            ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {titles[ori]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Motion Mode */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">โหมดการเคลื่อนที่ (Motion)</label>
                <div className="grid grid-cols-2 gap-1">
                  {(['relative', 'true'] as RadarMotion[]).map((mot) => (
                    <button
                      key={mot}
                      onClick={() => {
                        tacticalAudio.playButtonPress();
                        onUpdateSettings({ motionMode: mot });
                      }}
                      className={`min-h-[36px] text-[10px] font-bold rounded border active:scale-95 transition-transform ${
                        settings.motionMode === mot
                          ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {mot === 'relative' ? 'สัมพัทธ์ (RM)' : 'แท้จริง (TM)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 2: สัญญาณ & ฟิลเตอร์ (Filters & Gain)
           ========================================== */}
        {activeTab === 'filters' && (
          <div className="space-y-2.5">
            {/* Gain Slider */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-semibold">ความไวเรดาร์ (Gain):</span>
                <span className="font-mono-radar text-emerald-400 font-bold">{settings.gain}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.gain}
                onChange={(e) => onUpdateSettings({ gain: parseInt(e.target.value) })}
                className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
                <span>0% (กรองสัญญาณรบกวนสูง)</span>
                <span>100% (ตรวจจับสะท้อนละเอียด)</span>
              </div>
            </div>

            {/* Sea Clutter */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-semibold flex items-center gap-1">
                  <Waves className="w-3.5 h-3.5 text-cyan-400" />
                  <span>คลื่นทะเลสะท้อน (Sea Clutter - STC):</span>
                </span>
                <span className="font-mono-radar text-cyan-400 font-bold uppercase">{settings.seaClutter}</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {(['off', 'low', 'med', 'high'] as ClutterLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => {
                      tacticalAudio.playButtonPress();
                      onUpdateSettings({ seaClutter: lvl });
                    }}
                    className={`min-h-[36px] text-xs font-semibold rounded border uppercase active:scale-95 transition-transform ${
                      settings.seaClutter === lvl
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {lvl === 'off' ? 'ปิด' : lvl === 'low' ? 'ต่ำ' : lvl === 'med' ? 'กลาง' : 'สูง'}
                  </button>
                ))}
              </div>
            </div>

            {/* Rain Clutter */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-semibold flex items-center gap-1">
                  <CloudRain className="w-3.5 h-3.5 text-blue-400" />
                  <span>เมฆฝนสะท้อน (Rain Clutter - FTC):</span>
                </span>
                <span className="font-mono-radar text-blue-400 font-bold uppercase">{settings.rainClutter}</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {(['off', 'low', 'med', 'high'] as ClutterLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => {
                      tacticalAudio.playButtonPress();
                      onUpdateSettings({ rainClutter: lvl });
                    }}
                    className={`min-h-[36px] text-xs font-semibold rounded border uppercase active:scale-95 transition-transform ${
                      settings.rainClutter === lvl
                        ? 'bg-blue-950 border-blue-500 text-blue-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {lvl === 'off' ? 'ปิด' : lvl === 'low' ? 'ต่ำ' : lvl === 'med' ? 'กลาง' : 'สูง'}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Trails */}
            <div>
              <div className="text-xs text-slate-300 font-semibold mb-1">
                หางเส้นทางเป้าหมาย (Target Trails):
              </div>
              <div className="grid grid-cols-5 gap-1">
                {([0, 10, 30, 60, 300] as TrailDurationSeconds[]).map((dur) => {
                  const label = dur === 0 ? 'ปิด' : dur === 60 ? '1 นาที' : dur === 300 ? '5 นาที' : `${dur} วิ`;
                  return (
                    <button
                      key={dur}
                      onClick={() => {
                        tacticalAudio.playButtonPress();
                        onUpdateSettings({ trailDuration: dur });
                      }}
                      className={`min-h-[36px] text-[10px] font-semibold rounded border active:scale-95 transition-transform ${
                        settings.trailDuration === dur
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 3: รายการเป้าหมาย (Targets List)
           ========================================== */}
        {activeTab === 'targets' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-900">
              <span>พบเป้าหมายในระยะ: <strong>{targets.length}</strong> ลำ</span>
              <button
                onClick={() => {
                  tacticalAudio.playButtonPress();
                  onSpawnTarget();
                }}
                className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3 h-3" />
                <span>เพิ่มเป้าหมายจำลอง</span>
              </button>
            </div>

            <div className="divide-y divide-slate-900">
              {targets.map((t) => {
                const isSelected = t.id === selectedTargetId;
                const isThreat = t.threatLevel === 'hostile' || (t.cpaNM < 1.0 && t.tcpaMin > 0);

                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      tacticalAudio.playTargetAcquired();
                      onSelectTarget(t.id);
                    }}
                    className={`w-full py-1.5 px-2 flex items-center justify-between text-left rounded active:bg-slate-800 transition-colors ${
                      isSelected
                        ? 'bg-slate-800/90 border border-cyan-500/80'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        t.threatLevel === 'hostile' ? 'bg-rose-500' :
                        t.threatLevel === 'friendly' ? 'bg-emerald-400' :
                        t.threatLevel === 'suspect' ? 'bg-orange-400' : 'bg-amber-400'
                      }`} />
                      <div className="truncate">
                        <div className="font-mono-radar font-bold text-xs text-white flex items-center gap-1.5">
                          <span>{t.id}</span>
                          <span className="text-[10px] font-normal text-slate-400 truncate">{t.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono-radar">
                          RNG: {t.rangeNM.toFixed(1)} NM · BRG: {t.bearingDeg.toFixed(0)}° · SPD: {t.speedKnots.toFixed(0)} kt
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono-radar">
                      <div className={`text-xs font-bold ${isThreat ? 'text-rose-400' : 'text-slate-300'}`}>
                        CPA {t.cpaNM.toFixed(1)} NM
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {t.status.toUpperCase()}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 4: เครื่องมือ & ตั้งค่าระบบ (Tools & Settings)
           ========================================== */}
        {activeTab === 'tools' && (
          <div className="space-y-2">
            {/* Display Elements Toggles */}
            <div>
              <div className="text-xs text-slate-300 font-semibold mb-1">องค์ประกอบการแสดงผลบนจอเรดาร์:</div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => {
                    tacticalAudio.playButtonPress();
                    onUpdateSettings({ showRangeRings: !settings.showRangeRings });
                  }}
                  className={`min-h-[38px] text-[10px] font-semibold rounded border active:scale-95 transition-transform ${
                    settings.showRangeRings
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  วงแหวนระยะ (Rings)
                </button>

                <button
                  onClick={() => {
                    tacticalAudio.playButtonPress();
                    onUpdateSettings({ showBearingLines: !settings.showBearingLines });
                  }}
                  className={`min-h-[38px] text-[10px] font-semibold rounded border active:scale-95 transition-transform ${
                    settings.showBearingLines
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  เส้นแบริ่ง (Lines)
                </button>

                <button
                  onClick={() => {
                    tacticalAudio.playButtonPress();
                    onUpdateSettings({ showSpeedVectors: !settings.showSpeedVectors });
                  }}
                  className={`min-h-[38px] text-[10px] font-semibold rounded border active:scale-95 transition-transform ${
                    settings.showSpeedVectors
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  เวกเตอร์ความเร็ว
                </button>
              </div>
            </div>

            {/* Sweep RPM Speed */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-semibold">ความเร็วการกวาดเรดาร์ (Sweep Speed):</span>
                <span className="font-mono-radar text-emerald-400 font-bold">{settings.sweepRpm} RPM</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[12, 24, 36, 48].map((rpm) => (
                  <button
                    key={rpm}
                    onClick={() => {
                      tacticalAudio.playButtonPress();
                      onUpdateSettings({ sweepRpm: rpm });
                    }}
                    className={`min-h-[36px] text-xs font-mono-radar font-bold rounded border active:scale-95 transition-transform ${
                      settings.sweepRpm === rpm
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {rpm} RPM
                  </button>
                ))}
              </div>
            </div>

            {/* Color Scheme */}
            <div>
              <div className="text-xs text-slate-300 font-semibold mb-1">โทนสีคอนโซลเรือรบ (Color Scheme):</div>
              <div className="grid grid-cols-3 gap-1">
                {(['tactical_green', 'naval_cyan', 'amber_crt'] as RadarColorScheme[]).map((theme) => {
                  const labels: Record<RadarColorScheme, string> = {
                    tactical_green: 'เขียวเรืองแสง (Green)',
                    naval_cyan: 'น้ำเงินนาวี (Cyan)',
                    amber_crt: 'อำพันเรดาร์ (Amber)',
                  };
                  return (
                    <button
                      key={theme}
                      onClick={() => {
                        tacticalAudio.playButtonPress();
                        onUpdateSettings({ colorScheme: theme });
                      }}
                      className={`min-h-[36px] text-[10px] font-semibold rounded border active:scale-95 transition-transform ${
                        settings.colorScheme === theme
                          ? 'bg-slate-800 border-white text-white font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {labels[theme]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reset Radar */}
            <div className="pt-1">
              <button
                onClick={() => {
                  tacticalAudio.playButtonPress();
                  onResetRadar();
                }}
                className="w-full min-h-[42px] flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 text-xs font-bold active:scale-95 transition-transform"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>รีเซ็ตเรดาร์สู่ค่ามาตรฐาน (RESET RADAR)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

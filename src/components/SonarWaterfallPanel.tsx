/**
 * ASW Waterfall Sonar Display Sub-Panel (จอแสดงผลโซนาร์แบบน้ำตกตรวจจับภัยคุกคามใต้น้ำ)
 * แสดงภาพ Spectrogram สเปกตรัมเสียงใต้น้ำแบบเรียลไทม์ พร้อมการวิเคราะห์สัญญาณเรือดำน้ำและตอร์ปิโด
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  SonarColorMap,
  SonarContact,
  SonarMode,
  SonarState,
} from '../types/radar';
import { sonarManager } from '../services/sonarManager';
import { tacticalAudio } from '../services/audioEffects';
import {
  Waves,
  Radio,
  ShieldAlert,
  Volume2,
  X,
  Target,
  Crosshair,
  Sliders,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Anchor,
  Sparkles,
} from 'lucide-react';

interface SonarWaterfallPanelProps {
  sonarState: SonarState;
  onClose: () => void;
}

// Color palettes for tactical naval sonar displays
const COLOR_PALETTES: Record<SonarColorMap, { bg: string; r: number; g: number; b: number }> = {
  ocean_deep_blue: { bg: '#020b18', r: 30, g: 140, b: 240 },
  emerald_phosphor: { bg: '#021208', r: 34, g: 197, b: 94 },
  thermal_gold: { bg: '#180a02', r: 245, g: 158, b: 11 },
};

export const SonarWaterfallPanel: React.FC<SonarWaterfallPanelProps> = ({
  sonarState,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Render Waterfall Spectrogram Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isMinimized) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const buffer = sonarManager.getWaterfallBuffer();
    if (buffer.length === 0) return;

    const width = canvas.width;
    const height = canvas.height;
    const bufferWidth = buffer[0].length;
    const numRows = buffer.length;

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    const palette = COLOR_PALETTES[sonarState.colorMap] || COLOR_PALETTES.ocean_deep_blue;

    // Map waterfall buffer to canvas pixels
    for (let y = 0; y < height; y++) {
      const bufferRowIdx = Math.floor((y / height) * numRows);
      const row = buffer[bufferRowIdx] || buffer[0];

      for (let x = 0; x < width; x++) {
        const bufferColIdx = Math.floor((x / width) * bufferWidth);
        const intensity = row[bufferColIdx] || 0; // 0 - 255

        const pixelIdx = (y * width + x) * 4;
        const norm = intensity / 255;

        // Spectrogram intensity color mapping
        data[pixelIdx] = Math.floor(palette.r * norm);     // Red
        data[pixelIdx + 1] = Math.floor(palette.g * norm); // Green
        data[pixelIdx + 2] = Math.floor(palette.b * norm); // Blue
        data[pixelIdx + 3] = 255;                          // Alpha
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Overlay bearing vertical grid lines (every 45 degrees)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    for (let deg = 0; deg <= 360; deg += 45) {
      const x = (deg / 360) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw Active Sonar Ping wavefront animation
    if (sonarState.isPinging) {
      const timeOffset = (Date.now() % 2000) / 2000;
      const pingY = timeOffset * height;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, pingY);
      ctx.lineTo(width, pingY);
      ctx.stroke();
    }

    // Draw Bearing Cursor (EBL Line)
    const cursorX = (sonarState.bearingCursorDeg / 360) * width;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(cursorX, 0);
    ctx.lineTo(cursorX, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Contact markers on top of waterfall
    sonarState.contacts.forEach((contact) => {
      if (contact.status === 'neutralized') return;
      const contactX = (contact.bearingDeg / 360) * width;

      ctx.fillStyle = contact.classification === 'torpedo' ? '#ef4444' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(contactX, 10, 4, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      const shortTag = contact.classification === 'torpedo' ? 'TORP' : contact.classification === 'submarine' ? 'SUB' : 'BIO';
      ctx.fillText(shortTag, contactX, 24);
    });
  }, [sonarState, isMinimized]);

  // Handle click on waterfall to move bearing cursor
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const deg = Math.round((clickX / rect.width) * 360);
    sonarManager.setBearingCursor(deg);
    tacticalAudio.playButtonPress();
  };

  const selectedContact = sonarState.contacts.find((c) => c.id === sonarState.selectedContactId);

  return (
    <div
      ref={containerRef}
      className="w-full bg-[#020914] border border-cyan-800/80 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-100 select-none animate-fadeIn transition-all"
    >
      {/* 1. Header Row */}
      <div className="bg-[#031124] px-3 py-2 border-b border-cyan-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-cyan-400 animate-pulse" />
          <div>
            <div className="font-mono-radar font-bold text-xs text-white flex items-center gap-1.5">
              <span>ASW SONAR TACTICAL SUITE (ระบบโซนาร์ใต้น้ำ)</span>
              <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-700/60 px-1.5 py-0.2 rounded">
                WATERFALL BDI
              </span>
            </div>
            <div className="text-[9px] text-slate-400 font-mono-radar">
              LOFAR SPECTROGRAM // HYDROPHONE ARRAY
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {sonarState.torpedoAlert && (
            <div className="flex items-center gap-1 bg-rose-950 text-rose-200 border border-rose-600 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>TORPEDO ALERT</span>
            </div>
          )}

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="w-7 h-7 flex items-center justify-center rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
            title={isMinimized ? 'ขยายจอโซนาร์' : 'ย่อจอโซนาร์'}
          >
            {isMinimized ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => {
              tacticalAudio.playButtonPress();
              onClose();
            }}
            className="w-7 h-7 flex items-center justify-center rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
            title="ปิดหน้าต่างโซนาร์"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="p-2.5 flex flex-col gap-2">
          {/* 2. Controls & Color Palette Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 p-2 rounded border border-slate-900 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[10px]">โหมด:</span>
              <button
                onClick={() => sonarManager.setMode('bdi_waterfall')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  sonarState.mode === 'bdi_waterfall'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-600'
                    : 'bg-slate-900 text-slate-400'
                }`}
              >
                BDI Waterfall
              </button>
              <button
                onClick={() => sonarManager.setMode('passive_lofar')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  sonarState.mode === 'passive_lofar'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-600'
                    : 'bg-slate-900 text-slate-400'
                }`}
              >
                LOFAR Passive
              </button>
            </div>

            {/* Color Palette */}
            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-[10px]">ชุดสี:</span>
              {(['ocean_deep_blue', 'emerald_phosphor', 'thermal_gold'] as SonarColorMap[]).map((col) => (
                <button
                  key={col}
                  onClick={() => sonarManager.setColorMap(col)}
                  className={`w-4 h-4 rounded-full border ${
                    col === 'ocean_deep_blue'
                      ? 'bg-blue-600'
                      : col === 'emerald_phosphor'
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                  } ${sonarState.colorMap === col ? 'ring-2 ring-white' : 'opacity-60'}`}
                  title={col}
                />
              ))}
            </div>

            {/* Gain Slider */}
            <div className="flex items-center gap-1.5 min-w-[130px]">
              <span className="text-slate-400 text-[10px]">GAIN:</span>
              <input
                type="range"
                min="20"
                max="100"
                value={sonarState.gain}
                onChange={(e) => sonarManager.setGain(parseInt(e.target.value))}
                className="w-20 accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] font-mono-radar text-cyan-300">{sonarState.gain}%</span>
            </div>
          </div>

          {/* 3. The Waterfall Spectrogram Canvas with Bearing Axis */}
          <div className="relative flex flex-col bg-slate-950 rounded border border-cyan-950/90 overflow-hidden">
            {/* Top Bearing Axis (000° to 360°) */}
            <div className="h-5 bg-[#020a16] border-b border-cyan-950 flex justify-between px-2 text-[9px] font-mono-radar text-cyan-400/80 items-center">
              <span>000°</span>
              <span>045°</span>
              <span>090°</span>
              <span>135°</span>
              <span>180°</span>
              <span>225°</span>
              <span>270°</span>
              <span>315°</span>
              <span>360°</span>
            </div>

            {/* Waterfall Display Canvas */}
            <canvas
              ref={canvasRef}
              width={360}
              height={140}
              onClick={handleCanvasClick}
              className="w-full h-[140px] block cursor-crosshair active:cursor-pointer"
            />

            {/* Draggable/Current Bearing Cursor indicator */}
            <div className="absolute bottom-1 right-2 bg-slate-950/85 px-2 py-0.5 rounded border border-amber-500/70 text-[9px] font-mono-radar text-amber-300">
              BRG CURSOR: <span className="font-bold text-white">{sonarState.bearingCursorDeg.toString().padStart(3, '0')}°</span>
            </div>

            <div className="absolute bottom-1 left-2 bg-slate-950/85 px-2 py-0.5 rounded border border-cyan-800/60 text-[9px] font-mono-radar text-cyan-300">
              TIME DEPTH: 120s HISTORY
            </div>
          </div>

          {/* 4. ASW Tactical Action Buttons */}
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            {/* Active Sonar Ping */}
            <button
              onClick={() => sonarManager.triggerActivePing()}
              disabled={sonarState.isPinging}
              className={`p-2 rounded font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                sonarState.isPinging
                  ? 'bg-cyan-950 border-cyan-400 text-cyan-200 animate-pulse'
                  : 'bg-cyan-950/70 border-cyan-700/80 hover:bg-cyan-900 text-cyan-200 active:scale-95'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span>{sonarState.isPinging ? 'กำลังส่งคลื่น PING...' : 'ส่งคลื่น ACTIVE PING'}</span>
            </button>

            {/* Nixie Torpedo Decoy */}
            <button
              onClick={() => sonarManager.launchDecoy()}
              disabled={sonarState.decoysCount <= 0}
              className="p-2 rounded font-bold flex items-center justify-center gap-1.5 border bg-amber-950/70 border-amber-700/80 hover:bg-amber-900 text-amber-200 disabled:opacity-40 active:scale-95 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>ปล่อยเป้าลวง NIXIE ({sonarState.decoysCount})</span>
            </button>

            {/* ASROC / ASW Torpedo */}
            <button
              onClick={() => {
                if (selectedContact) {
                  sonarManager.launchAswTorpedo(selectedContact.id);
                } else if (sonarState.contacts.length > 0) {
                  sonarManager.launchAswTorpedo(sonarState.contacts[0].id);
                }
              }}
              disabled={sonarState.aswTorpedosCount <= 0}
              className="p-2 rounded font-bold flex items-center justify-center gap-1.5 border bg-rose-950/70 border-rose-700/80 hover:bg-rose-900 text-rose-200 disabled:opacity-40 active:scale-95 cursor-pointer"
            >
              <Anchor className="w-3.5 h-3.5 text-rose-400" />
              <span>ยิงตอร์ปิโด ASW ({sonarState.aswTorpedosCount})</span>
            </button>
          </div>

          {/* 5. Subsurface Detected Contacts Table */}
          <div className="bg-slate-950/90 p-2 rounded border border-slate-900 flex flex-col gap-1.5">
            <div className="text-[10px] font-bold text-slate-400 flex items-center justify-between">
              <span>เป้าหมายตรวจพบใต้น้ำ (SUBMERGED CONTACTS)</span>
              <span className="font-mono text-cyan-400">{sonarState.contacts.length} เป้าหมาย</span>
            </div>

            <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-0.5">
              {sonarState.contacts.map((c) => {
                const isSelected = c.id === sonarState.selectedContactId;
                let badgeColor = 'text-amber-400 bg-amber-950/60 border-amber-800';
                if (c.classification === 'torpedo') badgeColor = 'text-rose-400 bg-rose-950/80 border-rose-600 animate-pulse';
                if (c.classification === 'submarine') badgeColor = 'text-rose-300 bg-rose-950/60 border-rose-800';
                if (c.classification === 'biologic') badgeColor = 'text-emerald-400 bg-emerald-950/60 border-emerald-800';

                return (
                  <div
                    key={c.id}
                    onClick={() => sonarManager.selectContact(c.id)}
                    className={`flex items-center justify-between p-1.5 rounded border transition-colors cursor-pointer text-xs ${
                      isSelected
                        ? 'bg-cyan-950/80 border-cyan-500'
                        : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono-radar font-bold text-white text-[11px]">{c.id}</span>
                      <span className="text-[10px] text-slate-300 truncate max-w-[130px]">{c.name}</span>
                      <span className={`text-[9px] px-1 py-0.2 rounded border font-mono ${badgeColor}`}>
                        {c.classification.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono-radar text-[10px] shrink-0 text-slate-400">
                      <span>แบริ่ง: <span className="text-white font-bold">{c.bearingDeg.toFixed(1)}°</span></span>
                      <span>ระยะ: <span className="text-cyan-300">{c.rangeYards} yds</span></span>
                      <span>ลึก: <span className="text-amber-300">{c.depthMeters} m</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

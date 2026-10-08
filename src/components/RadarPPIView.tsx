/**
 * Naval Warship PPI (Plan Position Indicator) Radar Renderer
 * ระบบแสดงผลจอเรดาร์เรือรบ 360 องศา พร้อมเส้นกวาดเรืองแสง วงแหวนระยะ และเป้าหมายยุทธการ
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { tacticalAudio } from '../services/audioEffects';
import {
  OwnShip,
  RadarColorScheme,
  RadarRangeNM,
  RadarSettings,
  RadarTarget,
} from '../types/radar';

interface RadarPPIViewProps {
  settings: RadarSettings;
  ownShip: OwnShip;
  targets: RadarTarget[];
  selectedTargetId: string | null;
  onSelectTarget: (targetId: string | null) => void;
  onRangeChange: (newRange: RadarRangeNM) => void;
  panOffset: { x: number; y: number };
  onPanOffsetChange: (offset: { x: number; y: number }) => void;
}

// ชุดสีคอนโซลเรดาร์ยุทธการเรือรบ
const COLOR_THEMES: Record<
  RadarColorScheme,
  {
    bg: string;
    scopeBg: string;
    rings: string;
    ringText: string;
    sweepGlow: string;
    sweepLine: string;
    northMarker: string;
    hdgLine: string;
    friendly: string;
    neutral: string;
    suspect: string;
    hostile: string;
    locked: string;
    clutterSea: string;
    clutterRain: string;
  }
> = {
  tactical_green: {
    bg: '#020b06',
    scopeBg: '#03140a',
    rings: 'rgba(16, 185, 129, 0.35)',
    ringText: 'rgba(52, 211, 153, 0.9)',
    sweepGlow: 'rgba(16, 185, 129, 0.22)',
    sweepLine: '#34d399',
    northMarker: '#10b981',
    hdgLine: 'rgba(236, 253, 245, 0.85)',
    friendly: '#10b981',
    neutral: '#fbbf24',
    suspect: '#f97316',
    hostile: '#ef4444',
    locked: '#38bdf8',
    clutterSea: 'rgba(16, 185, 129, 0.3)',
    clutterRain: 'rgba(52, 211, 153, 0.2)',
  },
  naval_cyan: {
    bg: '#020914',
    scopeBg: '#031226',
    rings: 'rgba(6, 182, 212, 0.35)',
    ringText: 'rgba(103, 232, 249, 0.9)',
    sweepGlow: 'rgba(6, 182, 212, 0.22)',
    sweepLine: '#67e8f9',
    northMarker: '#06b6d4',
    hdgLine: 'rgba(238, 242, 255, 0.85)',
    friendly: '#06b6d4',
    neutral: '#fef08a',
    suspect: '#fb923c',
    hostile: '#f43f5e',
    locked: '#38bdf8',
    clutterSea: 'rgba(6, 182, 212, 0.3)',
    clutterRain: 'rgba(103, 232, 249, 0.2)',
  },
  amber_crt: {
    bg: '#0e0802',
    scopeBg: '#1c0f04',
    rings: 'rgba(245, 158, 11, 0.35)',
    ringText: 'rgba(252, 211, 77, 0.9)',
    sweepGlow: 'rgba(245, 158, 11, 0.22)',
    sweepLine: '#fcd34d',
    northMarker: '#f59e0b',
    hdgLine: 'rgba(254, 243, 199, 0.85)',
    friendly: '#10b981',
    neutral: '#f59e0b',
    suspect: '#ea580c',
    hostile: '#ef4444',
    locked: '#38bdf8',
    clutterSea: 'rgba(245, 158, 11, 0.3)',
    clutterRain: 'rgba(252, 211, 77, 0.2)',
  },
};

export const RadarPPIView: React.FC<RadarPPIViewProps> = ({
  settings,
  ownShip,
  targets,
  selectedTargetId,
  onSelectTarget,
  onRangeChange,
  panOffset,
  onPanOffsetChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sweepAngleRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number | null>(null);

  // Touch and interaction states
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartDistRef = useRef<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 340, height: 340 });

  // Update sweep angle continuously based on sweepRpm
  const theme = COLOR_THEMES[settings.colorScheme] || COLOR_THEMES.tactical_green;

  // Responsive Canvas Sizing via ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 50 && height > 50) {
          setDimensions({
            width: Math.floor(width),
            height: Math.floor(height),
          });
        }
      }
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Main Canvas Render Loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = dimensions.width;
    const height = dimensions.height;

    // Set physical buffer size
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Update sweep rotation angle if not paused
    const now = Date.now();
    const dt = (now - lastTimeRef.current) / 1000;
    lastTimeRef.current = now;

    if (!settings.isPaused && settings.isPoweredOn) {
      // sweepRpm = rotations per minute
      const degPerSec = (settings.sweepRpm * 360) / 60;
      sweepAngleRef.current = (sweepAngleRef.current + degPerSec * dt) % 360;
    }

    const currentSweep = sweepAngleRef.current;

    // Radar Center & Radius
    const centerX = width / 2 + panOffset.x;
    const centerY = height / 2 + panOffset.y;
    const radius = Math.max(40, Math.min(width, height) / 2 - 14);

    // Background fill
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);

    if (!settings.isPoweredOn) {
      // Off State Screen
      ctx.fillStyle = '#050c08';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '600 13px "Chakra Petch", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('เรดาร์อยู่ในสถานะสแตนด์บาย (STANDBY)', centerX, centerY - 10);
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText('กด "เปิดเรดาร์" ด้านล่างเพื่อเริ่มการตรวจการณ์', centerX, centerY + 14);
      ctx.restore();
      return;
    }

    // 1. Radar PPI circular background with subtle radial gradient
    const scopeGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    scopeGrad.addColorStop(0, theme.scopeBg);
    scopeGrad.addColorStop(0.85, theme.scopeBg);
    scopeGrad.addColorStop(1, '#000000');

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip(); // Clip all echoes and sweep inside the radar scope circle

    ctx.fillStyle = scopeGrad;
    ctx.fill();

    // Orientation Offset Calculation:
    // North Up: North is top (0 deg). Bearing 0° points up.
    // Head Up: Own Ship Heading is top. Bearing (heading) points up.
    // Course Up: Own Ship Course is top.
    let orientationAngleOffset = 0;
    if (settings.orientation === 'head_up') {
      orientationAngleOffset = -ownShip.hdgDeg;
    } else if (settings.orientation === 'course_up') {
      orientationAngleOffset = -ownShip.cogDeg;
    }

    // Helper: Convert Polar (Range in NM, Bearing in Deg) to PPI Canvas Coordinates
    const polarToCanvas = (rNM: number, bDeg: number) => {
      const displayAngle = (bDeg + orientationAngleOffset - 90) * (Math.PI / 180);
      const distPx = (rNM / settings.rangeNM) * radius;
      return {
        x: centerX + distPx * Math.cos(displayAngle),
        y: centerY + distPx * Math.sin(displayAngle),
      };
    };

    // 2. Simulated Sea Clutter (ผิวน้ำสะท้อนใกล้เรือ)
    if (settings.seaClutter !== 'off' && settings.gain > 15) {
      const clutterMultipliers: Record<string, number> = { low: 25, med: 50, high: 80 };
      const clutterCount = clutterMultipliers[settings.seaClutter] || 30;
      const seed = Math.floor(now / 150); // flicker gently

      ctx.fillStyle = theme.clutterSea;
      for (let i = 0; i < clutterCount; i++) {
        const angle = ((i * 137.5 + seed * 7) % 360) * (Math.PI / 180);
        const distRatio = Math.sin((i + seed) * 1.3) * 0.22; // clustered within inner 22%
        if (distRatio > 0.03) {
          const px = centerX + distRatio * radius * Math.cos(angle);
          const py = centerY + distRatio * radius * Math.sin(angle);
          ctx.beginPath();
          ctx.arc(px, py, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 3. Simulated Rain Clutter (เมฆฝน/สภาพอากาศ)
    if (settings.rainClutter !== 'off' && settings.gain > 20) {
      const rainCounts: Record<string, number> = { low: 30, med: 65, high: 110 };
      const rainCount = rainCounts[settings.rainClutter] || 40;
      // เมฆฝนเคลื่อนที่บริเวณตะวันออกเฉียงเหนือ (035° - 075°)
      ctx.fillStyle = theme.clutterRain;
      for (let i = 0; i < rainCount; i++) {
        const rainAngle = (40 + (i % 35) + Math.sin(i * 3 + now * 0.001) * 8) * (Math.PI / 180);
        const rainDist = (0.35 + (i / rainCount) * 0.45) * radius;
        const rx = centerX + rainDist * Math.cos(rainAngle);
        const ry = centerY - rainDist * Math.sin(rainAngle);
        ctx.beginPath();
        ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Concentric Range Rings (วงแหวนระยะ)
    if (settings.showRangeRings) {
      const ringSteps = [0.25, 0.5, 0.75, 1.0];
      ctx.lineWidth = 1;
      ctx.strokeStyle = theme.rings;

      ringSteps.forEach((step) => {
        const ringRadius = radius * step;
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Range Label
        const ringDistanceNM = (settings.rangeNM * step).toFixed(settings.rangeNM <= 2 ? 2 : 1);
        ctx.fillStyle = theme.ringText;
        ctx.font = '500 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${ringDistanceNM} NM`, centerX + 4, centerY - ringRadius + 12);
      });
    }

    // 5. Bearing Crosshair & Lines (เส้นแบริ่งหลัก)
    if (settings.showBearingLines) {
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX - radius, centerY);
      ctx.lineTo(centerX + radius, centerY);
      ctx.moveTo(centerX, centerY - radius);
      ctx.lineTo(centerX, centerY + radius);
      ctx.stroke();
    }

    // 6. Heading Line (เส้นหัวเรือจริง - HDG Vector)
    if (settings.showHeadingMarker) {
      const hdgAngle = (ownShip.hdgDeg + orientationAngleOffset - 90) * (Math.PI / 180);
      ctx.strokeStyle = theme.hdgLine;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + radius * Math.cos(hdgAngle), centerY + radius * Math.sin(hdgAngle));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 7. Electronic Bearing Line (EBL) & Variable Range Marker (VRM)
    if (settings.eblActive) {
      const eblAngle = (settings.eblAngleDeg + orientationAngleOffset - 90) * (Math.PI / 180);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + radius * Math.cos(eblAngle), centerY + radius * Math.sin(eblAngle));
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (settings.vrmActive && settings.vrmDistanceNM <= settings.rangeNM) {
      const vrmR = (settings.vrmDistanceNM / settings.rangeNM) * radius;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, vrmR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 8. Target Trails (เส้นทางย้อนหลังของเป้าหมาย)
    if (settings.trailDuration > 0) {
      targets.forEach((tgt) => {
        if (!tgt.showTrail || tgt.trailHistory.length < 2) return;
        ctx.strokeStyle = tgt.threatLevel === 'hostile' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(52, 211, 153, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        let first = true;
        tgt.trailHistory.forEach((pt) => {
          const ptRange = Math.hypot(pt.x, pt.y);
          let ptBearing = (Math.atan2(pt.x, pt.y) * 180) / Math.PI;
          if (ptBearing < 0) ptBearing += 360;

          const screenPt = polarToCanvas(ptRange, ptBearing);
          if (first) {
            ctx.moveTo(screenPt.x, screenPt.y);
            first = false;
          } else {
            ctx.lineTo(screenPt.x, screenPt.y);
          }
        });
        ctx.stroke();
      });
    }

    // 9. Rotating Radar Sweep Beam (ลำแสงกวาดเรดาร์พร้อมหางเรืองแสง)
    const sweepRad = (currentSweep + orientationAngleOffset - 90) * (Math.PI / 180);
    const sweepTrailAngle = 0.55; // 31 degrees trail width

    // Phosphor sweep sector gradient
    const sweepGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    sweepGrad.addColorStop(0, 'rgba(16, 185, 129, 0.05)');
    sweepGrad.addColorStop(0.8, theme.sweepGlow);
    sweepGrad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, sweepRad - sweepTrailAngle, sweepRad, false);
    ctx.closePath();
    ctx.fillStyle = sweepGrad;
    ctx.fill();
    ctx.restore();

    // Sharp leading sweep edge line
    ctx.strokeStyle = theme.sweepLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + radius * Math.cos(sweepRad), centerY + radius * Math.sin(sweepRad));
    ctx.stroke();

    // 10. Target Contacts & Tactical Symbology
    targets.forEach((tgt) => {
      if (tgt.rangeNM > settings.rangeNM) return; // Out of current range scale

      const pos = polarToCanvas(tgt.rangeNM, tgt.bearingDeg);
      const isSelected = tgt.id === selectedTargetId;

      // Color based on threat
      let contactColor = theme.neutral;
      if (tgt.threatLevel === 'friendly') contactColor = theme.friendly;
      if (tgt.threatLevel === 'suspect') contactColor = theme.suspect;
      if (tgt.threatLevel === 'hostile') contactColor = theme.hostile;

      ctx.save();
      ctx.translate(pos.x, pos.y);

      // Contact Echo Blob (Phosphor illumination glow)
      const echoR = 4 * tgt.echoStrength;
      ctx.fillStyle = contactColor;
      ctx.shadowColor = contactColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, echoR, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Tactical Military Symbology
      ctx.strokeStyle = contactColor;
      ctx.lineWidth = 1.5;

      if (tgt.classification === 'escort' || tgt.threatLevel === 'friendly') {
        // Friendly: Circle / Escort
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.stroke();
      } else if (tgt.classification === 'aircraft') {
        // Air: Chevron ^
        ctx.beginPath();
        ctx.moveTo(-6, 5);
        ctx.lineTo(0, -5);
        ctx.lineTo(6, 5);
        ctx.stroke();
      } else if (tgt.threatLevel === 'hostile') {
        // Hostile: Diamond ◇
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 8);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.stroke();
      } else {
        // Neutral / Surface: Square or Diamond
        ctx.strokeRect(-5, -5, 10, 10);
      }

      // Projected Speed Vector Line (COG / SOG 6-minute vector)
      if (settings.showSpeedVectors && tgt.speedKnots > 0) {
        const courseScreenAngle = (tgt.courseDeg + orientationAngleOffset - 90) * (Math.PI / 180);
        // Vector length represents 6 minutes of travel
        const vectorNM = (tgt.speedKnots * 6) / 60;
        const vectorPx = (vectorNM / settings.rangeNM) * radius;
        ctx.strokeStyle = contactColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(vectorPx * Math.cos(courseScreenAngle), vectorPx * Math.sin(courseScreenAngle));
        ctx.stroke();
      }

      // Tactical Target ID Label
      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(tgt.id, 10, -2);

      // Selected / Locked Target Reticle (กรอบล็อกเป้าหมาย)
      if (isSelected || tgt.status === 'locked') {
        const reticleColor = tgt.status === 'locked' ? '#ef4444' : '#38bdf8';
        ctx.strokeStyle = reticleColor;
        ctx.lineWidth = 2;

        const bSize = 12;
        // 4 corner brackets
        ctx.beginPath();
        // Top-left
        ctx.moveTo(-bSize, -bSize + 4);
        ctx.lineTo(-bSize, -bSize);
        ctx.lineTo(-bSize + 4, -bSize);
        // Top-right
        ctx.moveTo(bSize - 4, -bSize);
        ctx.lineTo(bSize, -bSize);
        ctx.lineTo(bSize, -bSize + 4);
        // Bottom-right
        ctx.moveTo(bSize, bSize - 4);
        ctx.lineTo(bSize, bSize);
        ctx.lineTo(bSize - 4, bSize);
        // Bottom-left
        ctx.moveTo(-bSize + 4, bSize);
        ctx.lineTo(-bSize, bSize);
        ctx.lineTo(-bSize, bSize - 4);
        ctx.stroke();

        // Lock text indicator
        ctx.fillStyle = reticleColor;
        ctx.font = '700 9px "Chakra Petch", sans-serif';
        ctx.fillText(tgt.status === 'locked' ? 'LOCKED' : 'TRK', -bSize, bSize + 10);
      }

      ctx.restore();
    });

    // 11. Own Ship Position Marker (ศูนย์กลางเรือเรา)
    ctx.save();
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Own ship ring
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.restore(); // End clipping inside radar circle

    // ==========================================
    // 12. Outer Azimuth Compass Dial (หน้าปัดแบริ่ง 360 องศา)
    // ==========================================
    ctx.strokeStyle = theme.rings;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Degree Ticks and Degree Labels
    ctx.font = '600 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let deg = 0; deg < 360; deg += 5) {
      const isMajor = deg % 30 === 0;
      const isCard = deg % 90 === 0;
      const angle = (deg + orientationAngleOffset - 90) * (Math.PI / 180);

      const tickLen = isCard ? 9 : isMajor ? 6 : 3;
      const x1 = centerX + radius * Math.cos(angle);
      const y1 = centerY + radius * Math.sin(angle);
      const x2 = centerX + (radius - tickLen) * Math.cos(angle);
      const y2 = centerY + (radius - tickLen) * Math.sin(angle);

      ctx.strokeStyle = isMajor ? theme.ringText : theme.rings;
      ctx.lineWidth = isMajor ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Degree Text every 30 degrees
      if (isMajor) {
        const textR = radius + 9;
        const tx = centerX + textR * Math.cos(angle);
        const ty = centerY + textR * Math.sin(angle);

        let label = deg.toString().padStart(3, '0');
        if (deg === 0) label = 'N';
        else if (deg === 90) label = 'E';
        else if (deg === 180) label = 'S';
        else if (deg === 270) label = 'W';

        ctx.fillStyle = deg === 0 ? theme.northMarker : theme.ringText;
        ctx.fillText(label, tx, ty);
      }
    }

    // North Indicator Arrow on Outer Ring
    const northAngle = (0 + orientationAngleOffset - 90) * (Math.PI / 180);
    const nArrowDist = radius + 11;
    const nx = centerX + nArrowDist * Math.cos(northAngle);
    const ny = centerY + nArrowDist * Math.sin(northAngle);
    ctx.fillStyle = theme.northMarker;
    ctx.beginPath();
    ctx.arc(nx, ny, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, [
    dimensions,
    panOffset,
    settings,
    ownShip,
    targets,
    selectedTargetId,
    theme,
  ]);

  // Request Animation Frame Loop
  useEffect(() => {
    let active = true;

    const loop = () => {
      if (!active) return;
      render();
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);

  // Touch Interactions: Tap to Select Target & Drag to Pan
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;
    // Limit pan to prevent losing radar center
    const maxPan = dimensions.width * 0.45;
    onPanOffsetChange({
      x: Math.max(-maxPan, Math.min(maxPan, newX)),
      y: Math.max(-maxPan, Math.min(maxPan, newY)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const movedDist = Math.hypot(
      e.clientX - (dragStartRef.current.x + panOffset.x),
      e.clientY - (dragStartRef.current.y + panOffset.y)
    );

    setIsDragging(false);

    // If small movement, treat as TAP to select target
    if (movedDist < 8) {
      handleCanvasTap(e.clientX, e.clientY);
    }
  };

  // Tap Hit-Testing for Target Selection
  const handleCanvasTap = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const tapX = clientX - rect.left;
    const tapY = clientY - rect.top;

    const centerX = dimensions.width / 2 + panOffset.x;
    const centerY = dimensions.height / 2 + panOffset.y;
    const radius = Math.min(dimensions.width, dimensions.height) / 2 - 14;

    let orientationAngleOffset = 0;
    if (settings.orientation === 'head_up') {
      orientationAngleOffset = -ownShip.hdgDeg;
    } else if (settings.orientation === 'course_up') {
      orientationAngleOffset = -ownShip.cogDeg;
    }

    let nearestTargetId: string | null = null;
    let minDistance = 26; // 26px touch hitbox target radius

    targets.forEach((tgt) => {
      if (tgt.rangeNM > settings.rangeNM) return;

      const displayAngle = (tgt.bearingDeg + orientationAngleOffset - 90) * (Math.PI / 180);
      const distPx = (tgt.rangeNM / settings.rangeNM) * radius;
      const tgtScreenX = centerX + distPx * Math.cos(displayAngle);
      const tgtScreenY = centerY + distPx * Math.sin(displayAngle);

      const d = Math.hypot(tapX - tgtScreenX, tapY - tgtScreenY);
      if (d < minDistance) {
        minDistance = d;
        nearestTargetId = tgt.id;
      }
    });

    if (nearestTargetId) {
      tacticalAudio.playTargetAcquired();
      onSelectTarget(nearestTargetId);
    } else {
      // Tap outside clears target
      onSelectTarget(null);
    }
  };

  // Double tap / click to center ship
  const handleDoubleClick = () => {
    tacticalAudio.playButtonPress();
    onPanOffsetChange({ x: 0, y: 0 });
  };

  // Touch Pinch Zoom support
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const diff = currentDist - touchStartDistRef.current;

      const availableRanges: RadarRangeNM[] = [0.5, 1, 2, 5, 10, 20, 40, 80];
      const curIdx = availableRanges.indexOf(settings.rangeNM);

      if (diff > 45 && curIdx > 0) {
        // Pinch In -> Zoom in (smaller range)
        onRangeChange(availableRanges[curIdx - 1]);
        touchStartDistRef.current = currentDist;
        tacticalAudio.playButtonPress();
      } else if (diff < -45 && curIdx < availableRanges.length - 1) {
        // Pinch Out -> Zoom out (larger range)
        onRangeChange(availableRanges[curIdx + 1]);
        touchStartDistRef.current = currentDist;
        tacticalAudio.playButtonPress();
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none select-none bg-[#020712]"
    >
      <canvas
        ref={canvasRef}
        style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
        className="cursor-crosshair active:cursor-grabbing block"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Floating HUD Indicators on Radar Edge (Zero Overlap with radar core) */}
      <div className="absolute top-2 left-2 pointer-events-none flex flex-col gap-0.5 text-[10px] font-mono-radar text-emerald-400/80 bg-slate-950/60 px-1.5 py-1 rounded border border-emerald-900/40">
        <div>RNG: <span className="text-white font-bold">{settings.rangeNM} NM</span></div>
        <div>RINGS: <span className="text-emerald-300">{(settings.rangeNM / 4).toFixed(settings.rangeNM <= 2 ? 2 : 1)} NM</span></div>
      </div>

      <div className="absolute top-2 right-2 pointer-events-none flex flex-col items-end gap-0.5 text-[10px] font-mono-radar text-emerald-400/80 bg-slate-950/60 px-1.5 py-1 rounded border border-emerald-900/40">
        <div>ORI: <span className="text-white font-bold">{settings.orientation.replace('_', ' ').toUpperCase()}</span></div>
        <div>PULSE: <span className="text-emerald-300">LP 0.8μs</span></div>
      </div>

      {panOffset.x !== 0 || panOffset.y !== 0 ? (
        <button
          onClick={() => {
            tacticalAudio.playButtonPress();
            onPanOffsetChange({ x: 0, y: 0 });
          }}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] font-mono bg-emerald-950/90 text-emerald-300 border border-emerald-600/60 px-3 py-1 rounded shadow-lg active:scale-95 transition-transform"
        >
          รีเซ็ตศูนย์กลาง (CENTER SHIP)
        </button>
      ) : null}
    </div>
  );
};

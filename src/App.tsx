/**
 * Naval Warship Radar Simulator (ระบบเรดาร์เรือรบจำลอง)
 * Mobile-First Responsive Radar Console
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  GPSStatus,
  HardwareRadarStatus,
  OwnShip,
  RadarSettings,
  RadarTarget,
  ThreatLevel,
} from './types/radar';
import { simulationEngine } from './services/targetSimulationEngine';
import { gpsManager } from './services/gpsManager';
import { hardwareRadarManager } from './services/hardwareRadarInterface';
import { tacticalAudio } from './services/audioEffects';
import { TopStatusBar } from './components/TopStatusBar';
import { RadarPPIView } from './components/RadarPPIView';
import { TargetInfoPanel } from './components/TargetInfoPanel';
import { MobileControlPanel } from './components/MobileControlPanel';
import { HardwareRadarModal } from './components/HardwareRadarModal';
import { AddTargetModal } from './components/AddTargetModal';

export default function App() {
  // 1. Radar Settings
  const [settings, setSettings] = useState<RadarSettings>({
    rangeNM: 10,
    orientation: 'north_up',
    motionMode: 'relative',
    gain: 65,
    seaClutter: 'low',
    rainClutter: 'off',
    trailDuration: 30,
    showRangeRings: true,
    showBearingLines: true,
    showHeadingMarker: true,
    showSpeedVectors: true,
    sweepRpm: 24,
    colorScheme: 'tactical_green',
    isPaused: false,
    isPoweredOn: true,
    soundEnabled: true,
    eblActive: false,
    eblAngleDeg: 45,
    vrmActive: false,
    vrmDistanceNM: 5,
  });

  // 2. Own Ship State (เรือเรา - เรือฟริเกตตรวจการณ์อ่าวไทย)
  const [ownShip, setOwnShip] = useState<OwnShip>({
    name: 'HTMS Bhumibol Adulyadej (FFG-471)',
    hdgDeg: 42.0,
    cogDeg: 40.0,
    sogKnots: 18.5,
    latitude: 12.6582,
    longitude: 100.9023,
    altitudeMeters: 14.0,
  });

  // 3. Targets and Tracking State
  const [targets, setTargets] = useState<RadarTarget[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  // 4. GPS & Hardware Radar Status
  const [gpsStatus, setGpsStatus] = useState<GPSStatus>(gpsManager.getStatus());
  const [hardwareStatus, setHardwareStatus] = useState<HardwareRadarStatus>(hardwareRadarManager.getStatus());
  const [radarSystemStatus] = useState(hardwareRadarManager.getSystemStatus());

  // 5. Interactive Pan Offset (for panning PPI view)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 6. Modals
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);
  const [isAddTargetModalOpen, setIsAddTargetModalOpen] = useState(false);

  // Sync sound settings with audio service
  useEffect(() => {
    tacticalAudio.enabled = settings.soundEnabled;
  }, [settings.soundEnabled]);

  // Subscribe to GPS Manager
  useEffect(() => {
    const unsubGPS = gpsManager.subscribe((status) => {
      setGpsStatus(status);
      if (status.source === 'real_gps') {
        setOwnShip((prev) => ({
          ...prev,
          latitude: status.latitude,
          longitude: status.longitude,
          hdgDeg: status.headingDeg,
          sogKnots: status.speedKnots,
        }));
      }
    });

    const unsubCompass = gpsManager.subscribeCompass((heading) => {
      if (gpsStatus.source === 'real_gps') {
        setOwnShip((prev) => ({ ...prev, hdgDeg: heading }));
      }
    });

    return () => {
      unsubGPS();
      unsubCompass();
    };
  }, [gpsStatus.source]);

  // Subscribe to Hardware Radar Manager (WebSocket / External NMEA)
  useEffect(() => {
    const unsubStatus = hardwareRadarManager.subscribeStatus((status) => {
      setHardwareStatus(status);
    });

    const unsubTargets = hardwareRadarManager.subscribeTargets((externalTargets) => {
      simulationEngine.mergeExternalTargets(externalTargets);
    });

    return () => {
      unsubStatus();
      unsubTargets();
    };
  }, []);

  // Real-time Physics & Target Detection Engine Loop (Runs ~10 times/sec)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!settings.isPoweredOn) return;

      const updated = simulationEngine.updatePhysics(ownShip, settings);
      setTargets(updated);

      // Check for urgent collision risks and trigger alert chime
      const hasCriticalThreat = updated.some(
        (t) => t.threatLevel !== 'friendly' && t.cpaNM < 0.8 && t.tcpaMin > 0 && t.tcpaMin < 10
      );
      if (hasCriticalThreat && settings.soundEnabled && Math.random() < 0.05) {
        tacticalAudio.playCollisionAlert(0.12);
      }
    }, 120);

    return () => clearInterval(interval);
  }, [ownShip, settings]);

  // Handlers for Target Management
  const handleSelectTarget = useCallback((id: string | null) => {
    setSelectedTargetId(id);
  }, []);

  const handleTrackTarget = useCallback((id: string) => {
    simulationEngine.setTargetStatus(id, 'tracking');
    setTargets((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'tracking' } : t)));
  }, []);

  const handleCancelTrack = useCallback((id: string) => {
    simulationEngine.setTargetStatus(id, 'detected');
    setTargets((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'detected' } : t)));
  }, []);

  const handleLockTarget = useCallback((id: string) => {
    simulationEngine.setTargetStatus(id, 'locked');
    setTargets((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'locked' } : t)));
  }, []);

  const handleToggleTargetTrail = useCallback((id: string, show: boolean) => {
    simulationEngine.toggleTargetTrail(id, show);
    setTargets((prev) => prev.map((t) => (t.id === id ? { ...t, showTrail: show } : t)));
  }, []);

  const handleChangeThreat = useCallback((id: string, threat: ThreatLevel) => {
    simulationEngine.updateTargetThreat(id, threat);
    setTargets((prev) => prev.map((t) => (t.id === id ? { ...t, threatLevel: threat } : t)));
  }, []);

  const handleResetRadar = useCallback(() => {
    simulationEngine.initDefaultTargets();
    setPanOffset({ x: 0, y: 0 });
    setSelectedTargetId(null);
    setSettings((prev) => ({
      ...prev,
      rangeNM: 10,
      orientation: 'north_up',
      motionMode: 'relative',
      gain: 65,
      seaClutter: 'low',
      rainClutter: 'off',
      trailDuration: 30,
      isPaused: false,
      isPoweredOn: true,
    }));
  }, []);

  const handleAddCustomTarget = useCallback(
    (
      name: string,
      classification: import('./types/radar').TargetClassification,
      threatLevel: ThreatLevel,
      rangeNM: number,
      bearingDeg: number,
      courseDeg: number,
      speedKnots: number
    ) => {
      simulationEngine.addCustomTarget(
        name,
        classification,
        threatLevel,
        rangeNM,
        bearingDeg,
        courseDeg,
        speedKnots
      );
    },
    []
  );

  const selectedTarget = targets.find((t) => t.id === selectedTargetId) || null;
  const criticalThreatCount = targets.filter(
    (t) => (t.threatLevel === 'hostile' || t.cpaNM < 1.0) && t.tcpaMin > 0
  ).length;

  return (
    <div className="w-full h-full min-h-screen bg-[#020712] text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* 1. TOP STATUS BAR (แถบสถานะด้านบน - Fixed, No Overlap) */}
      <TopStatusBar
        settings={settings}
        ownShip={ownShip}
        gpsStatus={gpsStatus}
        hardwareStatus={hardwareStatus}
        threatCount={criticalThreatCount}
        onToggleSound={() => setSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }))}
        onRequestGPS={async () => {
          tacticalAudio.playButtonPress();
          await gpsManager.requestRealGPS();
        }}
        onOpenHardwareModal={() => {
          tacticalAudio.playButtonPress();
          setIsHardwareModalOpen(true);
        }}
      />

      {/* 2. CENTER RADAR PPI DISPLAY (พื้นที่หลักของหน้าจอ - The Core Star of the App) */}
      <main className="flex-1 min-h-0 w-full relative flex items-center justify-center p-1 overflow-hidden bg-[#020712]">
        <RadarPPIView
          settings={settings}
          ownShip={ownShip}
          targets={targets}
          selectedTargetId={selectedTargetId}
          onSelectTarget={handleSelectTarget}
          onRangeChange={(newRange) => setSettings((s) => ({ ...s, rangeNM: newRange }))}
          panOffset={panOffset}
          onPanOffsetChange={setPanOffset}
        />
      </main>

      {/* 3. BOTTOM SECTION: Target Information (if selected) + Mobile Control Panel */}
      <footer className="w-full shrink-0 flex flex-col z-20 bg-[#030914]">
        {/* If a target is selected, display Target Information in dedicated non-overlapping space */}
        {selectedTarget && (
          <TargetInfoPanel
            target={selectedTarget}
            onClose={() => setSelectedTargetId(null)}
            onTrack={handleTrackTarget}
            onCancelTrack={handleCancelTrack}
            onLock={handleLockTarget}
            onToggleTrail={handleToggleTargetTrail}
            onChangeThreat={handleChangeThreat}
          />
        )}

        {/* Mobile Control Panel (Categorized, Thumb-friendly, Scrollable) */}
        <MobileControlPanel
          settings={settings}
          targets={targets}
          selectedTargetId={selectedTargetId}
          onUpdateSettings={(partial) => setSettings((s) => ({ ...s, ...partial }))}
          onSelectTarget={handleSelectTarget}
          onCenterShip={() => setPanOffset({ x: 0, y: 0 })}
          onResetRadar={handleResetRadar}
          onSpawnTarget={() => setIsAddTargetModalOpen(true)}
        />
      </footer>

      {/* 4. MODALS (External Radar Hardware & Custom Target Creator) */}
      <HardwareRadarModal
        isOpen={isHardwareModalOpen}
        onClose={() => setIsHardwareModalOpen(false)}
        status={hardwareStatus}
        systemStatus={radarSystemStatus}
      />

      <AddTargetModal
        isOpen={isAddTargetModalOpen}
        onClose={() => setIsAddTargetModalOpen(false)}
        onAddTarget={handleAddCustomTarget}
      />
    </div>
  );
}

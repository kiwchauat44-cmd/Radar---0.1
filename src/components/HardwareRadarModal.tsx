/**
 * Hardware Radar Connection & Pipeline Configuration Dialog
 * แผงจัดการการเชื่อมต่อฮาร์ดแวร์เรดาร์จริงผ่าน WebSocket / NMEA / เครือข่ายเรือรบ
 */

import React, { useState } from 'react';
import {
  HardwareRadarStatus,
  HardwareTransport,
  RadarStatus,
} from '../types/radar';
import {
  hardwareRadarManager,
} from '../services/hardwareRadarInterface';
import {
  Radio,
  Wifi,
  Cpu,
  Activity,
  CheckCircle2,
  XCircle,
  X,
  Play,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { tacticalAudio } from '../services/audioEffects';

interface HardwareRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: HardwareRadarStatus;
  systemStatus: RadarStatus;
}

export const HardwareRadarModal: React.FC<HardwareRadarModalProps> = ({
  isOpen,
  onClose,
  status,
  systemStatus,
}) => {
  const [ip, setIp] = useState(status.ipAddress);
  const [port, setPort] = useState(status.port.toString());
  const [transport, setTransport] = useState<HardwareTransport>(status.transport === 'none' ? 'websocket' : status.transport);
  const [wsUrl, setWsUrl] = useState(`ws://${status.ipAddress}:${status.port}/radar`);
  const [isSimulatedStreamActive, setIsSimulatedStreamActive] = useState(false);

  if (!isOpen) return null;

  const isConnected = status.connectionState === 'connected';

  const handleConnect = async () => {
    tacticalAudio.playButtonPress();
    hardwareRadarManager.updateConnectionConfig(ip, parseInt(port) || 8080, transport);
    await hardwareRadarManager.connectWebSocket(wsUrl);
  };

  const handleDisconnect = () => {
    tacticalAudio.playButtonPress();
    hardwareRadarManager.disconnect();
    setIsSimulatedStreamActive(false);
  };

  const handleToggleMockHardwareStream = () => {
    tacticalAudio.playButtonPress();
    const nextState = !isSimulatedStreamActive;
    setIsSimulatedStreamActive(nextState);
    hardwareRadarManager.simulateHardwareConnection(nextState);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-[#030914] border border-cyan-800/80 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-950 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold tracking-wide text-white">
              สถาปัตยกรรมเชื่อมต่อเรดาร์ฮาร์ดแวร์จริง (HARDWARE INTERFACE)
            </h2>
          </div>
          <button
            onClick={() => {
              tacticalAudio.playButtonPress();
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center rounded bg-slate-900 hover:bg-slate-800 text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs font-sans">
          {/* Integrity Notice (ข้อกำหนดสำคัญ: ห้ามอ้างว่าโทรศัพท์เป็นเรดาร์จริงได้) */}
          <div className="p-3 rounded bg-amber-950/40 border border-amber-700/60 text-amber-200/90 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-1">
              <Cpu className="w-4 h-4 shrink-0" />
              <span>หลักการความซื่อตรงของระบบ (Hardware Integrity)</span>
            </div>
            สมาร์ตโฟนทั่วไปไม่มีตัวส่งคลื่นความถี่ไมโครเวฟ (Magnetron/Solid-State Transceiver) ของเรดาร์จริง 
            ระบบนี้จึงทำงานใน <strong>โหมดจำลอง (SIMULATION)</strong> เป็นค่าเริ่มต้น 
            และออกแบบ Architecture รองรับการเชื่อมต่อกับเรดาร์ทางเรือภายนอกผ่าน WebSocket/NMEA/Network อย่างสมบูรณ์
          </div>

          {/* Current Connection Status Box */}
          <div className="p-3 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {isConnected ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-slate-500 shrink-0" />
              )}
              <div>
                <div className="font-bold text-white text-xs">
                  {isConnected ? 'เชื่อมต่อเรดาร์ฮาร์ดแวร์สำเร็จ (REAL RADAR)' : 'โหมดจำลอง (SIMULATION MODE)'}
                </div>
                <div className="text-[11px] text-slate-400 font-mono-radar">
                  สถานะ: {status.connectionState.toUpperCase()} · Latency: {status.latencyMs}ms · แพ็กเก็ต: {status.packetsReceived}
                </div>
              </div>
            </div>

            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              isConnected ? 'bg-cyan-950 text-cyan-300 border border-cyan-500' : 'bg-amber-950 text-amber-300 border border-amber-600'
            }`}>
              {isConnected ? 'REAL RADAR' : 'SIMULATION'}
            </span>
          </div>

          {/* Data Pipeline Diagram */}
          <div className="p-3 rounded bg-slate-950 border border-slate-800">
            <div className="font-bold text-slate-300 mb-2 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>ลำดับกระบวนการส่งข้อมูล (Data Pipeline Architecture)</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono-radar text-center py-1 overflow-x-auto gap-1">
              <div className="bg-slate-900 border border-slate-700 px-2 py-1 rounded shrink-0">Sensor / Hardware</div>
              <div className="text-cyan-400">→</div>
              <div className="bg-slate-900 border border-slate-700 px-2 py-1 rounded shrink-0">Radar Input</div>
              <div className="text-cyan-400">→</div>
              <div className="bg-slate-900 border border-slate-700 px-2 py-1 rounded shrink-0">Signal Proc</div>
              <div className="text-cyan-400">→</div>
              <div className="bg-slate-900 border border-slate-700 px-2 py-1 rounded shrink-0">Detection</div>
              <div className="text-cyan-400">→</div>
              <div className="bg-slate-900 border border-slate-700 px-2 py-1 rounded shrink-0">Tracking</div>
              <div className="text-cyan-400">→</div>
              <div className="bg-cyan-950 border border-cyan-600 text-cyan-200 px-2 py-1 rounded shrink-0">PPI Display</div>
            </div>
          </div>

          {/* Connection Settings */}
          <div className="space-y-2.5">
            <div className="font-bold text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>ตั้งค่าการเชื่อมต่อ WebSocket / เครือข่าย NMEA</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">ช่องทางเชื่อมต่อ (Transport)</label>
                <select
                  value={transport}
                  onChange={(e) => setTransport(e.target.value as HardwareTransport)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-xs text-white"
                >
                  <option value="websocket">WebSocket (ws://)</option>
                  <option value="network_udp">Network TCP / UDP</option>
                  <option value="bluetooth">Bluetooth SPP Bridge</option>
                  <option value="serial">USB Serial / NMEA 0183</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">พอร์ตเรดาร์ (Port)</label>
                <input
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="8080"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-xs font-mono text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">WebSocket URL เป้าหมาย</label>
              <input
                type="text"
                value={wsUrl}
                onChange={(e) => setWsUrl(e.target.value)}
                placeholder="ws://192.168.1.50:8080/radar"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-xs font-mono text-white"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {isConnected ? (
              <button
                onClick={handleDisconnect}
                className="min-h-[44px] flex items-center justify-center gap-1.5 bg-rose-950/80 border border-rose-600 rounded text-rose-200 font-bold active:scale-95 transition-transform"
              >
                <RotateCcw className="w-4 h-4" />
                <span>ตัดการเชื่อมต่อ</span>
              </button>
            ) : (
              <button
                onClick={handleConnect}
                className="min-h-[44px] flex items-center justify-center gap-1.5 bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500 rounded text-cyan-200 font-bold active:scale-95 transition-transform"
              >
                <Wifi className="w-4 h-4" />
                <span>เชื่อมต่อ WebSocket</span>
              </button>
            )}

            {/* Test Hardware Stream Toggle */}
            <button
              onClick={handleToggleMockHardwareStream}
              className={`min-h-[44px] flex items-center justify-center gap-1.5 rounded border font-bold active:scale-95 transition-transform ${
                isSimulatedStreamActive
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-200'
                  : 'bg-slate-900 border-slate-700 text-slate-300'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>{isSimulatedStreamActive ? 'กำลังป้อน NMEA จำลอง' : 'ทดสอบสัญญาณฮาร์ดแวร์'}</span>
            </button>
          </div>

          {status.errorMessage && (
            <div className="p-2 rounded bg-rose-950/60 border border-rose-700 text-rose-300 text-[11px]">
              {status.errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

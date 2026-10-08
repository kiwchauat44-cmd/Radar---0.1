/**
 * Add Custom Simulated Target Modal
 * หน้าต่างสำหรับสร้างเป้าหมายจำลองเพิ่มเติมเพื่อทดสอบระบบ
 */

import React, { useState } from 'react';
import { TargetClassification, ThreatLevel } from '../types/radar';
import { X, Plus, Ship } from 'lucide-react';
import { tacticalAudio } from '../services/audioEffects';

interface AddTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTarget: (
    name: string,
    classification: TargetClassification,
    threatLevel: ThreatLevel,
    rangeNM: number,
    bearingDeg: number,
    courseDeg: number,
    speedKnots: number
  ) => void;
}

export const AddTargetModal: React.FC<AddTargetModalProps> = ({
  isOpen,
  onClose,
  onAddTarget,
}) => {
  const [name, setName] = useState('เรือเป้าหมายทดสอบ (Test Target)');
  const [classification, setClassification] = useState<TargetClassification>('surface');
  const [threatLevel, setThreatLevel] = useState<ThreatLevel>('neutral');
  const [rangeNM, setRangeNM] = useState('4.5');
  const [bearingDeg, setBearingDeg] = useState('065');
  const [courseDeg, setCourseDeg] = useState('240');
  const [speedKnots, setSpeedKnots] = useState('18.0');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    tacticalAudio.playTargetAcquired();
    onAddTarget(
      name || 'Custom Target',
      classification,
      threatLevel,
      parseFloat(rangeNM) || 3.0,
      parseFloat(bearingDeg) || 0,
      parseFloat(courseDeg) || 0,
      parseFloat(speedKnots) || 12
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm bg-[#030914] border border-emerald-800/80 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-950 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <Ship className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">สร้างเป้าหมายจำลองใหม่</h2>
          </div>
          <button
            onClick={() => {
              tacticalAudio.playButtonPress();
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center rounded bg-slate-900 text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">ชื่อหรือรหัสเป้าหมาย</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">ประเภท (Classification)</label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value as TargetClassification)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 text-white"
              >
                <option value="surface">เรือผิวน้ำ (Surface)</option>
                <option value="fighter_jet">✈️ เครื่องบินรบ (Fighter Jet)</option>
                <option value="missile">🚀 ขีปนาวุธต่อต้านเรือ (Anti-Ship Missile)</option>
                <option value="aircraft">อากาศยานทั่วไป (Aircraft)</option>
                <option value="high_speed">เรือเร็ว (Fast Craft)</option>
                <option value="submarine">เรือดำน้ำ (Submarine)</option>
                <option value="merchant">เรือสินค้า (Merchant)</option>
                <option value="escort">เรือคุ้มกัน (Escort)</option>
                <option value="unknown">ไม่ทราบประเภท (Unknown)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">ระดับภัย (Threat)</label>
              <select
                value={threatLevel}
                onChange={(e) => setThreatLevel(e.target.value as ThreatLevel)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 text-white"
              >
                <option value="neutral">เป็นกลาง (Neutral)</option>
                <option value="friendly">ฝ่ายเดียวกัน (Friendly)</option>
                <option value="suspect">น่าสงสัย (Suspect)</option>
                <option value="hostile">คุกคาม (Hostile)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">ระยะเริ่มต้น (NM)</label>
              <input
                type="number"
                step="0.1"
                min="0.2"
                max="80"
                value={rangeNM}
                onChange={(e) => setRangeNM(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 font-mono text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">แบริ่ง (Bearing 0-359°)</label>
              <input
                type="number"
                min="0"
                max="359"
                value={bearingDeg}
                onChange={(e) => setBearingDeg(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 font-mono text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">ทิศทางเรือ (Course °)</label>
              <input
                type="number"
                min="0"
                max="359"
                value={courseDeg}
                onChange={(e) => setCourseDeg(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 font-mono text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">ความเร็ว (Knots)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="350"
                value={speedKnots}
                onChange={(e) => setSpeedKnots(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 font-mono text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-h-[44px] flex items-center justify-center gap-1.5 bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500 rounded text-emerald-200 font-bold active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" />
            <span>สร้างเป้าหมายลงบนจอเรดาร์</span>
          </button>
        </form>
      </div>
    </div>
  );
};

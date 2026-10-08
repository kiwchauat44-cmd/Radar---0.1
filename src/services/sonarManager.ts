/**
 * Naval ASW Waterfall Sonar Service (ระบบจำลองโซนาร์แบบน้ำตกตรวจจับภัยคุกคามใต้น้ำ)
 * จำลองการรับสัญญาณไฮโดรโฟน, LOFAR Spectrogram, BDI Waterfall, และการต่อต้านภัยคุกคามใต้น้ำ
 */

import { SonarColorMap, SonarContact, SonarMode, SonarState } from '../types/radar';
import { tacticalAudio } from './audioEffects';

class SonarManager {
  private state: SonarState = {
    isActive: true,
    isPanelOpen: false,
    mode: 'bdi_waterfall',
    colorMap: 'ocean_deep_blue',
    gain: 68,
    rangeYds: 10000,
    bearingCursorDeg: 215,
    isPinging: false,
    torpedoAlert: false,
    decoysCount: 6,
    aswTorpedosCount: 4,
    selectedContactId: null,
    contacts: [
      {
        id: 'SONAR-01',
        name: 'Kilo-class 636 SSK (เรือดำน้ำโจมตีดีเซล-ไฟฟ้า)',
        classification: 'submarine',
        threatLevel: 'hostile',
        bearingDeg: 214.5,
        rangeYards: 5800,
        depthMeters: 140,
        speedKnots: 4.8,
        frequenciesHz: [85, 170, 340],
        signalStrengthDb: 28,
        audioToneHz: 340,
        status: 'tracking',
      },
      {
        id: 'SONAR-02',
        name: 'Type 039A Yuan AIP (เรือดำน้ำระบบ AIP ไร้อากาศ)',
        classification: 'submarine',
        threatLevel: 'suspect',
        bearingDeg: 72.0,
        rangeYards: 8900,
        depthMeters: 210,
        speedKnots: 3.2,
        frequenciesHz: [115, 230],
        signalStrengthDb: 21,
        audioToneHz: 230,
        status: 'detected',
      },
      {
        id: 'SONAR-03',
        name: 'Homing Torpedo Inbound (ตอร์ปิโดนำวิถีวิ่งเข้าหาเรือ)',
        classification: 'torpedo',
        threatLevel: 'hostile',
        bearingDeg: 338.0,
        rangeYards: 3400,
        depthMeters: 25,
        speedKnots: 52.0,
        frequenciesHz: [950, 1900],
        signalStrengthDb: 42,
        audioToneHz: 950,
        status: 'tracking',
      },
      {
        id: 'SONAR-04',
        name: 'Bryde Whale Pod (ฝูงวาฬบรูด้าอ่าวไทย)',
        classification: 'biologic',
        threatLevel: 'neutral',
        bearingDeg: 145.0,
        rangeYards: 4100,
        depthMeters: 35,
        speedKnots: 6.0,
        frequenciesHz: [25, 45],
        signalStrengthDb: 18,
        audioToneHz: 60,
        status: 'detected',
      },
      {
        id: 'SONAR-05',
        name: 'Sunken Cargo Hull Wreck (ซากเรืออับปางใต้ทะเล)',
        classification: 'wreck',
        threatLevel: 'neutral',
        bearingDeg: 285.0,
        rangeYards: 7200,
        depthMeters: 82,
        speedKnots: 0.0,
        frequenciesHz: [],
        signalStrengthDb: 15,
        audioToneHz: 0,
        status: 'detected',
      },
    ],
  };

  private listeners: Set<(state: SonarState) => void> = new Set();
  // Rolling waterfall historical lines buffer (each line is an array of intensity values 0-255)
  private waterfallBuffer: Uint8Array[] = [];
  private bufferWidth = 180; // 180 bearing bins (2 degrees per bin)
  private maxHistoryRows = 120; // 120 rows of waterfall history
  private lastUpdate = Date.now();

  constructor() {
    // Seed initial waterfall rows with authentic ocean ambient noise
    for (let r = 0; r < this.maxHistoryRows; r++) {
      this.waterfallBuffer.push(this.generateWaterfallRow(r));
    }
  }

  public getState(): SonarState {
    return { ...this.state };
  }

  public getWaterfallBuffer(): Uint8Array[] {
    return this.waterfallBuffer;
  }

  public subscribe(fn: (state: SonarState) => void): () => void {
    this.listeners.add(fn);
    fn(this.getState());
    return () => this.listeners.delete(fn);
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((fn) => fn(s));
  }

  public togglePanel(open?: boolean) {
    this.state.isPanelOpen = open !== undefined ? open : !this.state.isPanelOpen;
    tacticalAudio.playButtonPress();
    this.notify();
  }

  public setMode(mode: SonarMode) {
    this.state.mode = mode;
    tacticalAudio.playButtonPress();
    this.notify();
  }

  public setColorMap(colorMap: SonarColorMap) {
    this.state.colorMap = colorMap;
    tacticalAudio.playButtonPress();
    this.notify();
  }

  public setGain(gain: number) {
    this.state.gain = Math.max(0, Math.min(100, gain));
    this.notify();
  }

  public setBearingCursor(deg: number) {
    this.state.bearingCursorDeg = (deg + 360) % 360;
    this.notify();
  }

  public selectContact(id: string | null) {
    this.state.selectedContactId = id;
    if (id) {
      const c = this.state.contacts.find((x) => x.id === id);
      if (c) {
        this.state.bearingCursorDeg = c.bearingDeg;
        tacticalAudio.playTargetAcquired();
      }
    }
    this.notify();
  }

  /**
   * ยิงคลื่นสัญญาณโซนาร์เชิงรุก (Active Sonar Transmission Ping)
   */
  public triggerActivePing() {
    if (this.state.isPinging) return;
    this.state.isPinging = true;
    tacticalAudio.playSonarPing();
    this.notify();

    setTimeout(() => {
      this.state.isPinging = false;
      this.notify();
    }, 2500);
  }

  /**
   * ปล่อยเป้าลวงตอร์ปิโด Nixie Acoustic Decoy
   */
  public launchDecoy(): boolean {
    if (this.state.decoysCount <= 0) return false;
    this.state.decoysCount--;
    tacticalAudio.playSubmarineDecoyLaunch();

    // หากมีตอร์ปิโดกำลังวิ่งเข้าหา ให้เบี่ยงเบนเป้าหมาย
    const torp = this.state.contacts.find((c) => c.classification === 'torpedo');
    if (torp) {
      torp.status = 'neutralized';
      torp.name = 'Homing Torpedo (Distracted by Nixie Decoy)';
      torp.bearingDeg = (torp.bearingDeg + 45) % 360;
    }

    this.notify();
    return true;
  }

  /**
   * ยิงอาวุธปราบเรือดำน้ำ ASROC / Mk-46 ตอร์ปิโดปราบเรือดำน้ำ
   */
  public launchAswTorpedo(targetId: string): boolean {
    if (this.state.aswTorpedosCount <= 0) return false;
    this.state.aswTorpedosCount--;
    tacticalAudio.playSubmarineDecoyLaunch();

    setTimeout(() => {
      // ทำลายเป้าหมายใต้น้ำ
      tacticalAudio.playTargetDestroyed();
      this.state.contacts = this.state.contacts.filter((c) => c.id !== targetId);
      this.notify();
    }, 2800);

    this.notify();
    return true;
  }

  /**
   * สร้างแถวสัญญาณเสียงใหม่สำหรับ Waterfall Spectrogram (FFT Energy / LOFAR Spectrogram)
   */
  private generateWaterfallRow(rowIndex = 0): Uint8Array {
    const row = new Uint8Array(this.bufferWidth);
    const gainFactor = this.state.gain / 60;
    const now = Date.now();

    // 1. เสียงรบกวนพื้นหลังมหาสมุทร (Ocean Ambient Noise Floor)
    for (let i = 0; i < this.bufferWidth; i++) {
      const noise = Math.random() * 45 * gainFactor;
      row[i] = Math.min(255, Math.floor(noise));
    }

    // 2. สัญญาณความร้อน/กระแสน้ำ (Thermocline internal waves)
    const waveShift = Math.sin(rowIndex * 0.15 + now * 0.001) * 15;
    const waveBin = Math.floor(((70 + waveShift + 360) % 360) / 2);
    if (waveBin >= 0 && waveBin < this.bufferWidth) {
      row[waveBin] = Math.min(255, row[waveBin] + 35 * gainFactor);
    }

    // 3. รอยสัญญาณเสียงของเป้าหมายใต้น้ำ (Contact Acoustic Energy Traces)
    this.state.contacts.forEach((contact) => {
      if (contact.status === 'neutralized') return;

      const binCenter = Math.floor(contact.bearingDeg / 2);
      const strength = contact.signalStrengthDb * 4.5 * gainFactor;

      // เพิ่มความเข้มสัญญาณรอบๆ Bearing ของเป้าหมาย (Gaussian acoustic peak)
      for (let offset = -3; offset <= 3; offset++) {
        const bin = (binCenter + offset + this.bufferWidth) % this.bufferWidth;
        const decay = Math.exp(-(offset * offset) / 2);
        const energy = Math.floor(strength * decay);
        row[bin] = Math.min(255, Math.max(row[bin], energy));
      }
    });

    return row;
  }

  /**
   * ฟิสิกส์การเคลื่อนที่ของเป้าหมายใต้น้ำและอัปเดต Waterfall Spectrogram
   */
  public updatePhysics(dtSeconds: number) {
    const now = Date.now();
    this.lastUpdate = now;

    // อัปเดตพิกัดเป้าหมายใต้น้ำ
    let hasImminentTorpedo = false;

    this.state.contacts.forEach((c) => {
      if (c.status === 'neutralized') return;

      if (c.classification === 'torpedo') {
        // ตอร์ปิโดวิ่งเข้าหาเรือเราด้วยความเร็วสูง
        const yardsTraveled = (c.speedKnots * 2000 / 3600) * dtSeconds;
        c.rangeYards = Math.max(200, c.rangeYards - yardsTraveled);
        if (c.rangeYards < 4000) {
          hasImminentTorpedo = true;
        }
      } else if (c.classification === 'submarine') {
        // เรือดำน้ำแอบคืบคลานช้าๆ และหมุนทิศทางเล็กน้อย
        const drift = Math.sin(now * 0.0005 + parseInt(c.id.slice(-1))) * 0.2;
        c.bearingDeg = (c.bearingDeg + drift + 360) % 360;
      }
    });

    if (hasImminentTorpedo && !this.state.torpedoAlert) {
      this.state.torpedoAlert = true;
      tacticalAudio.playTorpedoAlert();
    } else if (!hasImminentTorpedo) {
      this.state.torpedoAlert = false;
    }

    // เลื่อนแถว Waterfall Spectrogram (ดันแถวใหม่เข้าด้านบน ดึงแถวเก่าออกด้านล่าง)
    const newRow = this.generateWaterfallRow(0);
    this.waterfallBuffer.unshift(newRow);
    if (this.waterfallBuffer.length > this.maxHistoryRows) {
      this.waterfallBuffer.pop();
    }

    this.notify();
  }
}

export const sonarManager = new SonarManager();

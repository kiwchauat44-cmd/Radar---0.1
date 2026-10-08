/**
 * Naval Target Detection & Tracking Simulation Engine (ARPA / TT)
 * ระบบจำลองการตรวจจับและติดตามเป้าหมายทางทะเลตามหลักฟิสิกส์เดินเรือ
 */

import {
  OwnShip,
  RadarSettings,
  RadarTarget,
  TargetClassification,
  ThreatLevel,
  TrailPoint,
} from '../types/radar';

export interface InternalTargetState {
  id: string;
  name: string;
  classification: TargetClassification;
  threatLevel: ThreatLevel;
  xNM: number;       // Nautical miles relative to own ship (+x East, +y North)
  yNM: number;
  courseDeg: number; // True course in degrees (000-359)
  speedKnots: number;
  echoStrength: number;
  isRealHardwareTarget: boolean;
  trailHistory: TrailPoint[];
  showTrail: boolean;
  status: 'detected' | 'tracking' | 'locked';
}

export class TargetSimulationEngine {
  private targets: InternalTargetState[] = [];
  private lastUpdateTimestamp: number = Date.now();

  constructor() {
    this.initDefaultTargets();
  }

  /**
   * สร้างเป้าหมายจำลองเริ่มต้น 10+ เป้าหมายในพื้นที่อ่าวไทย / น่านน้ำยุทธการ
   */
  public initDefaultTargets() {
    this.targets = [
      {
        id: 'TGT-01',
        name: 'HTMS Sukhothai Escort (เรือรบคุ้มกัน)',
        classification: 'escort',
        threatLevel: 'friendly',
        xNM: -1.8,
        yNM: 3.2,
        courseDeg: 40,
        speedKnots: 22.0,
        echoStrength: 0.95,
        isRealHardwareTarget: false,
        trailHistory: [],
        showTrail: true,
        status: 'tracking',
      },
      {
        id: 'TGT-02',
        name: 'MV Siam Pearl (เรือบรรทุกสินค้า)',
        classification: 'merchant',
        threatLevel: 'neutral',
        xNM: 4.5,
        yNM: 6.8,
        courseDeg: 215,
        speedKnots: 15.4,
        echoStrength: 0.98,
        isRealHardwareTarget: false,
        trailHistory: [],
        showTrail: true,
        status: 'detected',
      },
      {
        id: 'TGT-03',
        name: 'Fast Patrol Skiff (เรือเร็วตรวจการณ์)',
        classification: 'high_speed',
        threatLevel: 'suspect',
        xNM: -3.2,
        yNM: -2.1,
        courseDeg: 75,
        speedKnots: 38.0,
        echoStrength: 0.65,
        isRealHardwareTarget: false,
        trailHistory: [],
        showTrail: true,
        status: 'tracking',
      },
      {
        id: 'TGT-04',
        name: 'Coastal Trawler 104 (เรือประมงอวนลาก)',
        classification: 'surface',
        threatLevel: 'neutral',
        xNM: 1.2,
        yNM: -4.5,
        courseDeg: 120,
        speedKnots: 8.5,
        echoStrength: 0.75,
        isRealHardwareTarget: false,
        trailHistory: [],
        showTrail: true,
        status: 'detected',
      },
      {
        id: 'TGT-05',
        name: 'Navy Seahawk RTN-2101 (ฮ.ตรวจการณ์)',
        classification: 'aircraft',
        threatLevel: 'friendly',
        xNM: 7.2,
        yNM: -1.5,
        courseDeg: 310,
        speedKnots: 120.0,
        echoStrength: 0.85,
        isRealHardwareTarget: false,
        trailHistory: [],
        showTrail: true,
        status: 'tracking',
      },
      {
        id: 'TGT-06',
        name: 'Inbound Container Vessel (เรือตู้สินค้า)',
        classification: 'merchant',
        threatLevel: 'neutral',
        xNM: -6.5,
        yNM: 8.2,
        courseDeg: 160,
        speedKnots: 18.2,
        echoStrength: 0.95,
        isRealHardwareTarget: false,
        trailHistory: [],
        showTrail: true,
        status: 'detected',
      },
      {
        id: 'TGT-07',
        name: 'Unidentified Radar Contact (เป้าหมายไม่ทราบฝ่าย)',
        classification: 'unknown',
        threatLevel: 'suspect',
        xNM: 2.1,
        yNM: 2.8,
        courseDeg: 230,
        speedKnots: 26.0,
        echoStrength: 0.55,
        isRealHardwareTarget: false,
        trailHistory: [],
        showTrail: true,
        status: 'locked',
      },
      {
        id: 'TGT-08',
        name: 'Tanker Ocean Splendor (เรือบรรทุกน้ำมัน)',
        classification: 'merchant',
        threatLevel: 'neutral',
        xNM: -8.0,
        yNM: -5.4,
        courseDeg: 45,
        speedKnots: 12.0,
        echoStrength: 0.99,
        isRealHardwareTarget: false,
        trailHistory: [],
        showTrail: true,
        status: 'detected',
      },
      {
        id: 'TGT-09',
        name: 'Fast Interceptor 09 (เรือเร็วลอบผ่าน)',
        classification: 'high_speed',
        threatLevel: 'hostile',
        xNM: 5.8,
        yNM: -7.0,
        courseDeg: 345,
        speedKnots: 42.0,
        echoStrength: 0.70,
        isRealHardwareTarget: false,
        trailHistory: [],
        showTrail: true,
        status: 'tracking',
      },
      {
        id: 'TGT-10',
        name: 'Offshore Supply Vessel (เรือสนับสนุนแท่น)',
        classification: 'surface',
        threatLevel: 'neutral',
        xNM: 0.8,
        yNM: 7.5,
        courseDeg: 195,
        speedKnots: 14.0,
        echoStrength: 0.88,
        isRealHardwareTarget: false,
        trailHistory: [],
        showTrail: true,
        status: 'detected',
      },
      {
        id: 'TGT-11',
        name: 'Maritime Patrol Do-228 (บ.ลาดตระเวน)',
        classification: 'aircraft',
        threatLevel: 'neutral',
        xNM: -9.4,
        yNM: -2.0,
        courseDeg: 80,
        speedKnots: 160.0,
        echoStrength: 0.80,
        isRealHardwareTarget: false,
        trailHistory: [],
        showTrail: true,
        status: 'detected',
      },
    ];

    // Seed trailing points
    const now = Date.now();
    this.targets.forEach((t) => {
      t.trailHistory = [
        { x: t.xNM - (t.speedKnots * Math.sin(t.courseDeg * Math.PI / 180) * 0.005), y: t.yNM - (t.speedKnots * Math.cos(t.courseDeg * Math.PI / 180) * 0.005), timestamp: now - 30000 },
        { x: t.xNM, y: t.yNM, timestamp: now },
      ];
    });
    this.lastUpdateTimestamp = now;
  }

  /**
   * คำนวณความคืบหน้าของฟิสิกส์เป้าหมายตามกาลเวลาจริง
   */
  public updatePhysics(ownShip: OwnShip, settings: RadarSettings): RadarTarget[] {
    const now = Date.now();
    const dtSeconds = Math.max(0.01, Math.min(1.0, (now - this.lastUpdateTimestamp) / 1000));
    this.lastUpdateTimestamp = now;

    const dtHours = dtSeconds / 3600;

    // เวกเตอร์ความเร็วเรือเรา (Own Ship velocity in knots)
    const ownHdgRad = (ownShip.cogDeg * Math.PI) / 180;
    const v0x = ownShip.sogKnots * Math.sin(ownHdgRad);
    const v0y = ownShip.sogKnots * Math.cos(ownHdgRad);

    const calculatedTargets: RadarTarget[] = [];

    for (const t of this.targets) {
      // เวกเตอร์ความเร็วเป้าหมาย (Target velocity in knots)
      const tgtCourseRad = (t.courseDeg * Math.PI) / 180;
      const vtx = t.speedKnots * Math.sin(tgtCourseRad);
      const vty = t.speedKnots * Math.cos(tgtCourseRad);

      // ในพิกัดสัมพัทธ์เรือเรา (Relative motion updates)
      // dx_rel = (vtx - v0x) * dtHours
      const dxRel = (vtx - v0x) * dtHours;
      const dyRel = (vty - v0y) * dtHours;

      t.xNM += dxRel;
      t.yNM += dyRel;

      // Wrap-around bounds if target moves too far (> 100 NM) to keep simulation engaging
      if (Math.hypot(t.xNM, t.yNM) > 90) {
        t.xNM = -t.xNM * 0.6;
        t.yNM = -t.yNM * 0.6;
      }

      // บันทึก Trail History ตามการตั้งค่าระยะเวลา
      if (settings.trailDuration > 0) {
        const lastPoint = t.trailHistory[t.trailHistory.length - 1];
        if (!lastPoint || now - lastPoint.timestamp > 1500) {
          t.trailHistory.push({ x: t.xNM, y: t.yNM, timestamp: now });
        }
        // ตัด Trail ที่เก่าเกินกว่า trailDuration
        const cutoffTime = now - settings.trailDuration * 1000;
        t.trailHistory = t.trailHistory.filter((p) => p.timestamp >= cutoffTime);
      } else {
        t.trailHistory = [];
      }

      // คำนวณระยะ (Range in Nautical Miles)
      const rangeNM = Math.hypot(t.xNM, t.yNM);

      // คำนวณแบริ่ง (True Bearing: 000-359 deg)
      let bearingRad = Math.atan2(t.xNM, t.yNM);
      let bearingDeg = (bearingRad * 180) / Math.PI;
      if (bearingDeg < 0) bearingDeg += 360;

      // ==========================================
      // ARPA CPA & TCPA CALCULATION (ตามหลักการเดินเรือ)
      // ==========================================
      const vRelX = vtx - v0x;
      const vRelY = vty - v0y;
      const vRelSpeedSq = vRelX * vRelX + vRelY * vRelY;

      let cpaNM = rangeNM;
      let tcpaMin = 99.9;

      if (vRelSpeedSq > 0.001) {
        // tCPA (hours) = - (P · Vrel) / |Vrel|^2
        const dotProduct = t.xNM * vRelX + t.yNM * vRelY;
        const tCPAHours = -dotProduct / vRelSpeedSq;
        tcpaMin = Number((tCPAHours * 60).toFixed(1));

        if (tCPAHours >= 0) {
          // กำลังเข้าใกล้ (Converging)
          const cpaX = t.xNM + vRelX * tCPAHours;
          const cpaY = t.yNM + vRelY * tCPAHours;
          cpaNM = Number(Math.hypot(cpaX, cpaY).toFixed(2));
        } else {
          // กำลังห่างออกไป (Diverging)
          cpaNM = Number(rangeNM.toFixed(2));
        }
      }

      // แปลงเป็นพิกัดภูมิศาสตร์จำลองสัมพันธ์กับเรือเรา (Lat/Lon)
      const latOffsetDeg = t.yNM / 60;
      const lonOffsetDeg = t.xNM / (60 * Math.cos((ownShip.latitude * Math.PI) / 180));
      const targetLat = ownShip.latitude + latOffsetDeg;
      const targetLon = ownShip.longitude + lonOffsetDeg;

      // กรองสัญญาณตาม Gain และ Clutter
      // ถ้า Gain ต่ำ เป้าหมายที่มี Echo strength อ่อนจะไม่ปรากฏ
      const minGainThreshold = (1 - t.echoStrength) * 70;
      if (settings.gain >= minGainThreshold) {
        calculatedTargets.push({
          id: t.id,
          name: t.name,
          classification: t.classification,
          threatLevel: t.threatLevel,
          rangeNM: Number(rangeNM.toFixed(2)),
          bearingDeg: Number(bearingDeg.toFixed(1)),
          courseDeg: Math.round(t.courseDeg),
          speedKnots: Number(t.speedKnots.toFixed(1)),
          cpaNM: cpaNM,
          tcpaMin: tcpaMin,
          status: t.status,
          trailHistory: [...t.trailHistory],
          showTrail: t.showTrail,
          echoStrength: t.echoStrength,
          isRealHardwareTarget: t.isRealHardwareTarget,
          latitude: Number(targetLat.toFixed(4)),
          longitude: Number(targetLon.toFixed(4)),
          lastUpdated: now,
        });
      }
    }

    return calculatedTargets;
  }

  public setTargetStatus(targetId: string, status: 'detected' | 'tracking' | 'locked') {
    const tgt = this.targets.find((t) => t.id === targetId);
    if (tgt) {
      tgt.status = status;
    }
  }

  public toggleTargetTrail(targetId: string, show: boolean) {
    const tgt = this.targets.find((t) => t.id === targetId);
    if (tgt) {
      tgt.showTrail = show;
    }
  }

  public updateTargetThreat(targetId: string, threat: ThreatLevel) {
    const tgt = this.targets.find((t) => t.id === targetId);
    if (tgt) {
      tgt.threatLevel = threat;
    }
  }

  public addCustomTarget(
    name: string,
    classification: TargetClassification,
    threatLevel: ThreatLevel,
    rangeNM: number,
    bearingDeg: number,
    courseDeg: number,
    speedKnots: number
  ) {
    const rad = (bearingDeg * Math.PI) / 180;
    const xNM = rangeNM * Math.sin(rad);
    const yNM = rangeNM * Math.cos(rad);
    const nextNum = this.targets.length + 1;
    const id = `TGT-${nextNum < 10 ? '0' + nextNum : nextNum}`;

    this.targets.push({
      id,
      name,
      classification,
      threatLevel,
      xNM,
      yNM,
      courseDeg,
      speedKnots,
      echoStrength: 0.9,
      isRealHardwareTarget: false,
      trailHistory: [],
      showTrail: true,
      status: 'tracking',
    });
  }

  public mergeExternalTargets(externalTargets: RadarTarget[]) {
    externalTargets.forEach((ext) => {
      const idx = this.targets.findIndex((t) => t.id === ext.id);
      const rad = (ext.bearingDeg * Math.PI) / 180;
      const xNM = ext.rangeNM * Math.sin(rad);
      const yNM = ext.rangeNM * Math.cos(rad);

      if (idx >= 0) {
        this.targets[idx].xNM = xNM;
        this.targets[idx].yNM = yNM;
        this.targets[idx].courseDeg = ext.courseDeg;
        this.targets[idx].speedKnots = ext.speedKnots;
        this.targets[idx].status = ext.status;
        this.targets[idx].isRealHardwareTarget = true;
      } else {
        this.targets.push({
          id: ext.id,
          name: ext.name,
          classification: ext.classification,
          threatLevel: ext.threatLevel,
          xNM,
          yNM,
          courseDeg: ext.courseDeg,
          speedKnots: ext.speedKnots,
          echoStrength: ext.echoStrength,
          isRealHardwareTarget: true,
          trailHistory: [],
          showTrail: true,
          status: ext.status,
        });
      }
    });
  }
}

export const simulationEngine = new TargetSimulationEngine();

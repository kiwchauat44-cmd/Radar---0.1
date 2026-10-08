/**
 * AEGIS Combat System Engine (ระบบบัญชาการรบและต่อสู้อากาศยาน/ขีปนาวุธเอจิส)
 * จำลองระบบควบคุมการยิง (WCS), เรดาร์เฟสอะเรย์ AN/SPY, การประเมินภัยคุกคาม (TEWA),
 * การยิงสกัดกั้นขีปนาวุธ VLS (SM-2, ESSM), ฮาร์พูน และปืนกล CIWS
 */

import {
  AegisCombatLogEntry,
  AegisDoctrine,
  AegisExplosion,
  AegisMissile,
  AegisSystemState,
  AegisWeaponType,
  RadarTarget,
} from '../types/radar';
import { tacticalAudio } from './audioEffects';
import { simulationEngine } from './targetSimulationEngine';

class AegisCombatEngine {
  private state: AegisSystemState = {
    isActive: false,
    doctrine: 'manual',
    vlsSm2Count: 32,
    vlsSm2Max: 32,
    vlsEssmCount: 24,
    vlsEssmMax: 24,
    harpoonCount: 8,
    harpoonMax: 8,
    ciwsRounds: 1500,
    ciwsRoundsMax: 1500,
    activeMissiles: [],
    explosions: [],
    autoEngagementRangeNM: 14.0,
    killCount: 0,
    combatLog: [
      {
        id: 'LOG-INIT',
        timestamp: new Date().toLocaleTimeString('th-TH'),
        message: 'ระบบเอจิสสแตนด์บาย (AN/SPY-1D RADAR & MK-41 VLS STANDBY)',
        type: 'info',
      },
    ],
  };

  private listeners: Set<(state: AegisSystemState) => void> = new Set();
  private lastAutoCheckTime = 0;

  public getState(): AegisSystemState {
    return { ...this.state };
  }

  public subscribe(fn: (state: AegisSystemState) => void): () => void {
    this.listeners.add(fn);
    fn(this.getState());
    return () => this.listeners.delete(fn);
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((fn) => fn(s));
  }

  public addLog(message: string, type: AegisCombatLogEntry['type']) {
    const entry: AegisCombatLogEntry = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toLocaleTimeString('th-TH'),
      message,
      type,
    };
    this.state.combatLog = [entry, ...this.state.combatLog.slice(0, 49)];
    this.notify();
  }

  public toggleAegis(forceState?: boolean): boolean {
    const nextState = forceState !== undefined ? forceState : !this.state.isActive;
    this.state.isActive = nextState;

    if (nextState) {
      tacticalAudio.playAegisAlarm();
      this.addLog('เปิดใช้งานระบบเอจิส (AEGIS COMBAT SYSTEM ONLINE // WEAPONS ARMED)', 'warning');
    } else {
      tacticalAudio.playButtonPress();
      this.addLog('ปิดโหมดระบบเอจิส กลับสู่การตรวจการณ์ปกติ', 'info');
    }

    this.notify();
    return this.state.isActive;
  }

  public setDoctrine(doctrine: AegisDoctrine) {
    this.state.doctrine = doctrine;
    tacticalAudio.playButtonPress();

    if (doctrine === 'auto_defense') {
      this.addLog('ตั้งกฎการยิง: ป้องกันอัตโนมัติ (AUTO-ENGAGE DOCTRINE ACTIVE - <14 NM)', 'warning');
    } else if (doctrine === 'saturation_salvo') {
      this.addLog('ตั้งกฎการยิง: ระดมยิงพร้อมกันทุกลำ (FULL SALVO ENGAGEMENT DOCTRINE)', 'warning');
    } else {
      this.addLog('ตั้งกฎการยิง: สั่งการด้วยตนเอง (MANUAL AUTHORIZATION)', 'info');
    }

    this.notify();
  }

  public reloadWeapons() {
    this.state.vlsSm2Count = this.state.vlsSm2Max;
    this.state.vlsEssmCount = this.state.vlsEssmMax;
    this.state.harpoonCount = this.state.harpoonMax;
    this.state.ciwsRounds = this.state.ciwsRoundsMax;
    tacticalAudio.playButtonPress();
    this.addLog('บรรจุอาวุธปล่อยนำวิถีและกระสุนเต็มพิกัด (VLS RELOAD COMPLETE)', 'info');
    this.notify();
  }

  /**
   * แนะนำอาวุธที่เหมาะสมตามระยะและความเร็วเป้าหมาย (TEWA)
   */
  public recommendWeapon(target: RadarTarget): AegisWeaponType {
    if (target.rangeNM <= 1.8) return 'CIWS';
    if (target.classification === 'missile') {
      if (target.rangeNM <= 10.0 && this.state.vlsEssmCount > 0) return 'ESSM';
      return this.state.vlsSm2Count > 0 ? 'SM-2' : 'ESSM';
    }
    if (target.classification === 'fighter_jet') {
      if (target.rangeNM > 8.0 && this.state.vlsSm2Count > 0) return 'SM-2';
      return this.state.vlsEssmCount > 0 ? 'ESSM' : 'SM-2';
    }
    if (target.classification === 'surface' || target.classification === 'merchant') {
      if (this.state.harpoonCount > 0 && target.rangeNM >= 3.0) return 'HARPOON';
    }
    if (target.rangeNM <= 10.0) {
      return this.state.vlsEssmCount > 0 ? 'ESSM' : 'SM-2';
    }
    return this.state.vlsSm2Count > 0 ? 'SM-2' : 'ESSM';
  }

  /**
   * คำนวณลำดับความสำคัญของภัยคุกคาม (Threat Evaluation and Weapon Assignment)
   */
  public getPrioritizedThreats(targets: RadarTarget[]): { target: RadarTarget; priorityScore: number; recommendedWeapon: AegisWeaponType }[] {
    const hostiles = targets.filter((t) => t.threatLevel === 'hostile' || t.status === 'locked' || t.threatLevel === 'suspect');

    return hostiles
      .map((t) => {
        let score = 0;
        if (t.threatLevel === 'hostile') score += 100;
        if (t.status === 'locked') score += 40;
        if (t.speedKnots > 300) score += 80; // High speed missile or jet
        if (t.speedKnots > 35) score += 30; // Fast craft
        if (t.cpaNM < 1.0 && t.tcpaMin > 0) score += 60;
        if (t.tcpaMin > 0 && t.tcpaMin < 5) score += 40;
        score += Math.max(0, 50 - t.rangeNM); // Closer = higher threat

        return {
          target: t,
          priorityScore: Math.round(score),
          recommendedWeapon: this.recommendWeapon(t),
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }

  /**
   * สั่งยิงขีปนาวุธหรือระบบอาวุธเอจิส
   */
  public launchWeapon(weaponType: AegisWeaponType, target: RadarTarget): boolean {
    if (!this.state.isActive) {
      this.state.isActive = true;
      tacticalAudio.playAegisAlarm();
    }

    // ตรวจสอบคลังอาวุธ
    if (weaponType === 'SM-2') {
      if (this.state.vlsSm2Count <= 0) {
        this.addLog('แจ้งเตือน: กระสุน SM-2 ในเซลล์ VLS หมดสิ้น!', 'warning');
        return false;
      }
      this.state.vlsSm2Count--;
    } else if (weaponType === 'ESSM') {
      if (this.state.vlsEssmCount <= 0) {
        this.addLog('แจ้งเตือน: กระสุน ESSM ใน Quad-pack VLS หมดสิ้น!', 'warning');
        return false;
      }
      this.state.vlsEssmCount--;
    } else if (weaponType === 'HARPOON') {
      if (this.state.harpoonCount <= 0) {
        this.addLog('แจ้งเตือน: จรวด Harpoon ในท่อยิงหมดสิ้น!', 'warning');
        return false;
      }
      this.state.harpoonCount--;
    } else if (weaponType === 'CIWS') {
      if (this.state.ciwsRounds < 75) {
        this.addLog('แจ้งเตือน: กระสุน CIWS 20mm ไม่เพียงพอ!', 'warning');
        return false;
      }
      this.state.ciwsRounds -= 75;
    }

    // ล็อกเป้าหมายอัตโนมัติเมื่อทำการยิง
    simulationEngine.setTargetStatus(target.id, 'locked');

    // คำนวณความเร็วขีปนาวุธ (Mach 2 - Mach 4+)
    let speedKnots = 1800; // ~ Mach 2.7
    if (weaponType === 'SM-2') speedKnots = 2400; // Mach 3.6
    if (weaponType === 'ESSM') speedKnots = 2700; // Mach 4.0
    if (weaponType === 'HARPOON') speedKnots = 520; // High subsonic
    if (weaponType === 'CIWS') speedKnots = 4500; // Superfast 20mm round burst

    // เสียงสั่งยิง
    if (weaponType === 'CIWS') {
      tacticalAudio.playCiwsBurst();
    } else {
      tacticalAudio.playMissileLaunch();
    }

    const missileId = `MSL-${weaponType}-${Date.now().toString().slice(-4)}`;
    const newMissile: AegisMissile = {
      id: missileId,
      weaponType,
      targetId: target.id,
      targetName: target.name,
      xNM: 0, // ยิงจากเรือเรา (ศูนย์กลางพิกัด 0,0)
      yNM: 0,
      startX: 0,
      startY: 0,
      speedKnots,
      headingDeg: target.bearingDeg,
      status: 'in_flight',
      launchedAt: Date.now(),
      trail: [{ x: 0, y: 0 }],
    };

    this.state.activeMissiles.push(newMissile);
    this.addLog(
      `ยิง ${weaponType} สกัดกั้นเป้า ${target.id} (${target.name}) ที่ระยะ ${target.rangeNM} NM!`,
      'launch'
    );

    this.notify();
    return true;
  }

  /**
   * สั่งยิงสกัดกั้นทุกลำที่เป็น Hostile พร้อมกัน (Saturation Salvo Defense)
   */
  public launchSalvoAllHostiles(targets: RadarTarget[]): number {
    const hostiles = targets.filter(
      (t) => t.threatLevel === 'hostile' || (t.threatLevel === 'suspect' && t.cpaNM < 2.0)
    );

    if (hostiles.length === 0) {
      this.addLog('ไม่พบเป้าหมายคุกคามในระยะสำหรับระดมยิง Salvo', 'info');
      return 0;
    }

    let launchedCount = 0;
    hostiles.forEach((tgt, idx) => {
      setTimeout(() => {
        const weapon = this.recommendWeapon(tgt);
        const ok = this.launchWeapon(weapon, tgt);
        if (ok) launchedCount++;
      }, idx * 220); // VLS rapid sequential launch interval
    });

    this.addLog(`คำสั่งระดมยิงฉุกเฉิน (SALVO FIRE) สู่อากาศยาน/เรือคุกคาม ${hostiles.length} เป้าหมาย!`, 'warning');
    return hostiles.length;
  }

  /**
   * อัปเดตการเคลื่อนที่ของขีปนาวุธที่กำลังบินสกัดกั้นในแต่ละเฟรม
   */
  public updateMissilesPhysics(dtSeconds: number, currentTargets: RadarTarget[]) {
    if (this.state.activeMissiles.length === 0 && this.state.explosions.length === 0) {
      // Auto defense check
      if (this.state.isActive && this.state.doctrine !== 'manual') {
        this.checkAutoEngageDoctrine(currentTargets);
      }
      return;
    }

    const now = Date.now();
    const dtHours = dtSeconds / 3600;

    // 1. อัปเดตระเบิดที่กำลังแสดงผล (Explosions shockwave)
    this.state.explosions = this.state.explosions.filter((exp) => {
      return now - exp.startTime < exp.durationMs;
    });

    // 2. อัปเดตวิถีขีปนาวุธ (Missile Flyout & Terminal Guidance)
    const updatedMissiles: AegisMissile[] = [];

    for (const msl of this.state.activeMissiles) {
      // ค้นหาพิกัดเป้าหมายปัจจุบัน (เป้าเคลื่อนที่จริงตามฟิสิกส์)
      const tgt = currentTargets.find((t) => t.id === msl.targetId);

      let targetX = 0;
      let targetY = 0;

      if (tgt) {
        // แปลง Range & Bearing ของเป้าหมายเป็นพิกัดคาร์ทีเซียน NM
        const rad = (tgt.bearingDeg * Math.PI) / 180;
        targetX = tgt.rangeNM * Math.sin(rad);
        targetY = tgt.rangeNM * Math.cos(rad);
      } else {
        // เป้าหมายอาจถูกทำลายหรือหายไปแล้ว
        continue;
      }

      // ทิศทางจากมิสไซล์ไปยังเป้าหมาย (Proportional Navigation Guidance)
      const dx = targetX - msl.xNM;
      const dy = targetY - msl.yNM;
      const distanceToTargetNM = Math.hypot(dx, dy);

      // ตรวจสอบการชนเป้าหมาย (Interception Hit Window: < 0.25 NM หรือ 150 เมตร)
      const hitThresholdNM = msl.weaponType === 'CIWS' ? 0.35 : 0.22;
      const travelDistNM = msl.speedKnots * dtHours;

      if (distanceToTargetNM <= hitThresholdNM || distanceToTargetNM <= travelDistNM) {
        // === เป้าหมายถูกสกัดกั้นและทำลาย (TARGET DESTROYED!) ===
        this.handleMissileHit(msl, tgt, targetX, targetY);
        continue;
      }

      // ขยับพิกัดมิสไซล์ไปข้างหน้าตามเวกเตอร์นำวิถี
      const headingRad = Math.atan2(dx, dy);
      msl.xNM += Math.sin(headingRad) * travelDistNM;
      msl.yNM += Math.cos(headingRad) * travelDistNM;
      msl.headingDeg = (headingRad * 180) / Math.PI;
      if (msl.headingDeg < 0) msl.headingDeg += 360;

      // บันทึก Trail สำหรับหางควันไอพ่น
      const lastPoint = msl.trail[msl.trail.length - 1];
      if (!lastPoint || Math.hypot(msl.xNM - lastPoint.x, msl.yNM - lastPoint.y) > 0.15) {
        msl.trail.push({ x: msl.xNM, y: msl.yNM });
        if (msl.trail.length > 25) {
          msl.trail.shift();
        }
      }

      // ตัดมิสไซล์ที่บินเกิน 30 วินาที (Fuel exhaustion / Self-destruct)
      if (now - msl.launchedAt < 30000) {
        updatedMissiles.push(msl);
      } else {
        this.addLog(`ขีปนาวุธ ${msl.id} เชื้อเพลิงหมด พลาดเป้าหมาย ${msl.targetId}`, 'warning');
      }
    }

    this.state.activeMissiles = updatedMissiles;

    // ตรวจสอบโหมดอัตโนมัติ (Auto-Engage Doctrine)
    if (this.state.isActive && this.state.doctrine !== 'manual') {
      this.checkAutoEngageDoctrine(currentTargets);
    }

    this.notify();
  }

  /**
   * จัดการผลการสกัดกั้นโดนเป้าหมาย (Hit & Neutralize)
   */
  private handleMissileHit(msl: AegisMissile, tgt: RadarTarget, xNM: number, yNM: number) {
    tacticalAudio.playTargetDestroyed();

    // สร้างเอฟเฟกต์การระเบิดบนเรดาร์
    const expId = `EXP-${Date.now()}`;
    const explosionRadius = msl.weaponType === 'SM-2' ? 1.4 : msl.weaponType === 'ESSM' ? 1.0 : 0.6;
    const explosionColor = msl.weaponType === 'SM-2' ? '#f43f5e' : msl.weaponType === 'ESSM' ? '#fb923c' : '#38bdf8';

    this.state.explosions.push({
      id: expId,
      xNM,
      yNM,
      startTime: Date.now(),
      durationMs: 1400,
      radiusNM: explosionRadius,
      color: explosionColor,
    });

    // ทำลายเป้าหมายใน Engine จำลอง
    simulationEngine.destroyTarget(tgt.id);
    this.state.killCount++;

    this.addLog(
      `💥 สกัดกั้นสำเร็จ! ${msl.weaponType} ทำลาย ${tgt.classification === 'missile' ? 'ขีปนาวุธ' : tgt.classification === 'fighter_jet' ? 'เครื่องบินรบ' : 'เป้าหมาย'} ${tgt.id} (${tgt.name}) สัญญาณหายไปจากจอเรดาร์แล้ว!`,
      'kill'
    );
  }

  /**
   * ระบบป้องกันอัตโนมัติตามกฎการรบ (Auto-Engagement Doctrine)
   */
  private checkAutoEngageDoctrine(targets: RadarTarget[]) {
    const now = Date.now();
    if (now - this.lastAutoCheckTime < 1200) return; // Rate-limit auto launches
    this.lastAutoCheckTime = now;

    // ค้นหาเป้าหมาย Hostile ที่อยู่ในระยะ Kill Zone และยังไม่มีมิสไซล์ล็อกเป้า
    const targetedIds = new Set(this.state.activeMissiles.map((m) => m.targetId));

    const imminentThreats = targets.filter((t) => {
      if (targetedIds.has(t.id)) return false;
      if (t.status === 'destroyed') return false;
      if (t.threatLevel === 'hostile' && t.rangeNM <= this.state.autoEngagementRangeNM) return true;
      if (t.threatLevel === 'suspect' && t.cpaNM < 1.2 && t.tcpaMin > 0 && t.tcpaMin < 10) return true;
      return false;
    });

    if (imminentThreats.length > 0) {
      const topThreat = imminentThreats[0];
      const weapon = this.recommendWeapon(topThreat);
      this.addLog(`[AUTO-DEFENSE] ระบบเอจิสตรวจพบภัยคุกคาม ${topThreat.id} ข้ามเส้นสังหาร สั่งยิงสกัดกั้นอัตโนมัติ!`, 'warning');
      this.launchWeapon(weapon, topThreat);
    }
  }
}

export const aegisEngine = new AegisCombatEngine();

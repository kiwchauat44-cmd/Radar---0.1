/**
 * Hardware Radar Interface & WebSocket Data Pipeline
 * สถาปัตยกรรมเชื่อมต่อเรดาร์ฮาร์ดแวร์จริงผ่าน WebSocket / NMEA / Network Protocol
 * 
 * Data Pipeline:
 * [Sensor / Hardware Radar]
 *         ↓
 *    [Radar Input]
 *         ↓
 * [Signal Processing]
 *         ↓
 *  [Target Detection]
 *         ↓
 *  [Target Tracking]
 *         ↓
 *  [Radar Display]
 *         ↓
 *       [UI]
 */

import {
  HardwareRadarStatus,
  HardwareTransport,
  RadarInput,
  RadarStatus,
  RadarTarget,
  RadarTrack,
} from '../types/radar';

export type TargetStreamCallback = (targets: RadarTarget[]) => void;
export type StatusStreamCallback = (status: HardwareRadarStatus) => void;

export class HardwareRadarManager {
  private ws: WebSocket | null = null;
  private targetStreamCallbacks: Set<TargetStreamCallback> = new Set();
  private statusCallbacks: Set<StatusStreamCallback> = new Set();
  private mockHeartbeatTimer: number | null = null;
  private sequenceCounter = 0;

  private hardwareStatus: HardwareRadarStatus = {
    connectionState: 'disconnected',
    transport: 'none',
    ipAddress: '192.168.1.50',
    port: 8080,
    latencyMs: 0,
    packetsReceived: 0,
    bytesReceived: 0,
    lastPacketTime: null,
    errorMessage: undefined,
  };

  private radarSystemStatus: RadarStatus = {
    isHardwareConnected: false,
    isSimulationActive: true,
    systemHealth: 'normal',
    transmitterStatus: 'radiating',
    antennaRotationRpm: 24,
    frequencyBand: 'X-Band (9.4 GHz)',
    magnetronCurrentPct: 98,
  };

  public getStatus(): HardwareRadarStatus {
    return { ...this.hardwareStatus };
  }

  public getSystemStatus(): RadarStatus {
    return { ...this.radarSystemStatus };
  }

  public subscribeTargets(cb: TargetStreamCallback): () => void {
    this.targetStreamCallbacks.add(cb);
    return () => this.targetStreamCallbacks.delete(cb);
  }

  public subscribeStatus(cb: StatusStreamCallback): () => void {
    this.statusCallbacks.add(cb);
    cb({ ...this.hardwareStatus });
    return () => this.statusCallbacks.delete(cb);
  }

  private notifyStatus() {
    this.statusCallbacks.forEach((cb) => cb({ ...this.hardwareStatus }));
  }

  /**
   * เชื่อมต่อ WebSocket ไปยัง Hardware Radar Gateway จริง
   * เช่น ws://192.168.1.50:8080/radar หรือ WebSocket Server บนเครือข่ายเรือ
   */
  public connectWebSocket(url?: string): Promise<boolean> {
    return new Promise((resolve) => {
      const endpoint = url || `ws://${this.hardwareStatus.ipAddress}:${this.hardwareStatus.port}/radar`;
      this.disconnect();

      this.hardwareStatus.connectionState = 'connecting';
      this.hardwareStatus.transport = 'websocket';
      this.notifyStatus();

      try {
        const ws = new WebSocket(endpoint);
        const startTime = Date.now();

        ws.onopen = () => {
          this.ws = ws;
          this.hardwareStatus.connectionState = 'connected';
          this.hardwareStatus.latencyMs = Date.now() - startTime;
          this.radarSystemStatus.isHardwareConnected = true;
          this.radarSystemStatus.isSimulationActive = false;
          this.notifyStatus();
          resolve(true);
        };

        ws.onmessage = (event) => {
          this.handleIncomingRawPayload(event.data);
        };

        ws.onerror = () => {
          this.hardwareStatus.connectionState = 'error';
          this.hardwareStatus.errorMessage = `ไม่สามารถเชื่อมต่อ WebSocket: ${endpoint}`;
          this.radarSystemStatus.isHardwareConnected = false;
          this.radarSystemStatus.isSimulationActive = true;
          this.notifyStatus();
          resolve(false);
        };

        ws.onclose = () => {
          this.hardwareStatus.connectionState = 'disconnected';
          this.radarSystemStatus.isHardwareConnected = false;
          this.radarSystemStatus.isSimulationActive = true;
          this.notifyStatus();
        };

        // Safety timeout if WS takes too long
        setTimeout(() => {
          if (this.hardwareStatus.connectionState === 'connecting') {
            ws.close();
            this.hardwareStatus.connectionState = 'error';
            this.hardwareStatus.errorMessage = 'หมดเวลาเชื่อมต่อ (Connection Timeout)';
            this.radarSystemStatus.isHardwareConnected = false;
            this.radarSystemStatus.isSimulationActive = true;
            this.notifyStatus();
            resolve(false);
          }
        }, 5000);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        this.hardwareStatus.connectionState = 'error';
        this.hardwareStatus.errorMessage = message;
        this.radarSystemStatus.isHardwareConnected = false;
        this.radarSystemStatus.isSimulationActive = true;
        this.notifyStatus();
        resolve(false);
      }
    });
  }

  /**
   * สลับโหมดการทดสอบจำลองเสมือนฮาร์ดแวร์จริง (Mock Hardware Stream)
   * ใช้สำหรับการทดสอบการรับส่งข้อมูลผ่านฮาร์ดแวร์จริงโดยไม่ต้องมีเครื่องเรดาร์สด
   */
  public simulateHardwareConnection(enable: boolean) {
    if (this.mockHeartbeatTimer) {
      clearInterval(this.mockHeartbeatTimer);
      this.mockHeartbeatTimer = null;
    }

    if (enable) {
      this.hardwareStatus.connectionState = 'connected';
      this.hardwareStatus.transport = 'network_udp';
      this.hardwareStatus.latencyMs = 12;
      this.radarSystemStatus.isHardwareConnected = true;
      this.radarSystemStatus.isSimulationActive = false;
      this.notifyStatus();

      // ส่งแพ็กเกจจำลองของฮาร์ดแวร์เรดาร์ทุกๆ 1 วินาที
      this.mockHeartbeatTimer = window.setInterval(() => {
        const mockPacket: RadarInput = {
          sourceType: 'network_udp',
          rawPayload: JSON.stringify({
            nmea: `$RATTM,01,3.4,045.2,T,18.0,090.0,T,1.2,14.5,N,MV ALPHA,L,T*5A`,
            timestamp: Date.now(),
          }),
          packetSequence: ++this.sequenceCounter,
          receivedAt: Date.now(),
          signalQualityPercent: 96,
        };
        this.processRadarInput(mockPacket);
      }, 1000);
    } else {
      this.hardwareStatus.connectionState = 'disconnected';
      this.hardwareStatus.transport = 'none';
      this.radarSystemStatus.isHardwareConnected = false;
      this.radarSystemStatus.isSimulationActive = true;
      this.notifyStatus();
    }
  }

  public disconnect() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Ignore
      }
      this.ws = null;
    }
    if (this.mockHeartbeatTimer) {
      clearInterval(this.mockHeartbeatTimer);
      this.mockHeartbeatTimer = null;
    }
    this.hardwareStatus.connectionState = 'disconnected';
    this.radarSystemStatus.isHardwareConnected = false;
    this.radarSystemStatus.isSimulationActive = true;
    this.notifyStatus();
  }

  public updateConnectionConfig(ip: string, port: number, transport: HardwareTransport) {
    this.hardwareStatus.ipAddress = ip;
    this.hardwareStatus.port = port;
    this.hardwareStatus.transport = transport;
    this.notifyStatus();
  }

  /**
   * Pipeline Step 1 & 2: Process Raw Payload to RadarInput
   */
  private handleIncomingRawPayload(data: string | ArrayBuffer) {
    this.hardwareStatus.packetsReceived++;
    this.hardwareStatus.bytesReceived += typeof data === 'string' ? data.length : data.byteLength;
    this.hardwareStatus.lastPacketTime = Date.now();

    const input: RadarInput = {
      sourceType: this.hardwareStatus.transport,
      rawPayload: data,
      packetSequence: ++this.sequenceCounter,
      receivedAt: Date.now(),
      signalQualityPercent: 98,
    };

    this.processRadarInput(input);
  }

  /**
   * Pipeline Step 3 & 4: Signal Processing & Target Detection
   */
  private processRadarInput(input: RadarInput) {
    try {
      if (typeof input.rawPayload === 'string') {
        // Parse JSON or NMEA
        if (input.rawPayload.trim().startsWith('{')) {
          const parsed = JSON.parse(input.rawPayload);
          if (Array.isArray(parsed.targets)) {
            const detectedTargets: RadarTarget[] = parsed.targets.map((t: Partial<RadarTarget>, idx: number) => ({
              id: t.id || `EXT-${idx + 1}`,
              name: t.name || `External Contact ${idx + 1}`,
              classification: t.classification || 'surface',
              threatLevel: t.threatLevel || 'neutral',
              rangeNM: t.rangeNM || 5.0,
              bearingDeg: t.bearingDeg || 0,
              courseDeg: t.courseDeg || 0,
              speedKnots: t.speedKnots || 15,
              cpaNM: t.cpaNM || 2.5,
              tcpaMin: t.tcpaMin || 12.0,
              status: t.status || 'tracking',
              trailHistory: [],
              showTrail: true,
              echoStrength: 0.9,
              isRealHardwareTarget: true,
              latitude: t.latitude || 12.65,
              longitude: t.longitude || 100.90,
              lastUpdated: Date.now(),
            }));
            this.notifyTargets(detectedTargets);
          }
        } else if (input.rawPayload.includes('$RATTM')) {
          // Parse NMEA TTM (Tracked Target Message)
          // $RATTM,01,distance,bearing,T/R,speed,course,T/R,CPA,TCPA,units,name,status,reference*hh
          const tokens = input.rawPayload.split(',');
          if (tokens.length >= 13) {
            const tgtNum = tokens[1] || '01';
            const range = parseFloat(tokens[2]) || 3.5;
            const bearing = parseFloat(tokens[3]) || 45.0;
            const speed = parseFloat(tokens[5]) || 18.0;
            const course = parseFloat(tokens[6]) || 90.0;
            const cpa = parseFloat(tokens[8]) || 1.2;
            const tcpa = parseFloat(tokens[9]) || 14.5;
            const name = tokens[11] || `TGT-${tgtNum}`;

            const realTgt: RadarTarget = {
              id: `TGT-${tgtNum}`,
              name: name,
              classification: 'surface',
              threatLevel: cpa < 1.0 ? 'suspect' : 'neutral',
              rangeNM: range,
              bearingDeg: bearing,
              courseDeg: course,
              speedKnots: speed,
              cpaNM: cpa,
              tcpaMin: tcpa,
              status: 'tracking',
              trailHistory: [],
              showTrail: true,
              echoStrength: 0.95,
              isRealHardwareTarget: true,
              latitude: 12.65 + (range * Math.cos(bearing * Math.PI / 180)) / 60,
              longitude: 100.90 + (range * Math.sin(bearing * Math.PI / 180)) / 60,
              lastUpdated: Date.now(),
            };
            this.notifyTargets([realTgt]);
          }
        }
      }
    } catch (e) {
      console.warn('Error processing radar input:', e);
    }
  }

  private notifyTargets(targets: RadarTarget[]) {
    this.targetStreamCallbacks.forEach((cb) => cb(targets));
  }
}

export const hardwareRadarManager = new HardwareRadarManager();

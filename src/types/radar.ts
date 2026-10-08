/**
 * Naval Warship Radar Types & Interfaces
 * ระบบเรดาร์เรือรบจำลอง - สถาปัตยกรรมข้อมูล
 */

export type RadarRangeNM = 0.5 | 1 | 2 | 5 | 10 | 20 | 40 | 80;
export type RadarOrientation = 'north_up' | 'head_up' | 'course_up';
export type RadarMotion = 'relative' | 'true';
export type ClutterLevel = 'off' | 'low' | 'med' | 'high';
export type TrailDurationSeconds = 0 | 10 | 30 | 60 | 300;
export type RadarColorScheme = 'tactical_green' | 'naval_cyan' | 'amber_crt';

export type TargetClassification = 
  | 'surface'       // เรือผิวน้ำทั่วไป
  | 'high_speed'    // เรือเร็วลาดตระเวน/เรือเร็วคุกคาม
  | 'merchant'      // เรือสินค้า/เรือบรรทุกตู้คอนเทนเนอร์
  | 'aircraft'      // อากาศยานลาดตระเวนทางทะเล/เฮลิคอปเตอร์
  | 'escort'        // เรือรบคุ้มกันฝ่ายเดียวกัน
  | 'unknown';      // วัตถุไม่ทราบฝ่าย/เรือประมง

export type ThreatLevel = 'friendly' | 'neutral' | 'suspect' | 'hostile';
export type TargetStatus = 'detected' | 'tracking' | 'locked';

export interface TrailPoint {
  x: number; // Nautical miles relative to own ship
  y: number;
  timestamp: number;
}

export interface RadarTarget {
  id: string;              // e.g. "TGT-01"
  name: string;            // e.g. "MV Ocean Pioneer"
  classification: TargetClassification;
  threatLevel: ThreatLevel;
  rangeNM: number;         // Nautical Miles
  bearingDeg: number;      // 0-359 degrees True
  courseDeg: number;       // Course Over Ground (COG)
  speedKnots: number;      // Speed Over Ground (SOG)
  cpaNM: number;           // Closest Point of Approach in NM
  tcpaMin: number;         // Time to CPA in minutes (negative = diverging)
  status: TargetStatus;
  trailHistory: TrailPoint[];
  showTrail: boolean;
  echoStrength: number;    // 0.2 to 1.0 (RCS - Radar Cross Section)
  isRealHardwareTarget: boolean;
  latitude: number;
  longitude: number;
  lastUpdated: number;
}

export interface OwnShip {
  name: string;
  hdgDeg: number;       // Heading True (ทิศทางหัวเรือ)
  cogDeg: number;       // Course Over Ground (ทิศทางการเคลื่อนที่จริง)
  sogKnots: number;     // Speed Over Ground (ความเร็วเรือเรา)
  latitude: number;
  longitude: number;
  altitudeMeters: number;
}

export interface RadarSettings {
  rangeNM: RadarRangeNM;
  orientation: RadarOrientation;
  motionMode: RadarMotion;
  gain: number;             // 0 - 100%
  seaClutter: ClutterLevel;
  rainClutter: ClutterLevel;
  trailDuration: TrailDurationSeconds;
  showRangeRings: boolean;
  showBearingLines: boolean;
  showHeadingMarker: boolean;
  showSpeedVectors: boolean;
  sweepRpm: number;          // 12, 24, 36, 48 RPM
  colorScheme: RadarColorScheme;
  isPaused: boolean;
  isPoweredOn: boolean;
  soundEnabled: boolean;
  eblActive: boolean;        // Electronic Bearing Line
  eblAngleDeg: number;
  vrmActive: boolean;        // Variable Range Marker
  vrmDistanceNM: number;
}

// ==========================================
// HARDWARE RADAR INTERFACE ARCHITECTURE
// (สถาปัตยกรรมอินเทอร์เฟซฮาร์ดแวร์เรดาร์)
// ==========================================

export type HardwareConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
export type HardwareTransport = 'none' | 'websocket' | 'bluetooth' | 'serial' | 'network_udp';

export interface RadarInput {
  sourceType: HardwareTransport;
  rawPayload: string | ArrayBuffer;
  packetSequence: number;
  receivedAt: number;
  signalQualityPercent: number;
}

export interface RadarTrack {
  trackId: string;
  targetId: string;
  filterWeight: number; // Kalman filter variance / confidence
  predictedX: number;
  predictedY: number;
  predictedHeading: number;
  predictedVelocity: number;
  lossOfSignalCount: number;
  isLocked: boolean;
}

export interface RadarStatus {
  isHardwareConnected: boolean;
  isSimulationActive: boolean;
  systemHealth: 'normal' | 'degraded' | 'fault';
  transmitterStatus: 'radiating' | 'standby' | 'off';
  antennaRotationRpm: number;
  frequencyBand: 'X-Band (9.4 GHz)' | 'S-Band (3.0 GHz)';
  magnetronCurrentPct: number;
}

export interface HardwareRadarStatus {
  connectionState: HardwareConnectionState;
  transport: HardwareTransport;
  ipAddress: string;
  port: number;
  latencyMs: number;
  packetsReceived: number;
  bytesReceived: number;
  lastPacketTime: number | null;
  errorMessage?: string;
}

export interface GPSStatus {
  isAvailable: boolean;
  source: 'real_gps' | 'simulation';
  accuracyMeters: number | null;
  latitude: number;
  longitude: number;
  speedKnots: number;
  headingDeg: number;
  altitudeMeters: number;
  errorMessage: string | null;
}

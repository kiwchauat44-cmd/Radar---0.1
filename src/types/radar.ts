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
  | 'fighter_jet'   // เครื่องบินรบ / บ.ขับไล่โจมตี (Fighter Jet)
  | 'missile'       // ขีปนาวุธต่อต้านเรือผิวน้ำ / ขีปนาวุธร่อน (Anti-Ship Missile)
  | 'escort'        // เรือรบคุ้มกันฝ่ายเดียวกัน
  | 'submarine'     // เรือดำน้ำ (Submarine)
  | 'unknown';      // วัตถุไม่ทราบฝ่าย/เรือประมง

export type ThreatLevel = 'friendly' | 'neutral' | 'suspect' | 'hostile';
export type TargetStatus = 'detected' | 'tracking' | 'locked' | 'intercepted' | 'destroyed';

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
  altitudeFt?: number;     // ความสูง (ฟุต) e.g. 35 ft (sea-skimmer), 24,000 ft (jet)
  machSpeed?: number;      // ความเร็วเทียบเท่ามัค e.g. Mach 0.85, Mach 2.2
  rcsM2?: number;          // พื้นที่สะท้อนเรดาร์ Radar Cross Section (m²)
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
  crtFlickerEnabled: boolean; // CRT scanline flicker animation effect
}

// ==========================================
// AEGIS COMBAT SYSTEM ARCHITECTURE
// (สถาปัตยกรรมระบบโจมตีและป้องกันภัยทางอากาศเอจิส)
// ==========================================

export type AegisWeaponType = 'SM-2' | 'ESSM' | 'HARPOON' | 'CIWS';
export type AegisDoctrine = 'manual' | 'auto_defense' | 'saturation_salvo';

export interface AegisMissile {
  id: string;
  weaponType: AegisWeaponType;
  targetId: string;
  targetName: string;
  xNM: number;
  yNM: number;
  startX: number;
  startY: number;
  speedKnots: number;
  headingDeg: number;
  status: 'in_flight' | 'terminal' | 'hit' | 'miss';
  launchedAt: number;
  trail: { x: number; y: number }[];
}

export interface AegisExplosion {
  id: string;
  xNM: number;
  yNM: number;
  startTime: number;
  durationMs: number;
  radiusNM: number;
  color: string;
}

export interface AegisCombatLogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'launch' | 'kill' | 'warning';
}

export interface AegisSystemState {
  isActive: boolean;
  doctrine: AegisDoctrine;
  vlsSm2Count: number;
  vlsSm2Max: number;
  vlsEssmCount: number;
  vlsEssmMax: number;
  harpoonCount: number;
  harpoonMax: number;
  ciwsRounds: number;
  ciwsRoundsMax: number;
  activeMissiles: AegisMissile[];
  explosions: AegisExplosion[];
  autoEngagementRangeNM: number;
  killCount: number;
  combatLog: AegisCombatLogEntry[];
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

// ==========================================
// ASW WATERFALL SONAR ARCHITECTURE
// (สถาปัตยกรรมระบบโซนาร์ตรวจจับภัยคุกคามใต้น้ำแบบน้ำตก)
// ==========================================

export type SonarMode = 'passive_lofar' | 'active_ping' | 'bdi_waterfall';
export type SonarColorMap = 'emerald_phosphor' | 'ocean_deep_blue' | 'thermal_gold';
export type SonarContactClassification = 'submarine' | 'torpedo' | 'biologic' | 'surface_vessel' | 'wreck';

export interface SonarContact {
  id: string;                    // e.g. "SONAR-01"
  name: string;                  // e.g. "Kilo-class SSK (เรือดำน้ำดีเซล-ไฟฟ้า)"
  classification: SonarContactClassification;
  threatLevel: ThreatLevel;
  bearingDeg: number;            // 000 - 359°
  rangeYards: number;            // ระยะ (หลา) e.g. 4,800 yds
  depthMeters: number;           // ความลึก (เมตร) e.g. 145 m
  speedKnots: number;            // ความเร็ว (น็อต) e.g. 5.2 kt
  frequenciesHz: number[];       // ความถี่เด่น (Propeller shaft / Machinery harmonics)
  signalStrengthDb: number;      // 0 - 45 dB
  audioToneHz: number;           // ความถี่เสียงไฮโดรโฟน
  status: 'detected' | 'tracking' | 'classified' | 'neutralized';
}

export interface SonarState {
  isActive: boolean;
  isPanelOpen: boolean;
  mode: SonarMode;
  colorMap: SonarColorMap;
  gain: number;                  // 0 - 100
  rangeYds: number;              // 2000, 5000, 10000, 20000
  bearingCursorDeg: number;      // 0 - 359°
  isPinging: boolean;
  torpedoAlert: boolean;
  decoysCount: number;           // Nixie acoustic decoy count
  aswTorpedosCount: number;      // Mk-46/54 ASW torpedos
  contacts: SonarContact[];
  selectedContactId: string | null;
}

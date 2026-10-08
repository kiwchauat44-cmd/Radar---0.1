/**
 * GPS & Compass Sensor Manager
 * จัดการพิกัดตำแหน่งจริงและระบบเซนเซอร์ของอุปกรณ์ Android
 * เน้นย้ำความซื่อตรง: หากไม่มี GPS จริงจะระบุว่าเป็นโหมดจำลองอย่างชัดเจน
 */

import { GPSStatus } from '../types/radar';

export type GPSUpdateCallback = (status: GPSStatus) => void;
export type CompassUpdateCallback = (headingDeg: number) => void;

class GPSManager {
  private watchId: number | null = null;
  private status: GPSStatus = {
    isAvailable: false,
    source: 'simulation',
    accuracyMeters: null,
    // จุดจำลองเริ่มต้น: ฐานทัพเรือสัตหีบ อ่าวไทย (Sattahip Naval Base, Gulf of Thailand)
    latitude: 12.6582,
    longitude: 100.9023,
    speedKnots: 18.5,
    headingDeg: 42.0,
    altitudeMeters: 14.0,
    errorMessage: null,
  };

  private callbacks: Set<GPSUpdateCallback> = new Set();
  private compassCallbacks: Set<CompassUpdateCallback> = new Set();
  private isListeningOrientation = false;

  constructor() {
    this.initSensors();
  }

  public subscribe(cb: GPSUpdateCallback): () => void {
    this.callbacks.add(cb);
    cb({ ...this.status });
    return () => this.callbacks.delete(cb);
  }

  public subscribeCompass(cb: CompassUpdateCallback): () => void {
    this.compassCallbacks.add(cb);
    return () => this.compassCallbacks.delete(cb);
  }

  private notify() {
    this.callbacks.forEach(cb => cb({ ...this.status }));
  }

  public getStatus(): GPSStatus {
    return { ...this.status };
  }

  public async requestRealGPS(): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      this.status.isAvailable = false;
      this.status.source = 'simulation';
      this.status.errorMessage = 'อุปกรณ์นี้ไม่รองรับระบบ Geolocation';
      this.notify();
      return false;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.handleGeoSuccess(pos);
          this.startWatch();
          resolve(true);
        },
        (err) => {
          this.status.isAvailable = false;
          this.status.source = 'simulation';
          this.status.errorMessage = `ไม่สามารถเข้าถึง GPS: ${err.message}`;
          this.notify();
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  private startWatch() {
    if (this.watchId !== null || !navigator.geolocation) return;

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handleGeoSuccess(pos),
      (err) => {
        this.status.isAvailable = false;
        this.status.source = 'simulation';
        this.status.errorMessage = `GPS ขัดข้อง: ${err.message}`;
        this.notify();
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 }
    );
  }

  private handleGeoSuccess(pos: GeolocationPosition) {
    const coords = pos.coords;
    const speedKnots = coords.speed !== null ? Number((coords.speed * 1.94384).toFixed(1)) : 18.5;
    const headingDeg = coords.heading !== null && !isNaN(coords.heading) ? coords.heading : this.status.headingDeg;

    this.status = {
      isAvailable: true,
      source: 'real_gps',
      accuracyMeters: coords.accuracy ? Math.round(coords.accuracy) : null,
      latitude: coords.latitude,
      longitude: coords.longitude,
      speedKnots: speedKnots,
      headingDeg: headingDeg,
      altitudeMeters: coords.altitude ? Math.round(coords.altitude) : 12,
      errorMessage: null,
    };
    this.notify();
  }

  private initSensors() {
    if (typeof window === 'undefined') return;

    // ลองเชื่อมต่อเซนเซอร์เข็มทิศจริงของ Android / มือถือ
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let heading: number | null = null;
      if ('webkitCompassHeading' in e && typeof (e as unknown as { webkitCompassHeading: number }).webkitCompassHeading === 'number') {
        heading = (e as unknown as { webkitCompassHeading: number }).webkitCompassHeading;
      } else if (e.alpha !== null) {
        // Absolute alpha on Android
        heading = 360 - e.alpha;
      }

      if (heading !== null && !isNaN(heading)) {
        const normalized = (heading % 360 + 360) % 360;
        this.compassCallbacks.forEach(cb => cb(normalized));
      }
    };

    const win = window as unknown as Window;
    if ('ondeviceorientationabsolute' in window) {
      win.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
      this.isListeningOrientation = true;
    } else if ('ondeviceorientation' in window) {
      win.addEventListener('deviceorientation', handleOrientation as EventListener, true);
      this.isListeningOrientation = true;
    }
  }

  public stop() {
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}

export const gpsManager = new GPSManager();

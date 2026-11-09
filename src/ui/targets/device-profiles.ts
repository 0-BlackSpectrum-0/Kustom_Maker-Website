// src/ui/targets/device-profiles.ts
import profilesData from './device-profiles.json';

export interface DeviceProfile {
  id: string;
  name: string;
  width: number;
  height: number;
  density: number;
  statusBarHeight: number;
  navBarHeight: number;
  cornerRadius: number;
  homeGrid: { cols: number; rows: number };
}

export const DEVICE_PROFILES: DeviceProfile[] = profilesData as DeviceProfile[];

export function getDeviceProfile(id: string): DeviceProfile | undefined {
  return DEVICE_PROFILES.find((p) => p.id === id);
}

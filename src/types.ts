export interface Point {
  x: number;
  y: number;
}

export interface Sector {
  id: string;
  points: Point[];
  label: string;
}

export interface Flight {
  id: string;
  callsign: string;
  type: string;
  level: number;
  speed: number;
  trajectories: {
    original: Point[];
    preActivation: Point[];
    actual: Point[];
  };
}

export interface ProhibitedZone {
  id: string;
  points: Point[];
  label: string;
  active: boolean;
}

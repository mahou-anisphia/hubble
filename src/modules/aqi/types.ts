export interface GeoPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Pollution {
  ts: string;
  aqius: number;
  mainus: string;
  aqicn: number;
  maincn: string;
}

export interface Weather {
  ts: string;
  ic: string;
  hu: number;
  pr: number;
  tp: number;
  wd: number;
  ws: number;
  heatIndex: number;
}

export interface Current {
  pollution: Pollution;
  weather: Weather;
}

export interface AirQualityData {
  city: string;
  state: string;
  country: string;
  location: GeoPoint;
  current: Current;
}

export interface AirQualityResponse {
  status: string;
  data: AirQualityData;
}

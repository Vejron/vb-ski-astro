export interface Pm3Point {
  parameters: {
    0: { name: 'msl', levelType: 'hmsl', level: 0, unit: 'hPa', values: number[] }
    1: { name: 't', levelType: 'hl', level: 2, unit: 'Cel', values: number[] }
    2: { name: 'vis', levelType: 'hl', level: 2, unit: 'km', values: number[] }
    3: { name: 'wd', levelType: 'hl', level: 10, unit: 'degree', values: number[] }
    4: { name: 'ws', levelType: 'hl', level: 10, unit: 'm/s', values: number[] }
    5: { name: 'r', levelType: 'hl', level: 2, unit: 'percent', values: number[] }
    6: { name: 'tstm', levelType: 'hl', level: 0, unit: 'percent', values: number[] }
    7: { name: 'tcc_mean', levelType: 'hl', level: 0, unit: 'octas', values: number[] }
    8: { name: 'lcc_mean', levelType: 'hl', level: 0, unit: 'octas', values: number[] }
    9: { name: 'mcc_mean', levelType: 'hl', level: 0, unit: 'octas', values: number[] }
    10: { name: 'hcc_mean', levelType: 'hl', level: 0, unit: 'octas', values: number[] }
    11: { name: 'gust', levelType: 'hl', level: 10, unit: 'm/s', values: number[] }
    12: { name: 'pmin', levelType: 'hl', level: 0, unit: 'kg/m2/h', values: number[] }
    13: { name: 'pmax', levelType: 'hl', level: 0, unit: 'kg/m2/h', values: number[] }
    14: { name: 'spp', levelType: 'hl', level: 0, unit: 'percent', values: number[] }
    15: { name: 'pcat', levelType: 'hl', level: 0, unit: 'category', values: number[] }
    16: { name: 'pmean', levelType: 'hl', level: 0, unit: 'kg/m2/h', values: number[] }
    17: { name: 'pmedian', levelType: 'hl', level: 0, unit: 'kg/m2/h', values: number[] }
    18: { name: 'Wsymb2', levelType: 'hl', level: 0, unit: 'category', values: number[] }
  }
  validTime: string;
}
export interface Pm3Response {
  approvedTime: string;
  geometry: {
    type: string;
    coordinates: number[];
  };
  referenceTime: string;
  timeSeries: Pm3Point[];
}

export async function getForecast(location: number[]) {
  return await fetch(
    `https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/${location[1]}/lat/${location[0]}/data.json`
  )
}
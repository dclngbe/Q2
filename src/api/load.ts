import { proxyAxios } from './proxy';

export interface LoadData {
  timestamp: string;
  value: number;
}

interface LoadPoint {
  hourEnding: number;
  loadLevel: number;
}

interface LoadCurve {
  loads: LoadPoint[];
}

interface LoadCurves {
  [key: string]: LoadCurve;
}

interface LoadResponse {
  loadCurves?: LoadCurves;
  loads?: Array<{
    name: string;
    oprHour: number;
    oprMinute: number;
    loadValue: number;
  }>;
}

function convertToTimestamp(hour: number, minute: number): string {
  const adjustedHour = (hour + 23) % 24;
  return `${String(adjustedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function formatRegionForApi(region: string): string {
  switch (region) {
    case 'RTO':
      return 'PJM RTO Total';
    case 'Mid-Atlantic':
      return 'Mid-Atlantic Region';
    case 'Western':
      return 'Western Region';
    case 'Southern':
      return 'Southern Region';
    default:
      return region;
  }
}

export async function fetchTeslaData(date: string, region: string): Promise<LoadData[]> {
  try {
    const response = await proxyAxios.get<LoadResponse>(
      `http://panda.gbefund.org:8080/Mimir/rest/load/pjm/tesla/tesla/current/${date}`
    );

    if (!response.data?.loadCurves) {
      return [];
    }

    const regionKey = formatRegionForApi(region);
    const regionData = response.data.loadCurves[regionKey];

    if (!regionData?.loads) {
      return [];
    }

    return regionData.loads
      .map(point => {
        const adjustedHourEnding = ((point.hourEnding + 2) % 24) || 24;
        return {
          timestamp: convertToTimestamp(adjustedHourEnding - 1, 30),
          value: point.loadLevel
        };
      })
      .sort((a, b) => {
        const [aHour, aMinute] = a.timestamp.split(':').map(Number);
        const [bHour, bMinute] = b.timestamp.split(':').map(Number);
        return (aHour * 60 + aMinute) - (bHour * 60 + bMinute);
      });
  } catch (error) {
    console.error('Error fetching Tesla data:', error);
    return [];
  }
}

export async function fetchMeteologicaData(date: string, region: string): Promise<LoadData[]> {
  try {
    const response = await proxyAxios.get<LoadResponse>(
      `http://panda.gbefund.org:8080/Mimir/rest/load/pjm/meteologica/${date}`
    );

    if (!response.data?.loadCurves) {
      return [];
    }

    const regionKey = formatRegionForApi(region);
    const regionData = response.data.loadCurves[regionKey];

    if (!regionData?.loads) {
      return [];
    }

    return regionData.loads
      .map(point => {
        const adjustedHourEnding = ((point.hourEnding + 2) % 24) || 24;
        return {
          timestamp: convertToTimestamp(adjustedHourEnding - 1, 30),
          value: point.loadLevel
        };
      })
      .sort((a, b) => {
        const [aHour, aMinute] = a.timestamp.split(':').map(Number);
        const [bHour, bMinute] = b.timestamp.split(':').map(Number);
        return (aHour * 60 + aMinute) - (bHour * 60 + bMinute);
      });
  } catch (error) {
    console.error('Error fetching Meteologica data:', error);
    return [];
  }
}

export async function fetchGbeData(date: string, region: string): Promise<LoadData[]> {
  try {
    const response = await proxyAxios.get<LoadResponse>(
      `http://panda.gbefund.org:8080/Mimir/rest/load/pjm/gbe/${date}`
    );

    if (!response.data?.loadCurves) {
      return [];
    }

    const regionKey = formatRegionForApi(region);
    const regionData = response.data.loadCurves[regionKey];

    if (!regionData?.loads) {
      return [];
    }

    return regionData.loads
      .map(point => {
        const adjustedHourEnding = ((point.hourEnding + 2) % 24) || 24;
        return {
          timestamp: convertToTimestamp(adjustedHourEnding - 1, 30),
          value: point.loadLevel
        };
      })
      .sort((a, b) => {
        const [aHour, aMinute] = a.timestamp.split(':').map(Number);
        const [bHour, bMinute] = b.timestamp.split(':').map(Number);
        return (aHour * 60 + aMinute) - (bHour * 60 + bMinute);
      });
  } catch (error) {
    console.error('Error fetching GBE data:', error);
    return [];
  }
}

export async function fetchLoadData(date: string, region: string = 'RTO'): Promise<LoadData[]> {
  try {
    const response = await proxyAxios.get<string | LoadResponse>(
      `http://panda.gbefund.org:8080/Mimir/rest/load/5min/pjm/regions/${date}`
    );

    if (!response.data) {
      console.error('No data in response');
      return [];
    }

    const expectedName = formatRegionForApi(region);

    // Handle CSV response
    if (typeof response.data === 'string') {
      const rows = response.data.trim().split('\n');
      const data: LoadData[] = [];
      
      for (let i = 1; i < rows.length; i++) {
        const [hour, minute, value] = rows[i].split(',').map(Number);
        if (!isNaN(hour) && !isNaN(minute) && !isNaN(value)) {
          data.push({
            timestamp: convertToTimestamp(hour, minute),
            value: value
          });
        }
      }
      
      return data.sort((a, b) => {
        const [aHour, aMinute] = a.timestamp.split(':').map(Number);
        const [bHour, bMinute] = b.timestamp.split(':').map(Number);
        return (aHour * 60 + aMinute) - (bHour * 60 + bMinute);
      });
    }

    // Handle JSON response
    if (Array.isArray(response.data)) {
      return response.data
        .filter(point => {
          return point && 
                 typeof point.oprHour === 'number' &&
                 typeof point.oprMinute === 'number' &&
                 typeof point.loadValue === 'number' &&
                 point.name === expectedName;
        })
        .map(point => ({
          timestamp: convertToTimestamp(point.oprHour, point.oprMinute),
          value: point.loadValue
        }))
        .sort((a, b) => {
          const [aHour, aMinute] = a.timestamp.split(':').map(Number);
          const [bHour, bMinute] = b.timestamp.split(':').map(Number);
          return (aHour * 60 + aMinute) - (bHour * 60 + bMinute);
        });
    }

    // Handle loads array in response
    if (response.data.loads && Array.isArray(response.data.loads)) {
      return response.data.loads
        .filter(point => {
          return point && 
                 typeof point === 'object' && 
                 point.name === expectedName &&
                 typeof point.oprHour === 'number' &&
                 typeof point.oprMinute === 'number' &&
                 typeof point.loadValue === 'number';
        })
        .map(point => ({
          timestamp: convertToTimestamp(point.oprHour, point.oprMinute),
          value: point.loadValue
        }))
        .sort((a, b) => {
          const [aHour, aMinute] = a.timestamp.split(':').map(Number);
          const [bHour, bMinute] = b.timestamp.split(':').map(Number);
          return (aHour * 60 + aMinute) - (bHour * 60 + bMinute);
        });
    }

    console.error('Unexpected response format:', response.data);
    return [];

  } catch (error) {
    console.error('Error fetching load data:', error);
    throw error;
  }
}
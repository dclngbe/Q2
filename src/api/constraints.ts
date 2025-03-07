import { proxyAxios } from './proxy';

function convertToHourEnding(hour: number, minute: number): { hourEnding: number, interval: number } {
  // Add 1 to get hour ending
  const hourEnding = ((hour + 1) % 24) || 24;
  
  // Calculate 5-minute interval (0-55)
  const interval = Math.floor(minute / 5) * 5;
  
  return { hourEnding, interval };
}

export interface Constraint {
  id?: string;
  oprDate: string;
  oprHour: number;
  oprMinute: number;
  hourEnding?: number;
  interval?: number;
  shadowPrice: number;
  contingency: string;
  facilityId: number;
  facility: string;
  controllingAction: string;
}

export async function fetchConstraints(date?: string, hour?: number, minute?: number): Promise<Constraint[]> {
  try {
    const url = date && hour !== undefined && minute !== undefined
      ? `http://panda.gbefund.org:8080/Mimir/rest/constraints/pjm/iso/interval/${date}/${((hour - 1 + 24) % 24)}/${minute}`
      : 'http://panda.gbefund.org:8080/Mimir/rest/constraints/pjm/iso/current';
    
    const response = await proxyAxios.get(url);
    
    if (!response.data?.payload) {
      return [];
    }

    return response.data.payload.map((constraint: Constraint) => {
      const { hourEnding, interval } = convertToHourEnding(constraint.oprHour, constraint.oprMinute);
      return {
        ...constraint,
        hourEnding,
        interval,
        shadowPrice: Number(constraint.shadowPrice.toFixed(2))
      };
    });
  } catch (error) {
    console.error('Error fetching constraints:', error);
    throw error;
  }
}
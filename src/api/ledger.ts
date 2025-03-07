import { proxyAxios } from './proxy';

const API_URL = "http://panda.gbefund.org:8080/Mimir/rest/dispatches/pjm/today";

interface HourEndingInfo {
  hourEnding: number;
  interval: number;
}

interface LedgerItem {
  Zone: string;
  Dispatch: number;
  timestamp: string;
  hourEnding: number;
  interval: number;
}

interface DispatchMap {
  [key: string]: number;
}

interface DispatchPayload {
  dispatchTimestamp: string;
  dispatchMap: DispatchMap;
}

function convertToHourEnding(timestamp: string): HourEndingInfo {
  const date = new Date(timestamp);
  // Add 1 hour to get the hour ending
  date.setHours(date.getHours() + 1);
  
  // Get the minutes to determine the interval
  const minutes = date.getMinutes();
  let interval = 0;
  
  // Calculate the 5-minute interval (0-11)
  interval = Math.floor(minutes / 5);
  
  return {
    hourEnding: date.getHours(),
    interval: interval * 5
  };
}

export async function fetchLedgerData(): Promise<LedgerItem[]> {
  try {
    const response = await proxyAxios.get(API_URL);
    
    if (!response.data.payload || response.data.payload.length === 0) {
      return [];
    }

    // Get the most recent dispatch by timestamp
    const mostRecentDispatch = response.data.payload.reduce((latest: DispatchPayload, current: DispatchPayload) => {
      const latestTime = new Date(latest.dispatchTimestamp).getTime();
      const currentTime = new Date(current.dispatchTimestamp).getTime();
      return currentTime > latestTime ? current : latest;
    }, response.data.payload[0]);

    // Convert timestamp to hour ending format
    const { hourEnding, interval } = convertToHourEnding(mostRecentDispatch.dispatchTimestamp);

    const ledgerItems = Object.entries(mostRecentDispatch.dispatchMap)
      .map(([zone, dispatch]) => ({
        Zone: zone,
        Dispatch: Number(dispatch.toFixed(2)),
        timestamp: mostRecentDispatch.dispatchTimestamp,
        hourEnding,
        interval
      }))
      .sort((a, b) => a.Dispatch - b.Dispatch);
    
    return ledgerItems;
  } catch (error) {
    console.error('Error fetching ledger data:', error);
    throw error;
  }
}
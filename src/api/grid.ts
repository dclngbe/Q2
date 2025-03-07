import { proxyAxios } from './proxy';

interface HubConfig {
  rtPath: string;
  daHub: string;
}

interface HubConfigs {
  [key: string]: HubConfig;
}

export interface GridData {
  HE: string;
  '0': number | null;
  '5': number | null;
  '10': number | null;
  '15': number | null;
  '20': number | null;
  '25': number | null;
  '30': number | null;
  '35': number | null;
  '40': number | null;
  '45': number | null;
  '50': number | null;
  '55': number | null;
  RT: number | null;
  DA: number | null;
  'DA/RT': number | null;
}

function formatDateForApi(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}${day}${year}`;
}

const hubConfigs: HubConfigs = {
  'Western Hub': {
    rtPath: 'wh',
    daHub: 'WESTERN HUB'
  },
  'AD Hub': {
    rtPath: 'ad',
    daHub: 'AEP-DAYTON HUB'
  }
};

export function createEmptyGridData(hour: number): GridData {
  return {
    HE: String(hour),
    '0': null,
    '5': null,
    '10': null,
    '15': null,
    '20': null,
    '25': null,
    '30': null,
    '35': null,
    '40': null,
    '45': null,
    '50': null,
    '55': null,
    RT: null,
    DA: null,
    'DA/RT': null
  };
}

async function fetchSingleHubData(config: HubConfig, date: string): Promise<GridData[]> {
  try {
    const [rtResponse, daResponse] = await Promise.all([
      proxyAxios.get(`http://panda.gbefund.org:8080/Mimir/rest/lmp/5min/pjm/${config.rtPath}/${date}/csv`),
      proxyAxios.get(`http://panda.gbefund.org:8080/Mimir/rest/price/da/pjm/${config.daHub}/${date}/csv`)
    ]);

    const rtRows = rtResponse.data.trim().split('\n').map((row: string) => row.split(',').map(Number));
    const daRows = daResponse.data.trim().split('\n').map((row: string) => row.split(',').map(Number));

    // Initialize array with 24 empty rows
    const gridData: GridData[] = Array.from({ length: 24 }, (_, i) => createEmptyGridData(i + 1));

    // First, populate DA prices for all hours
    daRows.forEach((row: number[], index: number) => {
      if (index < 24) {
        const daPrice = !isNaN(row[0]) ? Number(row[0].toFixed(2)) : null;
        gridData[index].DA = daPrice;
      }
    });

    // Then, fill in RT data where available
    rtRows.forEach((row: number[], index: number) => {
      if (index < 24) {
        const validRtValues = row.slice(1).filter(val => !isNaN(val) && val !== 0);
        const rtPrice = validRtValues.length > 0 
          ? Number((validRtValues.reduce((sum, val) => sum + val, 0) / validRtValues.length).toFixed(2))
          : null;

        const processValue = (val: number): number | null => {
          return !isNaN(val) && val !== 0 ? Number(val.toFixed(2)) : null;
        };

        Object.assign(gridData[index], {
          '0': processValue(row[1]),
          '5': processValue(row[2]),
          '10': processValue(row[3]),
          '15': processValue(row[4]),
          '20': processValue(row[5]),
          '25': processValue(row[6]),
          '30': processValue(row[7]),
          '35': processValue(row[8]),
          '40': processValue(row[9]),
          '45': processValue(row[10]),
          '50': processValue(row[11]),
          '55': processValue(row[12]),
          RT: rtPrice,
          'DA/RT': rtPrice !== null && gridData[index].DA !== null 
            ? Number((rtPrice - gridData[index].DA).toFixed(2)) 
            : null
        });
      }
    });

    return gridData;
  } catch (error) {
    console.error('Error in fetchSingleHubData:', error);
    return Array.from({ length: 24 }, (_, i) => createEmptyGridData(i + 1));
  }
}

export async function fetchGridData(hub: string, selectedDate: Date = new Date()): Promise<GridData[]> {
  if (hub === 'WH - AD Spread') {
    const formattedDate = formatDateForApi(selectedDate);
    
    try {
      const [whData, adData] = await Promise.all([
        fetchSingleHubData(hubConfigs['Western Hub'], formattedDate),
        fetchSingleHubData(hubConfigs['AD Hub'], formattedDate)
      ]);

      return whData.map((whRow, index) => {
        const adRow = adData[index];
        
        const calculateSpread = (whValue: number | null, adValue: number | null): number | null => {
          if (whValue === null || adValue === null) return null;
          return Number((whValue - adValue).toFixed(2));
        };

        return {
          HE: whRow.HE,
          '0': calculateSpread(whRow['0'], adRow['0']),
          '5': calculateSpread(whRow['5'], adRow['5']),
          '10': calculateSpread(whRow['10'], adRow['10']),
          '15': calculateSpread(whRow['15'], adRow['15']),
          '20': calculateSpread(whRow['20'], adRow['20']),
          '25': calculateSpread(whRow['25'], adRow['25']),
          '30': calculateSpread(whRow['30'], adRow['30']),
          '35': calculateSpread(whRow['35'], adRow['35']),
          '40': calculateSpread(whRow['40'], adRow['40']),
          '45': calculateSpread(whRow['45'], adRow['45']),
          '50': calculateSpread(whRow['50'], adRow['50']),
          '55': calculateSpread(whRow['55'], adRow['55']),
          RT: calculateSpread(whRow.RT, adRow.RT),
          DA: calculateSpread(whRow.DA, adRow.DA),
          'DA/RT': calculateSpread(whRow['DA/RT'], adRow['DA/RT'])
        };
      });
    } catch (error) {
      console.error('Error fetching spread data:', error);
      return Array.from({ length: 24 }, (_, i) => createEmptyGridData(i + 1));
    }
  }

  if (!hubConfigs[hub]) {
    return Array.from({ length: 24 }, (_, i) => createEmptyGridData(i + 1));
  }

  const formattedDate = formatDateForApi(selectedDate);
  
  try {
    return await fetchSingleHubData(hubConfigs[hub], formattedDate);
  } catch (error) {
    console.error('Error fetching grid data:', error);
    return Array.from({ length: 24 }, (_, i) => createEmptyGridData(i + 1));
  }
}
import { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  Button,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchLedgerData } from '../src/api/ledger';
import { fetchGridData, GridData } from '../src/api/grid';
import { fetchConstraints, Constraint } from '../src/api/constraints';
import CalendarPicker from 'react-native-calendar-picker';
import { createEmptyGridData } from '../src/api/grid';

interface GridItem extends GridData {
  Combo?: number | null;
}

interface LedgerItem {
  Zone: string;
  Dispatch: number;
  timestamp?: string;
}

interface MatrixData {
  row1: (number | null)[];
}

const getDispatchColor = (value: number): string => {
  if (value >= 700) return 'rgb(255,182,193)';
  if (value >= 200) return 'rgb(178,34,34)';
  if (value >= 70) return 'rgb(255,140,0)';
  if (value >= 30) return 'rgb(207,204,46)';
  if (value >= 25) return 'rgb(123,166,255)';
  return 'rgb(173,216,230)';
};

export default function DataDisplay() {

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f3f4f6',
    },
    fixedHeader: {
      backgroundColor: '#ffffff',
      paddingVertical: 4,
      zIndex: 10,
    },
    headerControls: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      height: 40,
    },
    selectorsContainer: {
      width: '81%',
      marginRight: 10,
    },
    selectors: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
      height: 32,
    },
    selector: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#f3f4f6',
      paddingHorizontal: 12,
      borderRadius: 6,
      height: '100%',
      alignSelf: 'center',
    },
    selectorText: {
      fontSize: 11,
      color: '#1f2937',
      fontWeight: '500',
      flex: 1,
      marginLeft: 0,
    },
    priceDisplays: {
      width: '19%',
      flexDirection: 'row',
      gap: 16,
      height: 32,
    },
    priceBox: {
      flex: 1,
      backgroundColor: '#f3f4f6',
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
      paddingHorizontal: 8,
    },
    priceLabel: {
      fontSize: 11,
      color: '#374151',
    },
    rtPriceText: {
      fontSize: 11,
      color: '#dc2626',
      fontWeight: '500',
    },
    daPriceText: {
      fontSize: 11,
      color: '#16a34a',
      fontWeight: '500',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: 8,
      width: 120,
      overflow: 'hidden',
      position: 'absolute',
    },
    hubOption: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb',
    },
    hubOptionText: {
      fontSize: 12,
      color: '#1f2937',
    },
    mainContent: {
      flex: 1,
      paddingHorizontal: 2,
      paddingBottom: 8,
    },
    topSection: {
      flexDirection: 'row',
      gap: 2,
      height: '75%',
      marginBottom: 2,
    },
    bottomSection: {
      height: '25%',
      paddingTop: 4,
    },
    horizontalContainer: {
      flex: 1,
      backgroundColor: 'white',
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      overflow: 'hidden',
    },
    horizontalContainerText: {
      fontSize: 16,
      color: '#374151',
      fontWeight: '500',
    },
    gridContainer: {
      flex: 0.65,
      backgroundColor: 'white',
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      overflow: 'hidden',
    },
    ledgerContainer: {
      flex: 0.35,
      backgroundColor: 'white',
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      overflow: 'hidden',
    },
    tableContent: {
      flex: 1,
    },
    gridWrapper: {
      flex: 1,
    },
    stickyHeader: {
      flexDirection: 'row',
      backgroundColor: '#3b82f6',
      height: 24,
    },
    stickyCorner: {
      width: 32,
      padding: 4,
      backgroundColor: '#3b82f6',
      borderWidth: 1,
      borderColor: '#e5e7eb',
      height: 24,
    },
    headerRow: {
      flex: 1,
      flexDirection: 'row',
    },
    headerCell: {
      flex: 1,
      padding: 4,
      backgroundColor: '#3b82f6',
      borderWidth: 1,
      borderColor: '#e5e7eb',
      alignItems: 'center',
      height: 24,
    },
    tableBody: {
      flex: 1,
      marginTop: 0,
      height: '100%',
    },
    dataRow: {
      flexDirection: 'row',
      height: 24,
    },
    stickyCell: {
      width: 32,
      padding: 4,
      borderWidth: 1,
      borderColor: '#e5e7eb',
      backgroundColor: 'white',
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cell: {
      flex: 1,
      padding: 4,
      borderWidth: 1,
      borderColor: '#e5e7eb',
      alignItems: 'center',
      backgroundColor: 'white',
      height: 24,
      justifyContent: 'center',
    },
    ledgerHeaderCell: {
      flex: 1,
      padding: 4,
      backgroundColor: '#3b82f6',
      borderWidth: 1,
      borderColor: '#e5e7eb',
      height: 24,
      width: 50,
    },
    ledgerCell: {
      flex: 1,
      padding: 4,
      borderWidth: 1,
      borderColor: '#e5e7eb',
      alignItems: 'center',
      backgroundColor: 'white',
      height: 24,
      justifyContent: 'center',
      width: 50,
    },
    cellText: {
      fontSize: 8,
      color: '#374151',
      textAlign: 'center',
    },
    headerText: {
      fontSize: 8,
      color: '#ffffff',
      textAlign: 'center',
      fontWeight: 'bold',
    },
    title: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#1f2937',
    },
    timestamp: {
      fontSize: 12,
      color: '#6b7280',
    },
    row: {
      flexDirection: 'row',
    },
    ledgerContent: {
      flex: 1,
    },
    ledgerScrollContent: {
      flexGrow: 1,
    },
    scrollContainer: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorText: {
      color: '#dc2626',
      textAlign: 'center',
      fontSize: 14,
    },
    boldText: {
      fontWeight: 'bold',
    },
    noHubSelected: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    noHubText: {
      fontSize: 16,
      color: '#6b7280',
      fontWeight: '500',
    },
    matrixContainer: {
      backgroundColor: 'white',
      margin: 4,
      marginTop: 4,
      marginBottom: 8,
      borderRadius: 8,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    matrixHeader: {
      flexDirection: 'row',
      backgroundColor: '#3b82f6',
    },
    matrixHeaderCell: {
      flex: 1,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#e5e7eb',
    },
    matrixRow: {
      flexDirection: 'row',
    },
    matrixFirstCell: {
      flex: 1,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#e5e7eb',
      backgroundColor: 'white',
    },
    matrixDataCell: {
      flex: 1,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#e5e7eb',
      backgroundColor: 'white',
    },
    selectedHE: {
      backgroundColor: '#3b82f6',
    },
    selectedHEText: {
      color: '#ffffff',
      fontWeight: 'bold',
    },
    selectedInterval: {
      backgroundColor: '#3b82f6',
    },
    divider: {
      height: 1,
      backgroundColor: '#e5e7eb',
    },
    constraintsHeader: {
      flexDirection: 'row',
      width: '100%',
      backgroundColor: '#3b82f6',
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    },
    constraintsNameColumn: {
      width: '65%',
      padding: 8,
      borderRightWidth: 1,
      borderRightColor: '#e5e7eb',
    },
    shadowColumn: {
      width: '17.5%',
      padding: 8,
      borderRightWidth: 1,
      borderRightColor: '#e5e7eb',
    },
    constraintsContent: {
      flex: 1,
    },
    constraintRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb',
      height: 24,
    },
    facilityColumn: {
      width: '65%',
      padding: 4,
      justifyContent: 'center',
      alignItems: 'center',
      borderRightWidth: 1,
      borderRightColor: '#e5e7eb',
      fontSize: 1,
    },
    priceColumn: {
      width: '17.5%',
      padding: 4,
      justifyContent: 'center',
      alignItems: 'center',
      borderRightWidth: 1,
      borderRightColor: '#e5e7eb',
      fontSize: 1,
    },
    actionColumn: {
      width: '17.5%',
      padding: 4,
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: 1,
    },
    facilityText: {
      fontSize: 10,
      color: "#000000",
    },
    priceText: {
      fontSize: 10,
      color: "#000000",
    },
    actionText: {
      fontSize: 10,
      color: "#000000",
    },
    modalContentLarge: {
      backgroundColor: 'white',
      borderRadius: 8,
      padding: 20,
      width: 360,
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: 10,
    },
    calendarWrapper: {
      width: 320,
      height: 380,
      justifyContent: 'center',
    },
    closeButton: {
      marginTop: 20,
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: '#3b82f6',
      borderRadius: 6,
    },
    closeButtonText: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
    },
  });

  const [grid, setGrid] = useState<GridItem[]>([]);
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGridLoading, setIsGridLoading] = useState(false);
  const [isConstraintsLoading, setIsConstraintsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gridError, setGridError] = useState<string | null>(null);
  const [constraintsError, setConstraintsError] = useState<string | null>(null);
  const [showHubSelector, setShowHubSelector] = useState(false);
  const [showIntervalSelector, setShowIntervalSelector] = useState(false);
  const [showDateSelector, setShowDateSelector] = useState(false);
  const [selectedHub, setSelectedHub] = useState('Western Hub');
  const [selectedInterval, setSelectedInterval] = useState('Peak');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [gridDate, setGridDate] = useState(new Date());
  const [currentHE, setCurrentHE] = useState<number>(1);
  const [selectedHE, setSelectedHE] = useState<number | null>(null);
  const [selectedMinute, setSelectedMinute] = useState<number | null>(null);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const lastGridDataRef = useRef<GridItem[] | null>(null);
  const lastTimestampRef = useRef<string | null>(null);
  const lastConstraintsDataRef = useRef<Constraint[] | null>(null);
  const lastLedgerDataRef = useRef<LedgerItem[] | null>(null);

  const gridColumns = ['RT', 'DA', 'Combo', 'DA/RT'];
  const hubOptions = ['Western Hub', 'AD Hub', 'WH - AD Spread'];
  const intervalOptions = [
    'All',
    'Peak',
    'Off Peak',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    '11',
    '12',
    '13',
    '14',
    '15',
    '16',
    '17',
    '18',
    '19',
    '20',
    '21',
    '22',
    '23',
    '24',
  ];

  const getCurrentHE = (gridData: GridItem[]): number => {
    const rowsWithRT = gridData.filter((row) => row.RT !== null);
    if (rowsWithRT.length === 0) return 1;

    const latestHE = Math.max(...rowsWithRT.map((row) => parseInt(row.HE)));
    return latestHE;
  };

  const onChangeDate = (event: any, date: Date) => {
    if (date) {
      setSelectedDate(date);
      setGridDate(date);
    }
    setShowDateSelector(false); // Close modal
  };

  function mergeGridData(
    cachedData: GridItem[] | null,
    newData: GridItem[]
  ): GridItem[] {
    if (!cachedData) {
      // First load – nothing to merge
      return newData;
    }
  
    // Merge each row: new values override cached ones.
    return newData.map((newRow, index) => {
      // Safely parse the hour
      const hour =
        typeof newRow.HE === 'number'
          ? newRow.HE
          : parseInt(newRow.HE as string, 10);
  
      // Fallback to a newly created empty row if none is cached at this index
      const cachedRow = cachedData[index] || createEmptyGridData(hour);
  
      return {
        ...cachedRow,
        ...newRow,
      };
    });
  }

  function mergeLedgerData(
    cachedData: LedgerItem[] | null,
    newData: LedgerItem[]
  ): LedgerItem[] {
    if (
      cachedData &&
      cachedData.length > 0 &&
      newData.length > 0 &&
      cachedData[0].timestamp === newData[0].timestamp
    ) {
      return cachedData;
    }
    return newData;
  }

  function mergeConstraintsData(
    cachedConstraints: Constraint[] | null,
    newConstraints: Constraint[]
  ): Constraint[] {
    if (!cachedConstraints) {
      return newConstraints;
    }
    // Here, you can compare arrays and merge as needed.
    // For simplicity, if anything differs, return the new constraints.
    const isDifferent =
      newConstraints.length !== cachedConstraints.length ||
      newConstraints.some((constraint, index) => {
        return JSON.stringify(constraint) !== JSON.stringify(cachedConstraints[index]);
      });
    return isDifferent ? newConstraints : cachedConstraints;
  }

  const fetchAndUpdateLedger = async () => {
    console.time('fetchAndUpdateLedger'); // Start total function timer
  
    try {
      console.time('Ledger Data Fetch');  // Start fetch timer
      const ledgerData = await fetchLedgerData();
      console.timeEnd('Ledger Data Fetch'); // End fetch timer
  
      if (ledgerData.length > 0 && ledgerData[0].timestamp) {
        const newTimestamp = ledgerData[0].timestamp;
  
        // Only update if we have a new timestamp
        if (newTimestamp !== lastTimestampRef.current) {
          lastTimestampRef.current = newTimestamp;
  
          // Convert the timestamp to a readable format
          const timestampDate = new Date(newTimestamp);
          timestampDate.setHours(timestampDate.getHours() - 2); // Adjust to EST if needed
  
          // Update the `lastUpdate` state, which the UI depends on
          setLastUpdate(
            timestampDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: 'America/New_York',
            })
          );
  
          // 1) Merge with any cached ledger data
          const mergedLedger = mergeLedgerData(lastLedgerDataRef.current, ledgerData);
          lastLedgerDataRef.current = mergedLedger;
  
          // 2) Sort the merged data as before
          const sortedLedgerData = [...mergedLedger].sort((a, b) => a.Dispatch - b.Dispatch);
  
          // 3) **Only set state if it changed**
          if (JSON.stringify(ledger) !== JSON.stringify(sortedLedgerData)) {
            setLedger(sortedLedgerData);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching ledger data:', err);
    } finally {
      console.timeEnd('fetchAndUpdateLedger'); // End total function timer
    }
  };

  const fetchAndUpdateGrid = async () => {
    console.time('fetchAndUpdateGrid'); // Start total function timer
  
    try {
      console.time('Grid Data Fetch');  // Start fetch timer
      const gridData = await fetchGridData(selectedHub, gridDate);
      console.timeEnd('Grid Data Fetch'); // End fetch timer
  
      // Compare only relevant data points
      const hasNewData =
        !lastGridDataRef.current ||
        gridData.some((row, i) => {
          const lastRow = lastGridDataRef.current?.[i];
          if (!lastRow) return true;
  
          // Compare only RT values and their components since DA doesn't change
          return (
            row.RT !== lastRow.RT ||
            row['0'] !== lastRow['0'] ||
            row['5'] !== lastRow['5'] ||
            row['10'] !== lastRow['10'] ||
            row['15'] !== lastRow['15'] ||
            row['20'] !== lastRow['20'] ||
            row['25'] !== lastRow['25'] ||
            row['30'] !== lastRow['30'] ||
            row['35'] !== lastRow['35'] ||
            row['40'] !== lastRow['40'] ||
            row['45'] !== lastRow['45'] ||
            row['50'] !== lastRow['50'] ||
            row['55'] !== lastRow['55']
          );
        });
  
      if (hasNewData) {
        const mergedData = mergeGridData(lastGridDataRef.current, gridData);
        lastGridDataRef.current = mergedData;
  
        // **Only set state if it changed**
        if (JSON.stringify(grid) !== JSON.stringify(mergedData)) {
          setGrid(mergedData);
          setCurrentHE(getCurrentHE(mergedData));
        }
      }
    } catch (err) {
      console.error('Error fetching grid data:', err);
      setGridError('Failed to load grid data');
    } finally {
      console.timeEnd('fetchAndUpdateGrid'); // End total function timer
    }
  };

  const fetchAndUpdateConstraints = async (
    dateStr?: string,
    heNumber?: number,
    minute?: number
  ) => {
    console.time('fetchAndUpdateConstraints'); // Start total function timer
  
    try {
      console.time('Constraints Data Fetch'); // Start fetch timer
      const newConstraintsData = await fetchConstraints(dateStr, heNumber, minute);
      console.timeEnd('Constraints Data Fetch'); // End fetch timer
  
      const mergedConstraints = mergeConstraintsData(
        lastConstraintsDataRef.current,
        newConstraintsData
      );
  
      lastConstraintsDataRef.current = mergedConstraints;
  
      // **Only set state if it changed**
      if (JSON.stringify(constraints) !== JSON.stringify(mergedConstraints)) {
        setConstraints(mergedConstraints);
      }
  
      return mergedConstraints;
    } catch (err) {
      console.error('Error fetching constraints data:', err);
      setConstraintsError('Failed to load constraints data');
      return [];
    } finally {
      console.timeEnd('fetchAndUpdateConstraints'); // End total function timer
    }
  };

  useEffect(() => {
    let isInitialLoad = true;
  
    // Set lastUpdate from cache on first render
    if (lastTimestampRef.current) {
      const timestampDate = new Date(lastTimestampRef.current);
      timestampDate.setHours(timestampDate.getHours() - 2); // Adjust to EST
  
      setLastUpdate(
        timestampDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'America/New_York',
        })
      );
    }
  
    const loadData = async () => {
      if (isInitialLoad) {
        setIsLoading(true);
        setIsConstraintsLoading(true);
      }
  
      setError(null);
      setGridError(null);
      setConstraintsError(null);
  
      try {
        const constraintsData = await fetchAndUpdateConstraints();
        setConstraints(constraintsData);
  
        await fetchAndUpdateLedger();
        await fetchAndUpdateGrid();
      } catch (err) {
        setError('Failed to load data. Please try again later.');
        console.error('Error loading data:', err);
      } finally {
        if (isInitialLoad) {
          setIsLoading(false);
          setIsConstraintsLoading(false);
          isInitialLoad = false;
        }
      }
    };
  
    // Initial load
    loadData();
  
    // Poll every 15 seconds
    const intervalId = setInterval(loadData, 15000);
  
    // Cleanup
    return () => clearInterval(intervalId);
  }, [selectedHub, gridDate]);

  const filteredGrid = useMemo(() => {
    let filtered =
      selectedInterval === 'All'
        ? grid
        : selectedInterval === 'Peak'
        ? grid.filter((row) => {
            const hour = parseInt(row.HE);
            return hour >= 8 && hour <= 23;
          })
        : selectedInterval === 'Off Peak'
        ? grid.filter((row) => {
            const hour = parseInt(row.HE);
            return hour <= 7 || hour === 24;
          })
        : grid.filter((row) => parseInt(row.HE) === parseInt(selectedInterval));

    const rows = filtered.map((row) => ({
      ...row,
      Combo: row.RT !== null ? row.RT : row.DA,
    }));

    const averages = gridColumns.reduce((acc, col) => {
      const values = rows
        .map((row) => row[col as keyof GridItem])
        .filter((val) => val !== null) as number[];
      acc[col] =
        values.length > 0
          ? Number(
              (
                values.reduce((sum, val) => sum + val, 0) / values.length
              ).toFixed(2)
            )
          : null;
      return acc;
    }, {} as Record<string, number | null>);

    return [...rows, { HE: 'Avg', ...averages }];
  }, [grid, selectedInterval]);

  const currentHEData = useMemo(() => {
    const rowToUse = selectedHE
      ? filteredGrid.find((row) => parseInt(row.HE) === selectedHE)
      : filteredGrid.find((row) => parseInt(row.HE) === currentHE);

    if (!rowToUse) return Array(12).fill(null);

    return [
      rowToUse['0'],
      rowToUse['5'],
      rowToUse['10'],
      rowToUse['15'],
      rowToUse['20'],
      rowToUse['25'],
      rowToUse['30'],
      rowToUse['35'],
      rowToUse['40'],
      rowToUse['45'],
      rowToUse['50'],
      rowToUse['55'],
    ];
  }, [filteredGrid, currentHE, selectedHE]);

  const renderZoneText = (zone: string, backgroundColor: string) => {
    return (
      <View style={[styles.ledgerCell, { backgroundColor }]}>
        <Text
          style={[
            styles.cellText,
            {
              color: '#ffffff',
              fontWeight:
                zone === 'PEP' || zone === 'PENELEC' ? 'bold' : 'normal',
            },
          ]}
        >
          {zone}
        </Text>
      </View>
    );
  };

  const renderDispatchValue = (value: number) => {
    const backgroundColor = getDispatchColor(value);
    return (
      <View style={[styles.ledgerCell, { backgroundColor }]}>
        <Text style={[styles.cellText, { color: '#ffffff' }]}>
          {formatNumber(value)}
        </Text>
      </View>
    );
  };

  const formatNumber = (num: number | null) => {
    return num !== null ? num.toFixed(2) : '';
  };

  const handleIntervalClick = async (he: string, minute: number) => {
    const heNumber = parseInt(he);
    if (selectedHE === heNumber && selectedMinute === minute) {
      // Reset selection
      setSelectedHE(null);
      setSelectedMinute(null);
      
      try {
        setIsConstraintsLoading(true);
        const constraintsData = await fetchConstraints();
        setConstraints(constraintsData);
      } catch (err) {
        console.error('Error fetching current constraints:', err);
        setConstraintsError('Failed to load current constraints');
      } finally {
        setIsConstraintsLoading(false);
      }
    } else {
      // Set new selection
      setSelectedHE(heNumber);
      setSelectedMinute(minute);
      
      // Format date for API
      const month = String(gridDate.getMonth() + 1).padStart(2, '0');
      const day = String(gridDate.getDate()).padStart(2, '0');
      const year = gridDate.getFullYear();
      const dateStr = `${month}${day}${year}`;
      
      try {
        setIsConstraintsLoading(true);
        await fetchAndUpdateConstraints(dateStr, heNumber, minute);
      } catch (err) {
        console.error('Error fetching interval constraints:', err);
        setConstraintsError('Failed to load interval constraints');
      } finally {
        setIsConstraintsLoading(false);
      }
    }
  };

  const handleHEClick = (he: string) => {
    const heNumber = parseInt(he);
    if (selectedHE === heNumber) {
      // Reset selection and fetch current constraints
      setSelectedHE(null);
      setSelectedMinute(null);
      
      const fetchCurrentConstraints = async () => {
        try {
          setIsConstraintsLoading(true);
          const constraintsData = await fetchConstraints();
          setConstraints(constraintsData);
        } catch (err) {
          console.error('Error fetching current constraints:', err);
          setConstraintsError('Failed to load current constraints');
        } finally {
          setIsConstraintsLoading(false);
        }
      };
      
      fetchCurrentConstraints();
    } else {
      setSelectedHE(heNumber);
      setSelectedMinute(null); // Clear minute selection when selecting new hour
    }
  };

  const renderFacilityText = (facility: string) => {
    return (
      <View style={styles.facilityColumn}>
        <Text style={[styles.facilityText, { fontSize: 10 }]} numberOfLines={2}>
          {facility}
        </Text>
      </View>
    );
  };

  const renderShadowPrice = (value: number) => {
    return (
      <View style={styles.priceColumn}>
        <Text style={[styles.priceText, { fontSize: 10 }]}>
          {value.toFixed(2)}
        </Text>
      </View>
    );
  };

  const renderControllingAction = (action: string) => {
    return (
      <View style={styles.actionColumn}>
        <Text style={[styles.actionText, { fontSize: 10 }]}>{action}</Text>
      </View>
    );
  };

  const getShadowPriceColor = (value: number): string => {
    if (value >= 1500) return 'rgb(208,31,60)'; // Dark Red
    if (value >= 1000) return 'rgb(178,34,34)'; // Dark Red
    if (value >= 500) return 'rgb(255,140,0)'; // Orange
    if (value >= 250) return 'rgb(207,204,46)'; // Yellow
    if (value >= 10) return 'rgb(123,166,255)'; // Blue
    return 'rgb(173,216,230)'; // Light Blue
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.fixedHeader}>
        <View style={styles.headerControls}>
          <View style={styles.selectorsContainer}>
            <View style={styles.selectors}>
              {/* Hub Selector */}
              <Pressable
                style={styles.selector}
                onPress={() => setShowHubSelector(true)}
              >
                <Text style={styles.selectorText}>{selectedHub}</Text>
              </Pressable>

              {/* Interval Selector */}
              <Pressable
                style={styles.selector}
                onPress={() => setShowIntervalSelector(true)}
              >
                <Text style={styles.selectorText}>{selectedInterval}</Text>
              </Pressable>

              {/* Date Selector */}
              <Pressable
                style={styles.selector}
                onPress={() => setShowDateSelector(true)}
              >
                <Text style={styles.selectorText}>
                  {selectedDate.toLocaleDateString('en-GB').slice(0, 8)}{' '}
                  {/* Cuts off the year */}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Single Price Display */}
          <View style={styles.priceDisplays}>
            <View style={styles.priceBox}>
              <Text style={[styles.priceLabel, { fontSize: 10 }]}>
                {lastUpdate || '-'} EST
              </Text>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />
      </View>

      <View style={[styles.matrixContainer, { marginBottom: 4 }]}>
        <View style={styles.matrixHeader}>
          <View style={styles.matrixHeaderCell}>
            <Text style={styles.headerText}>HE</Text>
          </View>
          {Array.from({ length: 12 }, (_, i) => (
            <View key={i} style={styles.matrixHeaderCell}>
              <Text style={styles.headerText}>{i * 5}</Text>
            </View>
          ))}
        </View>
        <View style={styles.matrixRow}>
          <View style={styles.matrixFirstCell}>
            <Text style={styles.cellText}>{selectedHE || currentHE}</Text>
          </View>
          {currentHEData.map((value, index) => (
            <Pressable
              key={`row1-${index}`}
              style={[
                styles.matrixDataCell,
                selectedHE === (selectedHE || currentHE) && selectedMinute === index * 5 && styles.selectedInterval
              ]}
              onPress={() => handleIntervalClick(selectedHE?.toString() || currentHE.toString(), index * 5)}
            >
              <Text style={styles.cellText}>
                {value !== null ? value.toFixed(2) : '-'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.mainContent}>
        <View style={styles.topSection}>
          <View style={styles.gridContainer}>
            <View style={styles.tableContent}>
              {selectedHub === 'Select Hub' ? (
                <View style={styles.noHubSelected}>
                  <Text style={styles.noHubText}>Select Hub</Text>
                </View>
              ) : isGridLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                </View>
              ) : gridError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{gridError}</Text>
                </View>
              ) : (
                <View style={styles.gridWrapper}>
                  <View style={styles.stickyHeader}>
                    <View style={styles.stickyCorner}>
                      <Text style={styles.headerText}>HE</Text>
                    </View>
                    <View style={styles.headerRow}>
                      {gridColumns.map((col, index) => (
                        <View key={index} style={styles.headerCell}>
                          <Text style={styles.headerText}>{col}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <ScrollView style={styles.tableBody}>
                    {filteredGrid.map((row, rowIndex) => (
                      <View key={rowIndex} style={styles.dataRow}>
                        <Pressable
                          style={[
                            styles.stickyCell,
                            selectedHE === parseInt(row.HE) &&
                              styles.selectedHE,
                          ]}
                          onPress={() => handleHEClick(row.HE)}
                        >
                          <Text
                            style={[
                              styles.cellText,
                              selectedHE === parseInt(row.HE) &&
                                styles.selectedHEText,
                            ]}
                          >
                            {row.HE}
                          </Text>
                        </Pressable>
                        {gridColumns.map((col, colIndex) => (
                          <View key={colIndex} style={styles.cell}>
                            <Text style={styles.cellText}>
                              {formatNumber(
                                row[col as keyof GridItem] as number | null
                              )}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          <View style={styles.ledgerContainer}>
            <View style={styles.tableContent}>
              <View style={styles.ledgerContent}>
                <View style={styles.row}>
                  <View style={styles.ledgerHeaderCell}>
                    <Text style={styles.headerText}>Zone</Text>
                  </View>
                  <View style={styles.ledgerHeaderCell}>
                    <Text style={styles.headerText}>Dispatch</Text>
                  </View>
                </View>

                {isLoading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                  </View>
                )}

                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {!isLoading && !error && (
                  <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.ledgerScrollContent}
                  >
                    {ledger.map((row, rowIndex) => {
                      const backgroundColor = getDispatchColor(row.Dispatch);
                      return (
                        <View key={rowIndex} style={styles.row}>
                          {renderZoneText(row.Zone, backgroundColor)}
                          {renderDispatchValue(row.Dispatch)}
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.bottomSection}>
          <View style={styles.horizontalContainer}>
            <View style={styles.constraintsHeader}>
              <View style={styles.constraintsNameColumn}>
                <Text style={styles.headerText}>Facility</Text>
              </View>
              <View style={styles.shadowColumn}>
                <Text style={styles.headerText}>Shadow Price</Text>
              </View>
              <View style={styles.actionColumn}>
                <Text style={styles.headerText}>Action</Text>
              </View>
            </View>

            {isConstraintsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
              </View>
            ) : constraintsError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{constraintsError}</Text>
              </View>
            ) : (
              <ScrollView style={styles.constraintsContent}>
                {constraints.map((constraint, index) => {
                  const backgroundColor = getShadowPriceColor(
                    constraint.shadowPrice
                  );
                  return (
                    <View
                      key={index}
                      style={[styles.constraintRow, { backgroundColor }]}
                    >
                      {renderFacilityText(constraint.facility)}
                      {renderShadowPrice(constraint.shadowPrice)}
                      {renderControllingAction(constraint.controllingAction)}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </View>

      {/* Date Picker Modal */}
      <Modal
        visible={showDateSelector}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDateSelector(false)}
      >
        <View style={[styles.modalOverlay]}>
          <View style={styles.modalContentLarge}>
            <Text style={styles.modalTitle}>Select a Date</Text>
            <View style={styles.calendarWrapper}>
              <CalendarPicker
                onDateChange={(date) => {
                  const newDate = date.toDate();
                  setSelectedDate(newDate);
                  setGridDate(newDate);
                  setShowDateSelector(false);
                }}
                selectedStartDate={selectedDate}
                width={320}
                textStyle={{ color: 'black', fontSize: 14 }}
                todayBackgroundColor="#e6ffe6"
                selectedDayColor="#3b82f6"
                selectedDayTextColor="#fff"
              />
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDateSelector(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showHubSelector}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHubSelector(false)}
        supportedOrientations={['portrait', 'landscape']}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowHubSelector(false)}
        >
          <View
            style={[
              styles.modalContent,
              {
                marginLeft: isLandscape ? '42%' : '28%',
                marginTop: isLandscape ? 80 : 120,
              },
            ]}
          >
            {hubOptions.map((hub, index) => (
              <TouchableOpacity
                key={index}
                style={styles.hubOption}
                onPress={() => {
                  setSelectedHub(hub);
                  setShowHubSelector(false);
                }}
              >
                <Text style={styles.hubOptionText}>{hub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showIntervalSelector}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowIntervalSelector(false)}
        supportedOrientations={['portrait', 'landscape']}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowIntervalSelector(false)}
        >
          <View
            style={[
              styles.modalContent,
              {
                marginLeft: isLandscape ? '52%' : '38%',
                marginTop: isLandscape ? 80 : 120,
                height: 300,
              },
            ]}
          >
            <ScrollView>
              {intervalOptions.map((interval, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.hubOption}
                  onPress={() => {
                    setSelectedInterval(interval);
                    setShowIntervalSelector(false);
                  }}
                >
                  <Text style={styles.hubOptionText}>{interval}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
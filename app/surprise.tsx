import { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Modal from 'react-native-modal';
import CalendarPicker from 'react-native-calendar-picker';
import Svg, { Path } from 'react-native-svg';
import { fetchLoadData, fetchGbeData, fetchMeteologicaData, fetchTeslaData, LoadData } from '../src/api/load';

const SERIES = [
  { id: 'realTime', label: 'Real Time', color: 'rgb(204,204,204)' },
  { id: 'current', label: 'ISO Current', color: 'rgb(51,255,0)' },
  { id: 'gbeInternal', label: 'GBE', color: 'rgb(224,224,224)' },
  { id: 'tesla', label: 'Tesla', color: 'rgb(0,163,228)' },
  { id: 'meteorologica', label: 'Meteologica', color: 'rgb(253,2,141)' },
];

const REGIONS = ['PJM RTO Total', 'Mid-Atlantic Region', 'Western Region', 'Southern Region'];

function calculateYAxisIncrement(min: number, max: number): number {
  const range = max - min;
  return Math.ceil(range / 7000) * 1000; // 7 steps for 8 labels total
}

function generatePath(data: LoadData[], width: number, height: number, minY: number, maxY: number): string {
  if (data.length === 0) return '';
  
  const effectiveRange = maxY - minY;
  
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const sortedData = [...data].sort((a, b) => timeToMinutes(a.timestamp) - timeToMinutes(b.timestamp));
  const totalMinutes = 24 * 60;

  return sortedData.reduce((path, point, i) => {
    const minutes = timeToMinutes(point.timestamp);
    const x = (minutes / totalMinutes) * width;
    const normalizedValue = (point.value - minY) / effectiveRange;
    const y = height * (1 - normalizedValue);
    return path + (i === 0 ? `M ${x},${y}` : ` L ${x},${y}`);
  }, '');
}

function formatDateForApi(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}${day}${year}`;
}

interface ActiveSeries {
  date1: string[];
  date2: string[];
}

export default function SurpriseScreen() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;

  const chartDimensions = useMemo(() => {
    const headerHeight = 80;
    const yAxisWidth = 80;
    const xAxisHeight = 30;
    const padding = 16;
    
    const availableWidth = windowWidth - (padding * 2);
    const availableHeight = windowHeight - headerHeight - (padding * 2);
    
    const chartWidth = availableWidth - yAxisWidth;
    const chartHeight = availableHeight - xAxisHeight;
    
    return {
      width: chartWidth,
      height: chartHeight,
      yAxisWidth,
      xAxisHeight,
      padding,
      totalWidth: availableWidth,
      totalHeight: availableHeight
    };
  }, [windowWidth, windowHeight]);

  const [selectedDate1, setSelectedDate1] = useState(new Date());
  const [selectedDate2, setSelectedDate2] = useState(new Date());
  const [selectedRegion, setSelectedRegion] = useState('PJM RTO Total');
  const [activeSeries, setActiveSeries] = useState<ActiveSeries>({
    date1: SERIES.map(s => s.id),
    date2: SERIES.map(s => s.id),
  });
  const [activeCalendar, setActiveCalendar] = useState<1 | 2 | null>(null);
  const [isRegionSelectorVisible, setRegionSelectorVisible] = useState(false);
  const [isSeriesSelectorVisible, setSeriesSelectorVisible] = useState(false);
  const [loadData1, setLoadData1] = useState<LoadData[]>([]);
  const [loadData2, setLoadData2] = useState<LoadData[]>([]);
  const [gbeData1, setGbeData1] = useState<LoadData[]>([]);
  const [gbeData2, setGbeData2] = useState<LoadData[]>([]);
  const [meteologicaData1, setMeteologicaData1] = useState<LoadData[]>([]);
  const [meteologicaData2, setMeteologicaData2] = useState<LoadData[]>([]);
  const [teslaData1, setTeslaData1] = useState<LoadData[]>([]);
  const [teslaData2, setTeslaData2] = useState<LoadData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const yAxisConfig = useMemo(() => {
    if (loadData1.length === 0 && loadData2.length === 0) {
      return {
        min: 15000,
        max: 22000,
        increment: 1000,
        labels: Array.from({ length: 8 }, (_, i) => 22000 - i * 1000)
      };
    }
    
    const allValues = [...loadData1, ...loadData2].map(d => d.value);
    const minY = Math.min(...allValues);
    const maxY = Math.max(...allValues);
    const range = maxY - minY;
    const padding = range * 0.1;
    
    const effectiveMin = Math.floor((minY - padding) / 1000) * 1000;
    const effectiveMax = Math.ceil((maxY + padding) / 1000) * 1000;
    const increment = calculateYAxisIncrement(effectiveMin, effectiveMax);
    
    const steps = 8;
    const adjustedMax = effectiveMax;
    const adjustedMin = adjustedMax - (increment * (steps - 1));
    
    const labels = Array.from({ length: steps }, (_, i) => 
      Math.round(adjustedMax - (i * increment))
    );
    
    return {
      min: adjustedMin,
      max: adjustedMax,
      increment,
      labels
    };
  }, [loadData1, loadData2]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const region = selectedRegion === 'PJM RTO Total' ? 'RTO' : selectedRegion.replace(' Region', '');
        const [data1, data2, gbe1, gbe2, met1, met2, tesla1, tesla2] = await Promise.all([
          fetchLoadData(formatDateForApi(selectedDate1), region),
          fetchLoadData(formatDateForApi(selectedDate2), region),
          fetchGbeData(formatDateForApi(selectedDate1), region),
          fetchGbeData(formatDateForApi(selectedDate2), region),
          fetchMeteologicaData(formatDateForApi(selectedDate1), region),
          fetchMeteologicaData(formatDateForApi(selectedDate2), region),
          fetchTeslaData(formatDateForApi(selectedDate1), region),
          fetchTeslaData(formatDateForApi(selectedDate2), region)
        ]);
        
        setLoadData1(data1);
        setLoadData2(data2);
        setGbeData1(gbe1);
        setGbeData2(gbe2);
        setMeteologicaData1(met1);
        setMeteologicaData2(met2);
        setTeslaData1(tesla1);
        setTeslaData2(tesla2);
      } catch (err) {
        setError('Failed to load data. Please try again.');
        console.error('Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedDate1, selectedDate2, selectedRegion]);

  const visibleCurves = useMemo(() => {
    const curves: { id: string, path: string, color: string, opacity: number, strokeDasharray?: string }[] = [];

    // Real Time curves
    if (activeSeries.date1.includes('realTime')) {
      curves.push({
        id: 'date1-realTime',
        path: generatePath(loadData1, chartDimensions.width, chartDimensions.height, yAxisConfig.min, yAxisConfig.max),
        color: 'rgb(204,204,204)',
        opacity: 1
      });
    }

    if (activeSeries.date2.includes('realTime')) {
      curves.push({
        id: 'date2-realTime',
        path: generatePath(loadData2, chartDimensions.width, chartDimensions.height, yAxisConfig.min, yAxisConfig.max),
        color: 'rgb(204,204,204)',
        opacity: 0.2
      });
    }

    // ISO Current curves
    if (activeSeries.date1.includes('current')) {
      curves.push({
        id: 'date1-current',
        path: generatePath(loadData1, chartDimensions.width, chartDimensions.height, yAxisConfig.min, yAxisConfig.max),
        color: 'rgb(51,255,0)',
        opacity: 1
      });
    }

    if (activeSeries.date2.includes('current')) {
      curves.push({
        id: 'date2-current',
        path: generatePath(loadData2, chartDimensions.width, chartDimensions.height, yAxisConfig.min, yAxisConfig.max),
        color: 'rgb(51,255,0)',
        opacity: 0.2
      });
    }

    // GBE curves
    if (activeSeries.date1.includes('gbeInternal')) {
      curves.push({
        id: 'date1-gbeInternal',
        path: generatePath(gbeData1, chartDimensions.width, chartDimensions.height, yAxisConfig.min, yAxisConfig.max),
        color: 'rgb(224,224,224)',
        opacity: 1,
        strokeDasharray: '5,5'
      });
    }

    if (activeSeries.date2.includes('gbeInternal')) {
      curves.push({
        id: 'date2-gbeInternal',
        path: generatePath(gbeData2, chartDimensions.width, chartDimensions.height, yAxisConfig.min, yAxisConfig.max),
        color: 'rgb(224,224,224)',
        opacity: 0.2,
        strokeDasharray: '5,5'
      });
    }

    // Meteologica curves
    if (activeSeries.date1.includes('meteorologica')) {
      curves.push({
        id: 'date1-meteorologica',
        path: generatePath(meteologicaData1, chartDimensions.width, chartDimensions.height, yAxisConfig.min, yAxisConfig.max),
        color: 'rgb(253,2,141)',
        opacity: 1
      });
    }

    if (activeSeries.date2.includes('meteorologica')) {
      curves.push({
        id: 'date2-meteorologica',
        path: generatePath(meteologicaData2, chartDimensions.width, chartDimensions.height, yAxisConfig.min, yAxisConfig.max),
        color: 'rgb(253,2,141)',
        opacity: 0.2
      });
    }

    // Tesla curves
    if (activeSeries.date1.includes('tesla')) {
      curves.push({
        id: 'date1-tesla',
        path: generatePath(teslaData1, chartDimensions.width, chartDimensions.height, yAxisConfig.min, yAxisConfig.max),
        color: 'rgb(0,163,228)',
        opacity: 1
      });
    }

    if (activeSeries.date2.includes('tesla')) {
      curves.push({
        id: 'date2-tesla',
        path: generatePath(teslaData2, chartDimensions.width, chartDimensions.height, yAxisConfig.min, yAxisConfig.max),
        color: 'rgb(0,163,228)',
        opacity: 0.2
      });
    }

    return curves;
  }, [
    activeSeries,
    chartDimensions,
    loadData1,
    loadData2,
    gbeData1,
    gbeData2,
    meteologicaData1,
    meteologicaData2,
    teslaData1,
    teslaData2,
    yAxisConfig
  ]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const handleDateSelect = (date: Date) => {
    if (activeCalendar === 1) {
      setSelectedDate1(date);
    } else if (activeCalendar === 2) {
      setSelectedDate2(date);
    }
    setActiveCalendar(null);
  };

  const toggleSeries = (seriesId: string, dateKey: keyof ActiveSeries) => {
    setActiveSeries(prev => {
      const currentSeries = prev[dateKey];
      const newSeries = currentSeries.includes(seriesId)
        ? currentSeries.filter(id => id !== seriesId)
        : [...currentSeries, seriesId];
      
      return {
        ...prev,
        [dateKey]: newSeries
      };
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <View style={styles.header}>
        <View style={[styles.controls, isLandscape && styles.controlsLandscape]}>
          <View style={styles.dateSelectors}>
            <Pressable 
              style={styles.selector}
              onPress={() => setActiveCalendar(1)}
            >
              <Text style={styles.selectorText}>{formatDate(selectedDate1)}</Text>
              <Ionicons name="calendar" size={16} color="#fff" />
            </Pressable>

            <Text style={styles.separator}>|</Text>

            <Pressable 
              style={styles.selector}
              onPress={() => setActiveCalendar(2)}
            >
              <Text style={styles.selectorText}>{formatDate(selectedDate2)}</Text>
              <Ionicons name="calendar" size={16} color="#fff" />
            </Pressable>
          </View>

          <Pressable 
            style={styles.selector}
            onPress={() => setRegionSelectorVisible(true)}
          >
            <Text style={styles.selectorText}>{selectedRegion}</Text>
            <Ionicons name="chevron-down" size={16} color="#fff" />
          </Pressable>

          <Pressable 
            style={styles.selector}
            onPress={() => setSeriesSelectorVisible(true)}
          >
            <Text style={styles.selectorText}>Series</Text>
            <Ionicons name="chevron-down" size={16} color="#fff" />
          </Pressable>
        </View>
      </View>

      <View style={[styles.chartContainer, { padding: chartDimensions.padding }]}>
        <View style={[styles.yAxis, { width: chartDimensions.yAxisWidth }]}>
          {yAxisConfig.labels.map((value, i) => (
            <View 
              key={i} 
              style={[
                styles.yAxisLabelContainer,
                {
                  top: `${(i * 100) / (yAxisConfig.labels.length - 1)}%`,
                }
              ]}
            >
              <Text style={styles.yAxisLabel}>
                {value.toLocaleString()}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.chartContent, { 
          width: chartDimensions.width,
          height: chartDimensions.height + chartDimensions.xAxisHeight
        }]}>
          <View style={[styles.chart, { 
            width: chartDimensions.width,
            height: chartDimensions.height
          }]}>
            <View style={styles.gridLines}>
              {yAxisConfig.labels.map((_, i) => (
                <View 
                  key={`h-${i}`} 
                  style={[
                    styles.gridLine,
                    { 
                      top: `${(i * 100) / (yAxisConfig.labels.length - 1)}%`,
                    }
                  ]} 
                />
              ))}
              {Array.from({ length: 25 }, (_, i) => (
                <View 
                  key={`v-${i}`} 
                  style={[
                    styles.verticalGridLine,
                    { left: `${(i * 100) / 24}%` }
                  ]} 
                />
              ))}
            </View>
            
            <Svg style={StyleSheet.absoluteFill}>
              {visibleCurves.map(curve => (
                <Path
                  key={curve.id}
                  d={curve.path}
                  stroke={curve.color}
                  strokeWidth={2}
                  strokeOpacity={curve.opacity}
                  strokeDasharray={curve.strokeDasharray}
                  fill="none"
                />
              ))}
            </Svg>
          </View>

          <View style={[styles.xAxis, { height: chartDimensions.xAxisHeight }]}>
            {Array.from({ length: 25 }, (_, i) => (
              <Text 
                key={i} 
                style={[
                  styles.xAxisLabel,
                  { width: `${100 / 24}%` }
                ]}
              >
                {i.toString()}
              </Text>
            ))}
          </View>
        </View>
      </View>

      <Modal
        isVisible={activeCalendar !== null}
        onBackdropPress={() => setActiveCalendar(null)}
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          <CalendarPicker
            onDateChange={(date) => {
              handleDateSelect(new Date(date as Date));
            }}
            selectedStartDate={activeCalendar === 1 ? selectedDate1 : selectedDate2}
            textStyle={{ color: '#fff' }}
            selectedDayColor="#3b82f6"
            selectedDayTextColor="#fff"
          />
        </View>
      </Modal>

      <Modal
        isVisible={isRegionSelectorVisible}
        onBackdropPress={() => setRegionSelectorVisible(false)}
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          {REGIONS.map((region) => (
            <Pressable
              key={region}
              style={styles.modalOption}
              onPress={() => {
                setSelectedRegion(region);
                setRegionSelectorVisible(false);
              }}
            >
              <Text style={styles.modalOptionText}>{region}</Text>
            </Pressable>
          ))}
        </View>
      </Modal>

      <Modal
        isVisible={isSeriesSelectorVisible}
        onBackdropPress={() => setSeriesSelectorVisible(false)}
        style={styles.modal}
      >
        <View style={[styles.modalContent, styles.seriesModalContent]}>
          <View style={styles.dateSectionsContainer}>
            <View style={styles.dateSection}>
              <Text style={styles.dateSectionTitle}>{formatDate(selectedDate1)}</Text>
              {SERIES.map((series) => {
                const isActive = activeSeries.date1.includes(series.id);
                return (
                  <Pressable
                    key={`date1-${series.id}`}
                    style={styles.modalOption}
                    onPress={() => toggleSeries(series.id, 'date1')}
                  >
                    <View 
                      style={[
                        styles.legendColor, 
                        { 
                          backgroundColor: series.color,
                          opacity: isActive ? 1 : 0.2 
                        }
                      ]} 
                    />
                    <Text 
                      style={[
                        styles.modalOptionText,
                        { opacity: isActive ? 1 : 0.5 }
                      ]}
                    >
                      {series.label}
                    </Text>
                    {isActive && (
                      <Ionicons name="checkmark" size={20} color="#3b82f6" style={styles.checkmark} />
                    )}
                  </Pressable>
                );
              })}
            </View>
            
            <View style={styles.verticalDivider} />
            
            <View style={styles.dateSection}>
              <Text style={styles.dateSectionTitle}>{formatDate(selectedDate2)}</Text>
              {SERIES.map((series) => {
                const isActive = activeSeries.date2.includes(series.id);
                return (
                  <Pressable
                    key={`date2-${series.id}`}
                    style={styles.modalOption}
                    onPress={() => toggleSeries(series.id, 'date2')}
                  >
                    <View 
                      style={[
                        styles.legendColor, 
                        { 
                          backgroundColor: series.color,
                          opacity: isActive ? 1 : 0.2 
                        }
                      ]} 
                    />
                    <Text 
                      style={[
                        styles.modalOptionText,
                        { opacity: isActive ? 1 : 0.5 }
                      ]}
                    >
                      {series.label}
                    </Text>
                    {isActive && (
                      <Ionicons name="checkmark" size={20} color="#3b82f6" style={styles.checkmark} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      )}
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  controlsLandscape: {
    flexWrap: 'nowrap',
  },
  dateSelectors: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  separator: {
    color: '#666',
    fontSize: 16,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 8,
    borderRadius: 4,
    gap: 8,
    minWidth: 120,
    justifyContent: 'space-between',
  },
  selectorText: {
    color: '#fff',
    fontSize: 14,
  },
  chartContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  yAxis: {
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  yAxisLabelContainer: {
    position: 'absolute',
    right: 0,
    transform: [{ translateY: -10 }],
  },
  yAxisLabel: {
    color: '#666',
    fontSize: 12,
  },
  chartContent: {
    flex: 1,
  },
  chart: {
    position: 'relative',
  },
  gridLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#333',
  },
  verticalGridLine: {
    position: 'absolute',
    width: 1,
    backgroundColor: '#333',
    top: 0,
    bottom: 0,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xAxisLabel: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
  modal: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    minWidth: 300,
    maxHeight: '80%',
  },
  seriesModalContent: {
    minWidth: 600,
    maxWidth: '90%',
  },
  dateSectionsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  dateSection: {
    flex: 1,
  },
  dateSectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 4,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: '#333',
    alignSelf: 'stretch',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  modalOptionText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  checkmark: {
    marginLeft: 'auto',
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  errorContainer: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    backgroundColor: '#dc2626',
    padding: 12,
    borderRadius: 8,
    zIndex: 1000,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
  },
});
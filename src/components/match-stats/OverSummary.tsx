/**
 * Over-by-over runs summary with bar/line chart toggle and collapsible section.
 * Used in match stats view.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { OverSummary as OverData } from '@/services/matchStats';

/** Props: overSummary (runs per over). */
interface OverSummaryProps {
  overSummary: OverData[];
}

type ChartType = 'bar' | 'line';

/** Renders runs per over with bar or line chart. */
export const OverSummary: React.FC<OverSummaryProps> = ({ overSummary }) => {
  const [expanded, setExpanded] = useState(false);
  const [chartType, setChartType] = useState<ChartType>('bar');
  
  if (overSummary.length === 0) {
    return null;
  }
  
  const screenWidth = Dimensions.get('window').width - 64; // Account for padding
  
  const chartData = {
    labels: overSummary.map(o => o.overNumber.toString()),
    datasets: [
      {
        data: overSummary.map(o => o.runs)
      }
    ]
  };
  
  // Calculate cumulative runs for line chart
  const cumulativeData = {
    labels: overSummary.map(o => o.overNumber.toString()),
    datasets: [
      {
        data: overSummary.reduce((acc, over, index) => {
          const cumulative = index === 0 ? over.runs : acc[index - 1] + over.runs;
          return [...acc, cumulative];
        }, [] as number[])
      }
    ]
  };
  
  const chartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#007AFF'
    }
  };
  
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.title}>Over Summary</Text>
        <Ionicons 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#666" 
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.content}>
          <View style={styles.chartTypeButtons}>
            <TouchableOpacity
              style={[styles.chartButton, chartType === 'bar' && styles.chartButtonActive]}
              onPress={() => setChartType('bar')}
            >
              <Text style={[styles.chartButtonText, chartType === 'bar' && styles.chartButtonTextActive]}>
                Bar Chart
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chartButton, chartType === 'line' && styles.chartButtonActive]}
              onPress={() => setChartType('line')}
            >
              <Text style={[styles.chartButtonText, chartType === 'line' && styles.chartButtonTextActive]}>
                Line Chart
              </Text>
            </TouchableOpacity>
          </View>
          
          {chartType === 'bar' ? (
            <BarChart
              data={chartData}
              width={screenWidth}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix=""
              fromZero
              showValuesOnTopOfBars
            />
          ) : (
            <LineChart
              data={cumulativeData}
              width={screenWidth}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix=""
            />
          )}
          
          <Text style={styles.chartLabel}>
            {chartType === 'bar' ? 'Runs per over' : 'Cumulative runs progression'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa'
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.5
  },
  content: {
    padding: 20
  },
  chartTypeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20
  },
  chartButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  chartButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#0051D5',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4
  },
  chartButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    letterSpacing: 0.3
  },
  chartButtonTextActive: {
    color: '#fff'
  },
  chart: {
    marginVertical: 12,
    borderRadius: 16
  },
  chartLabel: {
    fontSize: 13,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '600'
  }
});

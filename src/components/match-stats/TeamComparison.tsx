import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { InningsScore } from '@/models/Match';
import { BattingStats } from '@/services/matchStats';

interface TeamComparisonProps {
  teamAName: string;
  teamBName: string;
  teamAInnings: InningsScore;
  teamBInnings: InningsScore;
  teamABattingStats: BattingStats[];
  teamBBattingStats: BattingStats[];
}

export const TeamComparison: React.FC<TeamComparisonProps> = ({
  teamAName,
  teamBName,
  teamAInnings,
  teamBInnings,
  teamABattingStats,
  teamBBattingStats
}) => {
  // Calculate boundaries
  const teamABoundaries = teamABattingStats.reduce((sum, stat) => sum + stat.fours + stat.sixes, 0);
  const teamBBoundaries = teamBBattingStats.reduce((sum, stat) => sum + stat.fours + stat.sixes, 0);
  
  // Calculate extras
  const teamAExtras = teamAInnings.ballEvents?.filter(b => b.isWide || b.isNoBall).reduce((sum, b) => sum + b.runs, 0) || 0;
  const teamBExtras = teamBInnings.ballEvents?.filter(b => b.isWide || b.isNoBall).reduce((sum, b) => sum + b.runs, 0) || 0;
  
  // Calculate run rate
  const teamAOversDecimal = teamAInnings.overs + (teamAInnings.balls / 6);
  const teamBOversDecimal = teamBInnings.overs + (teamBInnings.balls / 6);
  const teamARunRate = teamAOversDecimal > 0 ? teamAInnings.runs / teamAOversDecimal : 0;
  const teamBRunRate = teamBOversDecimal > 0 ? teamBInnings.runs / teamBOversDecimal : 0;
  
  const screenWidth = Dimensions.get('window').width - 64;
  
  const chartData = {
    labels: ['Runs', 'Wickets', 'Run Rate', 'Boundaries', 'Extras'],
    datasets: [
      {
        data: [
          teamAInnings.runs,
          teamAInnings.wickets,
          parseFloat(teamARunRate.toFixed(1)),
          teamABoundaries,
          teamAExtras
        ]
      },
      {
        data: [
          teamBInnings.runs,
          teamBInnings.wickets,
          parseFloat(teamBRunRate.toFixed(1)),
          teamBBoundaries,
          teamBExtras
        ]
      }
    ],
    legend: [teamAName, teamBName]
  };
  
  const chartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1, index) => {
      return index === 0 ? `rgba(0, 122, 255, ${opacity})` : `rgba(255, 59, 48, ${opacity})`;
    },
    labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
    style: {
      borderRadius: 16
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Team Comparison</Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Runs</Text>
            <View style={styles.statValues}>
              <Text style={[styles.statValue, styles.teamAColor]}>{teamAInnings.runs}</Text>
              <Text style={styles.statSeparator}>vs</Text>
              <Text style={[styles.statValue, styles.teamBColor]}>{teamBInnings.runs}</Text>
            </View>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Wickets Lost</Text>
            <View style={styles.statValues}>
              <Text style={[styles.statValue, styles.teamAColor]}>{teamAInnings.wickets}</Text>
              <Text style={styles.statSeparator}>vs</Text>
              <Text style={[styles.statValue, styles.teamBColor]}>{teamBInnings.wickets}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Run Rate</Text>
            <View style={styles.statValues}>
              <Text style={[styles.statValue, styles.teamAColor]}>{teamARunRate.toFixed(2)}</Text>
              <Text style={styles.statSeparator}>vs</Text>
              <Text style={[styles.statValue, styles.teamBColor]}>{teamBRunRate.toFixed(2)}</Text>
            </View>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Boundaries</Text>
            <View style={styles.statValues}>
              <Text style={[styles.statValue, styles.teamAColor]}>{teamABoundaries}</Text>
              <Text style={styles.statSeparator}>vs</Text>
              <Text style={[styles.statValue, styles.teamBColor]}>{teamBBoundaries}</Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.chartContainer}>
        <BarChart
          data={chartData}
          width={screenWidth}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
          yAxisLabel=""
          yAxisSuffix=""
          fromZero
          withInnerLines={false}
        />
      </View>
      
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, styles.teamAColorBg]} />
          <Text style={styles.legendText}>{teamAName}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, styles.teamBColorBg]} />
          <Text style={styles.legendText}>{teamBName}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 20,
    letterSpacing: 0.5
  },
  statsGrid: {
    marginBottom: 20
  },
  statRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16
  },
  statItem: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  statLabel: {
    fontSize: 10,
    color: '#6c757d',
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 1
  },
  statValues: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800'
  },
  statSeparator: {
    fontSize: 13,
    color: '#adb5bd',
    fontWeight: '600'
  },
  teamAColor: {
    color: '#007AFF'
  },
  teamBColor: {
    color: '#FF3B30'
  },
  chartContainer: {
    marginVertical: 20,
    alignItems: 'center',
    backgroundColor: '#fafbfc',
    borderRadius: 16,
    padding: 12
  },
  chart: {
    borderRadius: 16
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#dee2e6'
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2
  },
  teamAColorBg: {
    backgroundColor: '#007AFF'
  },
  teamBColorBg: {
    backgroundColor: '#FF3B30'
  },
  legendText: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '700'
  }
});

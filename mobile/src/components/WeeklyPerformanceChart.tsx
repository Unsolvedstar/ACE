import { StyleSheet, Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import type { WeeklyTaskCompletion } from '../types/boards';

// Fixed status scale (dataviz reference palette) — these three metrics each carry a
// good/bad judgment (completed = good outcome, overdue = critical), so per the palette's
// collision rule they wear status tokens rather than generic categorical hues. "In Progress"
// takes the "warning" slot as the conventional middle state between good and critical.
const STATUS_COLORS = {
  completed: '#0ca30c',
  inProgress: '#fab219',
  overdue: '#d03b3b',
} as const;

// Warning's contrast on a light surface is sub-3:1 by design (palette.md) — the mitigation
// is pairing it with a visible label rather than relying on hue alone, which the legend and
// the numeric breakdown below both provide.
const CHART_INK = {
  primary: '#0b0b0b',
  secondary: '#52514e',
  muted: '#898781',
  axis: '#c3c2b7',
  grid: '#e1e0d9',
};

interface WeeklyPerformanceChartProps {
  rows: WeeklyTaskCompletion[];
}

export function WeeklyPerformanceChart({ rows }: WeeklyPerformanceChartProps) {
  if (rows.length === 0) {
    return null;
  }

  const stackData = rows.map((row) => ({
    label: row.employeeName,
    stacks: [
      { value: row.tasksCompleted, color: STATUS_COLORS.completed },
      { value: row.tasksInProgress, color: STATUS_COLORS.inProgress },
      { value: row.tasksOverdue, color: STATUS_COLORS.overdue },
    ],
  }));

  return (
    <View>
      <View style={styles.legend}>
        <LegendItem color={STATUS_COLORS.completed} label="Completed" />
        <LegendItem color={STATUS_COLORS.inProgress} label="In Progress" />
        <LegendItem color={STATUS_COLORS.overdue} label="Overdue" />
      </View>

      <BarChart
        stackData={stackData}
        horizontal
        barWidth={20}
        spacing={22}
        labelWidth={96}
        barBorderRadius={4}
        xAxisColor={CHART_INK.axis}
        yAxisColor={CHART_INK.axis}
        xAxisThickness={1}
        yAxisThickness={1}
        rulesColor={CHART_INK.grid}
        rulesThickness={1}
        rulesType="solid"
        xAxisLabelTextStyle={styles.axisLabel}
        yAxisTextStyle={styles.axisLabel}
        noOfSections={4}
        disableScroll
        height={rows.length * 42}
      />

      {/* Numeric breakdown is the accessible "table view" the chart summarizes visually —
          the dataviz skill requires one to exist alongside any chart. */}
      <View style={styles.table}>
        {rows.map((row) => (
          <View key={row.employeeId} style={styles.tableRow}>
            <Text style={styles.tableName}>{row.employeeName}</Text>
            <Text style={styles.tableValue}>
              {row.tasksCompleted} done · {row.tasksInProgress} in progress · {row.tasksOverdue} overdue
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, color: CHART_INK.secondary, fontWeight: '600' },
  axisLabel: { fontSize: 11, color: CHART_INK.muted },
  table: { marginTop: 16 },
  tableRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  tableName: { fontSize: 14, fontWeight: '600', color: CHART_INK.primary },
  tableValue: { fontSize: 12, color: CHART_INK.secondary, marginTop: 2 },
});

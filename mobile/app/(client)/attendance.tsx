import React, { useMemo } from 'react';
import { AttendanceRecord } from '@/api';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMyAttendance } from '@/hooks';
import { Card, StatCard } from '@/components';
import { palette, spacing, typography, radius } from '@/theme/tokens';
import { toDateKey, formatShortDate } from '@/utils/format';

/** Build a grid of the last 12 weeks (Mon→Sun columns). */
function buildGrid(attendedSet: Set<string>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const DOW = today.getDay(); // 0=Sun
  // start on most recent Sunday
  const startOffset = DOW;
  const totalDays = 12 * 7;
  const days: { key: string; attended: boolean; isToday: boolean; label: string }[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i + startOffset - 6);
    if (d > today) {
      days.push({ key: toDateKey(d), attended: false, isToday: false, label: '' });
      continue;
    }
    const key = toDateKey(d);
    days.push({
      key,
      attended: attendedSet.has(key),
      isToday: key === toDateKey(today),
      label: d.getDate() === 1 ? d.toLocaleString('default', { month: 'short' }) : '',
    });
  }
  return days;
}

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

export default function ClientAttendance() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch } = useMyAttendance();

  const attendedSet = useMemo(
    () => new Set<string>((data?.records ?? []).map((r: AttendanceRecord) => toDateKey(new Date(r.date)))),
    [data],
  );
  const grid = useMemo(() => buildGrid(attendedSet), [attendedSet]);

  // Group into 7-row columns (weeks)
  const weeks: typeof grid[] = [];
  for (let i = 0; i < grid.length; i += 7) weeks.push(grid.slice(i, i + 7));

  // Last 30 days for the detail list
  const recent = (data?.records ?? []).slice(0, 30);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{ paddingTop: insets.top + spacing[4], paddingBottom: spacing[10], paddingHorizontal: spacing[4] }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={palette.accent} />}
    >
      <Text style={s.title}>Attendance</Text>

      {/* Streak stats */}
      <View style={s.row}>
        <StatCard label="Current Streak" value={`🔥 ${data?.currentStreak ?? 0}`} accent style={s.thirdCard} />
        <StatCard label="Best Streak" value={data?.longestStreak ?? 0} style={s.thirdCard} />
        <StatCard label="Total Visits" value={data?.totalCheckIns ?? 0} style={s.thirdCard} />
      </View>

      {/* Heatmap */}
      <Card style={{ marginTop: spacing[4], paddingHorizontal: spacing[3] }}>
        <Text style={s.heatmapTitle}>Activity (12 weeks)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            {/* Day-of-week labels */}
            <View style={s.heatRow}>
              <View style={s.dowCol}>
                {DOW_LABELS.map((d) => (
                  <Text key={d} style={s.dowLabel}>{d}</Text>
                ))}
              </View>
              {weeks.map((week, wi) => (
                <View key={wi} style={s.weekCol}>
                  {week.map((day) => (
                    <View
                      key={day.key}
                      style={[
                        s.cell,
                        day.attended && s.cellActive,
                        day.isToday && s.cellToday,
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
        <View style={s.legend}>
          <Text style={s.legendText}>Less</Text>
          {[0, 0.3, 0.7, 1].map((o) => (
            <View key={o} style={[s.legendCell, { opacity: o === 0 ? 0.15 : o }]} />
          ))}
          <Text style={s.legendText}>More</Text>
        </View>
      </Card>

      {/* Recent visits */}
      <Text style={s.sectionTitle}>Recent Visits</Text>
      {recent.length === 0 && (
        <Text style={s.empty}>No visits recorded yet. Check in today!</Text>
      )}
      {recent.map((r: AttendanceRecord) => (
        <Card key={r._id} style={{ marginBottom: spacing[2] }}>
          <View style={s.visitRow}>
            <View style={s.visitDot} />
            <Text style={s.visitDate}>{formatShortDate(r.date)}</Text>
            {r.note && <Text style={s.visitNote}>{r.note}</Text>}
            <Text style={s.visitCheck}>✓</Text>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const CELL = 13;
const s = StyleSheet.create({
  title: { fontFamily: 'Syne-Bold', fontSize: typography.size['2xl'], color: palette.ink, marginBottom: spacing[4] },
  row: { flexDirection: 'row', gap: spacing[2] },
  thirdCard: { flex: 1 },
  heatmapTitle: { fontFamily: typography.bodyMedium, fontSize: typography.size.sm, color: palette.inkSecondary, marginBottom: spacing[3] },
  heatRow: { flexDirection: 'row' },
  dowCol: { marginRight: 4, paddingTop: 0 },
  dowLabel: { width: CELL, height: CELL + 4, fontSize: 8, color: palette.inkMuted, fontFamily: typography.body, textAlign: 'center', lineHeight: CELL + 4 },
  weekCol: { marginRight: 3 },
  cell: { width: CELL, height: CELL, borderRadius: 2, backgroundColor: palette.surface2, marginBottom: 3 },
  cellActive: { backgroundColor: palette.accent },
  cellToday: { borderWidth: 1.5, borderColor: palette.accent, backgroundColor: palette.accentSubtle },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing[3], justifyContent: 'flex-end' },
  legendCell: { width: CELL, height: CELL, borderRadius: 2, backgroundColor: palette.accent },
  legendText: { fontFamily: typography.body, fontSize: typography.size.xs, color: palette.inkMuted },
  sectionTitle: { fontFamily: 'Syne-Bold', fontSize: typography.size.lg, color: palette.ink, marginTop: spacing[5], marginBottom: spacing[3] },
  visitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  visitDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.accent },
  visitDate: { fontFamily: typography.bodyMedium, fontSize: typography.size.base, color: palette.ink, flex: 1 },
  visitNote: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary },
  visitCheck: { fontFamily: typography.bodyMedium, fontSize: typography.size.base, color: palette.success },
  empty: { fontFamily: typography.body, fontSize: typography.size.base, color: palette.inkMuted, textAlign: 'center', paddingVertical: spacing[6] },
});

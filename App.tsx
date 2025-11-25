/**
 * Workout Logger App
 * Minimal MVP: Add exercises and sets (reps, weight). In-memory only.
 * @format
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
  Modal,
  Platform,
  useWindowDimensions,
  Animated,
} from 'react-native';
import Svg, { G, Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// RoundedView: currently behaves like a normal View (continuous corners disabled)
const USE_CONTINUOUS_CURVE = false;
const RoundedView = React.forwardRef<View, React.ComponentProps<typeof View>>(({ style, ...rest }, forwardedRef) => {
  const localRef = useRef<View>(null);
  useEffect(() => {
    const node = localRef.current as any;
    if (USE_CONTINUOUS_CURVE && Platform.OS === 'ios' && node) {
      try {
        node.setNativeProps({ cornerCurve: 'continuous' });
      } catch {}
    }
  }, [style]);

  return (
    <View
      ref={(node) => {
        // @ts-ignore assign to local and forwarded refs
        localRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node as any);
        else if (forwardedRef && 'current' in (forwardedRef as any)) (forwardedRef as any).current = node as any;
      }}
      style={style}
      {...rest}
    />
  );
});
RoundedView.displayName = 'RoundedView';

type BodyPart =
  | 'Chest'
  | 'Back'
  | 'Legs'
  | 'Shoulders'
  | 'Arms'
  | 'Core'
  | 'Glutes'
  | 'Full Body';

type SetItem = { id: string; reps: number; weight: number };
type Exercise = { id: string; name: string; bodyPart: BodyPart; sets: SetItem[] };

const BODY_PARTS: BodyPart[] = [
  'Chest',
  'Back',
  'Legs',
  'Shoulders',
  'Arms',
  'Core',
  'Glutes',
  'Full Body',
];

const EXERCISE_LIBRARY: Array<{ name: string; bodyPart: BodyPart }> = [
  { name: 'Bench Press', bodyPart: 'Chest' },
  { name: 'Incline DB Press', bodyPart: 'Chest' },
  { name: 'Push-Up', bodyPart: 'Chest' },
  { name: 'Pull-Up', bodyPart: 'Back' },
  { name: 'Deadlift', bodyPart: 'Back' },
  { name: 'Bent-Over Row', bodyPart: 'Back' },
  { name: 'Back Squat', bodyPart: 'Legs' },
  { name: 'Leg Press', bodyPart: 'Legs' },
  { name: 'Lunge', bodyPart: 'Legs' },
  { name: 'Overhead Press', bodyPart: 'Shoulders' },
  { name: 'Lateral Raise', bodyPart: 'Shoulders' },
  { name: 'Bicep Curl', bodyPart: 'Arms' },
  { name: 'Tricep Pushdown', bodyPart: 'Arms' },
  { name: 'Plank', bodyPart: 'Core' },
  { name: 'Hanging Leg Raise', bodyPart: 'Core' },
  { name: 'Hip Thrust', bodyPart: 'Glutes' },
  { name: 'Kettlebell Swing', bodyPart: 'Full Body' },
];

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <AppContent />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function RadarChart({
  theme,
  size = 220,
  levels = 4,
  labels,
  values,
}: {
  theme: typeof lightTheme;
  size?: number;
  levels?: number;
  labels: string[];
  values: number[];
}) {
  const count = labels.length;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size * 0.38);
  const isDark = theme.bg === '#000000';
  const strokeColor = isDark ? '#64D2FF' : '#0A84FF';
  const fillOpacity = isDark ? 0.22 : 0.18;

  const colorForLabel = (label: string) => {
    const key = label.toLowerCase();
    const light: Record<string, string> = {
      chest: '#FF3B30',
      back: '#0A84FF',
      legs: '#34C759',
      shoulders: '#FF9F0A',
      arms: '#BF5AF2',
      abs: '#30B0C7',
    };
    const dark: Record<string, string> = {
      chest: '#FF453A',
      back: '#64D2FF',
      legs: '#30D158',
      shoulders: '#FFD60A',
      arms: '#BF5AF2',
      abs: '#64D2FF',
    };
    return (isDark ? dark : light)[key] || theme.textSecondary;
  };
  const angleFor = (i: number) => (Math.PI * 2 * i) / count - Math.PI / 2;
  const toPoint = (radius: number, i: number) => {
    const a = angleFor(i);
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
  };
  const gridPolys: string[] = [];
  for (let l = 1; l <= levels; l++) {
    const radius = (r * l) / levels;
    const pts = Array.from({ length: count }, (_, i) => toPoint(radius, i).join(',')).join(' ');
    gridPolys.push(pts);
  }
  const dataPts = Array.from({ length: count }, (_, i) => toPoint(r * Math.max(0, Math.min(1, values[i] || 0)), i).join(',')).join(' ');

  const labelRadius = r + 18;
  const labelPositions = labels.map((_, i) => toPoint(labelRadius, i));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G>
          {gridPolys.map((pts, idx) => (
            <Polygon key={`g${idx}`} points={pts} fill="none" stroke={theme.border} strokeWidth={1} />
          ))}
          {Array.from({ length: count }, (_, i) => (
            <Line key={`axis${i}`} x1={cx} y1={cy} x2={toPoint(r, i)[0]} y2={toPoint(r, i)[1]} stroke={theme.border} strokeWidth={1} />
          ))}
          <Polygon points={dataPts} fill={strokeColor} opacity={fillOpacity} stroke={strokeColor} strokeWidth={2} />
          <Circle cx={cx} cy={cy} r={2} fill={theme.textSecondary} />
          {labelPositions.map(([x, y], i) => (
            <SvgText key={`lbl${i}`} x={x} y={y} fill={colorForLabel(labels[i])} fontSize={11} fontWeight="700" textAnchor="middle" alignmentBaseline="middle">
              {labels[i]}
            </SvgText>
          ))}
        </G>
      </Svg>
    </View>
  );
}

function BodyPartPickerModal({
  visible,
  onClose,
  theme,
  selected,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  theme: typeof lightTheme;
  selected: BodyPart;
  onSelect: (bp: BodyPart) => void;
}) {
  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose} transparent>
      <View style={styles.modalBackdrop}>
        <RoundedView style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
          <View style={[styles.cardHeader, { marginBottom: 12 }]}> 
            <Text style={[styles.cardTitle, { color: theme.text }]}>Select Body Part</Text>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.iconBtn, { backgroundColor: pressed ? theme.dangerPressed : theme.danger }]}> 
              <Text style={styles.iconText}>Close</Text>
            </Pressable>
          </View>

          <FlatList
            data={BODY_PARTS}
            keyExtractor={(bp) => bp}
            renderItem={({ item }) => (
              <Pressable onPress={() => onSelect(item)} style={({ pressed }) => [styles.libraryItem, { borderColor: theme.border, backgroundColor: pressed || selected === item ? theme.input : theme.card }]}> 
                <Text style={{ color: theme.text, fontWeight: '600' }}>{item}</Text>
                {selected === item && (
                  <View style={[styles.badge, { backgroundColor: theme.input, borderColor: theme.border }]}> 
                    <Text style={[styles.badgeText, { color: theme.textSecondary }]}>Selected</Text>
                  </View>
                )}
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            contentContainerStyle={{ paddingBottom: 8 }}
          />
        </RoundedView>
      </View>
    </Modal>
  );
}

function ExerciseLibraryModal({
  visible,
  onClose,
  theme,
  filter,
  setFilter,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  theme: typeof lightTheme;
  filter: BodyPart | 'All';
  setFilter: (bp: BodyPart | 'All') => void;
  onSelect: (item: { name: string; bodyPart: BodyPart }) => void;
}) {
  const list = useMemo(
    () => EXERCISE_LIBRARY.filter(e => (filter === 'All' ? true : e.bodyPart === filter)),
    [filter],
  );


  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose} transparent>
      <View style={styles.modalBackdrop}>
        <RoundedView style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
          <View style={[styles.cardHeader, { marginBottom: 12 }]}> 
            <Text style={[styles.cardTitle, { color: theme.text }]}>Exercise Library</Text>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.iconBtn, { backgroundColor: pressed ? theme.dangerPressed : theme.danger }]}> 
              <Text style={styles.iconText}>Close</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            <Pressable onPress={() => setFilter('All')} style={[styles.chip, { borderColor: theme.border, backgroundColor: filter === 'All' ? theme.accent : theme.card }]}>
              <Text style={{ color: filter === 'All' ? '#fff' : theme.textSecondary, fontWeight: '600' }}>All</Text>
            </Pressable>
            {BODY_PARTS.map(bp => (
              <Pressable key={bp} onPress={() => setFilter(bp)} style={[styles.chip, { borderColor: theme.border, backgroundColor: filter === bp ? theme.accent : theme.card }]}>
                <Text style={{ color: filter === bp ? '#fff' : theme.textSecondary, fontWeight: '600' }}>{bp}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <FlatList
            data={list}
            keyExtractor={(item, idx) => `${item.name}-${idx}`}
            renderItem={({ item }) => (
              <Pressable onPress={() => onSelect(item)} style={({ pressed }) => [styles.libraryItem, { borderColor: theme.border, backgroundColor: pressed ? theme.input : theme.card }]}> 
                <Text style={{ color: theme.text, fontWeight: '600' }}>{item.name}</Text>
                <View style={[styles.badge, { backgroundColor: theme.input, borderColor: theme.border }]}> 
                  <Text style={[styles.badgeText, { color: theme.textSecondary }]}>{item.bodyPart}</Text>
                </View>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            contentContainerStyle={{ paddingBottom: 8 }}
          />
        </RoundedView>
      </View>
    </Modal>
  );
}

function AppContent() {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = useMemo(() => (isDarkMode ? darkTheme : lightTheme), [isDarkMode]);

  const [activeTab, setActiveTab] = useState<'Logger' | 'Today' | 'Progress'>('Logger');
  const pagesRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const tabs: Array<'Logger' | 'Today' | 'Progress'> = ['Logger', 'Today', 'Progress'];
  const tabIndex = (t: 'Logger' | 'Today' | 'Progress') => tabs.indexOf(t);
  useEffect(() => {
    const idx = tabIndex(activeTab);
    if (pagesRef.current && idx >= 0) {
      pagesRef.current.scrollTo({ x: width * idx, animated: true });
    }
  }, [activeTab, width]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseName, setExerciseName] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart>('Chest');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState<BodyPart | 'All'>('All');
  const [bodyPartPickerOpen, setBodyPartPickerOpen] = useState(false);

  const { totalVolume, totalSets, totalReps } = useMemo(() => {
    let volume = 0;
    let sets = 0;
    let reps = 0;
    for (const e of exercises) {
      for (const s of e.sets) {
        volume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
        sets += 1;
        reps += Number(s.reps) || 0;
      }
    }
    return { totalVolume: volume, totalSets: sets, totalReps: reps };
  }, [exercises]);

  const dateStr = useMemo(() => {
    const now = new Date();
    const weekday = now.toLocaleDateString(undefined, { weekday: 'short' });
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${weekday} ${d}/${m}`;
  }, []);

  const weekly = useMemo(() => {
    const now = new Date();
    const startOfDay = (d: Date) => {
      const dd = new Date(d);
      dd.setHours(0, 0, 0, 0);
      return dd.getTime();
    };
    // Build current calendar week Sun..Sat
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);
    const days: { label: string; start: number; end: number; volume: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      const start = startOfDay(day);
      const end = start + 24 * 60 * 60 * 1000 - 1;
      const label = day.toLocaleDateString(undefined, { weekday: 'short' });
      days.push({ label, start, end, volume: 0 });
    }
    // Aggregate using set id timestamp prefix
    for (const e of exercises) {
      for (const s of e.sets) {
        const ts = Number(String(s.id).split('-')[0]);
        const vol = (Number(s.weight) || 0) * (Number(s.reps) || 0);
        if (!Number.isFinite(ts)) continue;
        const idx = days.findIndex(d => ts >= d.start && ts <= d.end);
        if (idx >= 0) days[idx].volume += vol;
      }
    }
    const step = 500;
    const rawMax = Math.max(1, ...days.map(d => d.volume));
    const minTop = step * 6; // at least show 0..3000
    const max = Math.max(minTop, Math.ceil(rawMax / step) * step);
    const ticks: number[] = [];
    for (let v = 0; v <= max; v += step) ticks.push(v);
    const rangeStart = days[0]?.start ?? 0;
    const rangeEnd = days[6]?.end ?? 0;
    return { days, max, ticks, step, rangeStart, rangeEnd };
  }, [exercises]);

  const muscleBreakdown = useMemo(() => {
    const counts = new Map<BodyPart, number>();
    let total = 0;
    for (const e of exercises) {
      for (const s of e.sets) {
        const ts = Number(String(s.id).split('-')[0]);
        if (!Number.isFinite(ts)) continue;
        if (ts >= weekly.rangeStart && ts <= weekly.rangeEnd) {
          counts.set(e.bodyPart as BodyPart, (counts.get(e.bodyPart as BodyPart) || 0) + 1);
          total += 1;
        }
      }
    }
    const entries = Array.from(counts.entries())
      .map(([bp, c]) => ({ bp, c, pct: total ? Math.round((c / total) * 100) : 0 }))
      .sort((a, b) => b.c - a.c);
    const text = entries.length
      ? entries.map(x => `${x.bp} ${x.pct}%`).join(', ')
      : 'No sets this week';
    // Build fixed order dataset for radar (Chest, Back, Legs, Shoulders, Arms, Abs)
    const order: BodyPart[] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];
    const countsBy = order.map(bp => counts.get(bp) || 0);
    const maxCount = Math.max(1, ...countsBy);
    const values = countsBy.map(c => (maxCount ? c / maxCount : 0));
    return { entries, text, values, order };
  }, [exercises, weekly.rangeStart, weekly.rangeEnd]);

  const weeklyProgress = useMemo(() => {
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const curStart = weekly.rangeStart;
    const curEnd = weekly.rangeEnd;
    const prevStart = curStart - weekMs;
    const prevEnd = curStart - 1;
    let curVol = 0;
    let prevVol = 0;
    for (const e of exercises) {
      for (const s of e.sets) {
        const ts = Number(String(s.id).split('-')[0]);
        const vol = (Number(s.weight) || 0) * (Number(s.reps) || 0);
        if (!Number.isFinite(ts)) continue;
        if (ts >= curStart && ts <= curEnd) curVol += vol;
        else if (ts >= prevStart && ts <= prevEnd) prevVol += vol;
      }
    }
    const change = prevVol === 0 ? (curVol > 0 ? 100 : 0) : ((curVol - prevVol) / prevVol) * 100;
    const rounded = Math.round(change);
    const sign = rounded >= 0 ? '+' : '';
    let note = 'stable week';
    if (rounded >= 10) note = 'good progressive overload!';
    else if (rounded <= -10) note = 'consider deload or consistency';
    return { curVol, prevVol, rounded };
  }, [exercises, weekly.rangeStart, weekly.rangeEnd]);

  const addExercise = () => {
    const name = exerciseName.trim();
    if (!name) return;
    const newExercise: Exercise = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      bodyPart: selectedBodyPart,
      sets: [],
    };
    setExercises(prev => [newExercise, ...prev]);
    setExerciseName('');
  };

  const deleteExercise = (id: string) => {
    setExercises(prev => prev.filter(e => e.id !== id));
  };

  const addSet = (exerciseId: string, reps: number, weight: number) => {
    if (!Number.isFinite(reps) || reps <= 0) return;
    if (!Number.isFinite(weight) || weight < 0) return;
    setExercises(prev =>
      prev.map(e =>
        e.id === exerciseId
          ? {
              ...e,
              sets: [
                { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, reps, weight },
                ...e.sets,
              ],
            }
          : e,
      ),
    );
  };

  const deleteSet = (exerciseId: string, setId: string) => {
    setExercises(prev =>
      prev.map(e =>
        e.id === exerciseId ? { ...e, sets: e.sets.filter(s => s.id !== setId) } : e,
      ),
    );
  };

  const renderLogger = () => (
    <>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.text }]}>Logger</Text>
        <Text style={[styles.dateText, { color: theme.text }]}>{dateStr}</Text>
      </View>
      <Text style={[styles.subtitle, { color: theme.muted }]}>Small progress each day adds up to big results.</Text>

      <RoundedView style={[styles.card, styles.shadowSoft, { backgroundColor: theme.card, borderColor: theme.border }]}> 
        <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Add Exercise</Text>
        <View style={styles.column}>
          <TextInput
            placeholder="e.g. Bench Press"
            placeholderTextColor={theme.muted}
            value={exerciseName}
            onChangeText={setExerciseName}
            style={[styles.input, styles.inputTop, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
            returnKeyType="done"
            onSubmitEditing={addExercise}
          />
          <Pressable onPress={() => setBodyPartPickerOpen(true)} style={({ pressed }) => [styles.button, styles.buttonFull, { backgroundColor: pressed ? theme.input : theme.card, borderWidth: 1, borderColor: theme.border }]}>
            <Text style={[styles.buttonLabel, { color: theme.textSecondary }]}>Body Part: </Text>
            <Text style={[styles.buttonLabelStrong, { color: theme.text }]}>{selectedBodyPart}</Text>
          </Pressable>
          <View style={styles.actionsRowTwo}>
            <Pressable onPress={addExercise} style={({ pressed }) => [styles.button, styles.buttonHalf, { backgroundColor: pressed ? theme.accentPressed : theme.accent }]}>
              <Text style={styles.buttonText}>Add</Text>
            </Pressable>
            <Pressable onPress={() => setLibraryOpen(true)} style={({ pressed }) => [styles.button, styles.buttonHalf, { backgroundColor: pressed ? theme.accentPressed : theme.accent }]}>
              <Text style={styles.buttonText}>Browse</Text>
            </Pressable>
          </View>
        </View>
      </RoundedView>

      <FlatList
        data={exercises}
        keyExtractor={item => item.id}
        scrollEnabled={false}
        ListEmptyComponent={() => (
          <Text style={[styles.emptyText, { color: theme.muted }]}>No exercises yet. Add one above.</Text>
        )}
        renderItem={({ item }) => (
          <ExerciseCard
            exercise={item}
            theme={theme}
            onDelete={() => deleteExercise(item.id)}
            onAddSet={(reps, weight) => addSet(item.id, reps, weight)}
            onDeleteSet={(setId: string) => deleteSet(item.id, setId)}
          />
        )}
        contentContainerStyle={styles.listContent}
      />

      <ExerciseLibraryModal
        visible={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        theme={theme}
        filter={libraryFilter}
        setFilter={setLibraryFilter}
        onSelect={(item) => {
          const newExercise: Exercise = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: item.name,
            bodyPart: item.bodyPart,
            sets: [],
          };
          setExercises(prev => [newExercise, ...prev]);
          setLibraryOpen(false);
        }}
      />

      <BodyPartPickerModal
        visible={bodyPartPickerOpen}
        onClose={() => setBodyPartPickerOpen(false)}
        theme={theme}
        selected={selectedBodyPart}
        onSelect={(bp) => {
          setSelectedBodyPart(bp);
          setBodyPartPickerOpen(false);
        }}
      />
    </>
  );

  const renderToday = () => (
    <>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.text }]}>Today</Text>
        <Text style={[styles.dateText, { color: theme.text }]}>{dateStr}</Text>
      </View>
      <Text style={[styles.subtitle, { color: theme.muted }]}>Overview of today's training.</Text>
      <RoundedView style={[styles.card, styles.shadowSoft, { backgroundColor: theme.card, borderColor: theme.border }]}> 
        <Text style={{ color: theme.textSecondary }}>No summary yet. Log sets in Logger to see today's breakdown.</Text>
      </RoundedView>
    </>
  );

  const renderProgress = () => (
    <>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.text }]}>Progress</Text>
        <Text style={[styles.dateText, { color: theme.text }]}>{dateStr}</Text>
      </View>
      <Text style={[styles.subtitle, { color: theme.muted }]}>Your recent volume and sessions will appear here.</Text>

      <RoundedView style={[styles.card, styles.shadowSoft, { backgroundColor: theme.card, borderColor: theme.border }]}> 
        <View style={{ alignItems: 'center' }}>
          <RadarChart
            theme={theme}
            size={240}
            levels={4}
            labels={['Chest','Back','Legs','Shoulders','Arms','Abs']}
            values={muscleBreakdown.values}
          />
        </View>
      </RoundedView>

      <RoundedView style={[styles.card, styles.shadowSoft, { backgroundColor: theme.card, borderColor: theme.border }]}> 
        <View style={styles.statsRow}>
          <View>
            <Text style={[styles.statsLabel, { color: theme.text }]}>Total Volume</Text>
            <Text style={[styles.statsSub, { color: theme.muted }]}>Weight × Reps × Sets</Text>
          </View>
          <Text style={[styles.statsValue, { color: theme.text }]}>
            Today: <Text style={styles.emph}>{Intl.NumberFormat().format(totalVolume)} kg</Text> lifted
          </Text>
        </View>
        <View style={[styles.statsRow, { borderTopColor: theme.border }]}> 
          <View>
            <Text style={[styles.statsLabel, { color: theme.text }]}>Total Sets & Reps</Text>
            <Text style={[styles.statsSub, { color: theme.muted }]}>Session workload</Text>
          </View>
          <Text style={[styles.statsValue, { color: theme.text }]}>
            You did <Text style={styles.emph}>{totalSets} sets</Text> today
          </Text>
        </View>
      </RoundedView>

      <RoundedView style={[styles.card, styles.shadowSoft, { backgroundColor: theme.card, borderColor: theme.border }]}> 
        <View style={styles.statsRow}>
          <View>
            <Text style={[styles.statsLabel, { color: theme.text }]}>Weekly Volume Progress</Text>
            <Text style={[styles.statsSub, { color: theme.muted }]}>Whether training is increasing</Text>
          </View>
          {(() => {
            const pct = weeklyProgress.rounded;
            const sign = pct >= 0 ? '+' : '';
            const green = (theme.bg === '#000000') ? '#30D158' : '#34C759';
            const red = (theme.bg === '#000000') ? '#FF453A' : '#FF3B30';
            const color = pct > 0 ? green : pct < 0 ? red : theme.muted;
            return (
              <Text style={[styles.statsValue, { color, fontSize: 18, fontWeight: '800' }]}>
                {`${sign}${pct}%`}
              </Text>
            );
          })()}
        </View>
      </RoundedView>

      <RoundedView style={[styles.card, styles.shadowSoft, { backgroundColor: theme.card, borderColor: theme.border }]}> 
        <View style={[styles.cardHeader, { marginBottom: 0 }]}> 
          <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Weekly Volume</Text>
        </View>
        <View style={styles.chartWithAxis}>
          <View style={styles.yAxis}>
            {[...weekly.ticks].reverse().map((v) => (
              <View key={v} style={[styles.yTickRow, { borderColor: theme.border }]}> 
                <Text style={[styles.yTickLabel, { color: theme.muted }]}>{v}</Text>
              </View>
            ))}
          </View>
          <View style={styles.chartArea}>
            <View style={styles.chartContainer}>
              {weekly.days.map((d, i) => {
                const h = Math.max(4, Math.round((d.volume / weekly.max) * CHART_H));
                return (
                  <View key={i} style={styles.chartBar}>
                    <View style={[styles.chartBarTrack, { backgroundColor: theme.input, borderColor: theme.border }]}> 
                      <View style={[styles.chartBarFill, { height: h, backgroundColor: theme.accent }]} />
                    </View>
                    <Text style={[styles.chartBarLabel, { color: theme.muted }]}>{d.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </RoundedView>

      
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}> 
      <Animated.ScrollView
        ref={pagesRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        onMomentumScrollEnd={(e) => {
          const page = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width));
          const next = tabs[Math.min(tabs.length - 1, Math.max(0, page))];
          if (next && next !== activeTab) setActiveTab(next);
        }}
      >
        <Animated.View style={{ width, opacity: scrollX.interpolate({ inputRange: [-width, 0, width], outputRange: [0.6, 1, 0.6], extrapolate: 'clamp' }), transform: [{ scale: scrollX.interpolate({ inputRange: [-width, 0, width], outputRange: [0.98, 1, 0.98], extrapolate: 'clamp' }) }] }}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {renderLogger()}
          </ScrollView>
        </Animated.View>
        <Animated.View style={{ width, opacity: scrollX.interpolate({ inputRange: [0, width, 2*width], outputRange: [0.6, 1, 0.6], extrapolate: 'clamp' }), transform: [{ scale: scrollX.interpolate({ inputRange: [0, width, 2*width], outputRange: [0.98, 1, 0.98], extrapolate: 'clamp' }) }] }}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {renderToday()}
          </ScrollView>
        </Animated.View>
        <Animated.View style={{ width, opacity: scrollX.interpolate({ inputRange: [width, 2*width, 3*width], outputRange: [0.6, 1, 0.6], extrapolate: 'clamp' }), transform: [{ scale: scrollX.interpolate({ inputRange: [width, 2*width, 3*width], outputRange: [0.98, 1, 0.98], extrapolate: 'clamp' }) }] }}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {renderProgress()}
          </ScrollView>
        </Animated.View>
      </Animated.ScrollView>

      <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.card }}>
        <View style={[styles.tabBar, { borderColor: theme.border, backgroundColor: theme.card }]}> 
          {(['Logger','Today','Progress'] as const).map(tab => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} style={({ pressed }) => [styles.tabBtn, activeTab === tab && styles.tabBtnActive, { opacity: pressed ? 0.9 : 1, backgroundColor: activeTab === tab ? theme.accent : 'transparent', borderColor: theme.border }]}>
              <Text style={[styles.tabText, { color: activeTab === tab ? theme.onAccent : theme.textSecondary }]}>{tab}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

function ExerciseCard({
  exercise,
  theme,
  onDelete,
  onAddSet,
  onDeleteSet,
}: {
  exercise: Exercise;
  theme: typeof lightTheme;
  onDelete: () => void;
  onAddSet: (reps: number, weight: number) => void;
  onDeleteSet: (setId: string) => void;
}) {
  const [repsText, setRepsText] = useState('');
  const [weightText, setWeightText] = useState('');

  const submitSet = () => {
    const reps = Number(repsText);
    const weight = Number(weightText);
    if (!Number.isFinite(reps) || reps <= 0) return;
    if (!Number.isFinite(weight) || weight < 0) return;
    onAddSet(reps, weight);
    setRepsText('');
    setWeightText('');
  };

  return (
    <RoundedView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}> 
      <View style={styles.cardHeader}>
        <View style={styles.row}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{exercise.name}</Text>
          <View style={[styles.badge, { backgroundColor: theme.input, borderColor: theme.border }]}>
            <Text style={[styles.badgeText, { color: theme.textSecondary }]}>{exercise.bodyPart}</Text>
          </View>
        </View>
        <Pressable onPress={onDelete} style={({ pressed }) => [styles.iconBtn, { backgroundColor: pressed ? theme.dangerPressed : theme.danger }]}>
          <Text style={styles.iconText}>Delete</Text>
        </Pressable>
      </View>

      <View style={styles.trioRow}>
        <TextInput
          placeholder="Reps"
          placeholderTextColor={theme.muted}
          keyboardType="number-pad"
          value={repsText}
          onChangeText={setRepsText}
          style={[styles.input, styles.trioItem, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
          returnKeyType="done"
          onSubmitEditing={submitSet}
        />
        <TextInput
          placeholder="Weight"
          placeholderTextColor={theme.muted}
          keyboardType="decimal-pad"
          value={weightText}
          onChangeText={setWeightText}
          style={[styles.input, styles.trioItem, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
          returnKeyType="done"
          onSubmitEditing={submitSet}
        />
        <Pressable onPress={submitSet} style={({ pressed }) => [styles.button, styles.trioItem, styles.trioButton, { backgroundColor: pressed ? theme.accentPressed : theme.accent }]}>
          <Text style={[styles.buttonText, { color: theme.onAccent } ]}>Add Set</Text>
        </Pressable>
      </View>

      {exercise.sets.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.muted }]}>No sets yet.</Text>
      ) : (
        <View style={styles.setsContainer}>
          {exercise.sets.map(s => (
            <RoundedView key={s.id} style={[styles.setRow, { borderColor: theme.border }]}> 
              <Text style={[styles.setText, { color: theme.textSecondary }]}>Reps: {s.reps}</Text>
              <Text style={[styles.setText, { color: theme.textSecondary }]}>Weight: {s.weight}</Text>
              <Pressable onPress={() => onDeleteSet(s.id)} style={({ pressed }) => [styles.iconBtnSmall, { backgroundColor: pressed ? theme.dangerPressed : theme.danger }]}> 
                <Text style={styles.iconText}>Del</Text>
              </Pressable>
            </RoundedView>
          ))}
        </View>
      )}
    </RoundedView>
  );
}

const lightTheme = {
  bg: '#F2F2F7', // iOS grouped background
  text: '#111111',
  textSecondary: '#3A3A3C',
  muted: '#8E8E93',
  card: '#FFFFFF',
  border: '#E5E5EA',
  input: '#F2F2F7',
  accent: '#000000', // primary pill buttons
  accentPressed: '#111111',
  onAccent: '#FFFFFF',
  danger: '#FF3B30',
  dangerPressed: '#D32F23',
};

const darkTheme = {
  bg: '#000000',
  text: '#FFFFFF',
  textSecondary: '#D1D1D6',
  muted: '#8E8E93',
  card: '#1C1C1E',
  border: '#2C2C2E',
  input: '#1C1C1E',
  accent: '#FFFFFF',
  accentPressed: '#E5E5EA',
  onAccent: '#000000',
  danger: '#FF453A',
  dangerPressed: '#FF3B30',
};

const RC = 16; // container radius (cards, rows, modals)
const RI = 12; // control radius (inputs, chips, buttons)
const CH = 44; // uniform control height
const CHART_H = 120; // bar max height in px
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    borderRadius: RC,
    padding: 16,
    borderWidth: 1,
    marginBottom: 5,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
    marginTop: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowTight: {
    gap: 0,
  },
  trioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trioItem: {
    flex: 1,
    height: CH,
  },
  trioButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  setInputsRow: {
    flex: 0.72,
    flexDirection: 'row',
    gap: 5,
  },
  column: {
    flexDirection: 'column',
    gap: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionsRowTwo: {
    flexDirection: 'row',
    gap: 8,
  },
  gapSmall: {
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: RI,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    overflow: 'hidden',
  },
  inputTop: {
    marginTop: 12,
  },
  inputHalf: {
    flex: 0.5,
  },
  button: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: RI,
    overflow: 'hidden',
  },
  buttonFlex: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFull: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buttonHalf: {
    flex: 1,
  },
  buttonLabel: {
    fontWeight: '500',
  },
  buttonLabelStrong: {
    fontWeight: '700',
  },
  buttonNarrow: {
    paddingHorizontal: 12,
  },
  buttonFixed: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  badge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  iconBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  iconBtnSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  iconText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  chip: {
    borderWidth: 1,
    borderRadius: RI,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyText: {
    fontSize: 14,
  },
  setsContainer: {
    gap: 8,
    marginTop: 8,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: RC,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  setText: {
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '75%',
    borderTopLeftRadius: RC,
    borderTopRightRadius: RC,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  shadowSoft: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  libraryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: RC,
    paddingHorizontal: 12,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  tabBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: RI,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tabBtnActive: {
    // background handled inline with theme.accent
  },
  tabText: {
    fontWeight: '700',
  },
  // Progress metrics
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  statsLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  statsSub: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.9,
  },
  statsValue: {
    textAlign: 'right',
    maxWidth: '55%',
    fontSize: 14,
    fontWeight: '600',
  },
  emph: {
    fontWeight: '800',
  },
  // Weekly bar chart
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 8,
    height: 160,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  chartBarTrack: {
    width: 18,
    height: 130,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 10,
  },
  chartBarLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  chartWithAxis: {
    flexDirection: 'row',
    gap: 8,
  },
  yAxis: {
    width: 44,
    height: 160,
    paddingTop: 8,
    justifyContent: 'space-between',
  },
  yTickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 0,
    paddingTop: 2,
  },
  yTickLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  chartArea: {
    flex: 1,
    height: 160,
    position: 'relative',
  },
  yGrid: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  gridLine: {
    borderTopWidth: 1,
  },
});

export default App;

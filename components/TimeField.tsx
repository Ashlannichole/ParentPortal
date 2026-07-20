import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../theme/ThemeProvider';

interface TimeFieldProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
}

function toInputValue(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function TimeField({ label, value, onChange, placeholder = 'Select a time' }: TimeFieldProps) {
  const { colors } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  const displayValue = value
    ? value.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : placeholder;

  // Same web caveat as DateField -- no web implementation upstream, so we
  // fall back to a plain HTML time input there.
  if (Platform.OS === 'web') {
    return (
      <View style={styles.wrapper}>
        {label ? <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text> : null}
        <input
          type="time"
          value={value ? toInputValue(value) : ''}
          onChange={(e) => {
            if (!e.target.value) return;
            const [h, m] = e.target.value.split(':').map(Number);
            const d = value ? new Date(value) : new Date();
            d.setHours(h, m, 0, 0);
            onChange(d);
          }}
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            padding: 12,
            fontSize: 16,
            backgroundColor: colors.card,
            color: colors.text,
            fontFamily: 'inherit',
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text> : null}
      <Pressable
        onPress={() => setShowPicker(true)}
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card }]}
      >
        <Text style={{ color: value ? colors.text : colors.textMuted, fontSize: 16 }}>{displayValue}</Text>
      </Pressable>
      {showPicker ? (
        <>
          <DateTimePicker
            value={value ?? new Date()}
            mode="time"
            display="spinner"
            onChange={(event, selectedDate) => {
              if (Platform.OS === 'android') setShowPicker(false);
              if (event.type !== 'dismissed' && selectedDate) onChange(selectedDate);
            }}
          />
          {Platform.OS === 'ios' ? (
            <Pressable onPress={() => setShowPicker(false)} style={styles.doneButton}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Done</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { fontSize: 13, marginBottom: 6, fontWeight: '500' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  doneButton: { alignItems: 'flex-end', paddingVertical: 8 },
});

import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../theme/ThemeProvider';

interface DateFieldProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
}

function toInputValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function DateField({ label, value, onChange, placeholder = 'Select a date' }: DateFieldProps) {
  const { colors } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  const displayValue = value
    ? value.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : placeholder;

  // @react-native-community/datetimepicker has no web implementation at all
  // (it renders null there) -- fall back to a plain HTML date input, which
  // react-native-web happily renders since this all runs through ReactDOM.
  if (Platform.OS === 'web') {
    return (
      <View style={styles.wrapper}>
        {label ? <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text> : null}
        <input
          type="date"
          value={value ? toInputValue(value) : ''}
          onChange={(e) => {
            if (!e.target.value) return;
            const [y, m, d] = e.target.value.split('-').map(Number);
            onChange(new Date(y, m - 1, d));
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
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
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

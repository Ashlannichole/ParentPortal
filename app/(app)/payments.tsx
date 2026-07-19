import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { ErrorText } from '../../components/ErrorText';
import { usePayments } from '../../hooks/usePayments';
import { useAthletes } from '../../hooks/useAthletes';
import { useTheme } from '../../theme/ThemeProvider';
import type { Payment } from '../../lib/types';

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function Payments() {
  const { colors } = useTheme();
  const { data: payments, isLoading, isCoach, addPayment, setStatus } = usePayments();
  const { data: athletes } = useAthletes();

  const [modalVisible, setModalVisible] = useState(false);
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; items: Payment[] }>();
    for (const p of payments ?? []) {
      const name = p.athletes?.name ?? 'Unknown';
      if (!map.has(p.athlete_id)) map.set(p.athlete_id, { name, items: [] });
      map.get(p.athlete_id)!.items.push(p);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [payments]);

  const resetForm = () => {
    setAthleteId(null);
    setDescription('');
    setAmount('');
    setDueDate('');
    setError(null);
  };

  const onSubmit = async () => {
    setError(null);
    const cents = Math.round(parseFloat(amount) * 100);
    if (!athleteId || !description.trim() || isNaN(cents) || cents <= 0) {
      setError('Pick an athlete, a description, and a valid amount.');
      return;
    }
    try {
      await addPayment.mutateAsync({
        athlete_id: athleteId,
        description: description.trim(),
        amount_cents: cents,
        due_date: dueDate.trim() || null,
      });
      setModalVisible(false);
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add payment.');
    }
  };

  return (
    <Screen scroll>
      {isCoach ? <Button title="+ Add Payment" onPress={() => setModalVisible(true)} /> : null}

      {!isLoading && grouped.length === 0 ? (
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>
          No payments tracked yet.
        </Text>
      ) : null}

      {grouped.map((group) => {
        const balanceDue = group.items
          .filter((i) => i.status === 'unpaid')
          .reduce((sum, i) => sum + i.amount_cents, 0);
        return (
          <Card key={group.name} style={{ marginTop: 16 }}>
            <View style={styles.groupHeader}>
              <Text style={[styles.groupName, { color: colors.text }]}>{group.name}</Text>
              <Text style={{ color: balanceDue > 0 ? colors.danger : colors.success, fontWeight: '600' }}>
                {balanceDue > 0 ? `${formatMoney(balanceDue)} due` : 'Paid up'}
              </Text>
            </View>
            {group.items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text }}>{item.description}</Text>
                  {item.due_date ? (
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>Due {item.due_date}</Text>
                  ) : null}
                </View>
                <Text style={{ color: colors.text, marginRight: 12 }}>{formatMoney(item.amount_cents)}</Text>
                {isCoach ? (
                  <Pressable
                    onPress={() => setStatus.mutate({ id: item.id, status: item.status === 'paid' ? 'unpaid' : 'paid' })}
                  >
                    <Text
                      style={{
                        color: item.status === 'paid' ? colors.success : colors.danger,
                        fontWeight: '700',
                      }}
                    >
                      {item.status === 'paid' ? 'Paid' : 'Unpaid'}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={{ color: item.status === 'paid' ? colors.success : colors.danger, fontWeight: '700' }}>
                    {item.status === 'paid' ? 'Paid' : 'Unpaid'}
                  </Text>
                )}
              </View>
            ))}
          </Card>
        );
      })}

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Screen scroll>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 16 }}>
            Add Payment
          </Text>
          <ErrorText>{error}</ErrorText>
          <Text style={{ color: colors.textMuted, marginBottom: 6 }}>Athlete</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {(athletes ?? []).map((a) => (
              <Pressable
                key={a.id}
                onPress={() => setAthleteId(a.id)}
                style={[
                  styles.athleteChip,
                  {
                    borderColor: colors.border,
                    backgroundColor: athleteId === a.id ? colors.primary : 'transparent',
                  },
                ]}
              >
                <Text style={{ color: athleteId === a.id ? '#fff' : colors.text }}>{a.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <TextField label="Description" value={description} onChangeText={setDescription} placeholder="e.g. Tournament fee" />
          <TextField label="Amount (USD)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="45.00" />
          <TextField label="Due Date (optional, YYYY-MM-DD)" value={dueDate} onChangeText={setDueDate} placeholder="2026-09-01" />
          <Button title="Save" onPress={onSubmit} loading={addPayment.isPending} />
          <View style={{ height: 10 }} />
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => {
              setModalVisible(false);
              resetForm();
            }}
          />
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  groupName: { fontSize: 16, fontWeight: '700' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  athleteChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
});

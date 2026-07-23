import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { ErrorText } from '../../components/ErrorText';
import { DateField } from '../../components/DateField';
import { AthletePaymentCard, groupPaymentsByAthlete } from '../../components/PaymentSummary';
import { usePayments } from '../../hooks/usePayments';
import { useAthletes } from '../../hooks/useAthletes';
import { useTheme } from '../../theme/ThemeProvider';

export default function Payments() {
  const { colors } = useTheme();
  const { data: payments, isLoading, isCoach, addPayment } = usePayments();
  const { data: athletes } = useAthletes();

  const [modalVisible, setModalVisible] = useState(false);
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => groupPaymentsByAthlete(payments), [payments]);

  const resetForm = () => {
    setAthleteId(null);
    setDescription('');
    setAmount('');
    setDueDate(null);
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
        due_date: dueDate ? dueDate.toISOString().slice(0, 10) : null,
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

      <View style={{ marginTop: 16 }}>
        {grouped.map((group) => (
          <AthletePaymentCard key={group.athleteId} group={group} isCoach={isCoach} />
        ))}
      </View>

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
          <TextField label="Description" value={description} onChangeText={setDescription} placeholder="e.g. Club dues" />
          <TextField label="Amount (USD)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="200.00" />
          <DateField label="Due Date (optional)" value={dueDate} onChange={setDueDate} />
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
  athleteChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
});

import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from './Screen';
import { Card } from './Card';
import { Button } from './Button';
import { TextField } from './TextField';
import { ErrorText } from './ErrorText';
import { ProgressRing } from './ProgressRing';
import { DateField } from './DateField';
import { usePayments } from '../hooks/usePayments';
import { useTheme } from '../theme/ThemeProvider';
import type { Payment } from '../lib/types';

export function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export interface AthleteGroup {
  athleteId: string;
  name: string;
  items: Payment[];
}

export function paidCentsFor(item: Payment) {
  return (item.payment_installments ?? []).reduce((sum, i) => sum + i.amount_cents, 0);
}

export function groupPaymentsByAthlete(payments: Payment[] | undefined): AthleteGroup[] {
  const map = new Map<string, AthleteGroup>();
  for (const p of payments ?? []) {
    const name = p.athletes?.name ?? 'Unknown';
    if (!map.has(p.athlete_id)) map.set(p.athlete_id, { athleteId: p.athlete_id, name, items: [] });
    map.get(p.athlete_id)!.items.push(p);
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function PaymentItemRow({ item, isCoach }: { item: Payment; isCoach: boolean }) {
  const { colors } = useTheme();
  const { addInstallment } = usePayments();
  const [recordModalVisible, setRecordModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState<Date | null>(new Date());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const paid = paidCentsFor(item);
  const remaining = item.amount_cents - paid;
  const installments = [...(item.payment_installments ?? [])].sort((a, b) => b.paid_at.localeCompare(a.paid_at));

  const openRecordModal = () => {
    setAmount('');
    setPaidAt(new Date());
    setNote('');
    setError(null);
    setRecordModalVisible(true);
  };

  const onRecordPayment = async (cents: number) => {
    setError(null);
    if (cents <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    try {
      await addInstallment.mutateAsync({
        payment_id: item.id,
        amount_cents: cents,
        paid_at: (paidAt ?? new Date()).toISOString().slice(0, 10),
        note: note.trim() || null,
      });
      setRecordModalVisible(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not record payment.');
    }
  };

  return (
    <View style={styles.itemBlock}>
      <View style={styles.itemRow}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text }}>{item.description}</Text>
          {item.due_date ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>Due {item.due_date}</Text> : null}
        </View>
        <Text style={{ color: colors.text, marginRight: 12 }}>{formatMoney(item.amount_cents)}</Text>
        <Text style={{ color: remaining > 0 ? colors.danger : colors.success, fontWeight: '700' }}>
          {remaining > 0 ? `${formatMoney(remaining)} left` : 'Paid'}
        </Text>
      </View>

      {installments.length > 0 ? (
        <View style={styles.historyBlock}>
          {installments.map((inst) => (
            <Text key={inst.id} style={{ color: colors.textMuted, fontSize: 12 }}>
              • {formatMoney(inst.amount_cents)} on {inst.paid_at}
              {inst.note ? ` — ${inst.note}` : ''}
            </Text>
          ))}
        </View>
      ) : null}

      {isCoach && remaining > 0 ? (
        <View style={styles.itemActions}>
          <Button title="Record Payment" variant="secondary" onPress={openRecordModal} />
          <View style={{ width: 8 }} />
          <Button title="Mark Paid in Full" onPress={() => onRecordPayment(remaining)} />
        </View>
      ) : null}

      <Modal visible={recordModalVisible} animationType="slide" onRequestClose={() => setRecordModalVisible(false)}>
        <Screen scroll>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 16 }}>Record Payment</Text>
          <ErrorText>{error}</ErrorText>
          <Text style={{ color: colors.textMuted, marginBottom: 10 }}>{formatMoney(remaining)} remaining on {item.description}</Text>
          <TextField label="Amount (USD)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="50.00" />
          <DateField label="Date Paid" value={paidAt} onChange={setPaidAt} />
          <TextField label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. Venmo, check #123" />
          <Button
            title="Save"
            onPress={() => onRecordPayment(Math.round(parseFloat(amount) * 100))}
            loading={addInstallment.isPending}
            disabled={!amount}
          />
          <View style={{ height: 10 }} />
          <Button title="Cancel" variant="secondary" onPress={() => setRecordModalVisible(false)} />
        </Screen>
      </Modal>
    </View>
  );
}

export function AthletePaymentCard({ group, isCoach }: { group: AthleteGroup; isCoach: boolean }) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const totalCents = group.items.reduce((sum, i) => sum + i.amount_cents, 0);
  const paidCents = group.items.reduce((sum, i) => sum + paidCentsFor(i), 0);
  const percent = totalCents > 0 ? (paidCents / totalCents) * 100 : 0;
  const balanceDue = totalCents - paidCents;

  return (
    <Card>
      <Pressable onPress={() => setExpanded((e) => !e)} style={styles.groupHeader}>
        <ProgressRing
          percent={percent}
          color={percent >= 100 ? colors.success : colors.accent}
          trackColor={colors.surface}
          textColor={colors.text}
        />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={[styles.groupName, { color: colors.text }]}>{group.name}</Text>
          <Text style={{ color: balanceDue > 0 ? colors.danger : colors.success, fontWeight: '600', marginTop: 4 }}>
            {balanceDue > 0 ? `${formatMoney(balanceDue)} due` : 'Paid up'}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
            {expanded ? 'Tap to collapse' : 'Tap for details'}
          </Text>
        </View>
      </Pressable>

      {expanded ? (
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#8884' }}>
          {group.items.map((item) => (
            <PaymentItemRow key={item.id} item={item} isCoach={isCoach} />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  groupHeader: { flexDirection: 'row', alignItems: 'center' },
  groupName: { fontSize: 16, fontWeight: '700' },
  itemBlock: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#8884' },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemActions: { flexDirection: 'row', marginTop: 8 },
  historyBlock: { marginTop: 6, gap: 2 },
});

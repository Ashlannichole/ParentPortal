import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../hooks/useAuth';
import { useContacts, useUpdateMyContactInfo } from '../../hooks/useContacts';
import { useTheme } from '../../theme/ThemeProvider';

export default function Contacts() {
  const { colors } = useTheme();
  const { teamMember } = useAuth();
  const { data: contacts, isLoading } = useContacts();
  const updateContactInfo = useUpdateMyContactInfo();

  const [fullName, setFullName] = useState(teamMember?.full_name ?? '');
  const [phone, setPhone] = useState(teamMember?.phone ?? '');

  useEffect(() => {
    setFullName(teamMember?.full_name ?? '');
    setPhone(teamMember?.phone ?? '');
  }, [teamMember?.full_name, teamMember?.phone]);

  const others = (contacts ?? []).filter((c) => c.user_id !== teamMember?.user_id);

  return (
    <Screen>
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>My Contact Info</Text>
        <TextField label="Your Name" value={fullName} onChangeText={setFullName} />
        <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Button
          title="Save"
          onPress={() => updateContactInfo.mutate({ fullName, phone })}
          loading={updateContactInfo.isPending}
        />
      </Card>

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 8 }]}>Team Directory</Text>
      <FlatList
        data={others}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{item.full_name || 'Unnamed'}</Text>
              <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
                {item.role}
              </Text>
            </View>
            {item.phone ? <Text style={{ color: colors.textMuted, marginTop: 4 }}>{item.phone}</Text> : null}
          </Card>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 20 }}>
              No other contacts yet.
            </Text>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});

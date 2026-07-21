import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../hooks/useAuth';
import { useCoaches } from '../../hooks/useCoaches';
import { useContacts, useUpdateMyContactInfo } from '../../hooks/useContacts';
import { useTheme } from '../../theme/ThemeProvider';
import type { CoachProfile } from '../../lib/types';

export default function TeamInfo() {
  const { colors } = useTheme();
  const { session, teamMember } = useAuth();
  const isCoach = teamMember?.role === 'coach';

  const { data: coaches, isLoading: coachesLoading, upsertCoach } = useCoaches();
  const { data: contacts, isLoading: contactsLoading } = useContacts();
  const updateContactInfo = useUpdateMyContactInfo();

  const [bioModalVisible, setBioModalVisible] = useState(false);
  const [editingCoach, setEditingCoach] = useState<CoachProfile | null>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const [fullName, setFullName] = useState(teamMember?.full_name ?? '');
  const [phone, setPhone] = useState(teamMember?.phone ?? '');
  const [email, setEmail] = useState(teamMember?.email ?? '');

  useEffect(() => {
    setFullName(teamMember?.full_name ?? '');
    setPhone(teamMember?.phone ?? '');
    setEmail(teamMember?.email ?? '');
  }, [teamMember?.full_name, teamMember?.phone, teamMember?.email]);

  const myCoachProfile = (coaches ?? []).find((c) => c.user_id === session?.user.id);
  const otherContacts = (contacts ?? []).filter((c) => c.user_id !== teamMember?.user_id);

  const openBioEditor = () => {
    setEditingCoach(myCoachProfile ?? null);
    setName(myCoachProfile?.name ?? teamMember?.full_name ?? '');
    setBio(myCoachProfile?.bio ?? '');
    setPhotoUrl(myCoachProfile?.photo_url ?? '');
    setBioModalVisible(true);
  };

  const onSaveBio = async () => {
    await upsertCoach.mutateAsync({
      id: editingCoach?.id,
      name: name.trim(),
      bio: bio.trim() || null,
      photo_url: photoUrl.trim() || null,
    });
    setBioModalVisible(false);
  };

  return (
    <Screen scroll>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Coaches</Text>
      {isCoach ? (
        <Button title={myCoachProfile ? 'Edit My Bio' : 'Add My Bio'} onPress={openBioEditor} />
      ) : null}
      <View style={{ marginTop: 12 }}>
        {(coaches ?? []).map((item) => (
          <Card key={item.id}>
            <View style={styles.row}>
              {item.photo_url ? (
                <Image source={{ uri: item.photo_url }} style={styles.photo} />
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder, { backgroundColor: colors.surface }]}>
                  <Text style={{ color: colors.textMuted, fontSize: 20 }}>{item.name.charAt(0)}</Text>
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{item.name}</Text>
                {item.bio ? <Text style={{ color: colors.textMuted, marginTop: 4 }}>{item.bio}</Text> : null}
              </View>
            </View>
          </Card>
        ))}
        {!coachesLoading && (coaches ?? []).length === 0 ? (
          <Text style={{ color: colors.textMuted, textAlign: 'center', marginVertical: 12 }}>
            No coach bios added yet.
          </Text>
        ) : null}
      </View>

      <Card style={{ marginTop: 24 }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>My Contact Info</Text>
        <TextField label="Your Name" value={fullName} onChangeText={setFullName} />
        <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Button
          title="Save"
          onPress={() => updateContactInfo.mutate({ fullName, phone, email })}
          loading={updateContactInfo.isPending}
        />
      </Card>

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 8 }]}>Team Directory</Text>
      {otherContacts.map((item) => (
        <Card key={item.id}>
          <View style={styles.row}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{item.full_name || 'Unnamed'}</Text>
            <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
              {item.role}
            </Text>
          </View>
          {item.phone ? <Text style={{ color: colors.textMuted, marginTop: 4 }}>{item.phone}</Text> : null}
          {item.email ? <Text style={{ color: colors.textMuted, marginTop: 2 }}>{item.email}</Text> : null}
        </Card>
      ))}
      {!contactsLoading && otherContacts.length === 0 ? (
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginVertical: 12 }}>
          No other contacts yet.
        </Text>
      ) : null}

      <Modal visible={bioModalVisible} animationType="slide" onRequestClose={() => setBioModalVisible(false)}>
        <Screen scroll>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 16 }}>
            {editingCoach ? 'Edit My Bio' : 'Add My Bio'}
          </Text>
          <TextField label="Name" value={name} onChangeText={setName} />
          <TextField label="Bio" value={bio} onChangeText={setBio} multiline numberOfLines={4} />
          <TextField label="Photo URL (optional)" value={photoUrl} onChangeText={setPhotoUrl} autoCapitalize="none" />
          <Button title="Save" onPress={onSaveBio} loading={upsertCoach.isPending} disabled={!name} />
          <View style={{ height: 10 }} />
          <Button title="Cancel" variant="secondary" onPress={() => setBioModalVisible(false)} />
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  photo: { width: 56, height: 56, borderRadius: 28 },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
});

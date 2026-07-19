import React, { useState } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../hooks/useAuth';
import { useCoaches } from '../../hooks/useCoaches';
import { useTheme } from '../../theme/ThemeProvider';
import type { CoachProfile } from '../../lib/types';

export default function Coaches() {
  const { colors } = useTheme();
  const { session, teamMember } = useAuth();
  const isCoach = teamMember?.role === 'coach';
  const { data: coaches, isLoading, upsertCoach } = useCoaches();

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<CoachProfile | null>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const myProfile = (coaches ?? []).find((c) => c.user_id === session?.user.id);

  const openEditor = () => {
    setEditing(myProfile ?? null);
    setName(myProfile?.name ?? teamMember?.full_name ?? '');
    setBio(myProfile?.bio ?? '');
    setPhotoUrl(myProfile?.photo_url ?? '');
    setModalVisible(true);
  };

  const onSubmit = async () => {
    await upsertCoach.mutateAsync({
      id: editing?.id,
      name: name.trim(),
      bio: bio.trim() || null,
      photo_url: photoUrl.trim() || null,
    });
    setModalVisible(false);
  };

  return (
    <Screen>
      {isCoach ? (
        <Button title={myProfile ? 'Edit My Bio' : 'Add My Bio'} onPress={openEditor} />
      ) : null}
      <FlatList
        style={{ marginTop: 12 }}
        data={coaches ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card>
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
        )}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>
              No coach bios added yet.
            </Text>
          ) : null
        }
      />

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Screen scroll>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 16 }}>
            {editing ? 'Edit My Bio' : 'Add My Bio'}
          </Text>
          <TextField label="Name" value={name} onChangeText={setName} />
          <TextField label="Bio" value={bio} onChangeText={setBio} multiline numberOfLines={4} />
          <TextField label="Photo URL (optional)" value={photoUrl} onChangeText={setPhotoUrl} autoCapitalize="none" />
          <Button title="Save" onPress={onSubmit} loading={upsertCoach.isPending} disabled={!name} />
          <View style={{ height: 10 }} />
          <Button title="Cancel" variant="secondary" onPress={() => setModalVisible(false)} />
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  photo: { width: 56, height: 56, borderRadius: 28 },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
});

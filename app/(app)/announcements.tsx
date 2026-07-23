import React, { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { ErrorText } from '../../components/ErrorText';
import { useAnnouncements } from '../../hooks/useAnnouncements';
import { useTheme } from '../../theme/ThemeProvider';
import type { Announcement } from '../../lib/types';

function formatPostedAt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function AnnouncementCard({ item, isCoach, onDelete }: { item: Announcement; isCoach: boolean; onDelete: () => void }) {
  const { colors } = useTheme();

  const confirmDelete = () => {
    Alert.alert('Remove this announcement?', `This will remove "${item.title}" for everyone.`, [
      { text: 'Keep It', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <Card>
      <View style={styles.rowTop}>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{formatPostedAt(item.created_at)}</Text>
        {isCoach ? (
          <Pressable onPress={confirmDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
          </Pressable>
        ) : null}
      </View>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 4 }}>{item.title}</Text>
      <Text style={{ color: colors.text, marginTop: 6 }}>{item.body}</Text>
    </Card>
  );
}

export default function Announcements() {
  const { colors } = useTheme();
  const { data: announcements, isLoading, isCoach, addAnnouncement, deleteAnnouncement } = useAnnouncements();

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setTitle('');
    setBody('');
    setError(null);
  };

  const onSubmit = async () => {
    setError(null);
    if (!title.trim() || !body.trim()) {
      setError('Add a title and a message.');
      return;
    }
    try {
      await addAnnouncement.mutateAsync({ title: title.trim(), body: body.trim() });
      setModalVisible(false);
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post announcement.');
    }
  };

  return (
    <Screen>
      {isCoach ? <Button title="+ New Announcement" onPress={() => setModalVisible(true)} /> : null}
      <FlatList
        style={{ marginTop: 12 }}
        data={announcements ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AnnouncementCard item={item} isCoach={isCoach} onDelete={() => deleteAnnouncement.mutate(item)} />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>
              No announcements yet. {isCoach ? 'Post one to let the team know what’s new.' : ''}
            </Text>
          ) : null
        }
      />

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Screen scroll>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 16 }}>
            New Announcement
          </Text>
          <ErrorText>{error}</ErrorText>
          <TextField label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Practice moved to Friday" />
          <TextField
            label="Message"
            value={body}
            onChangeText={setBody}
            placeholder="Details for the team..."
            multiline
            numberOfLines={4}
          />
          <Button title="Post" onPress={onSubmit} loading={addAnnouncement.isPending} disabled={!title || !body} />
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
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});

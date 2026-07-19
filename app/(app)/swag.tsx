import React, { useState } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../hooks/useAuth';
import { useSwagItems, useSwagVotes } from '../../hooks/useSwag';
import { useTheme } from '../../theme/ThemeProvider';
import type { SwagItem } from '../../lib/types';

function SwagCard({ item }: { item: SwagItem }) {
  const { colors } = useTheme();
  const { session } = useAuth();
  const { data: votes, castVote, retractVote } = useSwagVotes(item.id);

  const upCount = (votes ?? []).filter((v) => v.vote === 'up').length;
  const downCount = (votes ?? []).filter((v) => v.vote === 'down').length;
  const myVote = (votes ?? []).find((v) => v.user_id === session?.user.id)?.vote ?? null;

  const onVote = (vote: 'up' | 'down') => {
    if (myVote === vote) {
      retractVote.mutate();
    } else {
      castVote.mutate(vote);
    }
  };

  return (
    <Card>
      {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.image} /> : null}
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>{item.name}</Text>
      <View style={styles.voteRow}>
        <Pressable
          onPress={() => onVote('up')}
          style={[styles.voteButton, { borderColor: colors.border, backgroundColor: myVote === 'up' ? colors.success : 'transparent' }]}
        >
          <Ionicons name="thumbs-up" size={18} color={myVote === 'up' ? '#fff' : colors.text} />
          <Text style={{ color: myVote === 'up' ? '#fff' : colors.text, marginLeft: 6, fontWeight: '600' }}>
            {upCount}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onVote('down')}
          style={[styles.voteButton, { borderColor: colors.border, backgroundColor: myVote === 'down' ? colors.danger : 'transparent' }]}
        >
          <Ionicons name="thumbs-down" size={18} color={myVote === 'down' ? '#fff' : colors.text} />
          <Text style={{ color: myVote === 'down' ? '#fff' : colors.text, marginLeft: 6, fontWeight: '600' }}>
            {downCount}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

export default function Swag() {
  const { colors } = useTheme();
  const { teamMember } = useAuth();
  const isCoach = teamMember?.role === 'coach';
  const { data: items, isLoading, addItem } = useSwagItems();

  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const onSubmit = async () => {
    await addItem.mutateAsync({ name: name.trim(), image_url: imageUrl.trim() || null });
    setModalVisible(false);
    setName('');
    setImageUrl('');
  };

  return (
    <Screen>
      {isCoach ? <Button title="+ Add SWAG Option" onPress={() => setModalVisible(true)} /> : null}
      <FlatList
        style={{ marginTop: 12 }}
        data={items ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SwagCard item={item} />}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>
              Nothing to vote on yet. {isCoach ? 'Add an apparel option to get started.' : ''}
            </Text>
          ) : null
        }
      />

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Screen scroll>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 16 }}>
            Add SWAG Option
          </Text>
          <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Navy quarter-zip" />
          <TextField label="Image URL (optional)" value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" />
          <Button title="Save" onPress={onSubmit} loading={addItem.isPending} disabled={!name} />
          <View style={{ height: 10 }} />
          <Button title="Cancel" variant="secondary" onPress={() => setModalVisible(false)} />
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: 160, borderRadius: 10, marginBottom: 10 },
  voteRow: { flexDirection: 'row', gap: 10 },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});

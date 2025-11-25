import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';

type Props = {
  name: string;
  description?: string;
  iconUrl?: string;
  membersCount?: number;
  onPress?: () => void;
};

const CommunityCard: React.FC<Props> = ({ name, description, iconUrl, membersCount, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.left}>
        {iconUrl ? (
          <Image source={{ uri: iconUrl }} style={styles.icon} />
        ) : (
          <View style={styles.placeholderIcon}>
            <Text style={styles.placeholderText}>{name.slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.right}>
        <Text style={styles.title} numberOfLines={1}>{name}</Text>
        {!!description && <Text style={styles.subtitle} numberOfLines={2}>{description}</Text>}
        {!!membersCount && <Text style={styles.meta}>{membersCount} members</Text>}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
    marginBottom: 10,
  },
  left: {
    marginRight: 12,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  placeholderIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#f1f1f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#555',
  },
  right: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
  },
  meta: {
    marginTop: 6,
    fontSize: 12,
    color: '#888',
  },
});

export default CommunityCard;



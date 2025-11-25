// list of community members, presentational only
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import MemberListItem from '../components/MemberListItem';
import { useCommunityMembers } from '../../../hooks/useCommunityMembershipData';
import SearchBar from '../../../components/SearchBar';

import CommunityMembersHeader from '../components/CommunityMembersHeader';

const CommunityMemberScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { communityId } = (route.params as any) ?? { communityId: undefined };
  const { members, isLoading } = useCommunityMembers(communityId);

  return (
    <View style={styles.container}>
        <CommunityMembersHeader communityId={communityId}/>
        <SearchBar />
        <FlatList
            data={members}
            keyExtractor={(item: any) => item.membership?.id || item.user?.id}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }: any) => (
            <MemberListItem
                name={item.user?.name ?? item.user?.handle ?? 'Member'}
                handle={item.user?.handle}
                role={(item.membership?.role as any) ?? 'MEMBER'}
                rightActionText={((item.membership?.role as any) === 'ADMIN') ? undefined : 'Promote'}
                onRightActionPress={() => {/* placeholder */}}
            />
            )}
            ListEmptyComponent={
            <View style={{ padding: 24 }}>
                <Text style={{ color: '#666', textAlign: 'center' }}>
                {isLoading ? 'Loading…' : 'No members'}
                </Text>
            </View>
            }
        />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, backgroundColor: '#fff' 
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#eee',
    marginLeft: 68,
  },
});

export default CommunityMemberScreen;
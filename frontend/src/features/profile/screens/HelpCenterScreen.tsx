import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const FAQ_ITEMS = [
  {
    q: 'How do I create a gallery?',
    a: 'Tap the + button on the Groups tab to create a new gallery. You can set a name, cover photo, and invite members.',
  },
  {
    q: 'How do I invite someone to a gallery?',
    a: 'Open the gallery, tap the Members option, then tap Add Members to search for and invite people.',
  },
  {
    q: 'Can I control who can add photos?',
    a: 'Yes. Gallery admins can configure post permissions under the gallery settings to restrict who can upload.',
  },
  {
    q: 'How do I sync photos across devices?',
    a: 'Photos sync automatically when connected to the internet. You can configure cellular sync and background sync under Settings → Sync & Data Usage.',
  },
  {
    q: 'How do I delete a gallery?',
    a: 'Open the gallery details and scroll to the Admin section. Only the gallery owner can delete a gallery.',
  },
  {
    q: 'Why are my photos not uploading?',
    a: 'Check your internet connection. Photos will queue and retry automatically when connectivity is restored. You can also check upload status in the gallery.',
  },
];

const FaqItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(v => !v);
  };

  return (
    <TouchableOpacity
      style={styles.faqItem}
      onPress={toggle}
      activeOpacity={0.6}
    >
      <View style={styles.faqRow}>
        <Text style={styles.faqQuestion}>{q}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={14}
          color="#AAAAAA"
        />
      </View>
      {open && <Text style={styles.faqAnswer}>{a}</Text>}
    </TouchableOpacity>
  );
};

const SectionLabel = ({ title }: { title: string }) => (
  <Text style={styles.sectionLabel}>{title}</Text>
);

const ContactRow = ({ icon, label, sub, onPress, isLast }: any) => (
  <TouchableOpacity
    style={[styles.row, isLast && styles.rowLast]}
    onPress={onPress}
    activeOpacity={0.5}
  >
    <View style={styles.rowIconWrap}>
      <Ionicons name={icon} size={17} color="#555555" />
    </View>
    <View style={styles.rowText}>
      <Text style={styles.rowLabel}>{label}</Text>
      {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
    </View>
    <Ionicons name="chevron-forward" size={14} color="#CECECE" />
  </TouchableOpacity>
);

const HelpCenterScreen = () => {
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* FAQ */}
      <View style={styles.section}>
        <SectionLabel title="FAQ" />
        <View style={styles.card}>
          {FAQ_ITEMS.map((item, i) => (
            <View key={i} style={[i < FAQ_ITEMS.length - 1 && styles.faqDivider]}>
              <FaqItem q={item.q} a={item.a} />
            </View>
          ))}
        </View>
      </View>

      {/* Contact */}
      <View style={styles.section}>
        <SectionLabel title="Contact" />
        <View style={styles.card}>
          <ContactRow
            icon="mail-outline"
            label="Email Support"
            sub="support@focal.app"
            onPress={() => Linking.openURL('mailto:support@focal.app')}
          />
          <ContactRow
            icon="logo-twitter"
            label="Twitter / X"
            sub="@focalapp"
            onPress={() => Linking.openURL('https://twitter.com/focalapp')}
            isLast
          />
        </View>
      </View>

      {/* Legal */}
      <View style={styles.section}>
        <SectionLabel title="Legal" />
        <View style={styles.card}>
          <ContactRow
            icon="document-text-outline"
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://focal.app/privacy')}
          />
          <ContactRow
            icon="shield-checkmark-outline"
            label="Terms of Service"
            onPress={() => Linking.openURL('https://focal.app/terms')}
            isLast
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 60,
    paddingHorizontal: 20,
  },

  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AAAAAA',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
  },

  // FAQ
  faqDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  faqItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111111',
    letterSpacing: -0.1,
    paddingRight: 12,
  },
  faqAnswer: {
    marginTop: 10,
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    fontWeight: '400',
  },

  // Contact / Legal rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111111',
    letterSpacing: -0.1,
  },
  rowSub: {
    fontSize: 12,
    color: '#AAAAAA',
    marginTop: 1,
  },
});

export default HelpCenterScreen;

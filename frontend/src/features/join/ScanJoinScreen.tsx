import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Camera, useCameraDevice, useCodeScanner, useCameraPermission } from 'react-native-vision-camera';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { parseUrl, ParsedLink } from '../../hooks/useDeepLinks';

const ScanJoinScreen = () => {
  const navigation = useNavigation<any>();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const [isFocused, setIsFocused] = useState(false);
  const [code, setCode] = useState('');
  const scanned = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      scanned.current = false;
      if (!hasPermission) requestPermission();
      return () => setIsFocused(false);
    }, [hasPermission, requestPermission])
  );

  const handleParsed = (parsed: ParsedLink) => {
    if (parsed.type === 'gallery') {
      navigation.navigate('JoinGallery', { galleryId: parsed.id });
    } else {
      navigation.navigate('JoinGroup', { groupId: parsed.id });
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (scanned.current) return;
      const value = codes[0]?.value;
      if (!value) return;
      const parsed = parseUrl(value);
      if (parsed) {
        scanned.current = true;
        handleParsed(parsed);
      }
    },
  });

  const handleManualSubmit = () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    const parsed = parseUrl(trimmed);
    if (!parsed) {
      Alert.alert('Invalid Link', 'Please paste a valid Focal invite link (e.g. focal.app/gallery/join/…)');
      return;
    }
    setCode('');
    handleParsed(parsed);
  };

  const canScan = hasPermission && device != null;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Camera / scanner section */}
      <View style={styles.cameraSection}>
        {canScan ? (
          <>
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={isFocused}
              codeScanner={codeScanner}
            />
            {/* Viewfinder overlay */}
            <View style={styles.viewfinderWrap}>
              <View style={styles.viewfinder}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
              <Text style={styles.scanHint}>Point at a Focal invite QR code</Text>
            </View>
          </>
        ) : (
          <View style={styles.noCameraBox}>
            <View style={styles.noCameraIconWrap}>
              <Ionicons name="camera-outline" size={32} color="#BBBBBB" />
            </View>
            <Text style={styles.noCameraTitle}>
              {!hasPermission ? 'Camera access needed' : 'Camera unavailable'}
            </Text>
            <Text style={styles.noCameraSubtitle}>
              {!hasPermission
                ? 'Allow camera access to scan QR codes, or enter a link below.'
                : 'Use the invite link field below to join.'}
            </Text>
            {!hasPermission && (
              <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} activeOpacity={0.7}>
                <Text style={styles.permissionButtonText}>Allow Camera</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Manual entry section */}
      <View style={styles.inputSection}>
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>or enter invite link</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="focal.app/gallery/join/…"
            placeholderTextColor="#BBBBBB"
            value={code}
            onChangeText={setCode}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            onSubmitEditing={handleManualSubmit}
          />
          <TouchableOpacity
            style={[styles.goButton, !code.trim() && styles.goButtonDisabled]}
            onPress={handleManualSubmit}
            disabled={!code.trim()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const CORNER = 22;
const THICKNESS = 3;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // Camera
  cameraSection: {
    flex: 1,
    backgroundColor: '#111111',
    overflow: 'hidden',
  },
  viewfinderWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  viewfinder: {
    width: 220,
    height: 220,
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: '#FFFFFF',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: THICKNESS, borderLeftWidth: THICKNESS },
  cornerTR: { top: 0, right: 0, borderTopWidth: THICKNESS, borderRightWidth: THICKNESS },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: THICKNESS, borderLeftWidth: THICKNESS },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: THICKNESS, borderRightWidth: THICKNESS },
  scanHint: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '400',
    opacity: 0.8,
    textAlign: 'center',
  },

  // No camera fallback
  noCameraBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 10,
  },
  noCameraIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  noCameraTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  noCameraSubtitle: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 19,
  },
  permissionButton: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
  },

  // Manual entry
  inputSection: {
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    gap: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#DDDDDD',
  },
  dividerLabel: {
    fontSize: 12,
    color: '#AAAAAA',
    fontWeight: '400',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 46,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111111',
  },
  goButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goButtonDisabled: {
    opacity: 0.35,
  },
});

export default ScanJoinScreen;

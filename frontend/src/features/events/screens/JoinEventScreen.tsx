import React, { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, StyleSheet, View } from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";
import { Camera, useCameraDevice } from "react-native-vision-camera";
import Ionicons from 'react-native-vector-icons/Ionicons';

const JoinEventScreen = () => {
    const theme = useTheme();
    const device = useCameraDevice('back');
    const [cameraPermission, setCameraPermission] = useState<"granted" | "denied" | "not-determined">("not-determined");
    const [joinCode, setJoinCode] = useState("");

    const isJoinDisabled = useMemo(() => joinCode.trim().length < 4, [joinCode]);

    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const status = await Camera.getCameraPermissionStatus();
                if (!isMounted) return;
                if (status === "granted") {
                    setCameraPermission("granted");
                    return;
                }
                const req = await Camera.requestCameraPermission();
                if (!isMounted) return;
                setCameraPermission(req);
            } catch {
                // If requesting fails, treat as denied so UI shows fallback
                if (isMounted) setCameraPermission("denied");
            }
        })();
        return () => {
            isMounted = false;
        };
    }, []);

    const handleJoin = () => {
        if (isJoinDisabled) return;
        // Hook up your join flow here (API/navigation)
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.select({ ios: "padding", android: undefined })}
        >
            <View style={styles.content}>
                <View style={styles.inputRow}>
                    <TextInput
                        mode="outlined"
                        placeholder="Enter join pin"
                        placeholderTextColor="#9ca3af"
                        value={joinCode}
                        onChangeText={setJoinCode}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        style={styles.pinInput}
                        contentStyle={{ color: "#111827" }}
                        theme={{
                            colors: {
                                background: "#FFFFFF",
                                surface: "#FFFFFF",
                                primary: "#111827",
                                onSurface: "#111827",
                                outline: "#E5E7EB",
                            },
                        }}
                        right={
                            <TextInput.Icon
                                icon={(iconProps) => (
                                    <Ionicons
                                        name="arrow-forward-circle-outline"
                                        size={iconProps.size}
                                        color={isJoinDisabled ? "#D1D5DB" : "#111827"}
                                    />
                                )}
                                onPress={handleJoin}
                                forceTextInputFocus={false}
                                disabled={isJoinDisabled}
                            />
                        }
                        returnKeyType="go"
                        onSubmitEditing={handleJoin}
                    />
                </View>
                
                <View style={styles.separator}>
                    <View style={styles.separatorLine} />
                    <Text style={styles.separatorText}>or</Text>
                    <View style={styles.separatorLine} />
                </View>

                <View style={styles.scannerWrapper}>
                    {cameraPermission === "granted" && device ? (
                        <View style={styles.cameraContainer}>
                            <Camera
                                style={styles.camera}
                                device={device}
                                isActive={true}
                                photo={false}
                                video={false}
                                audio={false}
                            />
                            <View pointerEvents="none" style={styles.overlay}>
                                <View style={styles.scanFrame} />
                                <Text style={styles.overlayText}>Align the QR code within the frame</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={[styles.permissionFallback, { backgroundColor: theme.colors.surfaceVariant }]}>
                            <Text style={styles.fallbackTitle}>Camera access needed</Text>
                            <Text style={styles.fallbackText}>
                                Enable camera to scan event QR codes, or enter your pin above.
                            </Text>
                            <Button
                                mode="contained"
                                onPress={() => Linking.openSettings()}
                                style={styles.permissionButton}
                            >
                                Open Settings
                            </Button>
                        </View>
                    )}
                </View>

            </View>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    headerSection: {
        marginBottom: 12,
    },
    title: {
        marginBottom: 4,
    },
    subtitle: {
        color: "#9ca3af",
    },
    inputRow: {
        marginBottom: 16,
    },
    pinInput: {
        borderRadius: 12,
        backgroundColor: "#FFFFFF",
    },
    separator: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
        gap: 8,
    },
    separatorLine: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
        backgroundColor: "#E5E7EB",
    },
    separatorText: {
        color: "#9ca3af",
        paddingHorizontal: 8,
        textTransform: "uppercase",
        letterSpacing: 1,
        fontSize: 12,
        fontWeight: "600",
    },
    scannerWrapper: {
        flex: 1,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
        marginBottom: 16,
    },
    cameraContainer: {
        flex: 1,
    },
    camera: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
    },
    scanFrame: {
        width: 220,
        height: 220,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "#E5E7EB",
        backgroundColor: "transparent",
    },
    overlayText: {
        position: "absolute",
        bottom: 32,
        color: "#F9FAFB",
        fontSize: 14,
        opacity: 0.9,
    },
    permissionFallback: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        borderRadius: 16,
        backgroundColor: "#FFFFFF",
    },
    permissionButton: {
        marginTop: 12,
    },
    fallbackTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#6b7280",
        marginBottom: 4,
    },
    fallbackText: {
        color: "#9ca3af",
        textAlign: "center",
        marginBottom: 8,
    },
    helper: {
        borderRadius: 12,
        padding: 12,
    },
    helperText: {
        color: "#6b7280",
    }
})  

export default JoinEventScreen;
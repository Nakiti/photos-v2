import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button, SegmentedButtons, Text, TextInput, useTheme } from "react-native-paper";

const JoinEventScreen = () => {
    const theme = useTheme();
    const [mode, setMode] = useState<"code" | "scan">("code");
    const [joinCode, setJoinCode] = useState("");

    const isJoinDisabled = useMemo(() => joinCode.trim().length < 4, [joinCode]);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.select({ ios: "padding", android: undefined })}
        >
            <View style={styles.content}>
                <View style={styles.headerSection}>
                    <Text variant="titleLarge" style={styles.title}>Join an event</Text>
                    <Text style={styles.subtitle}>Enter a code or scan a QR to join.</Text>
                </View>

                <SegmentedButtons
                    value={mode}
                    onValueChange={(val) => setMode(val as "code" | "scan")}
                    buttons={[
                        { value: "code", label: "Enter Code" },
                        { value: "scan", label: "Scan QR" },
                    ]}
                    style={styles.segmented}
                />

                {mode === "code" ? (
                    <View style={styles.card}>
                        <TextInput
                            mode="outlined"
                            label="Join code"
                            placeholder="e.g. ABCD-1234"
                            value={joinCode}
                            onChangeText={setJoinCode}
                            autoCapitalize="characters"
                            autoCorrect={false}
                            right={<TextInput.Icon icon="form-textbox" />}
                        />
                        <Button
                            mode="contained"
                            style={styles.primaryButton}
                            disabled={isJoinDisabled}
                            onPress={() => { /* no-op presentational */ }}
                        >
                            Join event
                        </Button>
                    </View>
                ) : (
                    <View style={styles.card}>
                        <Text style={styles.scanDescription}>
                            We will open your camera to scan the event QR code.
                        </Text>
                        <Button
                            mode="contained"
                            style={styles.primaryButton}
                            icon="qrcode-scan"
                            onPress={() => { /* no-op presentational */ }}
                        >
                            Scan QR code
                        </Button>
                        <Button
                            mode="text"
                            style={styles.secondaryButton}
                            onPress={() => setMode("code")}
                        >
                            Enter code instead
                        </Button>
                    </View>
                )}

                <View style={[styles.helper, { backgroundColor: theme.colors.surfaceVariant }]}> 
                    <Text style={styles.helperText}>
                        Only join events you trust. Codes may expire or be revoked by the owner.
                    </Text>
                </View>
            </View>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    headerSection: {
        marginBottom: 16,
    },
    title: {
        marginBottom: 4,
    },
    subtitle: {
        color: "#6b7280",
    },
    segmented: {
        marginBottom: 16,
    },
    card: {
        gap: 12,
        marginBottom: 24,
    },
    primaryButton: {
        marginTop: 4,
    },
    secondaryButton: {
        alignSelf: "center",
    },
    scanDescription: {
        color: "#374151",
    },
    helper: {
        borderRadius: 12,
        padding: 12,
    },
    helperText: {
        color: "#374151",
    }
})  

export default JoinEventScreen;
/**
 * Environment Configuration Test Screen
 * Tests that environment variables are properly loaded
 */

import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { env, validateEnv } from '@/constants/env.config';

export default function EnvTest() {
    const router = useRouter();
    const validation = validateEnv();

    const envVars = [
        {
            name: 'EXPO_PUBLIC_SUPABASE_URL',
            value: env.supabaseUrl,
            required: true,
        },
        {
            name: 'EXPO_PUBLIC_SUPABASE_KEY',
            value: env.supabaseKey,
            required: true,
            masked: true,
        },
        {
            name: 'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY',
            value: env.googleMapsApiKey,
            required: true,
            masked: true,
        },
        {
            name: 'EXPO_PUBLIC_API_BASE_URL',
            value: env.apiBaseUrl,
            required: false,
        },
        {
            name: 'EXPO_PUBLIC_AUTH_REDIRECT_URI',
            value: env.authRedirectUri,
            required: false,
        },
        {
            name: 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
            value: env.googleWebClientId,
            required: false,
            masked: true,
        },
        {
            name: 'EXPO_ANDROID_CLIENT_ID',
            value: env.androidClientId,
            required: false,
            masked: true,
        },
        {
            name: 'EXPO_PUBLIC_DEBUG_AUTH',
            value: env.debugAuth ? 'true' : 'false',
            required: false,
        },
    ];

    const maskValue = (value: string): string => {
        if (!value || value.length <= 8) return '***';
        return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
    };

    return (
        <View style={styles.container}>
            {/* Back Button */}
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
            >
                <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            <ScrollView style={styles.scrollView}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Environment Test</Text>
                    <Text style={styles.subtitle}>
                        {validation.valid ? '✅ All Required Variables Set' : '❌ Missing Variables'}
                    </Text>
                </View>

                {/* Validation Status */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Validation Status</Text>
                    <View style={[
                        styles.statusCard,
                        validation.valid ? styles.statusSuccess : styles.statusError
                    ]}>
                        <Text style={styles.statusText}>
                            {validation.valid
                                ? '✅ Environment is properly configured'
                                : `❌ Missing: ${validation.missing.join(', ')}`}
                        </Text>
                    </View>
                </View>

                {/* Environment Variables */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Environment Variables</Text>
                    {envVars.map((envVar, index) => (
                        <View key={index} style={styles.envCard}>
                            <View style={styles.envHeader}>
                                <Text style={styles.envName}>{envVar.name}</Text>
                                {envVar.required && (
                                    <Text style={styles.requiredBadge}>REQUIRED</Text>
                                )}
                            </View>
                            <View style={styles.envValueContainer}>
                                <Text
                                    style={[
                                        styles.envValue,
                                        !envVar.value && styles.envValueMissing
                                    ]}
                                >
                                    {envVar.value
                                        ? envVar.masked
                                            ? maskValue(envVar.value)
                                            : envVar.value
                                        : '❌ Not Set'}
                                </Text>
                            </View>
                            <View style={styles.envStatus}>
                                <View
                                    style={[
                                        styles.statusDot,
                                        envVar.value ? styles.statusDotSuccess : styles.statusDotError
                                    ]}
                                />
                                <Text style={styles.statusLabel}>
                                    {envVar.value ? 'Loaded' : 'Missing'}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Usage Example */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Usage Example</Text>
                    <View style={styles.codeBlock}>
                        <Text style={styles.codeText}>
                            {`import { env } from '@/constants/env.config';

// Access environment variables
const apiKey = env.googleMapsApiKey;
const supabaseUrl = env.supabaseUrl;
const isDebug = env.debugAuth;

// Validate environment
import { validateEnv } from '@/constants/env.config';

const validation = validateEnv();
if (!validation.valid) {
  console.error('Missing:', validation.missing);
}`}
                        </Text>
                    </View>
                </View>

                {/* Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ℹ️ Information</Text>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoText}>
                            • Environment variables are loaded from .env file{'\n'}
                            • Only variables prefixed with EXPO_PUBLIC_ are available in the app{'\n'}
                            • Changes require app restart: npx expo start --clear{'\n'}
                            • Native changes require rebuild: npx expo run:android{'\n'}
                            • See ENV_SETUP.md for complete documentation
                        </Text>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollView: {
        flex: 1,
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 100,
        backgroundColor: '#000',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#000',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#999',
    },
    section: {
        marginTop: 20,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
        marginBottom: 12,
    },
    statusCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
    },
    statusSuccess: {
        backgroundColor: '#ECFDF5',
        borderColor: '#10B981',
    },
    statusError: {
        backgroundColor: '#FEF2F2',
        borderColor: '#EF4444',
    },
    statusText: {
        fontSize: 14,
        fontWeight: '500',
    },
    envCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    envHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    envName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
        fontFamily: 'monospace',
    },
    requiredBadge: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#EF4444',
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    envValueContainer: {
        marginBottom: 8,
    },
    envValue: {
        fontSize: 14,
        color: '#000',
        fontFamily: 'monospace',
    },
    envValueMissing: {
        color: '#EF4444',
        fontStyle: 'italic',
    },
    envStatus: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusDotSuccess: {
        backgroundColor: '#10B981',
    },
    statusDotError: {
        backgroundColor: '#EF4444',
    },
    statusLabel: {
        fontSize: 12,
        color: '#666',
    },
    codeBlock: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 16,
    },
    codeText: {
        fontSize: 12,
        color: '#00ff00',
        fontFamily: 'monospace',
    },
    infoCard: {
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#3B82F6',
    },
    infoText: {
        fontSize: 14,
        color: '#1E40AF',
        lineHeight: 20,
    },
});

/**
 * Map Diagnostics Screen
 * Tests various map configurations and displays diagnostic information
 */

import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    Platform,
    Dimensions,
    TouchableOpacity,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

export default function MapDiagnostics() {
    const router = useRouter();
    const [diagnostics, setDiagnostics] = useState({
        platform: Platform.OS,
        version: Platform.Version,
        dimensions: `${width.toFixed(0)}x${height.toFixed(0)}`,
        mapReady: false,
        mapError: null,
        locationPermission: 'unknown',
        locationError: null,
    });

    const [testResults, setTestResults] = useState({
        mapRenders: false,
        mapLoads: false,
        markersRender: false,
        eventsWork: false,
    });

    useEffect(() => {
        checkLocationPermission();
    }, []);

    const checkLocationPermission = async () => {
        try {
            const { status } = await Location.getForegroundPermissionsAsync();
            setDiagnostics(prev => ({
                ...prev,
                locationPermission: status,
            }));
        } catch (error: any) {
            setDiagnostics(prev => ({
                ...prev,
                locationError: error?.message || 'Unknown error',
            }));
        }
    };

    const handleMapReady = () => {
        console.log('✅ Map Ready Event Fired');
        setDiagnostics(prev => ({ ...prev, mapReady: true }));
        setTestResults(prev => ({ ...prev, mapLoads: true, mapRenders: true }));
    };

    const handleMapError = (error: any) => {
        console.error('❌ Map Error Event Fired:', error);
        setDiagnostics(prev => ({ ...prev, mapError: error.message || 'Unknown error' }));
    };

    const handleRegionChange = () => {
        setTestResults(prev => ({ ...prev, eventsWork: true }));
    };

    const handleMarkerPress = () => {
        console.log('Marker pressed!');
        setTestResults(prev => ({ ...prev, markersRender: true }));
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
                    <Text style={styles.title}>Map Diagnostics</Text>
                    <Text style={styles.subtitle}>Testing Google Maps Integration</Text>
                </View>

                {/* Diagnostics Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>System Information</Text>
                    <View style={styles.infoCard}>
                        <InfoRow label="Platform" value={diagnostics.platform} />
                        <InfoRow label="Version" value={String(diagnostics.version)} />
                        <InfoRow label="Dimensions" value={diagnostics.dimensions} />
                        <InfoRow
                            label="Map Provider"
                            value={Platform.OS === 'android' ? 'GOOGLE' : 'APPLE'}
                        />
                        <InfoRow
                            label="Location Permission"
                            value={diagnostics.locationPermission}
                            status={diagnostics.locationPermission === 'granted' ? 'success' : 'warning'}
                        />
                    </View>
                </View>

                {/* Test Results */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Test Results</Text>
                    <View style={styles.infoCard}>
                        <TestRow label="Map Renders" passed={testResults.mapRenders} />
                        <TestRow label="Map Loads" passed={testResults.mapLoads} />
                        <TestRow label="Markers Render" passed={testResults.markersRender} />
                        <TestRow label="Events Work" passed={testResults.eventsWork} />
                    </View>
                </View>

                {/* Map Status */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Map Status</Text>
                    <View style={styles.infoCard}>
                        <InfoRow
                            label="Ready"
                            value={diagnostics.mapReady ? 'Yes' : 'No'}
                            status={diagnostics.mapReady ? 'success' : 'warning'}
                        />
                        {diagnostics.mapError && (
                            <InfoRow label="Error" value={diagnostics.mapError} status="error" />
                        )}
                        {diagnostics.locationError && (
                            <InfoRow
                                label="Location Error"
                                value={diagnostics.locationError}
                                status="error"
                            />
                        )}
                    </View>
                </View>

                {/* Map View */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Map Test</Text>
                    <View style={styles.mapWrapper}>
                        <MapView
                            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                            style={styles.map}
                            initialRegion={{
                                latitude: 37.78825,
                                longitude: -122.4324,
                                latitudeDelta: 0.0922,
                                longitudeDelta: 0.0421,
                            }}
                            onMapReady={handleMapReady}
                            onRegionChangeComplete={handleRegionChange}
                            showsUserLocation={false}
                            showsMyLocationButton={true}
                            showsCompass={true}
                        >
                            <Marker
                                coordinate={{ latitude: 37.78825, longitude: -122.4324 }}
                                title="Test Marker"
                                description="Tap to test marker interaction"
                                onPress={handleMarkerPress}
                            />
                        </MapView>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

function InfoRow({
    label,
    value,
    status,
}: {
    label: string;
    value: string;
    status?: 'success' | 'warning' | 'error';
}) {
    const statusColor =
        status === 'success' ? '#10B981' : status === 'error' ? '#EF4444' : '#F59E0B';

    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}:</Text>
            <Text style={[styles.infoValue, status && { color: statusColor }]}>{value}</Text>
        </View>
    );
}

function TestRow({ label, passed }: { label: string; passed: boolean }) {
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}:</Text>
            <Text style={[styles.testStatus, passed ? styles.testPass : styles.testFail]}>
                {passed ? '✅ PASS' : '❌ FAIL'}
            </Text>
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
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    infoLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 14,
        color: '#000',
        fontWeight: '600',
    },
    testStatus: {
        fontSize: 14,
        fontWeight: '600',
    },
    testPass: {
        color: '#10B981',
    },
    testFail: {
        color: '#EF4444',
    },
    mapWrapper: {
        height: 300,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    map: {
        width: '100%',
        height: '100%',
    },
});

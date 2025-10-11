/**
 * Test Map Screen - Simple map implementation for testing
 */

import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Platform,
    Dimensions,
    TouchableOpacity,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function TestMap() {
    const router = useRouter();
    const [mapReady, setMapReady] = useState(false);

    // Simple initial region (San Francisco)
    const initialRegion = {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };

    // Sample markers
    const markers = [
        {
            id: '1',
            coordinate: { latitude: 37.78825, longitude: -122.4324 },
            title: 'Marker 1',
            description: 'First test marker',
        },
        {
            id: '2',
            coordinate: { latitude: 37.79025, longitude: -122.4314 },
            title: 'Marker 2',
            description: 'Second test marker',
        },
    ];

    return (
        <View style={styles.container}>
            {/* Back Button */}
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
            >
                <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            {/* Title */}
            <View style={styles.header}>
                <Text style={styles.title}>Test Map Screen</Text>
                <Text style={styles.subtitle}>
                    {mapReady ? '✅ Map Loaded' : '⏳ Loading...'}
                </Text>
            </View>

            {/* Map View */}
            <View style={styles.mapContainer}>
                <MapView
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                    style={styles.map}
                    initialRegion={initialRegion}
                    showsUserLocation={false}
                    showsMyLocationButton={true}
                    showsCompass={true}
                    showsScale={true}
                    loadingEnabled={true}
                    onMapReady={() => {
                        console.log('✅ Test Map Ready!');
                        setMapReady(true);
                    }}
                >
                    {markers.map((marker) => (
                        <Marker
                            key={marker.id}
                            coordinate={marker.coordinate}
                            title={marker.title}
                            description={marker.description}
                            pinColor="red"
                        />
                    ))}
                </MapView>
            </View>

            {/* Debug Info */}
            <View style={styles.debugInfo}>
                <Text style={styles.debugText}>Platform: {Platform.OS}</Text>
                <Text style={styles.debugText}>
                    Provider: {Platform.OS === 'android' ? 'GOOGLE' : 'APPLE'}
                </Text>
                <Text style={styles.debugText}>
                    Dimensions: {width.toFixed(0)} x {height.toFixed(0)}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    header: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        alignItems: 'flex-end',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
    },
    mapContainer: {
        flex: 1,
        backgroundColor: '#e0e0e0',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    debugInfo: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        borderRadius: 8,
        zIndex: 10,
    },
    debugText: {
        color: '#fff',
        fontSize: 12,
        marginBottom: 4,
    },
});

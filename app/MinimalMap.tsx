/**
 * Minimal Map Screen - Absolute bare minimum map implementation
 */

import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

export default function MinimalMap() {
    console.log('🗺️ MinimalMap component rendered');
    console.log('🗺️ Platform:', Platform.OS);

    return (
        <View style={styles.container}>
            <Text style={styles.debugText}>Minimal Map Test - Platform: {Platform.OS}</Text>
            <MapView
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                style={styles.map}
                initialRegion={{
                    latitude: 37.78825,
                    longitude: -122.4324,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
                onMapReady={() => console.log('✅ Minimal Map Ready!')}
                onLayout={(e) => console.log('📐 Map Layout:', e.nativeEvent.layout)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffcccc',
    },
    debugText: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        backgroundColor: 'yellow',
        padding: 10,
        zIndex: 999,
        fontSize: 14,
        fontWeight: 'bold',
    },
    map: {
        flex: 1,
        backgroundColor: '#ccffcc',
    },
});

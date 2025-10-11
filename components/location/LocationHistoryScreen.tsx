/**
 * Location History Screen
 * Displays historical location data for a family member with SQLite integration
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

interface LocationHistoryPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  batteryLevel?: number;
  speed?: number;
}

const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;

export default function LocationHistoryScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const userId = params.userId as string;
  const familyId = params.familyId as string;
  
  const [loading, setLoading] = useState(true);
  const [historyPoints, setHistoryPoints] = useState<LocationHistoryPoint[]>([]);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [userName, setUserName] = useState<string>('Member');

  const styles = createStyles(theme);

  useEffect(() => {
    loadLocationHistory();
  }, [userId, timeRange]);

  const loadLocationHistory = async () => {
    setLoading(true);
    try {
      // TODO: Integrate with SQLite location history
      // const db = await getLocationDatabase();
      // const points = await db.getLocationHistory(userId, timeRange);
      
      // Mock data for demonstration
      const now = Date.now();
      const mockPoints: LocationHistoryPoint[] = Array.from({ length: 20 }, (_, i) => ({
        latitude: 37.7879 + (Math.random() - 0.5) * 0.02,
        longitude: -122.4074 + (Math.random() - 0.5) * 0.02,
        accuracy: 10 + Math.random() * 20,
        timestamp: new Date(now - i * 3600000).toISOString(),
        batteryLevel: 100 - i * 2,
        speed: Math.random() * 10,
      }));
      
      setHistoryPoints(mockPoints);
      setUserName('John Doe'); // TODO: Get from family members
    } catch (error) {
      console.error('Failed to load location history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case '1h': return 'Last Hour';
      case '6h': return 'Last 6 Hours';
      case '24h': return 'Last 24 Hours';
      case '7d': return 'Last 7 Days';
    }
  };

  // Calculate center and bounds
  const centerRegion = historyPoints.length > 0 ? {
    latitude: historyPoints.reduce((sum, p) => sum + p.latitude, 0) / historyPoints.length,
    longitude: historyPoints.reduce((sum, p) => sum + p.longitude, 0) / historyPoints.length,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  } : {
    latitude: 37.7879,
    longitude: -122.4074,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  // Calculate distance traveled
  const totalDistance = historyPoints.reduce((total, point, index) => {
    if (index === 0) return 0;
    const prev = historyPoints[index - 1];
    const R = 6371; // Earth radius in km
    const dLat = (point.latitude - prev.latitude) * Math.PI / 180;
    const dLon = (point.longitude - prev.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(prev.latitude * Math.PI / 180) * Math.cos(point.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return total + (R * c);
  }, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Location History</Text>
          <Text style={styles.headerSubtitle}>{userName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeRangeContent}
        >
          {(['1h', '6h', '24h', '7d'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              onPress={() => setTimeRange(range)}
              style={[
                styles.timeRangeChip,
                timeRange === range && styles.timeRangeChipActive
              ]}
            >
              <Text style={[
                styles.timeRangeText,
                timeRange === range && styles.timeRangeTextActive
              ]}>
                {range === '1h' ? '1 Hour' :
                 range === '6h' ? '6 Hours' :
                 range === '24h' ? '24 Hours' : '7 Days'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#053326" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : historyPoints.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyTitle}>No History Available</Text>
          <Text style={styles.emptyText}>
            No location data found for the selected time range
          </Text>
        </View>
      ) : (
        <>
          {/* Map */}
          <View style={styles.mapContainer}>
            <MapView
              provider={MAP_PROVIDER}
              style={styles.map}
              initialRegion={centerRegion}
              showsUserLocation={false}
            >
              {/* Path Polyline */}
              <Polyline
                coordinates={historyPoints.map(p => ({
                  latitude: p.latitude,
                  longitude: p.longitude,
                }))}
                strokeColor="#053326"
                strokeWidth={3}
              />
              
              {/* Start Marker */}
              {historyPoints.length > 0 && (
                <Marker
                  coordinate={{
                    latitude: historyPoints[0].latitude,
                    longitude: historyPoints[0].longitude,
                  }}
                  title="Latest Position"
                  pinColor="#10B981"
                />
              )}
              
              {/* End Marker */}
              {historyPoints.length > 1 && (
                <Marker
                  coordinate={{
                    latitude: historyPoints[historyPoints.length - 1].latitude,
                    longitude: historyPoints[historyPoints.length - 1].longitude,
                  }}
                  title="Starting Position"
                  pinColor="#DC2626"
                />
              )}
            </MapView>

            {/* Stats Overlay */}
            <View style={styles.statsOverlay}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{historyPoints.length}</Text>
                <Text style={styles.statLabel}>Points</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{totalDistance.toFixed(1)} km</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{getTimeRangeLabel()}</Text>
                <Text style={styles.statLabel}>Period</Text>
              </View>
            </View>
          </View>

          {/* Timeline List */}
          <View style={styles.timelineContainer}>
            <Text style={styles.timelineTitle}>LOCATION TIMELINE</Text>
            <ScrollView style={styles.timelineScroll}>
              {historyPoints.map((point, index) => (
                <View key={index} style={styles.timelineItem}>
                  <View style={styles.timelineDot}>
                    <View style={[
                      styles.timelineDotInner,
                      index === 0 && styles.timelineDotLatest
                    ]} />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTime}>
                      {formatTimestamp(point.timestamp)}
                    </Text>
                    <Text style={styles.timelineDetails}>
                      Accuracy: ±{Math.round(point.accuracy)}m
                      {point.batteryLevel && ` • Battery: ${point.batteryLevel}%`}
                      {point.speed && ` • Speed: ${point.speed.toFixed(1)} m/s`}
                    </Text>
                    <Text style={styles.timelineCoords}>
                      {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E5E5E5',
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backIcon: {
      fontSize: 32,
      color: '#053326',
      fontWeight: '300',
    },
    headerTitleContainer: {
      flex: 1,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#000000',
    },
    headerSubtitle: {
      fontSize: 14,
      color: '#666666',
      marginTop: 2,
    },

    // Time Range
    timeRangeContainer: {
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E5E5E5',
      paddingVertical: theme.spacing.sm,
    },
    timeRangeContent: {
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    timeRangeChip: {
      backgroundColor: '#F5F5F5',
      borderRadius: 20,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderWidth: 1,
      borderColor: '#E5E5E5',
    },
    timeRangeChipActive: {
      backgroundColor: '#053326',
      borderColor: '#053326',
    },
    timeRangeText: {
      fontSize: 14,
      fontWeight: '500',
      color: '#666666',
    },
    timeRangeTextActive: {
      color: '#FFFFFF',
    },

    // Loading & Empty
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    loadingText: {
      fontSize: 14,
      color: '#666666',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: theme.spacing.md,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#000000',
      marginBottom: theme.spacing.sm,
    },
    emptyText: {
      fontSize: 14,
      color: '#666666',
      textAlign: 'center',
    },

    // Map
    mapContainer: {
      flex: 1,
      position: 'relative',
    },
    map: {
      ...StyleSheet.absoluteFillObject,
    },
    statsOverlay: {
      position: 'absolute',
      top: theme.spacing.md,
      left: theme.spacing.md,
      right: theme.spacing.md,
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    statCard: {
      flex: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: 12,
      padding: theme.spacing.sm,
      borderWidth: 1,
      borderColor: '#E5E5E5',
      alignItems: 'center',
    },
    statValue: {
      fontSize: 16,
      fontWeight: '700',
      color: '#053326',
    },
    statLabel: {
      fontSize: 11,
      color: '#666666',
      marginTop: 2,
    },

    // Timeline
    timelineContainer: {
      height: 250,
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E5E5E5',
      paddingTop: theme.spacing.md,
    },
    timelineTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: '#666666',
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      letterSpacing: 1,
    },
    timelineScroll: {
      flex: 1,
    },
    timelineItem: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    timelineDot: {
      width: 40,
      alignItems: 'center',
      paddingTop: 4,
    },
    timelineDotInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#053326',
      borderWidth: 2,
      borderColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    timelineDotLatest: {
      backgroundColor: '#10B981',
      width: 16,
      height: 16,
      borderRadius: 8,
    },
    timelineContent: {
      flex: 1,
      borderBottomWidth: 1,
      borderBottomColor: '#F5F5F5',
      paddingBottom: theme.spacing.sm,
    },
    timelineTime: {
      fontSize: 14,
      fontWeight: '600',
      color: '#000000',
      marginBottom: 2,
    },
    timelineDetails: {
      fontSize: 12,
      color: '#666666',
      marginBottom: 2,
    },
    timelineCoords: {
      fontSize: 11,
      color: '#999999',
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
  });

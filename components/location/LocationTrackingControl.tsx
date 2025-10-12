import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocation } from '../../hooks/useLocation';
import { TrackingMode } from '../../services/background-location.service';

interface LocationTrackingControlProps {
  familyId: string | null;
}

export default function LocationTrackingControl({ familyId }: LocationTrackingControlProps) {
  const {
    isConnected,
    isTracking,
    currentMode,
    error,
    connect,
    disconnect,
    startTracking,
    stopTracking,
    checkIn,
    memberLocations,
    refreshLocations,
  } = useLocation(familyId);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Auto-connect when component mounts
    if (!isConnected && familyId) {
      connect().catch((err) => {
        console.error('Failed to connect:', err);
      });
    }

    return () => {
      // Cleanup on unmount (optional - you might want to keep connection alive)
      // disconnect();
    };
  }, [familyId]);

  const handleStartTracking = async (mode: TrackingMode) => {
    if (!familyId) {
      Alert.alert('Error', 'No family selected');
      return;
    }

    setIsLoading(true);
    try {
      await startTracking(mode);
      Alert.alert('Success', `Location tracking started in ${mode} mode`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to start tracking');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopTracking = async () => {
    setIsLoading(true);
    try {
      await stopTracking();
      Alert.alert('Success', 'Location tracking stopped');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to stop tracking');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setIsLoading(true);
    try {
      await checkIn();
      Alert.alert('Success', 'Location checked in successfully');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to check in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await refreshLocations();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to refresh locations');
    } finally {
      setIsLoading(false);
    }
  };

  if (!familyId) {
    return (
      <View style={styles.container}>
        <Text style={styles.warningText}>No family selected</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Status Section */}
      <View style={styles.statusSection}>
        <View style={styles.statusRow}>
          <Text style={styles.label}>WebSocket:</Text>
          <View style={[styles.indicator, isConnected ? styles.online : styles.offline]} />
          <Text style={styles.statusText}>{isConnected ? 'Connected' : 'Disconnected'}</Text>
        </View>
        
        <View style={styles.statusRow}>
          <Text style={styles.label}>Tracking:</Text>
          <View style={[styles.indicator, isTracking ? styles.online : styles.offline]} />
          <Text style={styles.statusText}>
            {isTracking ? `Active (${currentMode})` : 'Inactive'}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.label}>Family Members:</Text>
          <Text style={styles.statusText}>{memberLocations.size} online</Text>
        </View>
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Control Buttons */}
      <View style={styles.controlSection}>
        {!isTracking ? (
          <>
            <Text style={styles.sectionTitle}>Start Tracking</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.highButton]}
                onPress={() => handleStartTracking('high')}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>High</Text>
                <Text style={styles.buttonSubtext}>30s</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.balancedButton]}
                onPress={() => handleStartTracking('balanced')}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>Balanced</Text>
                <Text style={styles.buttonSubtext}>5min</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.powerSaverButton]}
                onPress={() => handleStartTracking('power_saver')}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>Power Saver</Text>
                <Text style={styles.buttonSubtext}>30min</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.checkInButton]}
                onPress={handleCheckIn}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>Check In</Text>
                <Text style={styles.buttonSubtext}>Once</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={handleStopTracking}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Stop Tracking</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Refresh Button */}
      <TouchableOpacity
        style={[styles.button, styles.refreshButton]}
        onPress={handleRefresh}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>Refresh Locations</Text>
      </TouchableOpacity>

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  statusSection: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginRight: 8,
    minWidth: 100,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  online: {
    backgroundColor: '#10B981',
  },
  offline: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
  },
  warningText: {
    color: '#F59E0B',
    fontSize: 16,
    textAlign: 'center',
    padding: 16,
  },
  controlSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  highButton: {
    backgroundColor: '#EF4444',
  },
  balancedButton: {
    backgroundColor: '#4F46E5',
  },
  powerSaverButton: {
    backgroundColor: '#10B981',
  },
  checkInButton: {
    backgroundColor: '#F59E0B',
  },
  stopButton: {
    backgroundColor: '#DC2626',
    marginHorizontal: 4,
  },
  refreshButton: {
    backgroundColor: '#6B7280',
    marginHorizontal: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSubtext: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
});

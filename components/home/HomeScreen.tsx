/**
 * Home Screen - Map-First Design
 * Main screen with map, hamburger menu, and bottom drawer
 * Following the elegant auth screen aesthetic
 */

import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  PanResponder,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useFamily } from '@/hooks/useFamily';
import { useLocation } from '@/hooks/useLocation';
import QuickInviteModal from '@/components/family/QuickInviteModal';

const { height, width } = Dimensions.get('window');
const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;

// Member colors matching auth theme
const MEMBER_COLORS = ['#053326', '#064E3B', '#059669', '#34D399', '#6EE7B7', '#A7F3D0'];

// Drawer heights
const DRAWER_MIN_HEIGHT = 180;
const DRAWER_MAX_HEIGHT = height * 0.7;
const DRAWER_SNAP_POINTS = [DRAWER_MIN_HEIGHT, DRAWER_MAX_HEIGHT];

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const { families, currentFamily, currentFamilyId, switchFamily } = useFamily();
  const { isConnected, isTracking, memberLocations, memberPresence, connect } = useLocation(currentFamilyId);

  // State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'ALL' | string>(currentFamilyId || 'ALL');
  const [allMembers, setAllMembers] = useState<any[]>([]);

  // Drawer animation
  const drawerHeight = useRef(new Animated.Value(DRAWER_MIN_HEIGHT)).current;
  const drawerOpacity = useRef(new Animated.Value(1)).current;

  // Drawer pan responder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        const newHeight = drawerOpen
          ? DRAWER_MAX_HEIGHT - gestureState.dy
          : DRAWER_MIN_HEIGHT - gestureState.dy;

        if (newHeight >= DRAWER_MIN_HEIGHT && newHeight <= DRAWER_MAX_HEIGHT) {
          drawerHeight.setValue(newHeight);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -50) {
          // Swipe up - expand
          expandDrawer();
        } else if (gestureState.dy > 50) {
          // Swipe down - collapse
          collapseDrawer();
        } else {
          // Snap to nearest
          const currentHeight = drawerOpen ? DRAWER_MAX_HEIGHT : DRAWER_MIN_HEIGHT;
          Animated.spring(drawerHeight, {
            toValue: currentHeight,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const expandDrawer = () => {
    setDrawerOpen(true);
    Animated.spring(drawerHeight, {
      toValue: DRAWER_MAX_HEIGHT,
      useNativeDriver: false,
      tension: 50,
      friction: 7,
    }).start();
  };

  const collapseDrawer = () => {
    setDrawerOpen(false);
    Animated.spring(drawerHeight, {
      toValue: DRAWER_MIN_HEIGHT,
      useNativeDriver: false,
      tension: 50,
      friction: 7,
    }).start();
  };

  // Convert member locations to array for current family
  const currentFamilyMembers = useMemo(() => {
    const members: any[] = [];
    let colorIndex = 0;
    if (!currentFamilyId) return members;
    const selectedFamily = families.find(f => f.id === currentFamilyId);
    if (!selectedFamily) return members;
    selectedFamily.members?.forEach((member: any) => {
      const userId = member.user?.id || member.user_id;
      const location = memberLocations.get(userId);
      const presence = memberPresence.get(userId);
      const isOnline = presence?.status === 'online';
      if (location) {
        members.push({
          id: userId,
          name: member.user?.name || (userId?.split('-')[0] || 'Member'),
          color: MEMBER_COLORS[colorIndex % MEMBER_COLORS.length],
          status: isOnline ? 'online' : 'offline',
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: location.timestamp,
          batteryLevel: location.batteryLevel,
        });
        colorIndex++;
      }
    });
    return members;
  }, [currentFamilyId, families, memberLocations, memberPresence]);

  const familyMembers = useMemo(() => {
    return selectedTab === 'ALL' ? allMembers : currentFamilyMembers;
  }, [selectedTab, allMembers, currentFamilyMembers]);

  // Show ALL members in list even if they don't have a location
  const listMembers = useMemo(() => {
    if (selectedTab === 'ALL') {
      const map = new Map<string, any>();
      let colorIndex = 0;
      families.forEach((fam) => {
        fam.members?.forEach((m: any) => {
          const userId = m.user?.id || m.user_id;
          if (!userId || map.has(userId)) return;
          const location = memberLocations.get(userId);
          const presence = memberPresence.get(userId);
          const isOnline = presence?.status === 'online';
          map.set(userId, {
            id: userId,
            name: m.user?.name || m.user?.username || (userId?.split('-')[0] || 'Member'),
            color: MEMBER_COLORS[colorIndex % MEMBER_COLORS.length],
            status: isOnline ? 'online' : 'offline',
            latitude: location?.latitude,
            longitude: location?.longitude,
            accuracy: location?.accuracy,
            timestamp: location?.timestamp,
            batteryLevel: location?.batteryLevel,
          });
          colorIndex++;
        });
      });
      return Array.from(map.values());
    }

    const fam = families.find((f) => f.id === selectedTab) || (currentFamilyId ? families.find(f => f.id === currentFamilyId) : undefined);
    if (!fam) return [] as any[];
    let colorIndex = 0;
    return (fam.members || []).map((m: any) => {
      const userId = m.user?.id || m.user_id;
      const location = memberLocations.get(userId);
      const presence = memberPresence.get(userId);
      const isOnline = presence?.status === 'online';
      return {
        id: userId,
        name: m.user?.name || m.user?.username || (userId?.split('-')[0] || 'Member'),
        color: MEMBER_COLORS[colorIndex++ % MEMBER_COLORS.length],
        status: isOnline ? 'online' : 'offline',
        latitude: location?.latitude,
        longitude: location?.longitude,
        accuracy: location?.accuracy,
        timestamp: location?.timestamp,
        batteryLevel: location?.batteryLevel,
      };
    });
  }, [selectedTab, families, memberLocations, memberPresence, currentFamilyId]);

  // Center map on members when ready
  useEffect(() => {
    if (mapReady && familyMembers.length > 0 && mapRef.current) {
      const coordinates = familyMembers.map(m => ({
        latitude: m.latitude,
        longitude: m.longitude,
      }));

      if (coordinates.length === 1) {
        mapRef.current.animateToRegion({
          latitude: coordinates[0].latitude,
          longitude: coordinates[0].longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }, 1000);
      } else if (coordinates.length > 1) {
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
          animated: true,
        });
      }
    }
  }, [familyMembers.length, mapReady]);

  // Ensure websocket connects
  useEffect(() => {
    connect()
      .then(async () => {
        try {
          if (currentFamilyId) {
            const { backgroundLocationService } = await import('@/services/background-location.service');
            console.log('[HomeScreen] 📤 Immediate check-in on mount', { currentFamilyId });
            await backgroundLocationService.checkIn(currentFamilyId);
          }
        } catch (e) {
          console.warn('[HomeScreen] Immediate check-in failed', e);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconnect or rejoin when family changes
  useEffect(() => {
    if (currentFamilyId) {
      connect()
        .then(async () => {
          try {
            const { backgroundLocationService } = await import('@/services/background-location.service');
            console.log('[HomeScreen] 📤 Immediate check-in on family change', { currentFamilyId });
            await backgroundLocationService.checkIn(currentFamilyId);
          } catch (e) {
            console.warn('[HomeScreen] Immediate check-in on family change failed', e);
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFamilyId]);

  // Load all members across families when 'ALL' tab is selected
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (selectedTab !== 'ALL') return;
      try {
        const { locationApiService } = await import('@/services/location-api.service');
        const merged: Record<string, any> = {};
        let colorIndex = 0;
        for (const fam of families) {
          try {
            const locs = await locationApiService.getFamilyLocations(fam.id);
            locs.forEach((loc: any) => {
              if (cancelled) return;
              const existing = merged[loc.user_id];
              if (!existing || loc.timestamp > existing.timestamp) {
                merged[loc.user_id] = {
                  id: loc.user_id,
                  name: loc.user_id.split('-')[0] || 'Member',
                  color: MEMBER_COLORS[colorIndex % MEMBER_COLORS.length],
                  status: 'online',
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                  accuracy: loc.accuracy,
                  timestamp: loc.timestamp,
                  batteryLevel: loc.batteryLevel,
                };
                colorIndex++;
              }
            });
          } catch {}
        }
        if (!cancelled) setAllMembers(Object.values(merged));
      } catch {}
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedTab, families]);

  const focusOnMember = (member: typeof familyMembers[0]) => {
    setSelectedMember(member.id);
    if (mapRef.current && member.latitude != null && member.longitude != null) {
      mapRef.current.animateToRegion({
        latitude: member.latitude,
        longitude: member.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={MAP_PROVIDER}
        initialRegion={{
          latitude: 37.7879,
          longitude: -122.4074,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        onMapReady={() => setMapReady(true)}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {familyMembers.map((member) => (
          <Marker
            key={member.id}
            coordinate={{
              latitude: member.latitude,
              longitude: member.longitude,
            }}
            onPress={() => focusOnMember(member)}
          >
            <View style={styles.markerContainer}>
              <View style={[styles.marker, { backgroundColor: member.color }]}>
                <View style={styles.markerInner} />
              </View>
              {selectedMember === member.id && (
                <View style={styles.markerPulse} />
              )}
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Hamburger Menu Button */}
      <TouchableOpacity
        style={styles.hamburgerButton}
        onPress={() => router.push('/menu' as any)}
        activeOpacity={0.8}
      >
        <View style={styles.hamburgerLine} />
        <View style={styles.hamburgerLine} />
        <View style={styles.hamburgerLine} />
      </TouchableOpacity>

      {/* Theme Toggle (top-right) */}
      <TouchableOpacity style={styles.themeToggleButton} onPress={toggleTheme} activeOpacity={0.8}>
        <Text style={styles.themeToggleIcon}>🌗</Text>
      </TouchableOpacity>

      {/* Bottom Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          {
            height: drawerHeight,
          },
        ]}
      >
        {/* Drawer Handle */}
        <View {...panResponder.panHandlers} style={styles.drawerHandle}>
          <View style={styles.handleBar} />
        </View>

  {/* Family Tab Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.familyTabBar}
          contentContainerStyle={styles.familyTabBarContent}
        >
          <TouchableOpacity
            key={'ALL'}
            style={[styles.familyChip, selectedTab === 'ALL' && styles.familyChipSelected]}
            onPress={() => setSelectedTab('ALL')}
          >
            <Text style={styles.familyChipText}>All</Text>
          </TouchableOpacity>
          {families.map(family => (
            <TouchableOpacity
              key={family.id}
              style={[styles.familyChip, selectedTab === family.id && styles.familyChipSelected]}
              onPress={() => {
                setSelectedTab(family.id);
                if (currentFamilyId !== family.id) {
                  switchFamily(family.id);
                }
              }}
            >
              <Text style={styles.familyChipText}>{family.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Drawer Header */}
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>Family Members</Text>
          <View style={styles.statusDot}>
            <View style={[styles.dot, isConnected && styles.dotActive]} />
            <Text style={styles.statusText}>
              {isConnected ? 'Connected' : 'Offline'}
            </Text>
          </View>
        </View>

        {/* Member List (all members, regardless of location) */}
        <ScrollView
          style={styles.memberList}
          contentContainerStyle={styles.memberListContent}
          showsVerticalScrollIndicator={false}
        >
          {listMembers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👨‍👩‍👧‍👦</Text>
              <Text style={styles.emptyText}>No members to show</Text>
              <Text style={styles.emptySubtext}>Create or join a family to get started</Text>
              <TouchableOpacity
                style={styles.inviteButton}
                onPress={() => setShowInviteModal(true)}
              >
                <Text style={styles.inviteButtonText}>Invite Family</Text>
              </TouchableOpacity>
            </View>
          ) : (
            listMembers.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.memberCard,
                  selectedMember === member.id && styles.memberCardSelected,
                ]}
                onPress={() => focusOnMember(member)}
                activeOpacity={0.7}
              >
                <View style={[styles.memberAvatar, { backgroundColor: member.color }]}>
                  <Text style={styles.memberInitial}>
                    {member.name[0].toUpperCase()}
                  </Text>
                </View>

                <View style={styles.memberInfo}>
                  <View style={styles.memberHeader}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <View style={[
                      styles.memberStatus,
                      member.status === 'online' && styles.memberStatusOnline,
                    ]} />
                  </View>
                  
                  <View style={styles.memberDetails}>
                    <Text style={styles.memberDetailText}>
                      🔋 {typeof member.batteryLevel === 'number' ? `${Math.round(member.batteryLevel)}%` : 'N/A'}
                    </Text>
                    <Text style={styles.memberDetailDot}>•</Text>
                    <Text style={styles.memberDetailText}>
                      {member.timestamp ? formatTime(member.timestamp) : 'No location yet'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.memberAction}>
                  <Text style={styles.memberActionIcon}>›</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </Animated.View>

      {/* Invite Modal */}
      {currentFamily && (
        <QuickInviteModal
          visible={showInviteModal}
          familyId={currentFamilyId || ''}
          familyName={currentFamily.name}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </View>
  );
}

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    map: {
      flex: 1,
    },

    // Top-right Theme Toggle
    themeToggleButton: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 60 : 40,
      right: 20,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.9)',
      borderWidth: 1,
      borderColor: '#E5E5E5',
    },
    themeToggleIcon: {
      fontSize: 18,
      color: '#053326',
      fontWeight: '700',
    },

    // Hamburger Menu
    hamburgerButton: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 60 : 40,
      left: 20,
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: 'transparent',
    },
    hamburgerLine: {
      width: 24,
      height: 2,
      backgroundColor: '#053326',
      marginVertical: 2,
      borderRadius: 1,
    },

    // Family Tab Bar
    familyTabBar: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingBottom: 8,
      marginBottom: 4,
      maxHeight: 48,
    },
    familyTabBarContent: {
      alignItems: 'center',
      gap: 8,
    },
    familyChip: {
      backgroundColor: '#FAFAFA',
      borderWidth: 1,
      borderColor: '#E5E5E5',
      borderRadius: 16,
      paddingHorizontal: 18,
      paddingVertical: 8,
      marginRight: 8,
    },
    familyChipSelected: {
      backgroundColor: '#F0FDF4',
      borderColor: '#059669',
    },
    familyChipText: {
      color: '#053326',
      fontWeight: '600',
      fontSize: 14,
    },

    // Map Markers
    markerContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    marker: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    markerInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#FFFFFF',
      alignSelf: 'center',
      marginTop: 2,
    },
    markerPulse: {
      position: 'absolute',
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: 'rgba(5, 51, 38, 0.2)',
      borderWidth: 2,
      borderColor: 'rgba(5, 51, 38, 0.3)',
    },

    // Bottom Drawer
    drawer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 10,
    },
    drawerHandle: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    handleBar: {
      width: 40,
      height: 4,
      backgroundColor: '#E5E5E5',
      borderRadius: 2,
    },
    drawerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingBottom: 16,
    },
    drawerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#000000',
      letterSpacing: 0.3,
    },
    statusDot: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#999999',
    },
    dotActive: {
      backgroundColor: '#059669',
    },
    statusText: {
      fontSize: 12,
      color: '#666666',
      fontWeight: '500',
    },

    // Quick Actions
    quickActions: {
      flexDirection: 'row',
      paddingHorizontal: 24,
      paddingBottom: 20,
      gap: 12,
    },
    quickAction: {
      flex: 1,
      backgroundColor: '#FAFAFA',
      borderWidth: 1,
      borderColor: '#E5E5E5',
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickActionIcon: {
      fontSize: 24,
      marginBottom: 4,
    },
    quickActionText: {
      fontSize: 11,
      color: '#053326',
      fontWeight: '500',
    },

    // Member List
    memberList: {
      flex: 1,
    },
    memberListContent: {
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    memberCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FAFAFA',
      borderWidth: 1,
      borderColor: '#E5E5E5',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    memberCardSelected: {
      backgroundColor: '#F0FDF4',
      borderColor: '#053326',
      borderWidth: 1.5,
    },
    memberAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    memberInitial: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '600',
    },
    memberInfo: {
      flex: 1,
    },
    memberHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    memberName: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000000',
      marginRight: 8,
    },
    memberStatus: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#999999',
    },
    memberStatusOnline: {
      backgroundColor: '#059669',
    },
    memberDetails: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    memberDetailText: {
      fontSize: 12,
      color: '#666666',
      fontWeight: '400',
    },
    memberDetailDot: {
      fontSize: 12,
      color: '#999999',
      marginHorizontal: 6,
    },
    memberAction: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    memberActionIcon: {
      fontSize: 24,
      color: '#999999',
    },

    // Empty State
    emptyState: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#000000',
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: '#666666',
      textAlign: 'center',
      marginBottom: 24,
      paddingHorizontal: 40,
    },
    inviteButton: {
      backgroundColor: '#053326',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    inviteButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
  });

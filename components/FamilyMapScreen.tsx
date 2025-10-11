import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { MAP_CONFIG, MAP_TABS, MapTab } from '../constants/maps.config';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useDrawerAnimation } from '../hooks/useDrawerAnimation';
import { useFamily } from '../hooks/useFamily';
import { useLocation } from '../hooks/useLocation';
import { FamilyMember, FamilyWithMembers } from '../types/family.types';
import Sidebar from './Sidebar';
import LocationTrackingControl from './location/LocationTrackingControl';
import EmojiIcon from './ui/EmojiIcon';

const { height } = Dimensions.get('window');

// Determine map provider - use GOOGLE on Android if available, otherwise default
const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;

// Color palette for member markers
const MEMBER_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#A29BFE', '#FD79A8', '#FDCB6E', '#6C5CE7'];

export default function FamilyMapScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  // Get real family data from useFamily hook
  const { families, currentFamily, currentFamilyId, loading, error, switchFamily } = useFamily();

  // Get location tracking functionality
  const {
    isConnected,
    isTracking,
    memberLocations,
    memberPresence,
    memberGhost,
    refreshLocations,
  } = useLocation(currentFamilyId);

  // State management
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [bottomBarExpanded, setBottomBarExpanded] = useState(false);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(
    (currentFamilyId as string | null) || (families && families.length > 0 ? families[0].id : null)
  );
  const [selectedMember, setSelectedMember] = useState<string | number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 37.7879,
    longitude: -122.4074,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const [lastTappedMember, setLastTappedMember] = useState<string | null>(null);

  // Use custom drawer animation hook
  const { slideAnim, translateX } = useDrawerAnimation(menuOpen);

  console.log('🏠 FamilyMapScreen: Current families:', families?.length || 0);
  console.log('🏠 FamilyMapScreen: Current family ID:', currentFamilyId);
  console.log('🗺️ Map Ready:', mapReady);
  console.log('📍 Member Locations:', memberLocations.size);
  console.log('🔌 WebSocket Connected:', isConnected);

  // Auto-refresh locations when component mounts or family changes
  useEffect(() => {
    if (currentFamilyId && isConnected) {
      refreshLocations();
    }
  }, [currentFamilyId, isConnected]);

  // Ensure a family is selected once families/currentFamilyId are loaded
  useEffect(() => {
    if (!selectedFamilyId) {
      if (currentFamilyId) {
        setSelectedFamilyId(currentFamilyId);
      } else if (families && families.length > 0) {
        setSelectedFamilyId(families[0].id);
      }
    } else if (families && !families.some(f => f.id === selectedFamilyId)) {
      // Previously selected family no longer exists; pick first available
      setSelectedFamilyId(families[0]?.id ?? null);
    }
  }, [currentFamilyId, families]);

  // Convert memberLocations Map to array with additional data
  const familyMembers = useMemo(() => {
    const members: any[] = [];
    let colorIndex = 0;

    // Build a quick lookup of userId -> name from selected family's members
    const selectedFamily = families?.find(f => f.id === selectedFamilyId);
    const nameByUserId = new Map<string, string>();
    selectedFamily?.members?.forEach(m => {
      if (m.user_id) {
        const displayName = m.user?.name || m.user_id;
        nameByUserId.set(m.user_id, displayName);
      }
    });

    memberLocations.forEach((location, userId) => {
      const presence = memberPresence.get(userId);
      const isOnline = presence?.status === 'online';
      const displayName = nameByUserId.get(userId) || userId;

      members.push({
        id: userId,
        name: displayName,
        color: MEMBER_COLORS[colorIndex % MEMBER_COLORS.length],
        status: isOnline ? 'active' : 'idle',
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: location.timestamp,
        batteryLevel: location.batteryLevel,
      });

      colorIndex++;
    });

    return members;
  }, [memberLocations, memberPresence, families, selectedFamilyId]);

  const safeMembers = familyMembers.filter(m => !!m && m.id != null);

  // Center map on all members when locations update
  useEffect(() => {
    if (mapReady && safeMembers.length > 0 && mapRef.current) {
      const coordinates = safeMembers.map(m => ({
        latitude: m.latitude,
        longitude: m.longitude,
      }));

      if (coordinates.length === 1) {
        // Single member - center on them
        mapRef.current.animateToRegion({
          latitude: coordinates[0].latitude,
          longitude: coordinates[0].longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }, 1000);
      } else if (coordinates.length > 1) {
        // Multiple members - fit all in view
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
          animated: true,
        });
      }
    }
  }, [safeMembers.length, mapReady]);

  // Focus on a specific member
  const focusOnMember = useCallback((member: typeof familyMembers[0]) => {
    if (mapRef.current && member.latitude && member.longitude) {
      mapRef.current.animateToRegion({
        latitude: member.latitude,
        longitude: member.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  }, []);

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      {/* Map Area with Google Maps */}
      <View style={styles.mapContainer}>
        {!mapReady && (
          <View style={styles.mapLoadingOverlay}>
            <Text style={styles.mapLoadingText}>Loading Map...</Text>
          </View>
        )}
        <MapView
          ref={mapRef}
          provider={MAP_PROVIDER}
          style={styles.map}
          initialRegion={mapRegion}
          onRegionChangeComplete={setMapRegion}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
          loadingEnabled={true}
          mapType="standard"
          onMapReady={() => {
            console.log('✅ Map is ready!');
            setMapReady(true);
          }}
        >
          {/* Family Member Markers */}
          {safeMembers.map((member) => (
            <Marker
              key={member.id}
              coordinate={{
                latitude: member.latitude,
                longitude: member.longitude,
              }}
              title={member.name}
              description={member.status === 'active' ? 'Active now' : 'Idle'}
              pinColor={member.color}
              onPress={() => {
                setSelectedMember(member.id);
                focusOnMember(member);
              }}
            >
              <View style={[styles.customMarker, { backgroundColor: member.color }]}>
                <Text style={styles.markerText}>👤</Text>
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Location Tracking Control Overlay */}
        <View style={styles.locationControlOverlay}>
          <LocationTrackingControl familyId={currentFamilyId} />
        </View>
      </View>

      {/* Floating Create Family Button (FAB) */}
      <TouchableOpacity
        style={styles.createFamilyButton}
        accessibilityLabel="Create new family"
        onPress={() => router.push('/modal?view=familyManagement&openCreate=1')}
      >
        <Text style={styles.createFamilyIcon}>＋</Text>
      </TouchableOpacity>

      {/* Back Button - Top Left */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Text style={styles.iconText}>←</Text>
      </TouchableOpacity>

      {/* Top Left - Hamburger Menu (moved right to make room for back button) */}
      <TouchableOpacity
        onPress={() => setMenuOpen(!menuOpen)}
        style={styles.hamburgerButton}
      >
        <Text style={styles.iconText}>☰</Text>
      </TouchableOpacity>

      {/* Sidebar Drawer - Always rendered, animated in/out */}
      <View style={styles.drawerContainer} pointerEvents={menuOpen ? 'auto' : 'none'}>
        <Animated.View
          style={[
            styles.drawerContent,
            { transform: [{ translateX }] }
          ]}
        >
          <Sidebar
            navigation={null}
            userName={user?.fullName || user?.email || 'User'}
            profileImage={null}
            families={families}
            unreadBoardsCount={5}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.drawerBackdrop,
            { opacity: slideAnim }
          ]}
          pointerEvents={menuOpen ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setMenuOpen(false)}
          />
        </Animated.View>
      </View>

      {/* Top Right - Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        {actionsOpen && (
          <View style={styles.actionButtonsList}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.iconText}>📍</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.iconText}>🔍</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          onPress={() => setActionsOpen(!actionsOpen)}
          style={styles.actionButton}
        >
          <Text style={styles.iconText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Expandable Bar - Redesigned */}
      <View
        style={[
          styles.bottomBar,
          { height: bottomBarExpanded ? height * 0.7 : 200 }
        ]}
      >
        {/* Drag Handle */}
        <TouchableOpacity
          onPress={() => setBottomBarExpanded(!bottomBarExpanded)}
          style={styles.dragHandle}
        >
          <View style={styles.dragHandleBar} />
        </TouchableOpacity>

        {/* Top Action Bar: Family Tabs + Location + SOS */}
        <View style={styles.topActionBar}>
          {/* Scrollable Family Tabs */}
          <View style={[
            styles.familyTabsContainer,
            { flex: families && families.length === 1 ? 6 :
                    families && families.length === 2 ? 3 :
                    families && families.length >= 3 ? 2 : 6 }
          ]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.familyTabsContent}
            >
              {families?.map((family, index) => {
                const isSelected = selectedFamilyId === family.id;
                const familyMembers = family.members?.filter(m => m.user_id !== user?.id) || [];
                
                return (
                  <TouchableOpacity
                    key={family.id}
                    onPress={() => {
                      setSelectedFamilyId(family.id);
                      switchFamily(family.id);
                    }}
                    style={[
                      styles.familyChip,
                      isSelected && styles.familyChipActive
                    ]}
                  >
                    <Text style={[
                      styles.familyChipText,
                      isSelected && styles.familyChipTextActive
                    ]}>
                      {family.name}
                    </Text>
                    {familyMembers.length > 0 && (
                      <View style={[
                        styles.familyMemberBadge,
                        isSelected && styles.familyMemberBadgeActive
                      ]}>
                        <Text style={[
                          styles.familyMemberBadgeText,
                          isSelected && styles.familyMemberBadgeTextActive
                        ]}>
                          {familyMembers.length}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Location Management Button */}
          <TouchableOpacity
            style={styles.actionBarButton}
            onPress={() => router.push('/settings/location' as any)}
          >
            <Text style={styles.actionBarIcon}>📍</Text>
          </TouchableOpacity>

          {/* SOS Button */}
          <TouchableOpacity
            style={styles.sosButton}
            onPress={() => {
              // TODO: Implement SOS functionality
              alert('SOS Alert sent to all families!');
            }}
          >
            <Text style={styles.sosButtonText}>SOS</Text>
          </TouchableOpacity>
        </View>

        {/* Family Members List - Filtered by Selected Family */}
        <View style={styles.membersSection}>
          {(() => {
            const selectedFamily = families?.find(f => f.id === selectedFamilyId);
            const filteredMembers = selectedFamily?.members?.filter(m => m.user_id !== user?.id) || [];
            
            return (
              <>
                <Text style={styles.sectionTitle}>
                  {selectedFamily?.name.toUpperCase() || 'FAMILY'} MEMBERS ({filteredMembers.length})
                  {isConnected && <Text style={styles.statusOnline}> • CONNECTED</Text>}
                </Text>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {filteredMembers.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>
                        No other members in this family
                      </Text>
                      <Text style={styles.emptyStateSubtext}>
                        Invite members to see their locations
                      </Text>
                      <TouchableOpacity
                        style={styles.inviteButton}
                        onPress={() => router.push('/invitations' as any)}
                      >
                        <Text style={styles.inviteButtonText}>+ Invite Members</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    filteredMembers.map((member, index) => {
                      const location = memberLocations.get(member.user_id);
                      const presence = memberPresence.get(member.user_id);
                      const isOnline = presence?.status === 'online';
                      const memberColor = MEMBER_COLORS[index % MEMBER_COLORS.length];
                      const ghost = memberGhost.get(member.user_id);
                      
                      // Get display name - fallback chain
                      const displayName = member.user?.name || 
                                        member.user?.username || 
                                        (typeof member.user === 'string' ? member.user : null) ||
                                        'Unknown Member';
                      
                      const lastUpdate = location?.timestamp
                        ? new Date(location.timestamp).toLocaleTimeString()
                        : 'Unknown';

                      // Double-tap detection for location history
                      const handleMemberPress = () => {
                        const now = Date.now();
                        const DOUBLE_TAP_DELAY = 300;

                        if (
                          lastTappedMember === member.user_id &&
                          now - lastTapTime < DOUBLE_TAP_DELAY
                        ) {
                          // Double tap - show location history
                          router.push(`/location-history?userId=${member.user_id}&familyId=${selectedFamilyId}` as any);
                        } else {
                          // Single tap - move map
                          setSelectedMember(member.user_id);
                          if (location && mapRef.current) {
                            mapRef.current.animateToRegion({
                              latitude: location.latitude,
                              longitude: location.longitude,
                              latitudeDelta: 0.01,
                              longitudeDelta: 0.01,
                            }, 1000);
                          }
                        }

                        setLastTapTime(now);
                        setLastTappedMember(member.user_id);
                      };

                      // Log for debugging
                      console.log(`👤 Member ${index}:`, {
                        user_id: member.user_id,
                        role: member.role,
                        displayName,
                        hasLocation: !!location,
                        isOnline
                      });

                      return (
                        <TouchableOpacity
                          key={member.user_id}
                          onPress={handleMemberPress}
                          style={[
                            styles.memberCard,
                            selectedMember === member.user_id && styles.memberCardSelected,
                          ]}
                        >
                          <View
                            style={[
                              styles.memberAvatar,
                              { backgroundColor: memberColor },
                            ]}
                          >
                            <Text style={styles.memberAvatarText}>
                              {displayName[0]?.toUpperCase() || ''}
                            </Text>
                            {!displayName[0] && <EmojiIcon emoji="👤" size={26} />}
                          </View>

                          <View style={styles.memberInfo}>
                            <View style={styles.memberNameRow}>
                              <Text style={styles.memberName}>
                                {displayName}
                              </Text>
                              <View style={[
                                styles.roleBadge,
                                member.role === 'head' && styles.roleBadgeHead,
                                member.role === 'child_member' && styles.roleBadgeChild,
                              ]}>
                                {member.role === 'head' && <EmojiIcon emoji="👑" size={12} />}
                                {member.role === 'child_member' && <EmojiIcon emoji="�" size={12} />}
                                {member.role === 'member' && <EmojiIcon emoji="�" size={12} />}
                              </View>
                            </View>
                            
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <EmojiIcon emoji={isOnline ? '🟢' : '⚪'} size={14} />
                              <Text style={styles.memberStatus}>
                                {isOnline ? 'Active now' : 'Offline'}
                              </Text>
                            </View>
                            
                            {location ? (
                              <>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <Text style={styles.memberTimestamp}>
                                    Updated: {lastUpdate}
                                  </Text>
                                  {ghost?.enabled && <EmojiIcon emoji="👻" size={12} />}
                                </View>
                                {location.batteryLevel !== undefined && (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <EmojiIcon emoji="🔋" size={12} />
                                    <Text style={styles.memberBattery}>
                                      {location.batteryLevel}%
                                    </Text>
                                  </View>
                                )}
                                {location.accuracy !== undefined && (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <EmojiIcon emoji="📍" size={12} />
                                    <Text style={styles.memberAccuracy}>
                                      ±{Math.round(location.accuracy)}m
                                    </Text>
                                  </View>
                                )}
                              </>
                            ) : (
                              <Text style={styles.memberTimestamp}>
                                No location data yet
                              </Text>
                            )}
                            
                            <Text style={styles.doubleTapHint}>
                              Double-tap for history
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.statusIndicator,
                              isOnline ? styles.statusActive : styles.statusIdle,
                            ]}
                          />
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </>
            );
          })()}
        </View>
      </View>

      {/* Floating Action Button for Family Management */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push('/families' as any)}
      >
        <Text style={styles.fabText}>👥</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (theme: any) => {
  const tabVerticalPadding = theme.spacing.sm + 2;
  const accentWithOpacity = theme.colors.accent + '10';
  const fabBottom = theme.spacing.xl + 60;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    mapContainer: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      overflow: 'hidden',
    },
    map: {
      ...StyleSheet.absoluteFillObject,
      width: '100%',
      height: '100%',
    },
    mapLoadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    mapLoadingText: {
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: '500',
    },
    customMarker: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: '#fff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
    markerText: {
      fontSize: 20,
    },
    locationControlOverlay: {
      position: 'absolute',
      top: theme.spacing.md,
      right: theme.spacing.md,
      zIndex: 10,
    },
    hamburgerButton: {
      position: 'absolute',
      top: 56,
      left: 72, // Moved right to make room for back button
      width: 52,
      height: 52,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    backButton: {
      position: 'absolute',
      top: 56,
      left: theme.spacing.md,
      width: 52,
      height: 52,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    iconText: {
      fontSize: 24,
      color: theme.colors.icon,
    },
    drawerContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
    },
    drawerBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    drawerContent: {
      position: 'absolute',
      left: 0,
      top: 0,
      width: 280,
      height: '100%',
      backgroundColor: theme.colors.card,
      zIndex: 1001,
    },
    actionButtonsContainer: {
      position: 'absolute',
      top: 56,
      right: theme.spacing.md,
    },
    actionButtonsList: {
      marginBottom: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    actionButton: {
      width: 52,
      height: 52,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.sm,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    bottomBar: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: theme.borderRadius.lg,
      borderTopRightRadius: theme.borderRadius.lg,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 20,
      paddingTop: theme.spacing.sm,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: theme.colors.border,
    },
    dragHandle: {
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
    },
    dragHandleBar: {
      width: 56,
      height: 5,
      backgroundColor: theme.colors.border,
      borderRadius: theme.borderRadius.full,
    },
    topActionBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    familyTabsContainer: {
      flexDirection: 'row',
    },
    familyTabsContent: {
      gap: theme.spacing.xs,
      paddingRight: theme.spacing.sm,
    },
    familyChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F5F5F5',
      borderRadius: 20,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderWidth: 1,
      borderColor: '#E5E5E5',
    },
    familyChipActive: {
      backgroundColor: '#053326',
      borderColor: '#053326',
    },
    familyChipText: {
      fontSize: 14,
      fontWeight: '500',
      color: '#666666',
    },
    familyChipTextActive: {
      color: '#FFFFFF',
    },
    familyMemberBadge: {
      backgroundColor: '#053326',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: theme.spacing.xs,
      paddingHorizontal: 6,
    },
    familyMemberBadgeActive: {
      backgroundColor: '#FFFFFF',
    },
    familyMemberBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    familyMemberBadgeTextActive: {
      color: '#053326',
    },
    actionBarButton: {
      width: 48,
      height: 48,
      backgroundColor: '#053326',
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionBarIcon: {
      fontSize: 20,
    },
    sosButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      backgroundColor: '#DC2626',
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 60,
    },
    sosButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 1,
    },
    tabsContainer: {
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    tabsContent: {
      gap: theme.spacing.sm,
      paddingRight: theme.spacing.md,
    },
    tab: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: tabVerticalPadding,
      borderRadius: theme.borderRadius.md,
    },
    tabActive: {
      backgroundColor: theme.colors.accent,
    },
    tabInactive: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tabText: {
      fontWeight: '400',
      fontSize: 15,
      letterSpacing: 0.3,
    },
    tabTextActive: {
      color: '#FFFFFF',
      opacity: 1,
    },
    tabTextInactive: {
      color: theme.colors.text,
      opacity: 0.7,
    },
    membersSection: {
      paddingHorizontal: theme.spacing.md,
      flex: 1,
    },
    sectionTitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
      fontWeight: '400',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      opacity: 0.7,
    },
    statusOnline: {
      color: '#10B981',
      fontWeight: '600',
    },
    emptyState: {
      padding: theme.spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyStateText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: theme.colors.placeholder,
      textAlign: 'center',
    },
    inviteButton: {
      marginTop: theme.spacing.md,
      backgroundColor: '#053326',
      borderRadius: 8,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    inviteButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    memberCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    memberCardDefault: {
      backgroundColor: theme.colors.surface,
    },
    memberCardSelected: {
      backgroundColor: accentWithOpacity, // 10% opacity
      borderWidth: 1.5,
      borderColor: theme.colors.accent,
    },
    memberAvatar: {
      width: 52,
      height: 52,
      borderRadius: theme.borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
    },
    memberAvatarText: {
      fontSize: 26,
      color: 'white',
    },
    memberInfo: {
      flex: 1,
    },
    memberNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginBottom: 2,
    },
    memberName: {
      fontSize: 17,
      fontWeight: '400',
      color: theme.colors.text,
      letterSpacing: 0.2,
      flex: 1,
    },
    roleBadge: {
      backgroundColor: '#E5E5E5',
      borderRadius: 10,
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    roleBadgeHead: {
      backgroundColor: '#FFD700',
    },
    roleBadgeChild: {
      backgroundColor: '#93C5FD',
    },
    roleBadgeText: {
      fontSize: 12,
    },
    memberStatus: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    memberTimestamp: {
      fontSize: 12,
      color: theme.colors.placeholder,
      marginTop: 2,
    },
    memberBattery: {
      fontSize: 12,
      color: theme.colors.placeholder,
      marginTop: 2,
    },
    memberAccuracy: {
      fontSize: 12,
      color: theme.colors.placeholder,
      marginTop: 2,
    },
    doubleTapHint: {
      fontSize: 11,
      color: theme.colors.placeholder,
      fontStyle: 'italic',
      marginTop: 4,
    },
    statusIndicator: {
      width: 14,
      height: 14,
      borderRadius: theme.borderRadius.full,
      borderWidth: 2,
      borderColor: theme.colors.card,
    },
    statusActive: {
      backgroundColor: theme.colors.success,
    },
    statusIdle: {
      backgroundColor: theme.colors.placeholder,
    },
    createFamilyButton: {
      position: 'absolute',
      right: theme.spacing.md,
      bottom: 220,
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    createFamilyIcon: {
      color: '#fff',
      fontSize: 34,
      lineHeight: 38,
      fontWeight: '600',
    },
    fab: {
      position: 'absolute',
      right: theme.spacing.lg,
      bottom: fabBottom, // Above any bottom navigation
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    fabText: {
      fontSize: 24,
      color: '#FFFFFF',
    },
  });
};

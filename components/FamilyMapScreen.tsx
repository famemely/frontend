import React, { useCallback, useMemo, useState, useRef } from 'react';
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
import { FamilyMember, FamilyWithMembers } from '../types/family.types';
import Sidebar from './Sidebar';
import LocationTrackingControl from './location/LocationTrackingControl';

const { height } = Dimensions.get('window');

// Determine map provider - use GOOGLE on Android if available, otherwise default
const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;

export default function FamilyMapScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  // Get real family data from useFamily hook
  const { families, currentFamily, currentFamilyId, loading, error } = useFamily();

  // State management
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [bottomBarExpanded, setBottomBarExpanded] = useState(false);
  const [selectedTab, setSelectedTab] = useState<MapTab>('all');
  const [selectedMember, setSelectedMember] = useState<string | number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 37.7879,
    longitude: -122.4074,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Use custom drawer animation hook
  const { slideAnim, translateX } = useDrawerAnimation(menuOpen);

  console.log('🏠 FamilyMapScreen: Current families:', families?.length || 0);
  console.log('🏠 FamilyMapScreen: Current family ID:', currentFamilyId);
  console.log('🗺️ Map Ready:', mapReady);

  // Sample family members data (TODO: Fetch from API)
  const familyMembers = useMemo(() => [
    { id: '1', name: 'Mom', color: '#FF6B6B', status: 'active', latitude: 37.78825, longitude: -122.4324 },
    { id: '2', name: 'Dad', color: '#4ECDC4', status: 'active', latitude: 37.78925, longitude: -122.4314 },
    { id: '3', name: 'Sarah', color: '#FFE66D', status: 'idle', latitude: 37.78725, longitude: -122.4334 },
    { id: '4', name: 'Jake', color: '#95E1D3', status: 'active', latitude: 37.78625, longitude: -122.4344 },
  ], []);

  const safeMembers = familyMembers.filter(m => !!m && m.id != null);

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
            currentFamilyId={currentFamilyId || undefined}
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

      {/* Bottom Expandable Bar */}
      <View
        style={[
          styles.bottomBar,
          { height: bottomBarExpanded ? height * 0.6 : 180 }
        ]}
      >
        {/* Drag Handle */}
        <TouchableOpacity
          onPress={() => setBottomBarExpanded(!bottomBarExpanded)}
          style={styles.dragHandle}
        >
          <View style={styles.dragHandleBar} />
        </TouchableOpacity>

        {/* Tabs/Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {MAP_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setSelectedTab(tab.id)}
              style={[
                styles.tab,
                selectedTab === tab.id ? styles.tabActive : styles.tabInactive
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === tab.id ? styles.tabTextActive : styles.tabTextInactive
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Family Members Section */}
        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>FAMILY MEMBERS</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {familyMembers.map((member) => (
              <TouchableOpacity
                key={member.id}
                onPress={() => {
                  setSelectedMember(member.id);
                  focusOnMember(member);
                }}
                style={[
                  styles.memberCard,
                  selectedMember === member.id ? styles.memberCardSelected : styles.memberCardDefault
                ]}
              >
                <View
                  style={[
                    styles.memberAvatar,
                    { backgroundColor: member.color }
                  ]}
                >
                  <Text style={styles.memberAvatarText}>👤</Text>
                </View>

                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberStatus}>
                    {member.status === 'active' ? 'Active now' : 'Idle'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusIndicator,
                    member.status === 'active' ? styles.statusActive : styles.statusIdle
                  ]}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Floating Action Button for Family Management */}
      {currentFamily ? (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: currentFamily.theme_color || theme.colors.primary }]}
          onPress={() => router.push('/modal?view=familyManagement')}
        >
          <Text style={styles.fabText}>👥</Text>
        </TouchableOpacity>
      ) : families && families.length === 0 ? (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={() => router.push('/modal?view=familyManagement&openCreate=1')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      ) : null}
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
    memberCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
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
    memberName: {
      fontSize: 17,
      fontWeight: '400',
      color: theme.colors.text,
      marginBottom: 2,
      letterSpacing: 0.2,
    },
    memberStatus: {
      fontSize: 14,
      color: theme.colors.textSecondary,
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

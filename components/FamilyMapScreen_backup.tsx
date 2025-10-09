import React, { useCallback, useMemo, useState } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
// Map removed: previously                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.user.name}</Text>
                  <Text style={styles.memberStatus}>
                    {member.status === 'active' ? 'Active now' : 'Idle'}
                  </Text>
                </View>

                <View style={styles.memberActions}>
                  <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={() => navigation.navigate('modal', { 
                      view: 'familyManagement', 
                      openMemberManagement: '1',
                      memberId: member.id 
                    })}
                  >
                    <Text style={styles.quickActionText}>⚙️</Text>
                  </TouchableOpacity>
                  <View
                    style={[
                      styles.statusIndicator,
                      member.status === 'active' ? styles.statusActive : styles.statusIdle
                    ]}
                  />
                </View>ative-maps. Placeholder view instead.
import { MAP_CONFIG, MAP_TABS, MapTab } from '../constants/maps.config';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useDrawerAnimation } from '../hooks/useDrawerAnimation';
import { useFamily } from '../hooks/useFamily';
import { FamilyMember, FamilyWithMembers } from '../types/family.types';
import Sidebar from './Sidebar';
import { useNavigation } from '@react-navigation/native';

const { height } = Dimensions.get('window');

export default function FamilyMapScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  
  // Get real family data from useFamily hook
  const { families, currentFamily, currentFamilyId, loading, error } = useFamily();

  // Feature flag: allow disabling map for debugging crashes
  const MAP_ENABLED = true; // Flip to false to isolate issues
  
  // State management
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [bottomBarExpanded, setBottomBarExpanded] = useState(false);
  const [selectedTab, setSelectedTab] = useState<MapTab>('all');
  const [selectedMember, setSelectedMember] = useState<string | number | null>(null);

  // Use custom drawer animation hook
  const { slideAnim, translateX } = useDrawerAnimation(menuOpen);

  console.log('🏠 FamilyMapScreen: Current families:', families?.length || 0);
  console.log('🏠 FamilyMapScreen: Current family ID:', currentFamilyId);

  // Sample family members data (TODO: Fetch from API)
  // Using `any[]` here because FamilyMember in types includes many fields.
  const familyMembers = useMemo(() => [
    { id: '1', user: { name: 'Mom' }, color: '#FF6B6B', status: 'active' },
    { id: '2', user: { name: 'Dad' }, color: '#4ECDC4', status: 'active' },
    { id: '3', user: { name: 'Sarah' }, color: '#FFE66D', status: 'idle' },
    { id: '4', user: { name: 'Jake' }, color: '#95E1D3', status: 'active' },
  ], []) as any[];

  const initialRegion = useMemo(() => ({ ...MAP_CONFIG.DEFAULT_REGION }), [] as const);

  const safeMembers = familyMembers.filter(m => !!m && m.id != null);

  // Marker rendering removed with map dependency.
  const renderMarker = useCallback(() => null, []);

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      {/* Map Area - Real Map */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapPlaceholderTitle}>Map Feature Coming Soon</Text>
          <Text style={styles.mapPlaceholderSubtitle}>We removed the map module temporarily.</Text>
        </View>
      </View>

      {/* Floating Create Family Button (FAB) */}
      <TouchableOpacity
        style={styles.createFamilyButton}
        accessibilityLabel="Create new family"
        onPress={() => navigation.navigate('modal', { view: 'familyManagement', openCreate: '1' })}
      >
        <Text style={styles.createFamilyIcon}>＋</Text>
      </TouchableOpacity>

      {/* Top Left - Hamburger Menu */}
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
            navigation={navigation}
            userName={user?.fullName || user?.username || 'User'}
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>FAMILY MEMBERS</Text>
            <TouchableOpacity
              style={styles.manageFamilyButton}
              onPress={() => navigation.navigate('modal', { 
                view: 'familyManagement',
                openMemberManagement: '1'
              })}
            >
              <Text style={styles.manageFamilyButtonText}>⚙️ Manage</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            {familyMembers.map((member) => (
              <TouchableOpacity
                key={member.id}
                onPress={() => setSelectedMember(member.id)}
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

        {/* Quick Family Management Info */}
        {currentFamily && (
          <View style={styles.quickInfoCard}>
            <Text style={styles.quickInfoTitle}>👥 Family Management</Text>
            <Text style={styles.quickInfoText}>
              Tap "⚙️ Manage" above to invite members, change roles, or remove members from your family.
            </Text>
            <TouchableOpacity
              style={styles.quickInfoButton}
              onPress={() => navigation.navigate('modal', { 
                view: 'familyManagement',
                openMemberManagement: '1'
              })}
            >
              <Text style={styles.quickInfoButtonText}>Open Member Management</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Floating Action Button for Family Management */}
      {currentFamily ? (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: currentFamily.theme_color || theme.colors.primary }]}
          onPress={() => navigation.navigate('modal', { view: 'familyManagement' })}
        >
          <Text style={styles.fabText}>👥</Text>
        </TouchableOpacity>
      ) : families && families.length === 0 ? (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('modal', { view: 'familyManagement', openCreate: '1' })}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    mapContainer: {
      flex: 1,
      backgroundColor: theme.colors.muted,
    },
    map: { width: '100%', height: '100%' },
    mapDisabled: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mapDisabledText: {
      color: theme.colors.textSecondary,
      opacity: 0.7,
    },
    mapPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      margin: theme.spacing.md,
    },
    mapPlaceholderTitle: {
      fontSize: 18,
      fontWeight: '400',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      letterSpacing: 0.4,
    },
    mapPlaceholderSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      opacity: 0.75,
      lineHeight: 20,
    },
    hamburgerButton: {
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
      paddingVertical: theme.spacing.sm + 2,
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
      backgroundColor: theme.colors.accent + '10', // 10% opacity
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
      fontWeight: '400',
      opacity: 0.7,
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
      bottom: theme.spacing.xl + 60, // Above any bottom navigation
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
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    manageFamilyButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    manageFamilyButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    quickInfoCard: {
      backgroundColor: theme.colors.card,
      marginHorizontal: theme.spacing.md,
      marginVertical: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    quickInfoTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    quickInfoText: {
      fontSize: 14,
      color: theme.colors.placeholder,
      lineHeight: 20,
      marginBottom: theme.spacing.md,
    },
    quickInfoButton: {
      backgroundColor: theme.colors.accent,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
    },
    quickInfoButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
  });

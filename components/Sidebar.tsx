import React, { useState } from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { SidebarProps } from '../types/family.types';

/**
 * SIDEBAR COMPONENT
 * 
 * A fully functional sidebar for family management
 * Styled with the global theme: black dominant, green accents, minimal design
 * 
 * Features:
 * - User profile section
 * - Family list with visibility toggles
 * - Navigation menu items
 * - Ghost mode toggle
 * - Adapts to light/dark theme
 */

const Sidebar: React.FC<SidebarProps> = ({ 
  navigation, 
  userName = "name", 
  profileImage = null,
  families = [],
  unreadBoardsCount = 0,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // State to control the dropdown expansion of Families section
  const [isFamiliesExpanded, setIsFamiliesExpanded] = useState(true);
  
  // State to control Ghost Mode toggle
  const [isGhostModeEnabled, setIsGhostModeEnabled] = useState(false);

  /**
   * PROFILE HANDLER
   * Opens the profile editor page when user clicks on profile image or name
   * TODO: Connect to your ProfileEditor screen/component
   */
  const handleProfilePress = () => {
    console.log('Profile pressed - Navigate to Profile Editor');
    // Uncomment and modify when you have the profile page ready:
    // navigation.navigate('ProfileEditor');
  };

  /**
   * FAMILY ITEM HANDLER
   * Opens the specific family page when a family name is clicked
   * Each family is a separate unit - user can be part of multiple families
   * (e.g., "Dad's" family, "Mine" family, "Mom's" family, etc.)
   * TODO: Connect to your FamilyPage screen/component
   * @param {Object} family - The family object containing id and name
   */
  const handleFamilyPress = (family: { id: number | string; name: string }) => {
    console.log(`Opening ${family.name} family page (ID: ${family.id})`);
    // Uncomment and modify when you have the family page ready:
    // navigation.navigate('FamilyPage', { 
    //   familyId: family.id,
    //   familyName: family.name 
    // });
  };

  /**
   * ADD NEW FAMILY HANDLER
   * Opens interface to create/join a new family
   * TODO: Connect to your AddFamily screen/component
   */
  const handleAddNewFamily = () => {
    console.log('Add new family pressed');
    // Uncomment and modify when ready:
    // navigation.navigate('AddFamily');
  };

  /**
   * NAVIGATION HANDLERS
   * These handle clicks on main menu items
   * TODO: Connect each to their respective screens
   */
  const handleTimelinePress = () => {
    console.log('Timeline pressed');
    // navigation.navigate('Timeline');
  };

  const handleUnifiedBoardsPress = () => {
    console.log('Unified Boards pressed');
    // navigation.navigate('UnifiedBoards');
  };

  const handleSOSPress = () => {
    console.log('SOS pressed');
    // navigation.navigate('SOS');
  };

  const handleAboutPress = () => {
    console.log('About pressed');
    // navigation.navigate('About');
  };

  const handleSettingsPress = () => {
    console.log('Settings pressed');
    // navigation.navigate('Settings');
  };

  const handleTermsPress = () => {
    console.log('Terms & Privacy pressed');
    // Open terms and privacy policy
  };

  /**
   * GHOST MODE TOGGLE
   * Toggles the ghost mode feature on/off
   */
  const handleGhostModeToggle = () => {
    setIsGhostModeEnabled(!isGhostModeEnabled);
    console.log(`Ghost Mode: ${!isGhostModeEnabled ? 'ON' : 'OFF'}`);
  };

  /**
   * FAMILIES DROPDOWN TOGGLE
   * Expands/collapses the families list
   */
  const toggleFamiliesDropdown = () => {
    setIsFamiliesExpanded(!isFamiliesExpanded);
  };

  return (
    <View style={styles.container}>
      {/* PROFILE SECTION - Top area with user image and name */}
      <TouchableOpacity 
        style={styles.profileSection}
        onPress={handleProfilePress}
        activeOpacity={0.7}
      >
        {/* Profile Image Circle */}
        <View style={styles.profileImageContainer}>
          {profileImage ? (
            <Image 
              source={profileImage} 
              style={styles.profileImage}
              resizeMode="cover"
            />
          ) : (
            // Placeholder if no image provided
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profilePlaceholderText}>👤</Text>
            </View>
          )}
        </View>
        
        {/* User Name */}
        <Text style={styles.userName}>{userName}</Text>
      </TouchableOpacity>

      {/* SCROLLABLE MENU SECTION - Contains all menu items */}
      <ScrollView 
        style={styles.menuSection}
        showsVerticalScrollIndicator={false}
      >
        {/* UNIFIED BOARDS MENU ITEM - Above Families */}
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={handleUnifiedBoardsPress}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemRow}>
            <Text style={styles.menuText}>Unified Boards</Text>
            {unreadBoardsCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>
                  {unreadBoardsCount > 99 ? '99+' : unreadBoardsCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* FAMILIES SECTION - Expandable/collapsible list of families */}
        <View style={styles.menuItem}>
          <TouchableOpacity 
            style={styles.familiesHeader}
            onPress={toggleFamiliesDropdown}
            activeOpacity={0.7}
          >
            <Text style={styles.menuText}>Families</Text>
            {/* Dropdown chevron icon - rotates based on expanded state */}
            <Text style={[
              styles.chevron,
              isFamiliesExpanded && styles.chevronExpanded
            ]}>
              ›
            </Text>
          </TouchableOpacity>

          {/* FAMILIES LIST - Only visible when expanded - Scrollable */}
          {isFamiliesExpanded && (
            <ScrollView 
              style={styles.familiesList}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={false}
            >
              {/* Map through all families user belongs to */}
              {families.map((family) => (
                <View key={family.id} style={styles.familyItemContainer}>
                  <TouchableOpacity
                    style={styles.familyItem}
                    onPress={() => handleFamilyPress(family)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.familyName}>{family.name}</Text>
                  </TouchableOpacity>
                  
                  {/* Two checkboxes for family visibility settings */}
                  {/* Left checkbox: Show on map | Right checkbox: Show in timeline */}
                  {/* TODO: Implement checkbox logic for visibility toggles */}
                  <View style={styles.checkboxContainer}>
                    <TouchableOpacity activeOpacity={0.7}>
                      <View style={styles.checkbox} />
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.7}>
                      <View style={styles.checkbox} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* ADD NEW FAMILY BUTTON */}
              <TouchableOpacity
                style={styles.addNewFamily}
                onPress={handleAddNewFamily}
                activeOpacity={0.7}
              >
                <Text style={styles.addNewText}>··· add new</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* TIMELINE MENU ITEM */}
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={handleTimelinePress}
          activeOpacity={0.7}
        >
          <Text style={styles.menuText}>Timeline</Text>
        </TouchableOpacity>

        {/* UNIFIED BOARDS MENU ITEM */}
        {/* Moved above Families section */}

        {/* SOS MENU ITEM */}
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={handleSOSPress}
          activeOpacity={0.7}
        >
          <Text style={styles.menuText}>SOS</Text>
        </TouchableOpacity>

        {/* GHOST MODE MENU ITEM with toggle checkbox */}
        <View style={styles.menuItem}>
          <View style={styles.ghostModeContainer}>
            <Text style={styles.menuText}>Ghost Mode</Text>
            <TouchableOpacity
              style={styles.ghostModeCheckbox}
              onPress={handleGhostModeToggle}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox,
                isGhostModeEnabled && styles.checkboxChecked
              ]}>
                {isGhostModeEnabled && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ABOUT MENU ITEM */}
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={handleAboutPress}
          activeOpacity={0.7}
        >
          <Text style={styles.menuText}>About</Text>
        </TouchableOpacity>

        {/* SETTINGS MENU ITEM */}
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={handleSettingsPress}
          activeOpacity={0.7}
        >
          <Text style={styles.menuText}>Settings</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* FOOTER SECTION - Legal links at bottom */}
      <View style={styles.footer}>
        <TouchableOpacity 
          activeOpacity={0.7}
          style={styles.footerLink}
          onPress={handleTermsPress}
        >
          <Text style={styles.footerText}>Terms · Privacy Policy</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * STYLES
 * All styling for the sidebar component using the global theme
 * Follows the design system: black dominant, green accents, minimal rounded corners
 */
const createStyles = (theme: any) =>
  StyleSheet.create({
    // Main container - full height sidebar
    container: {
      flex: 1,
      backgroundColor: theme.colors.card,
      paddingTop: theme.spacing.xl,
      paddingLeft: theme.spacing.lg,
      paddingRight: theme.spacing.lg,
      shadowColor: '#000000',
      shadowOffset: { width: 4, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 16,
    },

    // Profile section at top
    profileSection: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
      marginBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },

    profileImageContainer: {
      width: 90,
      height: 90,
      borderRadius: 45,
      marginBottom: theme.spacing.md,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: theme.colors.border,
    },

    profileImage: {
      width: '100%',
      height: '100%',
    },

    // Placeholder circle when no image provided
    profilePlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },

    profilePlaceholderText: {
      fontSize: 32,
      color: theme.colors.icon,
      opacity: 0.5,
    },

    userName: {
      fontSize: 18,
      fontWeight: '400',
      color: theme.colors.text,
      letterSpacing: 0.5,
    },

    // Scrollable menu section
    menuSection: {
      flex: 1,
      paddingTop: theme.spacing.lg,
    },

    menuItem: {
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },

    menuText: {
      fontSize: 16,
      fontWeight: '400',
      color: theme.colors.text,
      letterSpacing: 0.3,
    },

    menuItemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    notificationBadge: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs - 2,
      minWidth: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },

    notificationText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '400',
    },

    // Families dropdown header
    familiesHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.xs,
    },

    // Chevron icon for dropdown
    chevron: {
      fontSize: 18,
      fontWeight: '400',
      color: theme.colors.icon,
      transform: [{ rotate: '90deg' }],
      opacity: 0.6,
    },

    chevronExpanded: {
      transform: [{ rotate: '-90deg' }],
    },

    // Families list container
    familiesList: {
      paddingLeft: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      maxHeight: 200,
    },

    familyItemContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.sm,
    },

    familyItem: {
      flex: 1,
    },

    familyName: {
      fontSize: 15,
      fontWeight: '400',
      color: theme.colors.text,
    },

    // Checkboxes next to family names
    checkboxContainer: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },

    checkbox: {
      width: 20,
      height: 20,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.sm,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
    },

    checkboxChecked: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },

    checkmark: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '400',
    },

    // Add new family button
    addNewFamily: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },

    addNewText: {
      fontSize: 14,
      fontWeight: '400',
      color: theme.colors.accent,
      fontStyle: 'italic',
    },

    // Ghost Mode container
    ghostModeContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    ghostModeCheckbox: {
      padding: theme.spacing.xs,
    },

    // Footer section at bottom
    footer: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xs,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      marginTop: theme.spacing.sm,
    },

    footerLink: {
      paddingVertical: theme.spacing.xs,
    },

    footerText: {
      fontSize: 10,
      fontWeight: '400',
      color: theme.colors.textSecondary,
      textAlign: 'center',
      opacity: 0.5,
      letterSpacing: 0.3,
    },
  });

export default Sidebar;

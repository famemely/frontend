/**
 * Family Dashboard
 * Main dashboard showing family overview with navigation to different sections
 * Redesigned to match auth screen aesthetic
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useFamily } from '@/hooks/useFamily';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function FamilyDashboard() {
    const { theme } = useTheme();
    const { user } = useAuth();
    const { currentFamily, families, loading } = useFamily();
    const router = useRouter();

    const styles = createStyles(theme);

    const dashboardCards = [
        {
            id: 'map',
            title: 'Family Map',
            description: 'Real-time location tracking',
            icon: '🗺️',
            onPress: () => router.push('/FamilyMap'),
        },
        {
            id: 'members',
            title: 'Family Members',
            description: 'Manage your family circle',
            icon: '👥',
            onPress: () => {
                console.log('Navigate to members');
            },
        },
        {
            id: 'invitations',
            title: 'Invitations',
            description: 'Send and manage invites',
            icon: '✉️',
            onPress: () => {
                console.log('Navigate to invitations');
            },
        },
        {
            id: 'settings',
            title: 'Settings',
            description: 'Privacy and preferences',
            icon: '⚙️',
            onPress: () => {
                console.log('Navigate to settings');
            },
        },
    ];

    return (
        <View style={styles.container}>
            {/* Elegant Header */}
            <View style={styles.header}>
                <Text style={styles.logo}>Famemely</Text>
                <Text style={styles.greeting}>
                    Hello, {user?.fullName?.split(' ')[0] || 'there'}
                </Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Family Card */}
                <View style={styles.familyCard}>
                    <View style={styles.familyCardHeader}>
                        <Text style={styles.familyName}>
                            {currentFamily?.name || 'Your Family'}
                        </Text>
                        {currentFamily && (
                            <View style={styles.memberBadge}>
                                <Text style={styles.memberBadgeText}>
                                    {currentFamily.member_count || currentFamily.members?.length || 0}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.familySubtext}>
                        {currentFamily ? 'Active family circle' : 'Create or join a family'}
                    </Text>
                </View>

                {/* Quick Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{families?.length || 0}</Text>
                        <Text style={styles.statLabel}>Families</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>
                            {currentFamily?.members?.length || 0}
                        </Text>
                        <Text style={styles.statLabel}>Members</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>
                            {currentFamily?.members?.filter((m: any) => m.status === 'active').length || 0}
                        </Text>
                        <Text style={styles.statLabel}>Active</Text>
                    </View>
                </View>

                {/* Navigation Cards */}
                <View style={styles.navSection}>
                    <Text style={styles.sectionTitle}>Quick Access</Text>
                    {dashboardCards.map((card, index) => (
                        <TouchableOpacity
                            key={card.id}
                            style={[
                                styles.navCard,
                                index === dashboardCards.length - 1 && styles.navCardLast,
                            ]}
                            onPress={card.onPress}
                            activeOpacity={0.7}
                        >
                            <View style={styles.navCardIcon}>
                                <Text style={styles.iconEmoji}>{card.icon}</Text>
                            </View>
                            <View style={styles.navCardContent}>
                                <Text style={styles.navCardTitle}>{card.title}</Text>
                                <Text style={styles.navCardDesc}>{card.description}</Text>
                            </View>
                            <Text style={styles.navCardArrow}>›</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Recent Activity */}
                <View style={styles.activitySection}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    <View style={styles.activityEmpty}>
                        <Text style={styles.activityEmptyIcon}>📭</Text>
                        <Text style={styles.activityEmptyText}>
                            No recent activity
                        </Text>
                        <Text style={styles.activityEmptySubtext}>
                            Activity from your family will appear here
                        </Text>
                    </View>
                </View>
            </ScrollView>
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
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.xl + 40,
            paddingBottom: theme.spacing.xl,
            backgroundColor: theme.colors.primary,
            borderBottomLeftRadius: 30,
            borderBottomRightRadius: 30,
        },
        logo: {
            fontSize: 36,
            color: '#FFFFFF',
            fontWeight: '800',
            letterSpacing: 1,
            marginBottom: theme.spacing.xs,
        },
        greeting: {
            fontSize: 16,
            color: '#FFFFFF',
            opacity: 0.9,
            marginBottom: theme.spacing.xs,
        },
        familyName: {
            fontSize: 20,
            fontWeight: '700',
            color: theme.colors.text,
        },
        memberCount: {
            fontSize: 14,
            color: '#FFFFFF',
            opacity: 0.8,
        },
        scrollView: {
            flex: 1,
        },
        scrollContent: {
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.xl,
        },
        // Family summary card
        familyCard: {
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            padding: theme.spacing.lg,
            marginTop: -24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 2,
        },
        familyCardHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        memberBadge: {
            backgroundColor: '#F0FDF4',
            borderColor: '#059669',
            borderWidth: 1,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
        },
        memberBadgeText: {
            color: '#065F46',
            fontWeight: '700',
        },
        familySubtext: {
            marginTop: 6,
            color: theme.colors.textSecondary,
        },
        // Stats row
        statsRow: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            padding: theme.spacing.lg,
            marginTop: theme.spacing.lg,
        },
        statItem: {
            flex: 1,
            alignItems: 'center',
        },
        statNumber: {
            fontSize: 20,
            fontWeight: '800',
            color: theme.colors.primary,
        },
        statLabel: {
            fontSize: 12,
            color: theme.colors.textSecondary,
            marginTop: 2,
        },
        statDivider: {
            width: 1,
            alignSelf: 'stretch',
            backgroundColor: '#E5E5E5',
            marginHorizontal: theme.spacing.md,
        },
        statsContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: -30,
            marginBottom: theme.spacing.lg,
            gap: theme.spacing.md,
        },
        statCard: {
            flex: 1,
            backgroundColor: theme.colors.surface,
            borderRadius: 15,
            padding: theme.spacing.lg,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        statValue: {
            fontSize: 32,
            fontWeight: 'bold',
            color: theme.colors.primary,
            marginBottom: theme.spacing.xs,
        },
        // statLabel defined later for statsRow, keep only one definition
        cardsContainer: {
            gap: theme.spacing.md,
        },
        card: {
            backgroundColor: theme.colors.surface,
            borderRadius: 15,
            padding: theme.spacing.lg,
            borderLeftWidth: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        cardContent: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        iconContainer: {
            width: 50,
            height: 50,
            borderRadius: 25,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: theme.spacing.md,
        },
        icon: {
            fontSize: 24,
        },
        cardText: {
            flex: 1,
        },
        cardTitle: {
            fontSize: 18,
            fontWeight: '600',
            color: theme.colors.text,
            marginBottom: 4,
        },
        cardDescription: {
            fontSize: 14,
            color: theme.colors.textSecondary,
        },
        arrow: {
            fontSize: 28,
            color: theme.colors.textSecondary,
            marginLeft: theme.spacing.sm,
        },
        section: {
            marginTop: theme.spacing.xl,
        },
        sectionTitle: {
            fontSize: 20,
            fontWeight: '600',
            color: theme.colors.text,
            marginBottom: theme.spacing.md,
        },
        // Navigation section
        navSection: {
            marginTop: theme.spacing.xl,
        },
        navCard: {
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            padding: theme.spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: theme.spacing.sm,
            borderWidth: 1,
            borderColor: '#E5E5E5',
        },
        navCardLast: {
            marginBottom: 0,
        },
        navCardIcon: {
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#F7F7F7',
            marginRight: theme.spacing.md,
        },
        iconEmoji: {
            fontSize: 22,
        },
        navCardContent: {
            flex: 1,
        },
        navCardTitle: {
            fontSize: 16,
            fontWeight: '600',
            color: theme.colors.text,
        },
        navCardDesc: {
            fontSize: 12,
            color: theme.colors.textSecondary,
            marginTop: 2,
        },
        navCardArrow: {
            fontSize: 24,
            color: '#999999',
        },
        activityCard: {
            backgroundColor: theme.colors.surface,
            borderRadius: 15,
            padding: theme.spacing.xl,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        // Activity section
        activitySection: {
            marginTop: theme.spacing.xl,
        },
        activityText: {
            fontSize: 14,
            color: theme.colors.textSecondary,
            fontStyle: 'italic',
        },
        activityEmpty: {
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            padding: theme.spacing.lg,
        },
        activityEmptyIcon: {
            fontSize: 36,
            marginBottom: theme.spacing.sm,
        },
        activityEmptyText: {
            fontSize: 16,
            fontWeight: '600',
            color: theme.colors.text,
        },
        activityEmptySubtext: {
            fontSize: 12,
            color: theme.colors.textSecondary,
            marginTop: 4,
        },
    });

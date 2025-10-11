/**
 * Family Dashboard
 * Main dashboard showing family overview with navigation to different sections
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
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
            description: 'View family member locations',
            icon: '🗺️',
            color: theme.colors.primary,
            onPress: () => router.push('/FamilyMap'),
        },
        {
            id: 'testmap',
            title: 'Test Map',
            description: 'Simple map test with markers',
            icon: '🧪',
            color: '#FF6B6B',
            onPress: () => router.push('/TestMap'),
        },
        {
            id: 'minimalmap',
            title: 'Minimal Map',
            description: 'Bare minimum map test',
            icon: '📍',
            color: '#A78BFA',
            onPress: () => router.push('/MinimalMap'),
        },
        {
            id: 'diagnostics',
            title: 'Map Diagnostics',
            description: 'Debug and test map functionality',
            icon: '🔧',
            color: '#F97316',
            onPress: () => router.push('/MapDiagnostics'),
        },
        {
            id: 'envtest',
            title: 'Environment Test',
            description: 'Test environment variables',
            icon: '⚙️',
            color: '#8B5CF6',
            onPress: () => router.push('/EnvTest'),
        },
        {
            id: 'members',
            title: 'Family Members',
            description: 'Manage family members',
            icon: '👥',
            color: '#4ECDC4',
            onPress: () => {
                // Navigation to family members screen
                console.log('Navigate to members');
            },
        },
        {
            id: 'invitations',
            title: 'Invitations',
            description: 'Send and manage invites',
            icon: '✉️',
            color: '#FFE66D',
            onPress: () => {
                // Navigation to invitations screen
                console.log('Navigate to invitations');
            },
        },
        {
            id: 'settings',
            title: 'Family Settings',
            description: 'Manage family settings',
            icon: '⚙️',
            color: '#95E1D3',
            onPress: () => {
                // Navigation to settings screen
                console.log('Navigate to settings');
            },
        },
    ];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.greeting}>Hello, {user?.fullName || user?.email || 'User'}!</Text>
                <Text style={styles.familyName}>
                    {currentFamily?.name || 'No Family Selected'}
                </Text>
                {currentFamily && (
                    <Text style={styles.memberCount}>
                        {currentFamily.member_count || currentFamily.members?.length || 0} members
                    </Text>
                )}
            </View>

            {/* Dashboard Cards */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Quick Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{families?.length || 0}</Text>
                        <Text style={styles.statLabel}>Families</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>
                            {currentFamily?.members?.length || 0}
                        </Text>
                        <Text style={styles.statLabel}>Members</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>
                            {currentFamily?.members?.length || 0}
                        </Text>
                        <Text style={styles.statLabel}>Active</Text>
                    </View>
                </View>

                {/* Action Cards */}
                <View style={styles.cardsContainer}>
                    {dashboardCards.map((card) => (
                        <TouchableOpacity
                            key={card.id}
                            style={[styles.card, { borderLeftColor: card.color }]}
                            onPress={card.onPress}
                            activeOpacity={0.7}
                        >
                            <View style={styles.cardContent}>
                                <View style={[styles.iconContainer, { backgroundColor: card.color + '20' }]}>
                                    <Text style={styles.icon}>{card.icon}</Text>
                                </View>
                                <View style={styles.cardText}>
                                    <Text style={styles.cardTitle}>{card.title}</Text>
                                    <Text style={styles.cardDescription}>{card.description}</Text>
                                </View>
                                <Text style={styles.arrow}>›</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Recent Activity Section (Placeholder) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    <View style={styles.activityCard}>
                        <Text style={styles.activityText}>
                            No recent activity to show
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
        greeting: {
            fontSize: 16,
            color: '#FFFFFF',
            opacity: 0.9,
            marginBottom: theme.spacing.xs,
        },
        familyName: {
            fontSize: 28,
            fontWeight: 'bold',
            color: '#FFFFFF',
            marginBottom: theme.spacing.xs,
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
        statLabel: {
            fontSize: 14,
            color: theme.colors.textSecondary,
        },
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
        activityText: {
            fontSize: 14,
            color: theme.colors.textSecondary,
            fontStyle: 'italic',
        },
    });

/**
 * Notifications Screen
 * Displays geofence enter/exit events and other family notifications
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useFamily } from '@/hooks/useFamily';

interface Notification {
  id: string;
  type: 'geofence_enter' | 'geofence_exit' | 'sos' | 'battery_low' | 'location_shared';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  member_name?: string;
  location_name?: string;
  family_name?: string;
}

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { families } = useFamily();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'geofence'>('all');

  const styles = createStyles(theme);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      // TODO: Integrate with notification service
      // const data = await notificationService.getNotifications();
      
      // Mock data for demonstration
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'geofence_enter',
          title: 'Geofence Alert',
          message: 'John entered Home',
          timestamp: new Date().toISOString(),
          read: false,
          member_name: 'John',
          location_name: 'Home',
          family_name: 'Smith Family',
        },
        {
          id: '2',
          type: 'geofence_exit',
          title: 'Geofence Alert',
          message: 'Sarah left School',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          read: true,
          member_name: 'Sarah',
          location_name: 'School',
          family_name: 'Smith Family',
        },
      ];
      
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    // TODO: Update on backend
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    // TODO: Update on backend
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    // TODO: Delete on backend
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'geofence_enter':
        return '📍';
      case 'geofence_exit':
        return '🚶';
      case 'sos':
        return '🆘';
      case 'battery_low':
        return '🔋';
      case 'location_shared':
        return '🗺️';
      default:
        return '🔔';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'geofence') return n.type === 'geofence_enter' || n.type === 'geofence_exit';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={{ width: 80 }} />}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
          <View style={[styles.filterBadge, filter === 'all' && styles.filterBadgeActive]}>
            <Text style={[styles.filterBadgeText, filter === 'all' && styles.filterBadgeTextActive]}>
              {notifications.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
            Unread
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.filterBadge, filter === 'unread' && styles.filterBadgeActive]}>
              <Text style={[styles.filterBadgeText, filter === 'unread' && styles.filterBadgeTextActive]}>
                {unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'geofence' && styles.filterTabActive]}
          onPress={() => setFilter('geofence')}
        >
          <Text style={[styles.filterText, filter === 'geofence' && styles.filterTextActive]}>
            Geofence
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#053326" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptyText}>
            {filter === 'unread'
              ? "You're all caught up!"
              : filter === 'geofence'
              ? 'No geofence alerts yet'
              : 'You have no notifications'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#053326"
            />
          }
        >
          {filteredNotifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[styles.notificationCard, !notification.read && styles.notificationUnread]}
              onPress={() => markAsRead(notification.id)}
              activeOpacity={0.7}
            >
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationIcon}>
                  {getNotificationIcon(notification.type)}
                </Text>
                <View style={styles.notificationContent}>
                  <View style={styles.notificationTitleRow}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    {!notification.read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.notificationMessage}>{notification.message}</Text>
                  {notification.family_name && (
                    <Text style={styles.notificationFamily}>
                      👨‍👩‍👧‍👦 {notification.family_name}
                    </Text>
                  )}
                  <Text style={styles.notificationTime}>
                    {formatTimestamp(notification.timestamp)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteNotification(notification.id)}
                >
                  <Text style={styles.deleteIcon}>×</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#000000',
    },
    markAllText: {
      fontSize: 14,
      color: '#053326',
      fontWeight: '500',
    },

    // Filter Tabs
    filterContainer: {
      flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E5E5',
    },
    filterTab: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F5F5F5',
      borderRadius: 20,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    filterTabActive: {
      backgroundColor: '#053326',
    },
    filterText: {
      fontSize: 14,
      fontWeight: '500',
      color: '#666666',
    },
    filterTextActive: {
      color: '#FFFFFF',
    },
    filterBadge: {
      backgroundColor: '#053326',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
    },
    filterBadgeActive: {
      backgroundColor: '#FFFFFF',
    },
    filterBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    filterBadgeTextActive: {
      color: '#053326',
    },

    // Loading & Empty States
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

    // Notifications List
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: theme.spacing.md,
    },
    notificationCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E5E5E5',
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    notificationUnread: {
      borderColor: '#053326',
      borderWidth: 1.5,
      backgroundColor: '#F0FDF4',
    },
    notificationHeader: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    notificationIcon: {
      fontSize: 24,
      marginTop: 2,
    },
    notificationContent: {
      flex: 1,
    },
    notificationTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
    },
    notificationTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000000',
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#053326',
    },
    notificationMessage: {
      fontSize: 14,
      color: '#333333',
      marginBottom: theme.spacing.xs,
      lineHeight: 20,
    },
    notificationFamily: {
      fontSize: 13,
      color: '#666666',
      marginBottom: theme.spacing.xs,
    },
    notificationTime: {
      fontSize: 12,
      color: '#999999',
    },
    deleteButton: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteIcon: {
      fontSize: 28,
      color: '#999999',
      fontWeight: '300',
    },
  });

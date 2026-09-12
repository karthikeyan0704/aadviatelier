import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import axios from 'axios';
import { ArrowLeft, Bell, CheckCheck, ChevronRight, Package, TriangleAlert } from 'lucide-react-native';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import { BorderRadius, Colors, Shadows, Spacing } from '../constants/theme';

const typeIcon = (type) => type === 'overdue_task' || type === 'overdue_order' ? TriangleAlert : Package;

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.NOTIFICATIONS);
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.log('Failed to load notifications', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadNotifications();
  }, [loadNotifications]));

  const markAllRead = async () => {
    try {
      await axios.put(`${API_ENDPOINTS.NOTIFICATIONS}/read-all`);
      setNotifications((current) => current.map((notification) => ({ ...notification, readAt: notification.readAt || new Date().toISOString() })));
    } catch (error) {
      console.log('Failed to mark notifications as read', error);
    }
  };

  const openNotification = async (notification) => {
    if (!notification.readAt) {
      try {
        await axios.put(`${API_ENDPOINTS.NOTIFICATIONS}/${notification._id}/read`);
        setNotifications((current) => current.map((item) => item._id === notification._id ? { ...item, readAt: new Date().toISOString() } : item));
      } catch (error) {
        console.log('Failed to mark notification as read', error);
      }
    }
    if (notification.orderIds?.[0]) {
      router.push({ pathname: '/order-details', params: { id: notification.orderIds[0] } });
    }
  };

  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>{unreadCount ? `${unreadCount} unread` : 'No new notifications'}</Text>
        </View>
        <TouchableOpacity onPress={markAllRead} disabled={!unreadCount} style={[styles.headerButton, !unreadCount && styles.disabled]}>
          <CheckCheck size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator style={styles.loader} size="large" color={Colors.primary} /> : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNotifications(); }} colors={[Colors.primary]} />}
          ListEmptyComponent={<View style={styles.empty}><Bell size={42} color={Colors.textSecondary} /><Text style={styles.emptyTitle}>No notifications yet</Text><Text style={styles.emptyText}>Delivery and task reminders will appear here.</Text></View>}
          renderItem={({ item }) => {
            const Icon = typeIcon(item.type);
            const isUnread = !item.readAt;
            return <TouchableOpacity style={[styles.card, isUnread && styles.unreadCard]} onPress={() => openNotification(item)}>
              <View style={[styles.icon, { backgroundColor: item.type === 'tomorrow_delivery' ? '#DBEAFE' : '#FEE2E2' }]}><Icon size={21} color={item.type === 'tomorrow_delivery' ? '#1D4ED8' : '#B91C1C'} /></View>
              <View style={styles.content}><Text style={[styles.cardTitle, isUnread && styles.unreadText]}>{item.title}</Text><Text style={styles.message}>{item.message}</Text><Text style={styles.time}>{new Date(item.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</Text></View>
              <ChevronRight size={18} color={Colors.textSecondary} />
            </TouchableOpacity>;
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, backgroundColor: Colors.primary, borderRadius: 20, margin: 10, ...Shadows.sm },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)' },
  headerText: { flex: 1, marginHorizontal: Spacing.md }, title: { color: Colors.white, fontSize: 21, fontWeight: 'bold' }, subtitle: { color: Colors.white, opacity: 0.8, fontSize: 13, marginTop: 2 },
  disabled: { opacity: 0.35 }, loader: { marginTop: 50 }, list: { padding: Spacing.md, paddingBottom: 100 },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', ...Shadows.sm },
  unreadCard: { borderLeftWidth: 4, borderLeftColor: Colors.primary }, icon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm }, content: { flex: 1 },
  cardTitle: { color: Colors.text, fontSize: 15, fontWeight: '600' }, unreadText: { fontWeight: '800' }, message: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 3 }, time: { color: Colors.textSecondary, fontSize: 11, marginTop: 7 },
  empty: { alignItems: 'center', marginTop: 100, paddingHorizontal: 30 }, emptyTitle: { color: Colors.text, fontWeight: 'bold', fontSize: 18, marginTop: 14 }, emptyText: { color: Colors.textSecondary, textAlign: 'center', marginTop: 6 },
});

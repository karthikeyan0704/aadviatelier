import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';

export const Shimmer = ({ width, height, borderRadius = 4, style }) => {
  return (
    <View
      style={[
        styles.shimmer,
        { width, height, borderRadius },
        style,
      ]}
    />
  );
};

export const TableSkeleton = () => {
  return (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={styles.tableRow}>
          <Shimmer width={100} height={16} />
          <Shimmer width={80} height={16} />
          <Shimmer width={60} height={16} />
        </View>
      ))}
    </View>
  );
};

export const CardSkeleton = () => {
  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.detailsSectionMock}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md}}>
           <Shimmer width={100} height={16} />
           <Shimmer width={80} height={20} borderRadius={4} />
        </View>
        <Shimmer width={'100%'} height={50} borderRadius={8} />
      </View>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={styles.customerCard}>
           <View style={styles.profileImage}>
             <Shimmer width={40} height={40} borderRadius={20} />
           </View>
           <View style={{ flex: 1 }}>
             <Shimmer width={150} height={18} style={{marginBottom: 8}} />
             <Shimmer width={100} height={14} />
           </View>
           <Shimmer width={20} height={20} borderRadius={10} style={{marginLeft: 10}} />
        </View>
      ))}
    </View>
  );
};

export const DashboardSkeleton = () => {
  return (
    <View style={styles.skeletonContainer}>
      <Shimmer width={120} height={20} style={{ marginHorizontal: Spacing.lg, marginBottom: Spacing.md }} />
      <View style={styles.gridContainer}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <View key={i} style={styles.gridCard}>
            <View style={styles.iconContainer}>
               <Shimmer width={24} height={24} borderRadius={12} style={{backgroundColor: '#CBD5E1'}} />
            </View>
            <View style={{ flex: 1, paddingLeft: 4 }}>
              <Shimmer width={30} height={22} style={{ marginBottom: 6 }} />
              <Shimmer width={70} height={12} style={{ marginBottom: 4 }} />
              <Shimmer width={40} height={12} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export const OrderDetailSkeleton = () => {
  return (
    <View style={[styles.skeletonContainer, { paddingHorizontal: Spacing.md }]}>
      {/* Profile Card Mock */}
      <View style={styles.detailCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
           <Shimmer width={50} height={50} borderRadius={25} />
           <View style={{ flex: 1, paddingLeft: Spacing.md }}>
             <Shimmer width={130} height={18} style={{ marginBottom: 8 }} />
             <Shimmer width={90} height={14} />
           </View>
           <Shimmer width={70} height={28} borderRadius={14} />
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Shimmer width={'48%'} height={40} borderRadius={8} />
          <Shimmer width={'48%'} height={40} borderRadius={8} />
        </View>
      </View>

      {/* Info Card Mock */}
      <View style={styles.detailCard}>
        <Shimmer width={100} height={18} style={{ marginBottom: Spacing.lg }} />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <Shimmer width={90} height={14} />
            <Shimmer width={120} height={14} />
          </View>
        ))}
      </View>

      {/* Dates Card Mock */}
      <View style={styles.detailCard}>
        <Shimmer width={80} height={18} style={{ marginBottom: Spacing.lg }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={{ alignItems: 'center' }}>
              <Shimmer width={30} height={30} borderRadius={15} style={{ marginBottom: 8 }} />
              <Shimmer width={50} height={12} style={{ marginBottom: 6 }} />
              <Shimmer width={70} height={14} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

export const SettingsSkeleton = () => {
  return (
    <View style={styles.skeletonContainer}>
      <View style={{ marginHorizontal: Spacing.lg, padding: Spacing.lg, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, marginBottom: Spacing.lg, flexDirection: 'row', alignItems: 'center', ...Shadows.sm }}>
        <Shimmer width={60} height={60} borderRadius={30} style={{ marginRight: Spacing.md }} />
        <View style={{ flex: 1 }}>
          <Shimmer width={140} height={20} style={{ marginBottom: 6 }} />
          <Shimmer width={80} height={14} />
        </View>
      </View>
      
      {[1, 2, 3].map((section) => (
        <View key={section} style={{ marginHorizontal: Spacing.lg, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg, ...Shadows.sm }}>
          <Shimmer width={90} height={14} style={{ marginBottom: Spacing.md }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
            <Shimmer width={40} height={40} borderRadius={20} style={{ marginRight: Spacing.md }} />
            <Shimmer width={150} height={16} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md }}>
            <Shimmer width={40} height={40} borderRadius={20} style={{ marginRight: Spacing.md }} />
            <Shimmer width={120} height={16} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  shimmer: {
    backgroundColor: '#E2E8F0',
  },
  skeletonContainer: {
    paddingTop: 10,
    width: '100%',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailsSectionMock: {
    margin: Spacing.md, 
    padding: Spacing.lg, 
    backgroundColor: Colors.white, 
    borderRadius: BorderRadius.xl, 
    ...Shadows.md,
    marginBottom: Spacing.lg
  },
  detailCard: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  customerCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.white, 
    padding: Spacing.md, 
    borderRadius: BorderRadius.md, 
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm, 
    ...Shadows.sm, 
    borderLeftWidth: 4, 
    borderLeftColor: Colors.primary 
  },
  profileImage: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.primary + '10', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48%',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    backgroundColor: '#F8FAFC',
  }
});

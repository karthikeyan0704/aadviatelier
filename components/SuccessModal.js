import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { CheckCircle, User, ShoppingBag, Calendar } from 'lucide-react-native';
import { Colors, Spacing, Shadows } from '../constants/theme';

export default function SuccessModal({ visible, title, message, onDone, secondaryText, onSecondaryAction, secondaryIcon, tertiaryText, onTertiaryAction, tertiaryIcon, orderConfirmation, customer, orderItems = [] }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.iconContainer}>
            <CheckCircle size={50} color={Colors.white} />
          </View>
          <Text style={styles.title}>{title || 'Success!'}</Text>
          {orderConfirmation ? (
            <ScrollView style={styles.confirmationScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.confirmationSubtitle}>Thank you for your order!</Text>
              <View style={styles.confirmationStatus}>
                <CheckCircle size={22} color="#2EAD55" />
                <Text style={styles.confirmationStatusText}>Your order has been confirmed successfully.</Text>
              </View>
              <View style={styles.customerInfo}>
                <User size={25} color={Colors.textSecondary} />
                <View>
                  <Text style={styles.detailLabel}>Customer</Text>
                  <Text style={styles.detailValue}>{customer?.name || 'Customer'}</Text>
                </View>
              </View>
              <View style={styles.orderDetailsBox}>
                <View style={styles.orderDetailsTitle}>
                  <ShoppingBag size={22} color={Colors.primary} />
                  <Text style={styles.orderDetailsTitleText}>Order Details</Text>
                </View>
                {orderItems.map((item, index) => (
                  <View key={`${item.dressType}-${index}`} style={styles.itemDetails}>
                    <Text style={styles.itemName}>{index + 1}. {item.category} - {item.dressType}</Text>
                    <View style={styles.itemMeta}>
                      <View style={styles.itemMetaRow}>
                        <Text style={styles.detailLabel}>Quantity</Text>
                        <Text style={styles.detailValue}>{item.orderInfo?.quantity || 1}</Text>
                      </View>
                      <View style={styles.itemMetaRow}>
                        <Calendar size={16} color={Colors.textSecondary} />
                        <Text style={styles.detailLabel}>Delivery Date</Text>
                        <Text style={styles.detailValue}>{item.orderInfo?.deliveryDate ? new Date(item.orderInfo.deliveryDate).toLocaleDateString('en-GB') : 'Not specified'}</Text>
                      </View>
                    </View>
                    {(item.orderInfo?.description || item.orderInfo?.specialInstructions) && (
                      <Text style={styles.descriptionText}>Description: {item.orderInfo.description || item.orderInfo.specialInstructions}</Text>
                    )}
                  </View>
                ))}
              </View>
              <Text style={styles.thankYouText}>Thank you for choosing Aadvi Designer Studio!{`\n`}♥</Text>
            </ScrollView>
          ) : (
            <Text style={styles.message}>{message}</Text>
          )}
          {onSecondaryAction && (
            <TouchableOpacity style={styles.secondaryButton} onPress={onSecondaryAction}>
              {secondaryIcon}
              <Text style={styles.secondaryButtonText}>{secondaryText}</Text>
            </TouchableOpacity>
          )}
          {onTertiaryAction && (
            <TouchableOpacity style={styles.tertiaryButton} onPress={onTertiaryAction}>
              {tertiaryIcon}
              <Text style={styles.tertiaryButtonText}>{tertiaryText}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.button} onPress={onDone}>
            <Text style={styles.buttonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: Colors.white, borderRadius: 30, padding: Spacing.xl, width: '85%', maxHeight: '92%', alignItems: 'center', ...Shadows.lg },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.xl, ...Shadows.sm },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.text, marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 16, color: Colors.textSecondary, marginBottom: Spacing.xl, textAlign: 'center', lineHeight: 22 },
  confirmationSubtitle: { fontSize: 17, color: Colors.textSecondary, marginBottom: 16, textAlign: 'center' },
  confirmationScroll: { width: '100%' },
  confirmationStatus: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 14, backgroundColor: '#ECFAF0', marginBottom: 18 },
  confirmationStatusText: { flex: 1, fontSize: 14, color: '#2EAD55', fontWeight: '600' },
  customerInfo: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 8, marginBottom: 18 },
  detailLabel: { fontSize: 14, color: Colors.textSecondary },
  detailValue: { fontSize: 16, color: Colors.text, fontWeight: '600' },
  orderDetailsBox: { width: '100%', backgroundColor: '#F8F8FF', borderRadius: 16, padding: 16, marginBottom: 18 },
  orderDetailsTitle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  orderDetailsTitleText: { fontSize: 18, color: Colors.text, fontWeight: '600' },
  itemDetails: { borderTopWidth: 1, borderTopColor: '#E5E5F0', paddingTop: 12, marginTop: 4 },
  itemName: { fontSize: 16, color: Colors.text, fontWeight: '600', marginBottom: 10 },
  itemMeta: { gap: 7 },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  descriptionText: { fontSize: 13, color: Colors.textSecondary, marginTop: 8 },
  thankYouText: { fontSize: 15, lineHeight: 22, color: Colors.textSecondary, textAlign: 'center', marginBottom: 18 },
  button: { width: '100%', height: 56, backgroundColor: Colors.primary, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  secondaryButton: { width: '100%', height: 56, backgroundColor: '#25D366', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12, flexDirection: 'row', gap: 8 },
  secondaryButtonText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  tertiaryButton: { width: '100%', height: 56, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.primary, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12, flexDirection: 'row', gap: 8 },
  tertiaryButtonText: { color: Colors.primary, fontSize: 16, fontWeight: 'bold' }
});

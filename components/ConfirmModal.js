import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { Colors, Spacing, Shadows } from '../constants/theme';

export default function ConfirmModal({ visible, title, message, onConfirm, onCancel, confirmText = 'Delete', cancelText = 'Cancel', isDestructive = true }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={[styles.iconContainer, { backgroundColor: isDestructive ? '#FFEBEE' : Colors.primary + '15' }]}>
            <AlertTriangle size={40} color={isDestructive ? Colors.error : Colors.primary} />
          </View>
          <Text style={styles.title}>{title || 'Are you sure?'}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.confirmButton, { backgroundColor: isDestructive ? Colors.error : Colors.primary }]} 
              onPress={onConfirm}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: Colors.white, borderRadius: 30, padding: Spacing.xl, width: '85%', alignItems: 'center', ...Shadows.lg },
  iconContainer: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.xl },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 16, color: Colors.textSecondary, marginBottom: Spacing.xl, textAlign: 'center', lineHeight: 22 },
  buttonRow: { flexDirection: 'row', gap: Spacing.sm, width: '100%' },
  cancelButton: { flex: 1, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F0F0' },
  cancelButtonText: { color: Colors.textSecondary, fontSize: 16, fontWeight: 'bold' },
  confirmButton: { flex: 1, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  confirmButtonText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' }
});

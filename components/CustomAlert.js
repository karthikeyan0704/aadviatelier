import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react-native';
import { Colors, Spacing, Shadows } from '../constants/theme';

const ALERT_CONFIG = {
  success: { icon: CheckCircle, color: '#4CAF50', bg: '#E8F5E9', btnColor: '#4CAF50', btnText: 'Great!' },
  error: { icon: XCircle, color: '#F44336', bg: '#FFEBEE', btnColor: '#F44336', btnText: 'OK' },
  warning: { icon: AlertTriangle, color: '#FF9800', bg: '#FFF3E0', btnColor: '#FF9800', btnText: 'Got it' },
  info: { icon: Info, color: Colors.primary, bg: Colors.primary + '15', btnColor: Colors.primary, btnText: 'OK' },
};

export default function CustomAlert({ 
  visible, 
  type = 'info', // 'success' | 'error' | 'warning' | 'info'
  title, 
  message, 
  onDismiss,
  // For confirm-style alerts
  showCancel = false,
  onConfirm,
  confirmText,
  cancelText = 'Cancel'
}) {
  const config = ALERT_CONFIG[type] || ALERT_CONFIG.info;
  const Icon = config.icon;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
            <Icon size={36} color={config.color} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Buttons */}
          {showCancel ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={onDismiss}>
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmButton, { backgroundColor: config.btnColor }]} 
                onPress={onConfirm || onDismiss}
              >
                <Text style={styles.confirmButtonText}>{confirmText || config.btnText}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.singleButton, { backgroundColor: config.btnColor }]} 
              onPress={onDismiss}
            >
              <Text style={styles.singleButtonText}>{confirmText || config.btnText}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.55)', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 30,
  },
  modalContent: { 
    backgroundColor: Colors.white, 
    borderRadius: 24, 
    padding: 28, 
    width: '100%', 
    maxWidth: 340,
    alignItems: 'center', 
    ...Shadows.lg,
  },
  iconContainer: { 
    width: 68, 
    height: 68, 
    borderRadius: 34, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20,
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: Colors.text, 
    marginBottom: 8, 
    textAlign: 'center',
  },
  message: { 
    fontSize: 15, 
    color: Colors.textSecondary, 
    marginBottom: 24, 
    textAlign: 'center', 
    lineHeight: 22,
  },
  buttonRow: { 
    flexDirection: 'row', 
    gap: 12, 
    width: '100%',
  },
  cancelButton: { 
    flex: 1, 
    height: 48, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#F0F0F0',
  },
  cancelButtonText: { 
    color: Colors.textSecondary, 
    fontSize: 15, 
    fontWeight: 'bold',
  },
  confirmButton: { 
    flex: 1, 
    height: 48, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center',
    ...Shadows.sm,
  },
  confirmButtonText: { 
    color: Colors.white, 
    fontSize: 15, 
    fontWeight: 'bold',
  },
  singleButton: { 
    width: '100%', 
    height: 48, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center',
    ...Shadows.sm,
  },
  singleButtonText: { 
    color: Colors.white, 
    fontSize: 16, 
    fontWeight: 'bold',
  },
});

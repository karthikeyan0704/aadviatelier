import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import ErrorModal from '../components/ErrorModal';
import SuccessModal from '../components/SuccessModal';
import { useAuth } from '../context/AuthContext';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { Lock, Phone, Eye, EyeOff } from 'lucide-react-native';

export default function LoginScreen() {
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successVisible, setSuccessVisible] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const { login, setAuthData } = useAuth();

  const handleLogin = async () => {
    if (!mobileNumber || !password) {
      setErrorMessage('Please fill in all fields');
      setErrorVisible(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await login({ mobileNumber, password }, true);
      setSuccessData(data);
      setSuccessVisible(true);
    } catch (error) {
      setErrorMessage(typeof error === 'string' ? error : 'Invalid mobile number or password');
      setErrorVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSuccess = () => {
    setSuccessVisible(false);
    if (successData) {
      setAuthData(successData.token, successData.user);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image source={require('../assets/images/aalogo.png')} style={{width: '100%', height: '100%', borderRadius: 60}} resizeMode="cover" />
          </View>
          <Text style={styles.title}>
            Aadvi <Text style={{ color: Colors.secondary }}>Atelier</Text>
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.loginTitle}>Login to your account</Text>
          
          <View style={styles.inputContainer}>
            <Phone size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Mobile Number"
              placeholderTextColor={Colors.textSecondary}
              value={mobileNumber}
              onChangeText={setMobileNumber}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              {showPassword ? (
                <EyeOff size={20} color={Colors.textSecondary} />
              ) : (
                <Eye size={20} color={Colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.button, isSubmitting && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Aadvi Designer Studio</Text>
        </View>
      </ScrollView>

      <ErrorModal
        visible={errorVisible}
        title="Login Failed"
        message={errorMessage}
        onDone={() => setErrorVisible(false)}
      />

      <SuccessModal
        visible={successVisible}
        title="Welcome Back!"
        message="You have successfully logged in."
        onDone={handleLoginSuccess}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContainer: { flexGrow: 1, padding: Spacing.xl, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: Spacing.xl * 2 },
  logoContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  logoText: { color: Colors.secondary, fontSize: 32, fontWeight: 'bold' },
  title: { fontSize: 36, fontWeight: 'bold', color: Colors.primary, letterSpacing: 4 },
  subtitle: { fontSize: 18, color: Colors.secondary, letterSpacing: 2, textTransform: 'uppercase' },
  form: { backgroundColor: Colors.surface, padding: Spacing.lg, borderRadius: BorderRadius.lg, ...Shadows.md },
  loginTitle: { fontSize: 20, fontWeight: '600', color: Colors.text, marginBottom: Spacing.lg, textAlign: 'center' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, marginBottom: Spacing.md, paddingHorizontal: Spacing.md, height: 56 },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, height: '100%', color: Colors.text, fontSize: 16 },
  eyeIcon: { padding: Spacing.sm },
  button: { backgroundColor: Colors.primary, height: 56, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.md, ...Shadows.sm },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  forgotPassword: { marginTop: Spacing.lg, alignItems: 'center' },
  forgotPasswordText: { color: Colors.secondary, fontWeight: '600' },
  footer: { marginTop: Spacing.xl, alignItems: 'center' },
  footerText: { color: Colors.textSecondary, fontSize: 12 }
});

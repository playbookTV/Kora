import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type VoiceState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING';

interface VoiceInterfaceProps {
  state: VoiceState;
  onMicPress: () => void;
  transcript?: string; // What Kora is saying
  safeSpend?: number; // Optional context to show
  showKeyboard?: boolean;
}

export default function VoiceInterface({ 
  state, 
  onMicPress, 
  transcript,
  showKeyboard = true 
}: VoiceInterfaceProps) {
  
  // Animation for the pulsing effect
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    if (state === 'THINKING' || state === 'LISTENING') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      pulseAnim.stopAnimation();
    }
  }, [state]);

  return (
    <View style={styles.container}>
      {/* Dynamic Content Area (Top/Center) */}
      <View style={styles.contentArea}>
        {state === 'IDLE' && (
           <Text style={styles.placeholderText}>Tap to speak...</Text>
        )}

        {state === 'LISTENING' && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }], opacity: 0.7 }}>
             <Text style={styles.stateText}>Listening...</Text>
          </Animated.View>
        )}

        {state === 'THINKING' && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <View style={styles.waveformContainer}>
               <View style={[styles.bar, { height: 20 }]} />
               <View style={[styles.bar, { height: 40 }]} />
               <View style={[styles.bar, { height: 20 }]} />
            </View>
          </Animated.View>
        )}

        {state === 'SPEAKING' && transcript && (
          <View style={styles.transcriptContainer}>
            <View style={styles.koraAvatar}>
              <View style={styles.koraEye} />
              <View style={styles.koraEye} />
            </View>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </View>
        )}
      </View>

      {/* Controls Area (Bottom) */}
      <View style={styles.bottomControls}>
        <View style={styles.micContainer}>
          <Pressable 
            onPress={onMicPress}
            style={({ pressed }) => [
              styles.micButton,
              state === 'LISTENING' && styles.micButtonActive,
              state === 'THINKING' && styles.micButtonDisabled,
              pressed && styles.micButtonPressed
            ]}
            disabled={state === 'THINKING'}
          >
            <Ionicons 
              name={state === 'LISTENING' ? "stop" : "mic"} 
              size={40} 
              color="white" 
            />
          </Pressable>
        </View>

        {/* Quiet Mode Toggle */}
        {showKeyboard && state === 'IDLE' && (
          <Pressable style={styles.keyboardButton}>
            <Ionicons name="keypad" size={24} color="#666" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, // Takes up available space in the parent
    width: '100%',
    justifyContent: 'space-between',
  },
  contentArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  placeholderText: {
    color: '#ccc',
    fontSize: 16,
    letterSpacing: 1,
  },
  stateText: {
    fontSize: 24,
    fontWeight: '300',
    color: '#000',
    letterSpacing: 2,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bar: {
    width: 6,
    backgroundColor: '#000',
    borderRadius: 3,
  },
  transcriptContainer: {
    alignItems: 'center',
    width: '100%',
  },
  koraAvatar: {
    width: 60,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  koraEye: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  transcriptText: {
    fontSize: 20,
    lineHeight: 30,
    textAlign: 'center',
    color: '#000',
    fontWeight: '500',
  },
  bottomControls: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 120, // ample touch area
  },
  micContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  micButtonActive: {
    backgroundColor: '#E63946', // Recording color
    transform: [{ scale: 1.1 }]
  },
  micButtonDisabled: {
    backgroundColor: '#ccc',
  },
  micButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  keyboardButton: {
    position: 'absolute',
    right: 40,
    bottom: 45,
    padding: 10,
  },
});

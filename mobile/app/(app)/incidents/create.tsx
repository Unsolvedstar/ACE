import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { uploadIncidentPhoto } from '../../../src/api/attachments';
import { extractErrorMessage, isNetworkError } from '../../../src/api/client';
import { submitIncidentReport } from '../../../src/api/incidents';
import { enqueueIncident } from '../../../src/offline/incidentQueue';
import { IncidentSeverity, IncidentSeverityLabels } from '../../../src/types/incidents';
import { colors } from '../../../src/theme/colors';

const SEVERITIES: IncidentSeverity[] = [
  IncidentSeverity.Low,
  IncidentSeverity.Medium,
  IncidentSeverity.High,
  IncidentSeverity.Critical,
];

interface PickedPhoto {
  uri: string;
  name: string;
  type: string;
}

export default function CreateIncidentScreen() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity>(IncidentSeverity.Low);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission is required to attach a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    setPhoto({ uri: asset.uri, name: asset.fileName ?? `incident-${Date.now()}.jpg`, type: asset.mimeType ?? 'image/jpeg' });
  }

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo library permission is required to attach a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    setPhoto({ uri: asset.uri, name: asset.fileName ?? `incident-${Date.now()}.jpg`, type: asset.mimeType ?? 'image/jpeg' });
  }

  async function handleSubmit() {
    if (!title || !location || !description) {
      setError('Please fill in all fields.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    const request = { title, description, severity, location, occurredAtUtc: new Date().toISOString() };

    try {
      const created = await submitIncidentReport(request);
      if (photo) {
        try {
          await uploadIncidentPhoto(created.id, photo);
        } catch {
          // The report itself is safely on the server - a failed photo upload just means no
          // photo attached, not a lost report, so it's not worth blocking on.
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['incidents', 'mine'] });
      router.back();
    } catch (err) {
      if (isNetworkError(err)) {
        // No connectivity - this is the whole point of the offline flow: a site worker
        // underground or otherwise out of signal can still file a report right now and trust
        // it'll reach the server once a connection comes back, instead of losing it.
        await enqueueIncident(request, photo);
        Alert.alert('Saved offline', "No connection right now — this report will sync automatically once you're back online.");
        router.back();
      } else {
        setError(extractErrorMessage(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Loose handrail" />

      <Text style={styles.label}>Severity</Text>
      <View style={styles.severityRow}>
        {SEVERITIES.map((option) => (
          <Pressable
            key={option}
            style={[styles.severityChip, severity === option && styles.severityChipActive]}
            onPress={() => setSeverity(option)}
          >
            <Text style={[styles.severityChipText, severity === option && styles.severityChipTextActive]}>
              {IncidentSeverityLabels[option]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Location</Text>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="e.g. Crusher house" />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="What happened?"
      />

      <Text style={styles.label}>Photo (optional)</Text>
      {photo ? (
        <View>
          <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
          <Pressable onPress={() => setPhoto(null)}>
            <Text style={styles.removePhoto}>Remove photo</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.photoButtonRow}>
          <Pressable style={styles.photoButton} onPress={() => void takePhoto()}>
            <Text style={styles.photoButtonText}>Take Photo</Text>
          </Pressable>
          <Pressable style={styles.photoButton} onPress={() => void choosePhoto()}>
            <Text style={styles.photoButtonText}>Choose from Library</Text>
          </Pressable>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, (!title || !location || !description || isSubmitting) && styles.buttonDisabled]}
        disabled={!title || !location || !description || isSubmitting}
        onPress={() => void handleSubmit()}
      >
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit Report</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 6, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  severityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  severityChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.ink900 },
  severityChipActive: { backgroundColor: colors.ink900 },
  severityChipText: { color: colors.ink900, fontWeight: '600', fontSize: 13 },
  severityChipTextActive: { color: '#fff' },
  photoButtonRow: { flexDirection: 'row', gap: 10 },
  photoButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.ink900,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  photoButtonText: { color: colors.ink900, fontWeight: '600', fontSize: 13 },
  photoPreview: { width: '100%', height: 200, borderRadius: 8, marginTop: 4 },
  removePhoto: { color: colors.error, marginTop: 8, fontSize: 13, fontWeight: '600' },
  error: { color: colors.error, marginTop: 12 },
  button: { backgroundColor: colors.ink900, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

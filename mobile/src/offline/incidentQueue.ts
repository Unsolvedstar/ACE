import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Paths } from "expo-file-system";
import type { SubmitIncidentReportRequest } from "../types/incidents";

const QUEUE_STORAGE_KEY = "acmehr.incidentQueue";

export interface QueuedIncidentReport {
  localId: string;
  request: SubmitIncidentReportRequest;
  // A persistent copy under the app's own document directory, not the picker's original
  // (transient) uri - see enqueueIncident for why.
  photoUri: string | null;
  photoName: string | null;
  photoType: string | null;
  queuedAtUtc: string;
  lastError: string | null;
}

async function readQueue(): Promise<QueuedIncidentReport[]> {
  const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as QueuedIncidentReport[]) : [];
}

async function writeQueue(queue: QueuedIncidentReport[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

export async function getQueuedIncidents(): Promise<QueuedIncidentReport[]> {
  return readQueue();
}

export async function enqueueIncident(
  request: SubmitIncidentReportRequest,
  photo: { uri: string; name: string; type: string } | null,
): Promise<QueuedIncidentReport> {
  const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let persistedPhoto: { uri: string; name: string; type: string } | null = null;

  if (photo) {
    try {
      // The image picker's uri lives in a transient cache location that isn't guaranteed to
      // survive until connectivity returns (could be minutes, could be a shift change) - copy
      // it into the app's own document directory so a queued report's photo isn't lost if the
      // OS reclaims that cache in the meantime.
      const dest = new File(Paths.document, `incident-${localId}.jpg`);
      await new File(photo.uri).copy(dest);
      persistedPhoto = { uri: dest.uri, name: photo.name, type: photo.type };
    } catch {
      // Preserving the report itself matters far more than the photo - queue without it
      // rather than losing the whole report over a copy failure.
      persistedPhoto = null;
    }
  }

  const item: QueuedIncidentReport = {
    localId,
    request,
    photoUri: persistedPhoto?.uri ?? null,
    photoName: persistedPhoto?.name ?? null,
    photoType: persistedPhoto?.type ?? null,
    queuedAtUtc: new Date().toISOString(),
    lastError: null,
  };

  const queue = await readQueue();
  queue.push(item);
  await writeQueue(queue);
  return item;
}

export async function removeQueuedIncident(localId: string): Promise<void> {
  const queue = await readQueue();
  const item = queue.find((q) => q.localId === localId);
  if (item?.photoUri) {
    try {
      const file = new File(item.photoUri);
      if (file.exists) file.delete();
    } catch {
      // Best-effort cleanup only - a leftover cached photo file isn't worth failing over.
    }
  }
  await writeQueue(queue.filter((q) => q.localId !== localId));
}

export async function markQueuedIncidentError(localId: string, message: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.map((q) => (q.localId === localId ? { ...q, lastError: message } : q)));
}

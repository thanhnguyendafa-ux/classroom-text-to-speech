export type FirestoreHealthCheck = () => Promise<boolean>;

export async function createHealthResponse(checkFirestore: FirestoreHealthCheck) {
  const firestoreConnected = await checkFirestore();

  return {
    statusCode: firestoreConnected ? 200 : 503,
    body: {
      status: firestoreConnected ? 'ok' as const : 'degraded' as const,
      service: 'classroom-text-to-speech-api',
      firestore: firestoreConnected ? 'connected' as const : 'unavailable' as const,
    },
  };
}

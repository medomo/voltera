import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore, 
  doc, 
  getDocFromServer,
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with auto-detect long polling and persistent local cache
// to prevent 10s WebChannel backend timeout errors in sandbox/iframe environments
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      experimentalAutoDetectLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    },
    (firebaseConfig as any).firestoreDatabaseId
  );
} catch {
  // If already initialized or if database ID requires standard getter
  firestoreInstance = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
}

export const db = firestoreInstance;
export const auth = getAuth(app);

// Sign in anonymously if not logged in to populate Firebase Auth context
if (!auth.currentUser) {
  signInAnonymously(auth).catch(() => {
    // Silent catch if anonymous auth provider is disabled on console
  });
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  if (errorMessage.includes('permission-denied') || errorMessage.includes('Missing or insufficient permissions')) {
    console.error('Firestore Permission Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  } else {
    console.warn('Firestore Operation Notice: ', errorMessage, `[Path: ${path || 'unknown'}]`);
  }
}

// Validate connection to Firestore as mandated by Firebase Skill
export async function testConnection(): Promise<boolean> {
  try {
    // Use a lightweight check with timeout
    const testPromise = getDocFromServer(doc(db, 'test', 'connection'));
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout check')), 4000)
    );
    await Promise.race([testPromise, timeoutPromise]);
    return true;
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('timeout'))) {
      console.warn("Firestore operating with cached offline resilience.");
    }
    return false;
  }
}

// Run test connection
testConnection().catch(() => {});


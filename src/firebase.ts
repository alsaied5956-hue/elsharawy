import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const defaultConfig = {
  projectId: "vernal-river-z3rp2",
  appId: "1:83078664809:web:595539c6fe4a86aabd08f8",
  apiKey: "AIzaSyAhYLVahyDnz5rz1EunKTeGpKuND3hdvqg",
  authDomain: "vernal-river-z3rp2.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-5e83644e-a0bb-4a3a-ac79-a4e70377c21a",
  storageBucket: "vernal-river-z3rp2.firebasestorage.app",
  messagingSenderId: "83078664809",
  measurementId: "",
  oAuthClientId: "83078664809-2itk8r7e70f6g6aspdunr7plt62qpcnc.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

const resolvedConfig = { ...defaultConfig, ...(firebaseConfig || {}) };
const app = initializeApp(resolvedConfig);

// CRITICAL: Initialize Firestore with the exact database ID from config
const dbId = resolvedConfig.firestoreDatabaseId;
export const db = getFirestore(app, dbId);

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: true,
      tenantId: null,
      providerInfo: [],
    },
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is currently offline.');
      return false;
    }
    // Connected (even if document doesn't exist, it means network/auth reached firestore)
    return true;
  }
}

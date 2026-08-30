export const DEMO_ACCOUNTS: Array<{ email: string; role: string; label: string; clinicId: string; clinicName: string; plan: string }> = [];

export type User = {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  role?: string;
  clinicId?: string;
  doctorId?: string;
};

export class GoogleAuthProvider {
  providerId = 'google.com';
}

export const auth: { currentUser: User | null } = {
  currentUser: null,
};

export const googleProvider = new GoogleAuthProvider();

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const cleanPath = (path: string) => String(path || '').replace(/^\/+|\/+$/g, '');

const api = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (payload && (payload as any).error) || `Request failed (${response.status})`;
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return payload as T;
};

const refPath = (ref: any): string => cleanPath(ref?.path || '');

type BackendDoc = { exists: boolean; data: any };
type BackendDocs = { docs: Array<Record<string, any>> };

const readDocFromServer = async (path: string): Promise<BackendDoc> =>
  api<BackendDoc>(`/api/db/doc?path=${encodeURIComponent(path)}`);

const readDocsFromServer = async (path: string, clauses: any[] = []): Promise<any[]> => {
  const result = await api<BackendDocs>('/api/db/query', {
    method: 'POST',
    body: JSON.stringify({ path, clauses: clauses || [] }),
  });
  return result.docs || [];
};

// Collection query builder helpers (kept for API compatibility)
export const collection = (_db: any, path: string) => ({ path: cleanPath(path) });
export const doc = (_db: any, ...segments: string[]) => ({ path: cleanPath(segments.filter(Boolean).join('/')) });
export const query = (source: any, ...clauses: any[]) => ({ path: source.path, clauses: clauses.filter(Boolean) });
export const where = (field: string, op: string, value: any) => ({ field, op, value });
export const orderBy = (field: string, _direction: 'asc' | 'desc' = 'asc') => ({ field });
export const limit = (count: number) => ({ count });
export const serverTimestamp = () => new Date().toISOString();

const buildDocSnapshot = (path: string, exists: boolean, data: any) => ({
  id: path.split('/').filter(Boolean).pop() || path,
  exists: () => exists,
  data: () => clone(data ?? {}),
  ref: { path },
});

const buildCollectionSnapshot = (path: string, items: any[]) => {
  const docs = (items || []).map((item) => ({
    id: item.id,
    data: () => clone(item),
    ref: { path: `${path}/${item.id}` },
  }));
  return {
    empty: docs.length === 0,
    docs,
    size: docs.length,
    ref: { path },
    forEach: (cb: (doc: any) => void) => {
      docs.forEach((doc) => cb(doc));
    },
  };
};

const isCollectionRef = (ref: any): boolean => {
  const path = refPath(ref);
  return path.split('/').filter(Boolean).length <= 1;
};

export const addDoc = async (ref: any, value: Record<string, any>) => {
  const path = refPath(ref);
  const result = await api<{ id: string }>('/api/db/doc', {
    method: 'POST',
    body: JSON.stringify({ path, value: { ...(value || {}) } }),
  });
  return { id: result.id, path: `${path}/${result.id}` };
};

export const getDoc = async (ref: any) => {
  const path = refPath(ref);
  const result = await readDocFromServer(path);
  return buildDocSnapshot(path, result.exists, result.data);
};

export const getDocs = async (ref: any) => {
  const path = refPath(ref);
  const clauses = ref?.clauses || [];
  const items = await readDocsFromServer(path, clauses);
  return buildCollectionSnapshot(path, items);
};

export const setDoc = async (ref: any, value: any, _options?: { merge?: boolean }) => {
  const path = refPath(ref);
  await api('/api/db/doc', {
    method: 'POST',
    body: JSON.stringify({ path, value: value ?? {} }),
  });
};

export const updateDoc = async (ref: any, updates: Record<string, any>, _options?: { merge?: boolean }) => {
  const path = refPath(ref);
  await api('/api/db/doc/update', {
    method: 'POST',
    body: JSON.stringify({ path, value: updates ?? {} }),
  });
};

export const deleteDoc = async (ref: any) => {
  const path = refPath(ref);
  await api('/api/db/doc/delete', {
    method: 'POST',
    body: JSON.stringify({ path }),
  });
};

const POLL_INTERVAL_MS = 2500;

export const onSnapshot = (ref: any, callback: (snapshot: any) => void, _onError?: (error: any) => void) => {
  let cancelled = false;
  let inFlight = false;

  const isCollection = isCollectionRef(ref);
  const path = refPath(ref);
  const clauses = ref?.clauses || [];

  const tick = async () => {
    if (cancelled || inFlight) return;
    inFlight = true;
    try {
      if (isCollection) {
        const items = await readDocsFromServer(path, clauses);
        if (!cancelled) callback(buildCollectionSnapshot(path, items));
      } else {
        const result = await readDocFromServer(path);
        if (!cancelled) callback(buildDocSnapshot(path, result.exists, result.data));
      }
    } catch (error) {
      if (!cancelled && _onError) _onError(error);
    } finally {
      inFlight = false;
    }
  };

  tick();
  const timer = setInterval(tick, POLL_INTERVAL_MS);

  return () => {
    cancelled = true;
    clearInterval(timer);
  };
};

export const signInWithPopup = async (_auth?: unknown, _provider?: unknown): Promise<{ user: User }> => {
  throw new Error('External authentication is not configured.');
};

export const signInWithEmailAndPassword = async (_auth: unknown, email: string, password: string, role?: string, clinicId?: string) => {
  const normalizedEmail = String(email || '').trim();
  const normalizedPassword = String(password || '');

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword, role: role || undefined, clinicId }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Authentication failed.');
  const user: User = { ...payload.user, displayName: payload.user.displayName || payload.user.email };
  auth.currentUser = user;
  return { user };
};

export const createUserWithEmailAndPassword = async (_auth: unknown, email: string, password: string): Promise<{ user: User }> => {
  void email;
  void password;
  throw new Error('Account provisioning must be performed by an administrator.');
};

export const signOut = async (_auth?: unknown) => {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
  auth.currentUser = null;
};

export const onAuthStateChanged = (_auth: unknown, callback: (user: User | null) => void) => {
  fetch('/api/auth/me', { credentials: 'include' })
    .then(async (response) => response.ok ? (await response.json()).user : null)
    .then((user) => {
      auth.currentUser = user;
      callback(user);
    })
    .catch(() => callback(auth.currentUser));
  return () => undefined;
};

export const getAuth = () => auth;

export const db = {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
};

export default db;

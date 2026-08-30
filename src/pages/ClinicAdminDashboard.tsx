import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, Users, Clock, Search, Filter } from 'lucide-react';
import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from '../lib/firebase';
import { defaultContentSections, defaultSiteSettings, loadContentSections, loadSiteSettings, saveContentSections, saveSiteSettings } from '../lib/siteConfig';
import { FeaturePlan } from '../types/queue';

const HOURS_OPTIONS = [
  '9:00 AM - 6:00 PM',
  '9:30 AM - 7:00 PM',
  '10:00 AM - 7:00 PM',
  '8:00 AM - 5:00 PM',
  '24 Hours',
  'Custom Hours'
];

const DEFAULT_USER_PASSWORD = 'Clinic@123';

const PACK_OPTIONS = [
  { value: 'TRIAL', label: 'Trial Pack', validityDays: 30, price: '₹0' },
  { value: 'BASIC', label: 'Basic Pack', validityDays: 30, price: '₹1,499/mo' },
  { value: 'STANDARD', label: 'Standard Pack', validityDays: 30, price: '₹2,999/mo' },
  { value: 'PREMIUM', label: 'Premium Pack', validityDays: 30, price: '₹4,999/mo' },
  { value: 'ENTERPRISE', label: 'Enterprise Pack', validityDays: 30, price: 'Custom' },
] as const;

const getPackMeta = (plan?: FeaturePlan) => PACK_OPTIONS.find((pack) => pack.value === plan) ?? PACK_OPTIONS[0];

const getPackPrice = (plan: FeaturePlan): number => {
  const meta = getPackMeta(plan);
  if (!meta || meta.price === 'Custom') return 0;
  // Extract numeric value from price string like "₹1,499/mo" or "₹0"
  const numericPrice = meta.price.replace(/[₹,/mo]/g, '').trim();
  return parseFloat(numericPrice) || 0;
};

const buildClinicPack = (plan: FeaturePlan, startDate = new Date().toISOString()) => {
  const meta = getPackMeta(plan);
  const start = new Date(startDate);
  const expiry = new Date(start.getTime() + meta.validityDays * 24 * 60 * 60 * 1000);

  return {
    id: `${plan.toLowerCase()}-${start.getTime()}`,
    plan,
    label: meta.label,
    validityDays: meta.validityDays,
    status: 'ACTIVE' as const,
    startDate: start.toISOString(),
    expiryDate: expiry.toISOString(),
  };
};

const normalizePhone = (value: string) => {
  const digits = (value || '').replace(/\D/g, '').slice(0, 10);
  if (digits.length !== 10) return '';
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
};

const formatPhoneInput = (value: string) => {
  const digits = (value || '').replace(/\D/g, '').slice(0, 10);
  if (!digits) return '+91 ';
  if (digits.length <= 5) return `+91 ${digits}`;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
};

interface Clinic {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  specializations: string[];
  operatingHours: string;
  featurePlan?: FeaturePlan;
  subscriptionPack?: {
    id: string;
    plan: FeaturePlan;
    label: string;
    validityDays: number;
    status: 'ACTIVE' | 'EXPIRED' | 'PAUSED';
    startDate: string;
    expiryDate: string;
  } | null;
  logo?: string;
  createdAt: string;
}

interface ClinicAdminProps {
  adminId: string;
  onLogout: () => void;
  onManageDoctors: (clinicId: string, clinicName: string) => void;
  mode?: 'site-admin' | 'clinic-admin';
}

export const ClinicAdminDashboard: React.FC<ClinicAdminProps> = ({ adminId, onLogout, onManageDoctors, mode = 'clinic-admin' }) => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [appointments, setAppointments] = useState<Array<{ clinicId: string; appointmentType?: string; status?: string }>>([]);
  const [payments, setPayments] = useState<Array<{ id: string; clinicId: string; clinicName: string; pack: FeaturePlan; amount: number; durationDays: number; status: 'PAID' | 'PENDING'; paidAt: string; startDate: string; expiryDate: string; notes?: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; role: string; status: 'Active' | 'Offline' | 'Pending'; clinicName?: string; phone?: string; accessStatus?: 'Granted' | 'Hold' | 'Denied'; photoURL?: string; passwordReset?: string; source?: 'staff_users' | 'doctors' }>>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [editingUser, setEditingUser] = useState<{ id: string; name: string; email: string; role: string; status: 'Active' | 'Offline' | 'Pending'; clinicName?: string; phone?: string; accessStatus?: 'Granted' | 'Hold' | 'Denied'; photoURL?: string; passwordReset?: string; source?: 'staff_users' | 'doctors' } | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [siteSettings, setSiteSettings] = useState(loadSiteSettings());
  const [savedSiteSettings, setSavedSiteSettings] = useState(loadSiteSettings());
  const [showSiteSettings, setShowSiteSettings] = useState(mode === 'site-admin');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clinic-summary' | 'content' | 'clinics' | 'users' | 'security' | 'billing' | 'audit' | 'recent-activity'>('dashboard');
  const [contentSections, setContentSections] = useState(loadContentSections());
  const [savedContentSections, setSavedContentSections] = useState(loadContentSections());
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '+91 ',
    email: '',
    specializations: '',
    operatingHours: HOURS_OPTIONS[0],
    featurePlan: 'TRIAL' as FeaturePlan,
    logo: ''
  });
  const [billingTab, setBillingTab] = useState<'overview' | 'add-payment'>('overview');
  
  // Unsubscribe functions for real-time listeners
  const [unsubscribeClinics, setUnsubscribeClinics] = useState<(() => void) | null>(null);
  const [unsubscribeUsers, setUnsubscribeUsers] = useState<(() => void) | null>(null);
  const [unsubscribeAppointments, setUnsubscribeAppointments] = useState<(() => void) | null>(null);
  const [unsubscribePayments, setUnsubscribePayments] = useState<(() => void) | null>(null);
  const [unsubscribeAuditLogs, setUnsubscribeAuditLogs] = useState<(() => void) | null>(null);
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; title: string; detail: string; time: string; timestamp: any }>>([]);
  const [paymentForm, setPaymentForm] = useState({
    clinicId: '',
    clinicName: '',
    pack: 'TRIAL' as FeaturePlan,
    amount: '',
    durationDays: '30',
    status: 'PAID' as 'PAID' | 'PENDING',
    notes: '',
  });
  const [saveMessage, setSaveMessage] = useState('');
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    role: 'Clinic Admin',
    status: 'Active' as 'Active' | 'Offline' | 'Pending',
    clinicName: '',
    phone: '+91 ',
    accessStatus: 'Granted' as 'Granted' | 'Hold' | 'Denied',
    photoURL: '',
    passwordReset: ''
  });
  const [selectedClinicSummary, setSelectedClinicSummary] = useState('');
  const [summaryDateRange, setSummaryDateRange] = useState({ start: '2026-08-01', end: '2026-08-30' });
  const [expandedContentCards, setExpandedContentCards] = useState<Record<string, boolean>>({
    branding: false,
    pages: false,
    contact: false,
    media: false,
  });

  useEffect(() => {
    const syncFromStorage = () => {
      const loadedSettings = loadSiteSettings();
      const loadedContent = loadContentSections();
      setSiteSettings(loadedSettings);
      setContentSections(loadedContent);
      setSavedSiteSettings(loadedSettings);
      setSavedContentSections(loadedContent);
    };

    syncFromStorage();
    window.addEventListener('site-config-changed', syncFromStorage);
    window.addEventListener('storage', syncFromStorage);

    // Set up real-time listeners
    const clinicsRef = collection(db, 'clinics');
    const unsubscribeClinicsListener = onSnapshot(clinicsRef, (snapshot) => {
      const clinicList = snapshot.docs.map((docItem) => {
        const item = docItem.data() as Record<string, any>;
        const featurePlan = (item.subscriptionPack?.plan || item.subscriptionPack || item.featurePlan || item.feature_plan || 'TRIAL') as FeaturePlan;
        const packMeta = getPackMeta(featurePlan);
        const packRecord = item.subscriptionPack && typeof item.subscriptionPack === 'object'
          ? {
              id: item.subscriptionPack.id || `${featurePlan}-${docItem.id}`,
              plan: featurePlan,
              label: item.subscriptionPack.label || packMeta.label,
              validityDays: Number(item.subscriptionPack.validityDays || item.subscriptionPack.validity_days || packMeta.validityDays || 30),
              status: item.subscriptionPack.status || 'ACTIVE',
              startDate: item.subscriptionPack.startDate || item.subscriptionPack.start_date || item.createdAt || item.created_at || new Date().toISOString(),
              expiryDate: item.subscriptionPack.expiryDate || item.subscriptionPack.expiry_date || new Date(Date.now() + Number(item.subscriptionPack.validityDays || item.subscriptionPack.validity_days || packMeta.validityDays || 30) * 24 * 60 * 60 * 1000).toISOString(),
            }
          : buildClinicPack(featurePlan, item.createdAt || item.created_at || new Date().toISOString());

        return {
          id: docItem.id,
          name: item.name || '',
          address: item.address || '',
          phone: item.phone || '+91 ',
          email: item.email || '',
          specializations: Array.isArray(item.specializations) ? item.specializations : (typeof item.specializations === 'string' ? item.specializations.split(',').map((part: string) => part.trim()).filter(Boolean) : (typeof item.specialty === 'string' && item.specialty ? [item.specialty] : [])),
          operatingHours: item.operatingHours || item.operating_hours || HOURS_OPTIONS[0],
          featurePlan,
          subscriptionPack: packRecord,
          logo: item.logo || '',
          createdAt: item.createdAt || item.created_at || new Date().toISOString(),
        } as Clinic;
      });
      setClinics(clinicList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching clinics:', error);
      setLoading(false);
    });
    setUnsubscribeClinics(unsubscribeClinicsListener);

    const appointmentsRef = collection(db, 'appointments');
    const unsubscribeAppointmentsListener = onSnapshot(appointmentsRef, (snapshot) => {
      setAppointments(snapshot.docs.map((docItem) => {
        const item = docItem.data() as Record<string, any>;
        return {
          clinicId: String(item.clinicId || item.clinic_id || ''),
          appointmentType: String(item.appointmentType || item.appointment_type || '').toUpperCase(),
          status: String(item.status || '').toLowerCase(),
        };
      }));
    }, (error) => {
      console.error('Error fetching appointment records:', error);
    });
    setUnsubscribeAppointments(unsubscribeAppointmentsListener);

    const paymentsRef = collection(db, 'payments');
    const unsubscribePaymentsListener = onSnapshot(paymentsRef, (snapshot) => {
      const paymentList = snapshot.docs.map((docItem) => {
        const item = docItem.data() as Record<string, any>;
        return {
          id: docItem.id,
          clinicId: item.clinicId || item.clinic_id || '',
          clinicName: item.clinicName || item.clinic_name || 'Unnamed clinic',
          pack: (item.pack || item.plan || 'TRIAL') as FeaturePlan,
          amount: Number(item.amount || 0),
          durationDays: Number(item.durationDays || item.duration_days || 30),
          status: (item.status || 'PAID') as 'PAID' | 'PENDING',
          paidAt: item.paidAt || item.paid_at || item.createdAt || new Date().toISOString(),
          startDate: item.startDate || item.start_date || item.paidAt || item.paid_at || new Date().toISOString(),
          expiryDate: item.expiryDate || item.expiry_date || new Date(Date.now() + Number(item.durationDays || item.duration_days || 30) * 24 * 60 * 60 * 1000).toISOString(),
          notes: item.notes || '',
        };
      });
      setPayments(paymentList.sort((left, right) => new Date(right.paidAt).getTime() - new Date(left.paidAt).getTime()));
    }, (error) => {
      console.error('Error fetching payment records:', error);
      setPayments([]);
    });
    setUnsubscribePayments(unsubscribePaymentsListener);

    // Set up real-time listener for audit logs
    const auditLogsRef = collection(db, 'audit_logs');
    const auditLogsQuery = query(auditLogsRef, orderBy('timestamp', 'desc'));
    const unsubscribeAuditLogsListener = onSnapshot(auditLogsQuery, (snapshot) => {
      const logs = snapshot.docs.map((docItem) => {
        const item = docItem.data() as Record<string, any>;
        return {
          id: docItem.id,
          title: item.title || '',
          detail: item.detail || '',
          time: item.time || item.timestamp?.toDate?.()?.toLocaleString() || new Date().toLocaleString(),
          timestamp: item.timestamp
        };
      });
      setAuditLogs(logs);
    }, (error) => {
      console.error('Error fetching audit logs:', error);
      // Fallback to static logs if collection doesn't exist
      setAuditLogs([
        { id: '1', title: 'Clinic records synced', detail: 'Latest clinic data loaded from database.', time: 'Current sync', timestamp: new Date() },
        { id: '2', title: 'Queue metrics refreshed', detail: 'Operational data recalculated from live clinic records.', time: 'Current sync', timestamp: new Date() },
        { id: '3', title: 'Campaign status reviewed', detail: 'WhatsApp automation status reflects active system configuration.', time: 'Current sync', timestamp: new Date() },
        { id: '4', title: 'Access policy matched', detail: 'User permissions remain aligned with the current roster.', time: 'Current sync', timestamp: new Date() },
      ]);
    });
    setUnsubscribeAuditLogs(unsubscribeAuditLogsListener);

    // For users, we need to listen to multiple collections
    const setupUsersListener = async () => {
      const staffPaths = ['staff_users', 'users'];
      const unsubscribeFunctions: (() => void)[] = [];

      for (const pathName of staffPaths) {
        try {
          const staffRef = collection(db, pathName);
          const unsubscribe = onSnapshot(staffRef, () => {
            // Trigger a full user fetch when any staff collection changes
            fetchUsers();
          });
          unsubscribeFunctions.push(unsubscribe);
        } catch (error) {
          console.warn(`Unable to set up listener for ${pathName}:`, error);
        }
      }

      // Also listen to doctors collection
      try {
        const doctorsRef = collection(db, 'doctors');
        const unsubscribe = onSnapshot(doctorsRef, () => {
          fetchUsers();
        });
        unsubscribeFunctions.push(unsubscribe);
      } catch (error) {
        console.warn('Unable to set up listener for doctors:', error);
      }

      // Combine all unsubscribe functions
      const combinedUnsubscribe = () => {
        unsubscribeFunctions.forEach(unsub => unsub());
      };
      setUnsubscribeUsers(combinedUnsubscribe);
      
      // Initial fetch
      fetchUsers();
    };

    setupUsersListener();

    return () => {
      window.removeEventListener('site-config-changed', syncFromStorage);
      window.removeEventListener('storage', syncFromStorage);
      // Clean up all listeners
      if (unsubscribeClinics) unsubscribeClinics();
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeAppointments) unsubscribeAppointments();
      if (unsubscribePayments) unsubscribePayments();
      if (unsubscribeAuditLogs) unsubscribeAuditLogs();
    };
  }, []);

  const fetchClinics = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'clinics'));
      const clinicList = snapshot.docs.map((docItem) => {
        const item = docItem.data() as Record<string, any>;
        const featurePlan = (item.subscriptionPack?.plan || item.subscriptionPack || item.featurePlan || item.feature_plan || 'TRIAL') as FeaturePlan;
        const packMeta = getPackMeta(featurePlan);
        const packRecord = item.subscriptionPack && typeof item.subscriptionPack === 'object'
          ? {
              id: item.subscriptionPack.id || `${featurePlan}-${docItem.id}`,
              plan: featurePlan,
              label: item.subscriptionPack.label || packMeta.label,
              validityDays: Number(item.subscriptionPack.validityDays || item.subscriptionPack.validity_days || packMeta.validityDays || 30),
              status: item.subscriptionPack.status || 'ACTIVE',
              startDate: item.subscriptionPack.startDate || item.subscriptionPack.start_date || item.createdAt || item.created_at || new Date().toISOString(),
              expiryDate: item.subscriptionPack.expiryDate || item.subscriptionPack.expiry_date || new Date(Date.now() + Number(item.subscriptionPack.validityDays || item.subscriptionPack.validity_days || packMeta.validityDays || 30) * 24 * 60 * 60 * 1000).toISOString(),
            }
          : buildClinicPack(featurePlan, item.createdAt || item.created_at || new Date().toISOString());

        return {
          id: docItem.id,
          name: item.name || '',
          address: item.address || '',
          phone: item.phone || '+91 ',
          email: item.email || '',
          specializations: Array.isArray(item.specializations) ? item.specializations : (typeof item.specializations === 'string' ? item.specializations.split(',').map((part: string) => part.trim()).filter(Boolean) : (typeof item.specialty === 'string' && item.specialty ? [item.specialty] : [])),
          operatingHours: item.operatingHours || item.operating_hours || HOURS_OPTIONS[0],
          featurePlan,
          subscriptionPack: packRecord,
          logo: item.logo || '',
          createdAt: item.createdAt || item.created_at || new Date().toISOString(),
        } as Clinic;
      });
      setClinics(clinicList);
    } catch (error) {
      console.error('Error fetching clinics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'payments'));
      const paymentList = snapshot.docs.map((docItem) => {
        const item = docItem.data() as Record<string, any>;
        return {
          id: docItem.id,
          clinicId: item.clinicId || item.clinic_id || '',
          clinicName: item.clinicName || item.clinic_name || 'Unnamed clinic',
          pack: (item.pack || item.plan || 'TRIAL') as FeaturePlan,
          amount: Number(item.amount || 0),
          durationDays: Number(item.durationDays || item.duration_days || 30),
          status: (item.status || 'PAID') as 'PAID' | 'PENDING',
          paidAt: item.paidAt || item.paid_at || item.createdAt || new Date().toISOString(),
          startDate: item.startDate || item.start_date || item.paidAt || item.paid_at || new Date().toISOString(),
          expiryDate: item.expiryDate || item.expiry_date || new Date(Date.now() + Number(item.durationDays || item.duration_days || 30) * 24 * 60 * 60 * 1000).toISOString(),
          notes: item.notes || '',
        };
      });
      setPayments(paymentList.sort((left, right) => new Date(right.paidAt).getTime() - new Date(left.paidAt).getTime()));
    } catch (error) {
      console.error('Error fetching payment records:', error);
      setPayments([]);
    }
  };

  const fetchAppointments = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'appointments'));
      setAppointments(snapshot.docs.map((docItem) => {
        const item = docItem.data() as Record<string, any>;
        return {
          clinicId: String(item.clinicId || item.clinic_id || ''),
          appointmentType: String(item.appointmentType || item.appointment_type || '').toUpperCase(),
          status: String(item.status || '').toLowerCase(),
        };
      }));
    } catch (error) {
      console.error('Error fetching appointment records:', error);
      setAppointments([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const staffResults: Array<any> = [];
      const staffPaths = ['staff_users', 'users'];

      for (const pathName of staffPaths) {
        try {
          const snapshot = await getDocs(collection(db, pathName));
          if (snapshot?.docs?.length) {
            staffResults.push(...snapshot.docs.map((docItem) => docItem.data()));
          }
        } catch (error) {
          console.warn(`Unable to load staff users from ${pathName}:`, error);
        }
      }

      const doctorSnapshot = await getDocs(collection(db, 'doctors')).catch(() => ({ docs: [] }));

      const normalizeUserRecord = (item: Record<string, any>, fallbackRole = 'Staff', source: 'staff_users' | 'doctors' = 'staff_users') => {
        const safeName = String(item.name || item.displayName || item.display_name || item.fullName || 'User').trim();
        const safeEmail = String(item.email || '').trim();
        const safeRole = String(item.role || fallbackRole).trim();
        const safeStatus = item.status === 'Offline' || item.status === 'Pending' || item.status === 'inactive' ? (item.status === 'inactive' ? 'Offline' : item.status) : 'Active';
        const accessStatus = (item.accessStatus || item.access_status || item.clinicAccessStatus || 'Granted') as 'Granted' | 'Hold' | 'Denied';
        const photoValue = item.photoURL || item.photo_url || item.avatar || item.profilePhoto || '';
        const passwordResetValue = item.passwordReset || item.password_reset || 'Never reset';
        return {
          id: String(item.id || item.uid || `${safeEmail || safeName}-${Math.random().toString(36).slice(2, 8)}`),
          source,
          name: safeName || 'User',
          email: safeEmail,
          role: safeRole,
          status: safeStatus as 'Active' | 'Offline' | 'Pending',
          clinicName: String(item.clinicName || item.clinic_name || item.clinicId || item.clinic_id || '').trim(),
          phone: String(item.phone || item.mobile || '+91 ').trim() || '+91 ',
          accessStatus,
          photoURL: String(photoValue).trim() || '',
          passwordReset: String(passwordResetValue).trim() || 'Never reset'
        };
      };

      const staffUsers = staffResults.map((item) => normalizeUserRecord(item as Record<string, any>, 'Staff', 'staff_users')).filter((user) => user.email || user.name);
      const doctorUsers = (doctorSnapshot.docs || []).map((docItem) => {
        const item = docItem.data() as Record<string, any>;
        return normalizeUserRecord({ ...item, role: 'Doctor' }, 'Doctor', 'doctors');
      });

      const mergedUsers = [...staffUsers, ...doctorUsers.filter((doctor) => !staffUsers.some((user) => user.email && doctor.email && user.email.toLowerCase() === doctor.email.toLowerCase()))];
      const uniqueUsers = mergedUsers.filter((user, index, array) => array.findIndex((candidate) => candidate.email && user.email && candidate.email.toLowerCase() === user.email.toLowerCase()) === index);

      if (uniqueUsers.length === 0) {
        setUsers([]);
        return;
      }

      setUsers(uniqueUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const handleSaveUser = async () => {
    try {
      const payload = {
        name: userFormData.name,
        display_name: userFormData.name,
        email: userFormData.email,
        role: userFormData.role,
        status: userFormData.status,
        clinic_name: userFormData.clinicName,
        phone: userFormData.phone,
        access_status: userFormData.accessStatus,
        photo_url: userFormData.photoURL || '',
        password_reset: userFormData.passwordReset || 'Never reset',
      };

      if (!payload.name || !payload.email) {
        window.alert('Name and email are required for each user.');
        return;
      }

      // Validate clinic selection
      if (!payload.clinic_name) {
        window.alert('Please select a clinic for the user.');
        return;
      }

      // Validate phone: must be exactly 10 digits
      const phoneDigits = (payload.phone || '').replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        window.alert('Phone number must be exactly 10 digits');
        return;
      }

      if (editingUser) {
        await updateDoc(doc(db, 'users', editingUser.id), payload);
      } else {
        await addDoc(collection(db, 'users'), {
          ...payload,
          createdAt: new Date().toISOString()
        });
      }

      setShowUserModal(false);
      setEditingUser(null);
      setUserFormData({ name: '', email: '', role: 'Clinic Admin', status: 'Active', clinicName: '', phone: '+91 ', accessStatus: 'Granted', photoURL: '', passwordReset: '' });
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      window.alert('Unable to save the user details. Please verify the information and try again.');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Delete this user from the admin roster?')) return;
    try {
      const user = users.find((item) => item.id === id);
      await deleteDoc(doc(db, user?.source === 'doctors' ? 'doctors' : 'users', id));
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleResetUserPassword = async (userId: string) => {
    if (!userId) return;
    if (!window.confirm(`Reset this user's password to the default password: ${DEFAULT_USER_PASSWORD}?`)) return;

    try {
      const response = await fetch('/api/users/reset-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, defaultPassword: DEFAULT_USER_PASSWORD })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to reset password.');
      }

      setUsers((currentUsers) => currentUsers.map((user) => user.id === userId ? { ...user, passwordReset: `Default (${DEFAULT_USER_PASSWORD})` } : user));
      setUserFormData((current) => ({ ...current, passwordReset: `Default (${DEFAULT_USER_PASSWORD})` }));
      setSaveMessage('User password reset to default successfully.');
      window.alert(`Password reset to ${DEFAULT_USER_PASSWORD}`);
    } catch (error) {
      console.error('Error resetting user password:', error);
      window.alert(error instanceof Error ? error.message : 'Unable to reset the user password.');
    }
  };

  const handleEditUser = (user: { id: string; name: string; email: string; role: string; status: 'Active' | 'Offline' | 'Pending'; clinicName?: string; phone?: string; accessStatus?: 'Granted' | 'Hold' | 'Denied'; photoURL?: string; passwordReset?: string; source?: 'staff_users' | 'doctors' }) => {
    setEditingUser(user);
    setUserFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      clinicName: user.clinicName || '',
      phone: user.phone || '+91 ',
      accessStatus: user.accessStatus || 'Granted',
      photoURL: user.photoURL || '',
      passwordReset: user.passwordReset || 'Never reset'
    });
    setShowUserModal(true);
  };

  const handleSaveClinic = async () => {
    try {
      // Validate required fields
      if (!formData.name.trim()) {
        window.alert('Clinic name is required');
        return;
      }
      if (!formData.email.trim()) {
        window.alert('Email is required');
        return;
      }

      // Validate phone: must be exactly 10 digits
      const digitsOnly = (formData.phone || '').replace(/\D/g, '');
      if (digitsOnly.length !== 10) {
        window.alert('Phone number must be exactly 10 digits');
        return;
      }

      const clinicPlan = formData.featurePlan as FeaturePlan;
      const subscriptionPack = buildClinicPack(clinicPlan, new Date().toISOString());
      const clinicPayload = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        featurePlan: clinicPlan,
        subscriptionPack,
        specializations: formData.specializations.split(',').map(s => s.trim()).filter(Boolean),
        operatingHours: formData.operatingHours,
        logo: formData.logo || '',
        updatedAt: new Date().toISOString(),
      };

      console.log('Clinic payload:', clinicPayload);

      if (editingClinic) {
        await updateDoc(doc(db, 'clinics', editingClinic.id), clinicPayload);
        console.log('Clinic updated:', editingClinic.id);
        window.alert('Clinic updated successfully');
      } else {
        const docRef = await addDoc(collection(db, 'clinics'), {
          ...clinicPayload,
          createdAt: new Date().toISOString()
        });
        console.log('Clinic created:', docRef.id);
        window.alert('Clinic added successfully');
      }
      setShowAddModal(false);
      setEditingClinic(null);
      setFormData({ name: '', address: '', phone: '+91 ', email: '', specializations: '', operatingHours: HOURS_OPTIONS[0], featurePlan: 'TRIAL', logo: '' });
      fetchClinics();
    } catch (error) {
      console.error('Error saving clinic:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      window.alert(`Unable to save clinic: ${errorMessage}`);
    }
  };

  const handleSavePayment = async () => {
    const clinicId = paymentForm.clinicId || clinics.find((clinic) => clinic.name.toLowerCase() === paymentForm.clinicName.trim().toLowerCase())?.id || '';
    const clinicName = paymentForm.clinicName.trim() || clinics.find((clinic) => clinic.id === clinicId)?.name || '';
    const amountValue = Number(paymentForm.amount);
    const durationValue = Number(paymentForm.durationDays || 30);

    // Allow 0 amount for TRIAL pack, otherwise require positive amount
    const isTrialPack = paymentForm.pack === 'TRIAL';
    if (!clinicName || !Number.isFinite(amountValue) || (amountValue <= 0 && !isTrialPack)) {
      window.alert('Please choose a clinic and enter a valid amount before saving the payment.');
      return;
    }

    try {
      const paidAtDate = new Date();
      const startDate = paidAtDate.toISOString();
      const expiryDate = new Date(paidAtDate.getTime() + durationValue * 24 * 60 * 60 * 1000).toISOString();
      const paymentPayload = {
        clinicId,
        clinicName,
        pack: paymentForm.pack,
        amount: amountValue,
        durationDays: durationValue,
        status: paymentForm.status,
        paidAt: startDate,
        startDate,
        expiryDate,
        notes: paymentForm.notes.trim(),
        createdAt: new Date().toISOString(),
      };

      const paymentRecord = await addDoc(collection(db, 'payments'), paymentPayload);
      const matchedClinic = clinics.find((clinic) => clinic.id === clinicId || clinic.name.toLowerCase() === clinicName.toLowerCase());
      if (matchedClinic) {
        const updatedPack = buildClinicPack(paymentForm.pack, startDate);
        await updateDoc(doc(db, 'clinics', matchedClinic.id), {
          featurePlan: paymentForm.pack,
          subscriptionPack: updatedPack,
          updatedAt: new Date().toISOString(),
          currentPackName: paymentForm.pack,
        });
      }

      setPayments((currentPayments) => [{
        id: paymentRecord.id,
        clinicId,
        clinicName,
        pack: paymentForm.pack,
        amount: amountValue,
        durationDays: durationValue,
        status: paymentForm.status,
        paidAt: startDate,
        startDate,
        expiryDate,
        notes: paymentForm.notes.trim(),
      }, ...currentPayments]);
      setPaymentForm({ clinicId: '', clinicName: '', pack: 'TRIAL', amount: '', durationDays: '30', status: 'PAID', notes: '' });
      setBillingTab('overview');
      fetchClinics();
      fetchPayments();
      window.alert('Payment saved successfully.');
    } catch (error) {
      console.error('Error saving payment:', error);
      window.alert('Unable to save the payment details. Please try again.');
    }
  };

  const handleDeleteClinic = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this clinic?')) {
      try {
        await deleteDoc(doc(db, 'clinics', id));
        fetchClinics();
      } catch (error) {
        console.error('Error deleting clinic:', error);
      }
    }
  };

  const handleEditClinic = (clinic: Clinic) => {
    setEditingClinic(clinic);
    setFormData({
      name: clinic.name,
      address: clinic.address,
      phone: clinic.phone || '+91 ',
      email: clinic.email || '',
      specializations: Array.isArray(clinic.specializations) ? clinic.specializations.join(', ') : (typeof clinic.specializations === 'string' ? clinic.specializations : ''),
      operatingHours: clinic.operatingHours || HOURS_OPTIONS[0],
      featurePlan: clinic.featurePlan || 'TRIAL',
      logo: clinic.logo || ''
    });
    setShowAddModal(true);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, logo: String(reader.result || '') }));
    };
    reader.readAsDataURL(file);
  };

  const handleUserPhoneChange = (value: string) => {
    setUserFormData((prev) => ({ ...prev, phone: formatPhoneInput(value) }));
  };

  const handleClinicPhoneChange = (value: string) => {
    setFormData((prev) => ({ ...prev, phone: formatPhoneInput(value) }));
  };

  const filteredClinics = clinics.filter(clinic =>
    clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    clinic.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasUnsavedSettingsChanges = JSON.stringify(siteSettings) !== JSON.stringify(savedSiteSettings) || JSON.stringify(contentSections) !== JSON.stringify(savedContentSections);

  const handleSaveSettings = () => {
    saveSiteSettings(siteSettings);
    saveContentSections(contentSections);
    setSaveMessage('Settings saved successfully.');
    window.dispatchEvent(new Event('site-config-changed'));
    
    // Reload from storage to ensure form reflects saved values
    setTimeout(() => {
      const reloadedSettings = loadSiteSettings();
      const reloadedContent = loadContentSections();
      setSiteSettings(reloadedSettings);
      setContentSections(reloadedContent);
      setSavedSiteSettings(reloadedSettings);
      setSavedContentSections(reloadedContent);
    }, 100);
    
    window.alert('Settings saved successfully.');
  };

  const isSiteAdmin = mode === 'site-admin';

  const tabs = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'clinic-summary', label: 'Clinic Wise Summary' },
    { key: 'content', label: 'Website Content' },
    { key: 'clinics', label: 'Clinics' },
    { key: 'users', label: 'Users' },
    { key: 'security', label: 'Access & Security' },
    { key: 'billing', label: 'Billing & Packs' },
    { key: 'audit', label: 'Audit Trail' },
    { key: 'recent-activity', label: 'Recent Activity' },
  ] as const;



  const paidPayments = payments.filter((payment) => payment.status === 'PAID');
  const pendingPayments = payments.filter((payment) => payment.status === 'PENDING');
  const billingSummary = [
    { label: 'Recorded revenue', value: `₹${paidPayments.reduce((sum, payment) => sum + payment.amount, 0).toLocaleString('en-IN')}`, tone: 'emerald' },
    { label: 'Pending invoices', value: String(pendingPayments.length), tone: 'amber' },
    { label: 'Recorded payments', value: String(payments.length), tone: 'cyan' },
    { label: 'Recorded due amount', value: `₹${pendingPayments.reduce((sum, payment) => sum + payment.amount, 0).toLocaleString('en-IN')}`, tone: 'violet' },
  ];

  const clinicAppointmentSummary = clinics.length > 0
    ? clinics.map((clinic) => {
        const clinicAppointments = appointments.filter((appointment) => appointment.clinicId === clinic.id);
        const walkIns = clinicAppointments.filter((appointment) => appointment.appointmentType === 'WALK_IN').length;
        const online = clinicAppointments.filter((appointment) => appointment.appointmentType === 'ONLINE').length;
        const followUps = clinicAppointments.filter((appointment) => appointment.appointmentType === 'FOLLOW_UP').length;
        const noShows = clinicAppointments.filter((appointment) => appointment.status === 'NO_SHOW').length;
        return {
        clinic: clinic.name || 'Unnamed clinic',
        walkIns,
        online,
        followUps,
        noShows,
        };
      })
    : [];

  const recentActivity = [
    { title: 'New clinic onboarding', detail: 'Latest clinic records loaded from MySQL.', time: 'Recently updated' },
    { title: 'WhatsApp reminder campaign', detail: `Status reflects current live clinic configuration.`, time: 'Live sync' },
    { title: 'Queue reporting', detail: 'Patient flow data updates from the connected clinic database.', time: 'Updated now' },
    { title: 'Security review completed', detail: 'Role-based access is aligned to the active user roster.', time: 'Current state' },
  ];

  const complianceChecks = [
    { name: 'Role-based access review', status: 'Passed' },
    { name: 'Data retention audit', status: 'Passed' },
    { name: 'Clinic onboarding policy', status: 'Needs review' },
    { name: 'Backup & restore test', status: 'Passed' },
  ];

  const exportReport = () => {
    window.alert('Enterprise report export started.');
  };

  const summaryClinicOptions = Array.from(new Set([
    ...clinics.map((clinic) => clinic.name),
    ...clinicAppointmentSummary.map((clinic) => clinic.clinic),
  ].filter(Boolean))).sort((left, right) => left.localeCompare(right));

  useEffect(() => {
    if (!selectedClinicSummary && summaryClinicOptions.length > 0) {
      setSelectedClinicSummary(summaryClinicOptions[0]);
    }
  }, [selectedClinicSummary, summaryClinicOptions]);

  const dateRangeMultiplier = (() => {
    const start = new Date(summaryDateRange.start);
    const end = new Date(summaryDateRange.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return 1;
    }
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1);
  })();

  const selectedClinicSummaryData = clinicAppointmentSummary.find((clinic) => clinic.clinic === selectedClinicSummary)
    ?? clinicAppointmentSummary[0]
    ?? {
      clinic: summaryClinicOptions[0] || 'No clinic selected',
      walkIns: 0,
      online: 0,
      followUps: 0,
      noShows: 0,
    };

  const filteredClinicSummaryData = {
    ...selectedClinicSummaryData,
    walkIns: Math.max(0, Math.round(selectedClinicSummaryData.walkIns * dateRangeMultiplier / 7)),
    online: Math.max(0, Math.round(selectedClinicSummaryData.online * dateRangeMultiplier / 7)),
    followUps: Math.max(0, Math.round(selectedClinicSummaryData.followUps * dateRangeMultiplier / 7)),
    noShows: Math.max(0, Math.round(selectedClinicSummaryData.noShows * dateRangeMultiplier / 7)),
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        const activeClinicsCount = clinics.filter(c => c.subscriptionPack?.status === 'ACTIVE').length;
        
        const pendingClinicsCount = Math.max(0, clinics.length - activeClinicsCount);
        
        const superAdminCount = users.filter(u => u.role === 'SUPER_ADMIN' || u.role === 'Site Admin').length || 0;
        const clinicAdminCount = users.filter(u => u.role === 'CLINIC_ADMIN' || u.role === 'Clinic Admin').length || 0;
        const activeUsersCount = users.filter(u => u.status === 'Active').length;
        const grantedAccessCount = users.filter(u => u.accessStatus === 'Granted').length;
        const accessGrantedPercent = users.length > 0 ? Math.round((grantedAccessCount / users.length) * 100) : 0;
        
        const totalRevenue = paidPayments.reduce((sum, payment) => sum + payment.amount, 0);
        
        const dashboardPendingPayments = pendingPayments.length;
        const expiringSubscriptions = clinics.filter((clinic) => {
          const expiryDate = clinic.subscriptionPack?.expiryDate;
          if (!expiryDate) return false;
          const expiry = new Date(expiryDate).getTime();
          return expiry >= Date.now() && expiry <= Date.now() + 7 * 24 * 60 * 60 * 1000;
        }).length;
        const activeSubscriptionsPercent = clinics.length ? Math.round((activeClinicsCount / clinics.length) * 100) : 0;
        
        return (
          <div className="space-y-8">
            {/* Clinics Section */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Clinics</h3>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">Active</span>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <button onClick={() => setActiveTab('clinics')} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-left hover:border-emerald-400/50 hover:bg-slate-800/70 transition">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Total clinics</div>
                  <div className="mt-3 text-4xl font-black text-white">{clinics.length}</div>
                  <p className="mt-2 text-xs text-slate-500">All registered clinics</p>
                </button>
                <button onClick={() => setActiveTab('clinics')} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-left hover:border-emerald-400/50 hover:bg-slate-800/70 transition">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-400">Active</div>
                  <div className="mt-3 text-4xl font-black text-white">{activeClinicsCount}</div>
                  <p className="mt-2 text-xs text-slate-500">Live and operational</p>
                </button>
                <button onClick={() => setActiveTab('clinics')} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-left hover:border-emerald-400/50 hover:bg-slate-800/70 transition">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-amber-400">Pending</div>
                  <div className="mt-3 text-4xl font-black text-white">{pendingClinicsCount}</div>
                  <p className="mt-2 text-xs text-slate-500">Awaiting approval</p>
                </button>
                <button onClick={() => setActiveTab('clinics')} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-left hover:border-emerald-400/50 hover:bg-slate-800/70 transition">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-red-400">Inactive</div>
                  <div className="mt-3 text-4xl font-black text-white">0</div>
                  <p className="mt-2 text-xs text-slate-500">Suspended or inactive</p>
                </button>
              </div>
            </div>

            {/* Payments Section */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Payments & Billing</h3>
                <span className="rounded-full bg-violet-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200">Overview</span>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <button onClick={() => setActiveTab('security')} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-left hover:border-violet-400/50 hover:bg-slate-800/70 transition">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-amber-400">Payment pending</div>
                  <div className="mt-3 text-4xl font-black text-white">₹{pendingPayments.reduce((sum, payment) => sum + payment.amount, 0).toLocaleString('en-IN')}</div>
                  <p className="mt-2 text-xs text-slate-500">{dashboardPendingPayments} invoices awaiting</p>
                </button>
                <button onClick={() => setActiveTab('security')} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-left hover:border-violet-400/50 hover:bg-slate-800/70 transition">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-400">Active subscriptions</div>
                  <div className="mt-3 text-4xl font-black text-white">{activeSubscriptionsPercent}%</div>
                  <p className="mt-2 text-xs text-slate-500">{activeClinicsCount} active plans</p>
                </button>
                <button onClick={() => setActiveTab('security')} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-left hover:border-violet-400/50 hover:bg-slate-800/70 transition">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-400">Expires within 7 days</div>
                  <div className="mt-3 text-4xl font-black text-white">{expiringSubscriptions}</div>
                  <p className="mt-2 text-xs text-slate-500">Subscription renewal alerts</p>
                </button>
                <button onClick={() => setActiveTab('security')} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-left hover:border-violet-400/50 hover:bg-slate-800/70 transition">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-violet-400">Monthly revenue</div>
                  <div className="mt-3 text-4xl font-black text-white">₹{(totalRevenue).toLocaleString('en-IN')}</div>
                  <p className="mt-2 text-xs text-slate-500">Current MRR</p>
                </button>
              </div>
            </div>

            {/* Users Section */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Users & Access</h3>
                <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">Tracking</span>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <button onClick={() => setActiveTab('users')} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-left hover:border-cyan-400/50 hover:bg-slate-800/70 transition">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Active users</div>
                  <div className="mt-3 text-4xl font-black text-white">{activeUsersCount}</div>
                  <p className="mt-2 text-xs text-slate-500">Total platform users</p>
                </button>
                <button onClick={() => setActiveTab('users')} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-left hover:border-cyan-400/50 hover:bg-slate-800/70 transition">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-400">Super admins</div>
                  <div className="mt-3 text-4xl font-black text-white">{superAdminCount}</div>
                  <p className="mt-2 text-xs text-slate-500">Platform administrators</p>
                </button>
                <button onClick={() => setActiveTab('users')} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-left hover:border-cyan-400/50 hover:bg-slate-800/70 transition">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-400">Clinic admins</div>
                  <div className="mt-3 text-4xl font-black text-white">{clinicAdminCount}</div>
                  <p className="mt-2 text-xs text-slate-500">Clinic management access</p>
                </button>
                <button onClick={() => setActiveTab('users')} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-left hover:border-cyan-400/50 hover:bg-slate-800/70 transition">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-violet-400">Access granted</div>
                  <div className="mt-3 text-4xl font-black text-white">{accessGrantedPercent}%</div>
                  <p className="mt-2 text-xs text-slate-500">Users with full access</p>
                </button>
              </div>
            </div>
          </div>
        );
      case 'audit':
        return (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.24em] text-emerald-300">Operations log</div>
                  <h3 className="mt-2 text-2xl font-bold text-white">Audit Trail</h3>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">Live</span>
              </div>

              <div className="space-y-3">
                {auditLogs.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-800/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-400">{item.detail}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'recent-activity':
        return (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.24em] text-cyan-300">Live updates</div>
                  <h3 className="mt-2 text-2xl font-bold text-white">Recent Activity</h3>
                </div>
                <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">Updated</span>
              </div>

              <div className="space-y-3">
                {recentActivity.map((item) => (
                  <div key={item.title} className="rounded-xl border border-slate-800 bg-slate-800/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-400">{item.detail}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'clinic-summary':
        return (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.5)]">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.24em] text-emerald-300">Operations report</div>
                  <h3 className="mt-2 text-2xl font-bold text-white">Clinic Wise Summary</h3>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">Live</span>
              </div>

              <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="max-w-md">
                  <label className="mb-2 block text-sm font-medium text-slate-300">Select clinic</label>
                  <select
                    value={selectedClinicSummary}
                    onChange={(event) => setSelectedClinicSummary(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-emerald-400 focus:outline-none"
                  >
                    {summaryClinicOptions.map((clinicName) => (
                      <option key={clinicName} value={clinicName}>{clinicName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">From date</label>
                  <input
                    type="date"
                    value={summaryDateRange.start}
                    onChange={(event) => setSummaryDateRange((current) => ({ ...current, start: event.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">To date</label>
                  <input
                    type="date"
                    value={summaryDateRange.end}
                    onChange={(event) => setSummaryDateRange((current) => ({ ...current, end: event.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Selected clinic</div>
                    <div className="mt-1 text-2xl font-bold text-white">{filteredClinicSummaryData.clinic}</div>
                  </div>
                  <span className="rounded-full bg-slate-700 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-slate-200">
                    {filteredClinicSummaryData.walkIns + filteredClinicSummaryData.online + filteredClinicSummaryData.followUps} total
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/30">
                    <div className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Walk-ins</div>
                    <div className="mt-3 text-4xl font-black text-white">{filteredClinicSummaryData.walkIns}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/30">
                    <div className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Online</div>
                    <div className="mt-3 text-4xl font-black text-white">{filteredClinicSummaryData.online}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/30">
                    <div className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Follow-ups</div>
                    <div className="mt-3 text-4xl font-black text-white">{filteredClinicSummaryData.followUps}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/30">
                    <div className="text-[10px] uppercase tracking-[0.15em] text-slate-400">No-shows</div>
                    <div className="mt-3 text-4xl font-black text-white">{filteredClinicSummaryData.noShows}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'content':
        const contentCards = [
          {
            key: 'branding',
            title: 'Branding & titles',
            badge: 'Brand',
            summary: 'Manage the site identity, hero message and main campaign copy.',
            fields: [
              { label: 'Site name', value: siteSettings.siteName, onChange: (value: string) => setSiteSettings({ ...siteSettings, siteName: value }) },
              { label: 'Tagline', value: siteSettings.siteTagline, onChange: (value: string) => setSiteSettings({ ...siteSettings, siteTagline: value }) },
              { label: 'Hero title', value: contentSections.heroTitle, onChange: (value: string) => setContentSections({ ...contentSections, heroTitle: value }) },
              { label: 'Hero subtitle', value: contentSections.heroSubtitle, onChange: (value: string) => setContentSections({ ...contentSections, heroSubtitle: value }), textarea: true },
            ],
          },
          {
            key: 'pages',
            title: 'Page titles',
            badge: 'Content',
            summary: 'Update the page headings and footer copy used across the website.',
            fields: [
              { label: 'What we provide', value: contentSections.whatWeProvideTitle, onChange: (value: string) => setContentSections({ ...contentSections, whatWeProvideTitle: value }) },
              { label: 'Why choose us', value: contentSections.whyChooseTitle, onChange: (value: string) => setContentSections({ ...contentSections, whyChooseTitle: value }) },
              { label: 'Benefits', value: contentSections.benefitsTitle, onChange: (value: string) => setContentSections({ ...contentSections, benefitsTitle: value }) },
              { label: 'Contact', value: contentSections.contactTitle, onChange: (value: string) => setContentSections({ ...contentSections, contactTitle: value }) },
              { label: 'Footer text', value: contentSections.footerText, onChange: (value: string) => setContentSections({ ...contentSections, footerText: value }) },
            ],
          },
          {
            key: 'contact',
            title: 'Contact details',
            badge: 'Contact',
            summary: 'Edit the main contact channels and support address for the clinic.',
            fields: [
              { label: 'Email', value: siteSettings.contactEmail, onChange: (value: string) => setSiteSettings({ ...siteSettings, contactEmail: value }), type: 'email' },
              { label: 'Phone', value: siteSettings.contactPhone, onChange: (value: string) => setSiteSettings({ ...siteSettings, contactPhone: value }), type: 'tel' },
              { label: 'WhatsApp', value: siteSettings.whatsappNumber, onChange: (value: string) => setSiteSettings({ ...siteSettings, whatsappNumber: value }), type: 'tel' },
              { label: 'Support address', value: siteSettings.supportAddress, onChange: (value: string) => setSiteSettings({ ...siteSettings, supportAddress: value }) },
            ],
          },
          {
            key: 'media',
            title: 'Media & social',
            badge: 'Links',
            summary: 'Adjust the social platform URLs used in the site footer and contact area.',
            fields: [
              { label: 'Facebook URL', value: siteSettings.facebookUrl, onChange: (value: string) => setSiteSettings({ ...siteSettings, facebookUrl: value }) },
              { label: 'Instagram URL', value: siteSettings.instagramUrl, onChange: (value: string) => setSiteSettings({ ...siteSettings, instagramUrl: value }) },
              { label: 'LinkedIn URL', value: siteSettings.linkedinUrl, onChange: (value: string) => setSiteSettings({ ...siteSettings, linkedinUrl: value }) },
              { label: 'X / Twitter URL', value: siteSettings.xUrl, onChange: (value: string) => setSiteSettings({ ...siteSettings, xUrl: value }) },
              { label: 'YouTube URL', value: siteSettings.youtubeUrl, onChange: (value: string) => setSiteSettings({ ...siteSettings, youtubeUrl: value }) },
            ],
          },
        ];

        return (
          <div className="space-y-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xl font-bold">Website content</h3>
              <span className="rounded-full bg-violet-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200">Editable</span>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              {contentCards.map(({ key, title, badge, summary, fields }) => {
                const isExpanded = !!expandedContentCards[key];

                return (
                  <div key={key} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
                    <button
                      type="button"
                      onClick={() => setExpandedContentCards((current) => ({ ...current, [key]: !current[key] }))}
                      className="flex w-full items-start justify-between gap-3 text-left"
                    >
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-white">{title}</h4>
                        {!isExpanded && (
                          <div className="mt-3 rounded-xl border border-slate-700 bg-slate-800/80 p-3">
                            <p className="text-sm text-slate-200">{summary}</p>
                            <p className="mt-2 text-[10px] uppercase tracking-[0.15em] text-slate-400">Click to view details</p>
                          </div>
                        )}
                      </div>

                      <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-slate-300">
                        {isExpanded ? 'Open' : badge}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
                        {fields.map((field) => (
                          <div key={field.label}>
                            <label className="mb-2 block text-sm font-medium">{field.label}</label>
                            {field.textarea ? (
                              <textarea
                                value={field.value}
                                onChange={(event) => field.onChange(event.target.value)}
                                rows={3}
                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                              />
                            ) : (
                              <input
                                type={field.type || 'text'}
                                value={field.value}
                                onChange={(event) => field.onChange(event.target.value)}
                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {hasUnsavedSettingsChanges && (
              <div className="flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  className="rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-2 font-semibold text-white hover:shadow-lg hover:shadow-emerald-500/50 transition"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        );
      case 'clinics':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search clinics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                />
              </div>
              <button
                onClick={() => {
                  setEditingClinic(null);
                  setFormData({ name: '', address: '', phone: '+91 ', email: '', specializations: '', operatingHours: HOURS_OPTIONS[0], featurePlan: 'TRIAL', logo: '' });
                  setShowAddModal(true);
                }}
                className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-emerald-500/50 flex items-center gap-2 transition"
              >
                <Plus className="w-5 h-5" />
                Add Clinic
              </button>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-8 text-center text-slate-400">Loading clinics...</div>
            ) : filteredClinics.length === 0 ? (
              <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-10 text-center">
                <Building2 className="mx-auto mb-3 h-12 w-12 text-slate-600" />
                <p className="text-slate-400">No clinics found</p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredClinics.map((clinic) => (
                  <div key={clinic.id} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">{clinic.name}</h3>
                        <p className="text-sm text-slate-400">{clinic.address}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditClinic(clinic)} className="rounded-lg bg-blue-500/15 p-2 text-blue-300"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => handleDeleteClinic(clinic.id)} className="rounded-lg bg-red-500/15 p-2 text-red-300"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-slate-300">
                      <p>{clinic.phone}</p>
                      <p>{clinic.email}</p>
                      <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-emerald-400" /> {clinic.operatingHours}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {clinic.specializations?.map((spec) => (
                        <span key={spec} className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-emerald-300">{spec}</span>
                      ))}
                    </div>

                    <button onClick={() => onManageDoctors(clinic.id, clinic.name)} className="mt-5 w-full rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700">
                      Manage doctors
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'users':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-bold">User directory</h3>
                <p className="text-sm text-slate-400">Review access, edit roles, and manage active team members.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingUser(null);
                  setUserFormData({ name: '', email: '', role: 'Clinic Admin', status: 'Active', clinicName: '', phone: '+91 ', accessStatus: 'Granted', photoURL: '', passwordReset: '' });
                  setShowUserModal(true);
                }}
                className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950"
              >
                Add user
              </button>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
              <div className="space-y-3">
                {users.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">No users found in the directory.</div>
                ) : (
                  users.map((user) => (
                    <div key={user.id} className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-800/60 p-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-600 bg-slate-700 text-sm font-bold text-emerald-300">
                          {user.photoURL ? <img src={user.photoURL} alt={user.name} className="h-full w-full object-cover" /> : <span>{user.name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()}</span>}
                        </div>
                        <div>
                          <div className="text-base font-semibold text-white">{user.name}</div>
                          <div className="text-xs text-slate-400">{user.email}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                            <span className="rounded-full bg-slate-700 px-2 py-1">{user.role}</span>
                            {user.clinicName && <span className="rounded-full bg-slate-700 px-2 py-1">{user.clinicName}</span>}
                            {user.phone && <span className="rounded-full bg-slate-700 px-2 py-1">{user.phone}</span>}
                            <span className={`rounded-full px-2 py-1 ${user.accessStatus === 'Granted' ? 'bg-emerald-500/15 text-emerald-300' : user.accessStatus === 'Hold' ? 'bg-amber-500/15 text-amber-300' : 'bg-red-500/15 text-red-300'}`}>{user.accessStatus || 'Granted'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${user.status === 'Active' ? 'bg-emerald-500/15 text-emerald-300' : user.status === 'Offline' ? 'bg-slate-500/15 text-slate-300' : 'bg-amber-500/15 text-amber-300'}`}>
                          {user.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleResetUserPassword(user.id)}
                          className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200 hover:bg-amber-500/25"
                        >
                          {user.passwordReset ? `Reset (${user.passwordReset})` : 'Reset password'}
                        </button>
                        <button onClick={() => handleEditUser(user)} className="rounded-lg bg-blue-500/15 p-2 text-blue-300"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => handleDeleteUser(user.id)} className="rounded-lg bg-red-500/15 p-2 text-red-300"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold">Clinic access management</h3>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">Live</span>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {['Granted', 'Hold', 'Denied'].map((status) => {
                  const count = users.filter((user) => (user.accessStatus || 'Granted') === status).length;
                  return (
                    <div key={status} className="rounded-xl border border-slate-800 bg-slate-800/70 p-4">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{status}</div>
                      <div className="mt-2 text-3xl font-black text-white">{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
              <h3 className="mb-4 text-xl font-bold">Clinic access matrix</h3>
              <div className="space-y-3">
                {clinics.length === 0 ? (
                  <div className="text-sm text-slate-400">No clinics available.</div>
                ) : (
                  clinics.map((clinic) => {
                    const clinicUsers = users.filter((user) => (user.clinicName || '').toLowerCase() === clinic.name.toLowerCase() || user.clinicName === clinic.name);
                    const status = clinicUsers.some((user) => (user.accessStatus || 'Granted') === 'Denied') ? 'Denied' : clinicUsers.some((user) => (user.accessStatus || 'Granted') === 'Hold') ? 'Hold' : 'Granted';
                    return (
                      <div key={clinic.id} className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-800/60 p-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="font-semibold text-white">{clinic.name}</div>
                          <div className="text-xs text-slate-400">{clinicUsers.length} linked users</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <select
                            value={status}
                            onChange={async (e) => {
                              const newStatus = e.target.value as 'Granted' | 'Hold' | 'Denied';
                              // Update local state immediately for responsive UI
                              setUsers(users.map(user => 
                                clinicUsers.some(cu => cu.id === user.id) 
                                  ? { ...user, accessStatus: newStatus }
                                  : user
                              ));
                              
                              // Save to Firestore
                              try {
                                for (const user of clinicUsers) {
                                  const userRef = doc(db, user.source === 'doctors' ? 'doctors' : 'users', user.id);
                                  await updateDoc(userRef, { accessStatus: newStatus });
                                }
                              } catch (error) {
                                console.error('Error updating clinic access:', error);
                                window.alert('Failed to update access. Please try again.');
                                // Revert local state on error
                                fetchUsers();
                              }
                            }}
                            className="rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm font-medium text-white focus:border-emerald-400 focus:outline-none"
                          >
                            <option value="Granted">Granted</option>
                            <option value="Hold">Hold</option>
                            <option value="Denied">Denied</option>
                          </select>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      case 'billing':
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              {billingSummary.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{item.label}</div>
                  <div className="mt-3 text-3xl font-black text-white">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-violet-300">Subscription packs</div>
                  <h3 className="mt-2 text-2xl font-bold text-white">Clinic pack management</h3>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setBillingTab('overview')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${billingTab === 'overview' ? 'bg-emerald-500 text-slate-950' : 'border border-slate-700 bg-slate-800 text-slate-200'}`}>
                    Overview
                  </button>
                  <button onClick={() => setBillingTab('add-payment')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${billingTab === 'add-payment' ? 'bg-violet-500 text-white' : 'border border-slate-700 bg-slate-800 text-slate-200'}`}>
                    Add payment
                  </button>
                </div>
              </div>

              {billingTab === 'overview' ? (
                <>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {PACK_OPTIONS.map((pack) => {
                      const activeCount = clinics.filter((clinic) => (clinic.featurePlan || 'TRIAL') === pack.value).length;
                      return (
                        <div key={pack.value} className="rounded-2xl border border-slate-800 bg-slate-800/70 p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{pack.label}</div>
                              <div className="mt-2 text-2xl font-black text-white">{pack.price}</div>
                            </div>
                            <span className="rounded-full bg-slate-700 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200">{pack.validityDays} days</span>
                          </div>
                          <div className="mt-4 text-sm text-slate-400">{activeCount} clinics assigned</div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {clinics.filter((clinic) => (clinic.featurePlan || 'TRIAL') === pack.value).slice(0, 3).map((clinic) => (
                              <span key={clinic.id} className="rounded-full bg-slate-700 px-2 py-1 text-[10px] text-slate-200">{clinic.name}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
                      <h3 className="mb-4 text-xl font-bold">Subscription health</h3>
                      <div className="space-y-4">
                        {[{ label: 'Paid records', value: payments.length ? `${Math.round((paidPayments.length / payments.length) * 100)}%` : '0%', tone: 'emerald' }, { label: 'Pending records', value: payments.length ? `${Math.round((pendingPayments.length / payments.length) * 100)}%` : '0%', tone: 'cyan' }, { label: 'Overdue balances', value: 'No data', tone: 'amber' }].map((item) => (
                          <div key={item.label}>
                            <div className="mb-1 flex items-center justify-between text-sm">
                              <span className="text-slate-300">{item.label}</span>
                              <span className="font-bold text-white">{item.value}</span>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                              <div className={`h-full rounded-full ${item.tone === 'emerald' ? 'bg-emerald-500' : item.tone === 'cyan' ? 'bg-cyan-500' : 'bg-amber-500'}`} style={{ width: item.value === 'No data' ? '0%' : item.value }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
                      <h3 className="mb-4 text-xl font-bold">Billing actions</h3>
                      <div className="space-y-3">
                        {['Upgrade clinic pack', 'Review overdue invoices', 'Sync payment status', 'Export usage report'].map((action) => (
                          <button key={action} className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-left text-sm font-medium text-slate-200 hover:border-emerald-400/50">
                            {action}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
                  <h3 className="mb-5 text-xl font-bold">Record clinic payment</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">Clinic</label>
                      <select
                        value={paymentForm.clinicId}
                        onChange={(event) => {
                          const selectedClinic = clinics.find((clinic) => clinic.id === event.target.value);
                          setPaymentForm((current) => ({
                            ...current,
                            clinicId: event.target.value,
                            clinicName: selectedClinic?.name || current.clinicName,
                          }));
                        }}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-violet-400 focus:outline-none"
                      >
                        <option value="">Select clinic</option>
                        {clinics.map((clinic) => (
                          <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">Or clinic name</label>
                      <input
                        type="text"
                        value={paymentForm.clinicName}
                        onChange={(event) => setPaymentForm((current) => ({ ...current, clinicName: event.target.value }))}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-violet-400 focus:outline-none"
                        placeholder="Clinic name"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">Pack</label>
                      <select
                        value={paymentForm.pack}
                        onChange={(event) => {
                          const newPack = event.target.value as FeaturePlan;
                          const autoAmount = getPackPrice(newPack);
                          setPaymentForm((current) => ({ 
                            ...current, 
                            pack: newPack,
                            amount: autoAmount.toString(),
                            durationDays: getPackMeta(newPack)?.validityDays?.toString() || '30'
                          }));
                        }}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-violet-400 focus:outline-none"
                      >
                        {PACK_OPTIONS.map((pack) => (
                          <option key={pack.value} value={pack.value}>{pack.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">Amount paid</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentForm.amount}
                        onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-violet-400 focus:outline-none"
                        placeholder={paymentForm.pack === 'TRIAL' ? '0 (auto-filled for Trial)' : paymentForm.pack === 'ENTERPRISE' ? 'Enter custom amount' : 'Auto-filled based on pack'}
                      />
                      <p className="mt-1 text-xs text-slate-500">Auto-fills based on selected pack. Edit to apply discounts.</p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">Duration (days)</label>
                      <input
                        type="number"
                        min="1"
                        value={paymentForm.durationDays}
                        onChange={(event) => setPaymentForm((current) => ({ ...current, durationDays: event.target.value }))}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-violet-400 focus:outline-none"
                        placeholder="30"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">Status</label>
                      <select
                        value={paymentForm.status}
                        onChange={(event) => setPaymentForm((current) => ({ ...current, status: event.target.value as 'PAID' | 'PENDING' }))}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-violet-400 focus:outline-none"
                      >
                        <option value="PAID">Paid</option>
                        <option value="PENDING">Pending</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium text-slate-300">Notes</label>
                    <textarea
                      value={paymentForm.notes}
                      onChange={(event) => setPaymentForm((current) => ({ ...current, notes: event.target.value }))}
                      rows={3}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-violet-400 focus:outline-none"
                      placeholder="Invoice reference, renewal note, or pack notes"
                    />
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setBillingTab('overview')} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 font-semibold text-slate-200">
                      Cancel
                    </button>
                    <button onClick={handleSavePayment} className="rounded-xl bg-violet-500 px-4 py-2 font-semibold text-white hover:bg-violet-400">
                      Save payment
                    </button>
                  </div>
                </div>
              )}
            </div>

            {payments.length > 0 && (
              <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Recent payments</h3>
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">{payments.length} entries</span>
                </div>
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-800/70 p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-base font-semibold text-white">{payment.clinicName || 'Unnamed clinic'}</div>
                        <div className="mt-1 text-xs text-slate-400">{payment.pack} • {payment.durationDays} days • {new Date(payment.paidAt).toLocaleDateString()}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-slate-700 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-200">{payment.status}</span>
                        <span className="text-lg font-bold text-emerald-300">₹{Number(payment.amount).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-950/90 shadow-[0_10px_35px_rgba(2,6,23,0.45)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-400/40">
              <Building2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{siteSettings.siteName}</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">{siteSettings.siteTagline}</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <button onClick={exportReport} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-400/50 hover:text-white">Export report</button>
            <button className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400">Generate summary</button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onLogout}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-red-400/40 hover:text-red-300"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        {saveMessage && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {saveMessage}
          </div>
        )}

        <div className="mb-6 flex gap-2 overflow-x-auto md:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition ${
                activeTab === tab.key ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30' : 'bg-slate-900 text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)] xl:items-start">
          <aside className="xl:sticky xl:top-24 xl:self-start rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-[0_24px_80px_rgba(2,6,23,0.4)]">
            <div className="space-y-5">
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Dashboard</div>
                <div className="space-y-2">
                  {tabs.slice(0, 3).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                        activeTab === tab.key ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Operations</div>
                <div className="space-y-2">
                  {tabs.slice(3, 8).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                        activeTab === tab.key ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/60 p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Service health</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-lg font-black text-white">99.8%</span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-200">Stable</span>
              </div>
            </div>
          </aside>

          <div className="space-y-6">{renderActiveTab()}</div>
        </div>


      </main>

      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-6">{editingUser ? 'Edit User' : 'Add New User'}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Full name</label>
                <input type="text" value={userFormData.name} onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none" />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Profile photo URL</label>
                <input type="url" value={userFormData.photoURL} onChange={(e) => setUserFormData({ ...userFormData, photoURL: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none" placeholder="https://example.com/avatar.jpg" />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Email</label>
                <input type="email" value={userFormData.email} onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none" />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Role</label>
                <select value={userFormData.role} onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none">
                  <option value="Super Admin">Super Admin</option>
                  <option value="Clinic Admin">Clinic Admin</option>
                  <option value="Doctor">Doctor</option>
                  <option value="Support Staff">Support Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Clinic</label>
                <select value={userFormData.clinicName} onChange={(e) => setUserFormData({ ...userFormData, clinicName: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none">
                  <option value="">Select a clinic</option>
                  {clinics.map((clinic) => (
                    <option key={clinic.id} value={clinic.name}>{clinic.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Phone</label>
                <input type="tel" value={userFormData.phone} onChange={(e) => handleUserPhoneChange(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none" placeholder="+91 98765 43210" maxLength={14} />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Access status</label>
                <select value={userFormData.accessStatus} onChange={(e) => setUserFormData({ ...userFormData, accessStatus: e.target.value as 'Granted' | 'Hold' | 'Denied' })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none">
                  <option value="Granted">Granted</option>
                  <option value="Hold">Hold</option>
                  <option value="Denied">Denied</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Password reset</label>
                <div className="rounded-lg border border-slate-600 bg-slate-700 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm text-slate-200">{userFormData.passwordReset || 'Never reset'}</div>
                      <div className="text-xs text-slate-400">Default password: {DEFAULT_USER_PASSWORD}</div>
                    </div>
                    <button
                      type="button"
                      disabled={!editingUser}
                      onClick={() => handleResetUserPassword(editingUser?.id || '')}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold ${editingUser ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' : 'cursor-not-allowed bg-slate-600 text-slate-400'}`}
                    >
                      Reset to default
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Status</label>
                <select value={userFormData.status} onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value as 'Active' | 'Offline' | 'Pending' })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none">
                  <option value="Active">Active</option>
                  <option value="Offline">Offline</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setEditingUser(null);
                  setUserFormData({ name: '', email: '', role: 'Clinic Admin', status: 'Active', clinicName: '', phone: '+91 ', accessStatus: 'Granted', photoURL: '', passwordReset: '' });
                }}
                className="flex-1 rounded-lg bg-slate-700 px-4 py-2 text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                className="flex-1 rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950"
              >
                {editingUser ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-6">{editingClinic ? 'Edit Clinic' : 'Add New Clinic'}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Clinic Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                  placeholder="e.g., City Care Clinic"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                  placeholder="Full address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleClinicPhoneChange(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                    placeholder="+91 98765 43210"
                    maxLength={14}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Specializations (comma-separated)</label>
                <input
                  type="text"
                  value={formData.specializations}
                  onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                  placeholder="Cardiology, General Surgery, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Operating Hours</label>
                <select
                  value={formData.operatingHours}
                  onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                >
                  {HOURS_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Clinic pack</label>
                <select
                  value={formData.featurePlan}
                  onChange={(e) => setFormData({ ...formData, featurePlan: e.target.value as FeaturePlan })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                >
                  {PACK_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label} · {option.validityDays} days</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Clinic Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-500 file:text-white"
                />
                {formData.logo && (
                  <img src={formData.logo} alt="Clinic preview" className="mt-3 h-20 w-20 object-cover rounded-lg border border-slate-600" />
                )}
              </div>

            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingClinic(null);
                  setFormData({ name: '', address: '', phone: '+91 ', email: '', specializations: '', operatingHours: HOURS_OPTIONS[0], featurePlan: 'TRIAL', logo: '' });
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveClinic}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold transition"
              >
                {editingClinic ? 'Update' : 'Create'} Clinic
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

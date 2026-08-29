import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, Users, Clock, Search, Filter } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

interface Clinic {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  specializations: string[];
  operatingHours: string;
  logo?: string;
  createdAt: string;
}

interface ClinicAdminProps {
  adminId: string;
  onLogout: () => void;
}

export const ClinicAdminDashboard: React.FC<ClinicAdminProps> = ({ adminId, onLogout }) => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    specializations: '',
    operatingHours: ''
  });

  useEffect(() => {
    fetchClinics();
  }, []);

  const fetchClinics = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'clinics'));
      const clinicList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Clinic[];
      setClinics(clinicList);
    } catch (error) {
      console.error('Error fetching clinics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClinic = async () => {
    try {
      if (editingClinic) {
        await updateDoc(doc(db, 'clinics', editingClinic.id), {
          ...formData,
          specializations: formData.specializations.split(',').map(s => s.trim()),
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'clinics'), {
          ...formData,
          specializations: formData.specializations.split(',').map(s => s.trim()),
          createdAt: new Date().toISOString()
        });
      }
      setShowAddModal(false);
      setEditingClinic(null);
      setFormData({ name: '', address: '', phone: '', email: '', specializations: '', operatingHours: '' });
      fetchClinics();
    } catch (error) {
      console.error('Error saving clinic:', error);
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
      phone: clinic.phone,
      email: clinic.email,
      specializations: clinic.specializations.join(', '),
      operatingHours: clinic.operatingHours
    });
    setShowAddModal(true);
  };

  const filteredClinics = clinics.filter(clinic =>
    clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    clinic.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen text-white">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <Building2 className="w-8 h-8 text-emerald-400" />
            Super Admin Dashboard
          </h1>
          <p className="text-slate-400">Manage all clinics and access control</p>
        </div>
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between">
          <div className="flex gap-3 flex-1">
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
            <button className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:border-slate-600 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter
            </button>
          </div>
          <button
            onClick={() => {
              setEditingClinic(null);
              setFormData({ name: '', address: '', phone: '', email: '', specializations: '', operatingHours: '' });
              setShowAddModal(true);
            }}
            className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-emerald-500/50 flex items-center gap-2 transition"
          >
            <Plus className="w-5 h-5" />
            Add Clinic
          </button>
        </div>

        {/* Clinics Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <p className="text-slate-400">Loading clinics...</p>
          </div>
        ) : filteredClinics.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4 opacity-50" />
            <p className="text-slate-400 mb-6">No clinics found</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2 bg-emerald-500 rounded-lg font-semibold hover:bg-emerald-600"
            >
              Create First Clinic
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClinics.map(clinic => (
              <div key={clinic.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-emerald-400/50 transition group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold group-hover:text-emerald-400 transition">{clinic.name}</h3>
                    <p className="text-sm text-slate-400">{clinic.address}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditClinic(clinic)}
                      className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition"
                    >
                      <Edit className="w-4 h-4 text-blue-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteClinic(clinic.id)}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>{clinic.operatingHours}</span>
                  </div>
                  <p className="text-sm text-slate-400">{clinic.phone} • {clinic.email}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {clinic.specializations?.map((spec, i) => (
                      <span key={i} className="px-2 py-1 bg-emerald-400/20 text-emerald-400 rounded text-xs">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                <button className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition flex items-center justify-center gap-2">
                  <Users className="w-4 h-4" />
                  Manage Doctors
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Clinic Modal */}
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
                  placeholder="e.g., Apex Super Specialty Care"
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
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
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
                <input
                  type="text"
                  value={formData.operatingHours}
                  onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                  placeholder="9:00 AM - 6:00 PM"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingClinic(null);
                  setFormData({ name: '', address: '', phone: '', email: '', specializations: '', operatingHours: '' });
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

import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Star, Search, Upload } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  clinicId: string;
  qualification: string;
  experience: string;
  phone: string;
  email: string;
  photo?: string;
  bio?: string;
  consultationFee: number;
  availableDays: string[];
  availableHours: string;
  rating: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface DoctorManagementProps {
  clinicId: string;
  clinicName: string;
  onBack: () => void;
}

export const DoctorManagement: React.FC<DoctorManagementProps> = ({ clinicId, clinicName, onBack }) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    specialization: '',
    qualification: '',
    experience: '',
    phone: '',
    email: '',
    bio: '',
    consultationFee: '',
    availableDays: [] as string[],
    availableHours: '',
    status: 'active' as 'active' | 'inactive'
  });

  useEffect(() => {
    fetchDoctors();
  }, [clinicId]);

  const fetchDoctors = async () => {
    try {
      const q = query(collection(db, 'doctors'), where('clinicId', '==', clinicId));
      const snapshot = await getDocs(q);
      const doctorList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Doctor[];
      setDoctors(doctorList);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDoctor = async () => {
    try {
      const doctorData = {
        ...formData,
        clinicId,
        consultationFee: parseInt(formData.consultationFee),
        rating: editingDoctor?.rating || 0
      };

      if (editingDoctor) {
        await updateDoc(doc(db, 'doctors', editingDoctor.id), {
          ...doctorData,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'doctors'), {
          ...doctorData,
          createdAt: new Date().toISOString()
        });
      }

      setShowAddModal(false);
      setEditingDoctor(null);
      setFormData({
        name: '',
        specialization: '',
        qualification: '',
        experience: '',
        phone: '',
        email: '',
        bio: '',
        consultationFee: '',
        availableDays: [],
        availableHours: '',
        status: 'active'
      });
      fetchDoctors();
    } catch (error) {
      console.error('Error saving doctor:', error);
    }
  };

  const handleDeleteDoctor = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this doctor?')) {
      try {
        await deleteDoc(doc(db, 'doctors', id));
        fetchDoctors();
      } catch (error) {
        console.error('Error deleting doctor:', error);
      }
    }
  };

  const handleEditDoctor = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setFormData({
      name: doctor.name,
      specialization: doctor.specialization,
      qualification: doctor.qualification,
      experience: doctor.experience,
      phone: doctor.phone,
      email: doctor.email,
      bio: doctor.bio || '',
      consultationFee: doctor.consultationFee.toString(),
      availableDays: doctor.availableDays,
      availableHours: doctor.availableHours,
      status: doctor.status
    });
    setShowAddModal(true);
  };

  const filteredDoctors = doctors.filter(doctor =>
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="min-h-screen text-white">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <Users className="w-8 h-8 text-emerald-400" />
            Doctors - {clinicName}
          </h1>
          <p className="text-slate-400">Manage doctors and staff for this clinic</p>
        </div>
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search doctors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
            />
          </div>
          <button
            onClick={() => {
              setEditingDoctor(null);
              setFormData({
                name: '',
                specialization: '',
                qualification: '',
                experience: '',
                phone: '',
                email: '',
                bio: '',
                consultationFee: '',
                availableDays: [],
                availableHours: '',
                status: 'active'
              });
              setShowAddModal(true);
            }}
            className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-emerald-500/50 flex items-center gap-2 transition"
          >
            <Plus className="w-5 h-5" />
            Add Doctor
          </button>
        </div>

        {/* Doctors Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <p className="text-slate-400">Loading doctors...</p>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-slate-600 mx-auto mb-4 opacity-50" />
            <p className="text-slate-400 mb-6">No doctors found</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2 bg-emerald-500 rounded-lg font-semibold hover:bg-emerald-600"
            >
              Add First Doctor
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map(doctor => (
              <div key={doctor.id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-emerald-400/50 transition group">
                {/* Doctor Image Placeholder */}
                <div className="h-40 bg-gradient-to-br from-emerald-900/30 to-cyan-900/30 flex items-center justify-center">
                  <Users className="w-20 h-20 text-slate-600" />
                </div>

                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold group-hover:text-emerald-400 transition">Dr. {doctor.name}</h3>
                      <p className="text-sm text-emerald-400">{doctor.specialization}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditDoctor(doctor)}
                        className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition"
                      >
                        <Edit className="w-4 h-4 text-blue-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteDoctor(doctor.id)}
                        className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <p className="text-slate-300">{doctor.qualification}</p>
                    <p className="text-slate-400">{doctor.experience} years experience</p>
                    <p className="text-slate-400">{doctor.phone} • {doctor.email}</p>
                    <p className="text-emerald-400 font-semibold">₹{doctor.consultationFee} per consultation</p>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm">{doctor.rating.toFixed(1)} (0 reviews)</span>
                  </div>

                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${doctor.status === 'active' ? 'bg-emerald-400/20 text-emerald-400' : 'bg-red-400/20 text-red-400'}`}>
                      {doctor.status.charAt(0).toUpperCase() + doctor.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Doctor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-2xl w-full my-8">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">{editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                    placeholder="Dr. John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Specialization</label>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                    placeholder="Cardiology"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Qualification</label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                    placeholder="MBBS, MD"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Experience (years)</label>
                  <input
                    type="text"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                    placeholder="10"
                  />
                </div>
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
                <label className="block text-sm font-semibold mb-2">Consultation Fee (₹)</label>
                <input
                  type="number"
                  value={formData.consultationFee}
                  onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                  placeholder="500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none resize-none"
                  rows={3}
                  placeholder="Brief bio..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Available Days</label>
                <div className="grid grid-cols-4 gap-2">
                  {daysOfWeek.map(day => (
                    <label key={day} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.availableDays.includes(day)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              availableDays: [...formData.availableDays, day]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              availableDays: formData.availableDays.filter(d => d !== day)
                            });
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{day.slice(0, 3)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Available Hours</label>
                <input
                  type="text"
                  value={formData.availableHours}
                  onChange={(e) => setFormData({ ...formData, availableHours: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                  placeholder="9:00 AM - 5:00 PM"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="border-t border-slate-700 px-6 py-4 flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingDoctor(null);
                  setFormData({
                    name: '',
                    specialization: '',
                    qualification: '',
                    experience: '',
                    phone: '',
                    email: '',
                    bio: '',
                    consultationFee: '',
                    availableDays: [],
                    availableHours: '',
                    status: 'active'
                  });
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDoctor}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold transition"
              >
                {editingDoctor ? 'Update' : 'Create'} Doctor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

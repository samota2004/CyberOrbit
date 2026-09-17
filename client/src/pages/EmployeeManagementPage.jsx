import React, { useState } from 'react';
import {
  UserPlus,
  Edit2,
  Trash2,
  Search,
  X,
  AlertTriangle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const EmployeeManagementPage = ({
  users = [],
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onFreezeUser,
  onUnfreezeUser
}) => {
  const { isDark } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    employeeId: '',
    department: 'ENGINEERING',
    role: 'EMPLOYEE',
    status: 'ACTIVE'
  });

  const departments = [
    'ENGINEERING',
    'FINANCE',
    'SECURITY',
    'HR',
    'LEGAL',
    'IT'
  ];

  const roles = [
    'EMPLOYEE'
  ];

  const generateEmployeeId = () => {
    const existingNumbers = users
      .map((user) => {
        const match = String(user.employeeId || '').match(/^EMP(\d+)$/i);
        return match ? Number(match[1]) : 0;
      })
      .filter((number) => number > 0);

    const nextNumber =
      existingNumbers.length > 0
        ? Math.max(...existingNumbers) + 1
        : 1;

    return `EMP${nextNumber.toString().padStart(3, '0')}`;
  };

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      email: '',
      employeeId: generateEmployeeId(),
      department: 'ENGINEERING',
      role: 'EMPLOYEE',
      status: 'ACTIVE'
    });

    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);

    setFormData({
      name: user.name || '',
      email: user.email || '',
      employeeId: user.employeeId || '',
      department: user.department?.toUpperCase() || 'ENGINEERING',
      role: user.role || 'EMPLOYEE',
      status: user.status || 'ACTIVE'
    });
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const employeeId = formData.employeeId.trim();

    if (!name || !email || !employeeId) {
      return;
    }

    try {
      setIsSubmitting(true);

      const token = localStorage.getItem('zero_trust_token');

      if (!token) {
        throw new Error(
          'Authentication token not found. Please log in again.'
        );
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          email,
          employeeId,
          department: formData.department,
          role: formData.role,
          status: formData.status
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
          data?.message ||
          'Failed to create employee.'
        );
      }

      if (!data?.user) {
        throw new Error(
          'Employee was not returned by the server.'
        );
      }

      if (onAddUser) {
        onAddUser(data.user);
      }

      setIsAddModalOpen(false);

      setFormData({
        name: '',
        email: '',
        employeeId: '',
        department: 'ENGINEERING',
        role: 'EMPLOYEE',
        status: 'ACTIVE'
      });
    } catch (error) {
      console.error('Failed to add employee:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();

    if (isSubmitting || !editingUser) return;

    if (!onUpdateUser) {
      console.error('onUpdateUser callback is not available.');
      return;
    }

    const updatedUser = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      employeeId: formData.employeeId.trim(),
      department: formData.department,
      role: formData.role,
      status: formData.status
    };

    if (
      !updatedUser.name ||
      !updatedUser.email ||
      !updatedUser.employeeId
    ) {
      return;
    }

    try {
      setIsSubmitting(true);

      await onUpdateUser(
        editingUser.id,
        updatedUser
      );

      setEditingUser(null);
    } catch (error) {
      console.error('Failed to update employee:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (
      !confirmDeleteUser ||
      !onDeleteUser ||
      isSubmitting
    ) {
      return;
    }

    try {
      setIsSubmitting(true);

      await onDeleteUser(confirmDeleteUser.id);

      setConfirmDeleteUser(null);
    } catch (error) {
      console.error('Failed to delete employee:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase().trim();

    const matchesSearch =
      !query ||
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.employeeId?.toLowerCase().includes(query);

    const matchesDept =
      selectedDept === 'ALL' ||
      user.department?.toUpperCase() === selectedDept;

    return matchesSearch && matchesDept;
  });

  const activeUsers = users.filter(
    (user) => user.status === 'ACTIVE'
  ).length;

  const watchlistUsers = users.filter(
    (user) => (user.currentRiskScore || 0) >= 60
  ).length;

  const frozenUsers = users.filter(
    (user) => user.status === 'FROZEN'
  ).length;

  return (
    <div className="space-y-10">

      <div
        className={`p-8 sm:p-10 border border-[#D4AF37]/25 relative transition-colors ${
          isDark ? 'bg-black' : 'bg-white'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#D4AF37] border border-[#D4AF37]/40 px-2.5 py-0.5">
                IDENTITY GOVERNANCE
              </span>

              <span className="text-[11px] font-mono text-gray-500">
                LIFECYCLE &amp; ACCESS PROVISIONING
              </span>
            </div>

            <h1 className="font-serif-display text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight">
              Employee Management
            </h1>

            <p className="text-xs text-gray-400 max-w-2xl mt-3 font-sans leading-relaxed">
              Create, update, and manage employee identities, department alignments, and role-based access privileges across the CyberOrbit Zero Trust perimeter.
            </p>
          </div>

          <button
            id="btn-add-employee"
            onClick={handleOpenAdd}
            className="px-5 py-2.5 border border-[#D4AF37] bg-[#D4AF37] text-black hover:bg-transparent hover:text-[#D4AF37] text-xs font-mono font-semibold tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-2 shrink-0 shadow-[0_0_15px_rgba(212,175,55,0.15)]"
          >
            <UserPlus className="w-4 h-4" />
            <span>ADD EMPLOYEE</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">

        <div
          className={`p-5 sm:p-6 border border-[#D4AF37]/25 relative transition-all ${
            isDark ? 'bg-black' : 'bg-white'
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37]">
            TOTAL IDENTITIES
          </div>

          <div className="font-serif-display text-3xl sm:text-4xl font-light mt-2">
            {users.length}
          </div>

          <div className="text-[11px] font-mono text-gray-400 mt-1">
            Governed in directory
          </div>
        </div>

        <div
          className={`p-5 sm:p-6 border border-[#D4AF37]/25 relative transition-all ${
            isDark ? 'bg-black' : 'bg-white'
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-400">
            ACTIVE SESSIONS
          </div>

          <div className="font-serif-display text-3xl sm:text-4xl font-light mt-2 text-emerald-400">
            {activeUsers}
          </div>

          <div className="text-[11px] font-mono text-gray-400 mt-1">
            Continuous verification
          </div>
        </div>

        <div
          className={`p-5 sm:p-6 border border-[#D4AF37]/25 relative transition-all ${
            isDark ? 'bg-black' : 'bg-white'
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37]">
            RISK WATCHLIST
          </div>

          <div className="font-serif-display text-3xl sm:text-4xl font-light mt-2 text-[#D4AF37]">
            {watchlistUsers}
          </div>

          <div className="text-[11px] font-mono text-gray-400 mt-1">
            Score &ge; 60 threshold
          </div>
        </div>

        <div
          className={`p-5 sm:p-6 border border-[#D4AF37]/25 relative transition-all ${
            isDark ? 'bg-black' : 'bg-white'
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-red-400">
            FROZEN ACCOUNTS
          </div>

          <div className="font-serif-display text-3xl sm:text-4xl font-light mt-2 text-red-400">
            {frozenUsers}
          </div>

          <div className="text-[11px] font-mono text-gray-400 mt-1">
            Policy containment active
          </div>
        </div>

      </div>

      <div
        className={`p-4 border border-[#D4AF37]/20 flex flex-col sm:flex-row gap-4 items-center justify-between ${
          isDark ? 'bg-[#0A0C10]' : 'bg-white'
        }`}
      >
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee, email, or ID..."
            className={`w-full border text-xs pl-9 pr-3 py-2 outline-none font-mono transition-all ${
              isDark
                ? 'bg-black border-[#D4AF37]/30 text-white focus:border-[#D4AF37]'
                : 'bg-[#F9F9F7] border-gray-300 text-black focus:border-[#D4AF37]'
            }`}
          />

          <Search className="w-3.5 h-3.5 text-[#D4AF37] absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto text-xs font-mono">
          <span className="text-gray-400">
            DEPARTMENT:
          </span>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className={`border text-xs px-3 py-1.5 outline-none font-mono cursor-pointer ${
              isDark
                ? 'bg-black border-[#D4AF37]/30 text-white'
                : 'bg-white border-gray-300 text-black'
            }`}
          >
            <option value="ALL">
              All Departments
            </option>

            {departments.map((department) => (
              <option
                key={department}
                value={department}
              >
                {department}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className={`border border-[#D4AF37]/25 overflow-hidden ${
          isDark ? 'bg-black' : 'bg-white'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`border-b border-[#D4AF37]/25 font-mono text-[10px] uppercase tracking-[0.15em] ${
                isDark
                  ? 'bg-[#0A0C10] text-[#D4AF37]'
                  : 'bg-[#F9F9F7] text-[#B8860B]'
              }`}
            >
              <tr>
                <th className="py-3.5 px-4">
                  EMPLOYEE ID
                </th>

                <th className="py-3.5 px-4">
                  NAME
                </th>

                <th className="py-3.5 px-4">
                  EMAIL
                </th>

                <th className="py-3.5 px-4">
                  DEPARTMENT
                </th>

                <th className="py-3.5 px-4">
                  ROLE
                </th>

                <th className="py-3.5 px-4">
                  STATUS
                </th>

                <th className="py-3.5 px-4 text-right">
                  ACTIONS
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#D4AF37]/15 font-mono">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-[#D4AF37]/5 transition-colors duration-150 group"
                  >
                    <td className="py-3.5 px-4 text-[#D4AF37] font-semibold">
                      {user.employeeId}
                    </td>

                    <td className="py-3.5 px-4 font-sans font-medium text-current text-sm">
                      {user.name}
                    </td>

                    <td className="py-3.5 px-4 text-gray-400 text-[11px]">
                      {user.email}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-[11px] font-semibold text-current">
                        {user.department}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-[10px] px-2 py-0.5 border border-[#D4AF37]/30 text-[#D4AF37]">
                        {user.role?.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] px-2 py-0.5 border font-semibold ${
                          user.status === 'FROZEN'
                            ? 'border-red-500 text-red-400 bg-red-500/10'
                            : 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="px-2.5 py-1 border border-[#D4AF37]/30 hover:border-[#D4AF37] text-[10px] text-[#D4AF37] transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>UPDATE</span>
                        </button>

                        <button
                          onClick={() =>
                            setConfirmDeleteUser(user)
                          }
                          className="px-2.5 py-1 border border-red-500/30 hover:border-red-500 text-[10px] text-red-400 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>DELETE</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-xs font-mono text-gray-500"
                  >
                    No employees match your search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div
            className={`w-full max-w-lg border border-[#D4AF37]/40 p-8 shadow-2xl relative ${
              isDark
                ? 'bg-black text-white'
                : 'bg-white text-black'
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#D4AF37]/20 mb-6">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37]">
                NEW IDENTITY REGISTRATION
              </span>

              <button
                onClick={() => setIsAddModalOpen(false)}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-white cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h2 className="font-serif-display text-3xl font-light mb-6">
              Add Employee
            </h2>

            <form
              onSubmit={handleSubmitAdd}
              className="space-y-4 text-xs font-mono"
            >
              <div>
                <label className="block text-gray-400 uppercase text-[10px] mb-1">
                  Full Name
                </label>

                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value
                    })
                  }
                  placeholder="Employee Name"
                  className="w-full border border-[#D4AF37]/30 bg-transparent px-3 py-2 text-current outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-gray-400 uppercase text-[10px] mb-1">
                  Corporate Email
                </label>

                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: e.target.value
                    })
                  }
                  placeholder="Employee Mail-Id"
                  className="w-full border border-[#D4AF37]/30 bg-transparent px-3 py-2 text-current outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Employee ID
                  </label>

                  <input
                    type="text"
                    required
                    value={formData.employeeId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        employeeId: e.target.value
                      })
                    }
                    className="w-full border border-[#D4AF37]/30 bg-transparent px-3 py-2 text-current outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Status
                  </label>

                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value
                      })
                    }
                    className={`w-full border border-[#D4AF37]/30 px-3 py-2 outline-none cursor-pointer ${
                      isDark
                        ? 'bg-black text-white'
                        : 'bg-white text-black'
                    }`}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="RESTRICTED">RESTRICTED</option>
                    <option value="FROZEN">FROZEN</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Assign Department
                  </label>

                  <select
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        department: e.target.value
                      })
                    }
                    className={`w-full border border-[#D4AF37]/30 px-3 py-2 outline-none cursor-pointer ${
                      isDark
                        ? 'bg-black text-white'
                        : 'bg-white text-black'
                    }`}
                  >
                    {departments.map((department) => (
                      <option
                        key={department}
                        value={department}
                      >
                        {department}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Assign Role
                  </label>

                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value
                      })
                    }
                    className={`w-full border border-[#D4AF37]/30 px-3 py-2 outline-none cursor-pointer ${
                      isDark
                        ? 'bg-black text-white'
                        : 'bg-white text-black'
                    }`}
                  >
                    {roles.map((role) => (
                      <option
                        key={role}
                        value={role}
                      >
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-[#D4AF37]/20 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setIsAddModalOpen(false)
                  }
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-500 text-gray-400 hover:text-white cursor-pointer disabled:opacity-50"
                >
                  CANCEL
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 border border-[#D4AF37] bg-[#D4AF37] text-black font-semibold hover:bg-transparent hover:text-[#D4AF37] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'ADDING...'
                    : 'CONFIRM ADD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div
            className={`w-full max-w-lg border border-[#D4AF37]/40 p-8 shadow-2xl relative ${
              isDark
                ? 'bg-black text-white'
                : 'bg-white text-black'
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#D4AF37]/20 mb-6">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37]">
                IDENTITY MODIFICATION
              </span>

              <button
                onClick={() => setEditingUser(null)}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-white cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h2 className="font-serif-display text-3xl font-light mb-6">
              Update Employee
            </h2>

            <form
              onSubmit={handleSubmitEdit}
              className="space-y-4 text-xs font-mono"
            >
              <div>
                <label className="block text-gray-400 uppercase text-[10px] mb-1">
                  Full Name
                </label>

                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value
                    })
                  }
                  className="w-full border border-[#D4AF37]/30 bg-transparent px-3 py-2 text-current outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-gray-400 uppercase text-[10px] mb-1">
                  Corporate Email
                </label>

                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: e.target.value
                    })
                  }
                  className="w-full border border-[#D4AF37]/30 bg-transparent px-3 py-2 text-current outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Assign Department
                  </label>

                  <select
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        department: e.target.value
                      })
                    }
                    className={`w-full border border-[#D4AF37]/30 px-3 py-2 outline-none cursor-pointer ${
                      isDark
                        ? 'bg-black text-white'
                        : 'bg-white text-black'
                    }`}
                  >
                    {departments.map((department) => (
                      <option
                        key={department}
                        value={department}
                      >
                        {department}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Assign Role
                  </label>

                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value
                      })
                    }
                    className={`w-full border border-[#D4AF37]/30 px-3 py-2 outline-none cursor-pointer ${
                      isDark
                        ? 'bg-black text-white'
                        : 'bg-white text-black'
                    }`}
                  >
                    {roles.map((role) => (
                      <option
                        key={role}
                        value={role}
                      >
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 uppercase text-[10px] mb-1">
                  Status
                </label>

                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value
                    })
                  }
                  className={`w-full border border-[#D4AF37]/30 px-3 py-2 outline-none cursor-pointer ${
                    isDark
                      ? 'bg-black text-white'
                      : 'bg-white text-black'
                  }`}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="RESTRICTED">RESTRICTED</option>
                  <option value="FROZEN">FROZEN</option>
                </select>
              </div>

              <div className="pt-4 border-t border-[#D4AF37]/20 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-500 text-gray-400 hover:text-white cursor-pointer disabled:opacity-50"
                >
                  CANCEL
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 border border-[#D4AF37] bg-[#D4AF37] text-black font-semibold hover:bg-transparent hover:text-[#D4AF37] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'SAVING...'
                    : 'SAVE CHANGES'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDeleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div
            className={`w-full max-w-md border border-red-500/40 p-8 shadow-2xl relative ${
              isDark
                ? 'bg-black text-white'
                : 'bg-white text-black'
            }`}
          >
            <div className="flex items-center gap-3 text-red-400 mb-4">
              <AlertTriangle className="w-6 h-6" />

              <span className="font-mono text-xs uppercase tracking-widest font-bold">
                CONFIRM DELETION
              </span>
            </div>

            <h3 className="font-serif-display text-2xl font-light mb-2">
              Remove {confirmDeleteUser.name}?
            </h3>

            <p className="text-xs font-sans text-gray-400 leading-relaxed mb-6">
              This action will permanently purge identity record{' '}
              <strong className="text-white font-mono">
                {confirmDeleteUser.employeeId}
              </strong>{' '}
              and revoke all associated Zero Trust cryptographic credentials.
            </p>

            <div className="flex justify-end gap-3 font-mono text-xs">
              <button
                onClick={() =>
                  setConfirmDeleteUser(null)
                }
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-500 text-gray-400 hover:text-white cursor-pointer disabled:opacity-50"
              >
                CANCEL
              </button>

              <button
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-5 py-2 border border-red-500 bg-red-500 text-white font-semibold hover:bg-transparent hover:text-red-400 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting
                  ? 'DELETING...'
                  : 'DELETE IDENTITY'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
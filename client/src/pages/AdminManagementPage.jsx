import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Edit3,
  KeyRound,
  Plus,
  Shield,
  Trash2,
  UserPlus,
  X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const DEPARTMENTS = [
  'HR',
  'FINANCE',
  'ENGINEERING',
  'SALES',
  'LEGAL',
  'EXECUTIVE',
  'SECURITY',
  'IT'
];

const ROLES = [
  'SECURITY_ADMIN',
  'SYSTEM_ADMIN'
];

const INITIAL_FORM = {
  name: '',
  email: '',
  password: '',
  department: 'ENGINEERING',
  role: 'SECURITY_ADMIN',
  status: 'ACTIVE'
};

const getToken = () =>
  localStorage.getItem('zero_trust_token');

const getErrorMessage = (data, fallback) =>
  data?.error?.message ||
  data?.message ||
  fallback;

const normalizeAdmin = (admin) => ({
  ...admin,
  department:
    admin.department ||
    admin.departmentCode ||
    'ENGINEERING',
  role:
    admin.role ||
    admin.roleCode ||
    'SECURITY_ADMIN',
  status:
    admin.status || 'ACTIVE'
});

const StatusBadge = ({ status, isDark }) => {
  const active = status === 'ACTIVE';

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-1
        border
        text-[9px]
        font-mono
        uppercase
        tracking-wider
        ${
          active
            ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
            : isDark
              ? 'border-red-500/30 text-red-400 bg-red-500/5'
              : 'border-red-500/30 text-red-500 bg-red-500/5'
        }
      `}
    >
      <span
        className={`
          w-1.5 h-1.5 rounded-full
          ${active ? 'bg-emerald-400' : 'bg-red-400'}
        `}
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
};

const RoleBadge = ({ role }) => {
  const label =
    role === 'SYSTEM_ADMIN'
      ? 'System Admin'
      : 'Security Admin';

  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#D4AF37] uppercase tracking-wider">
      <Shield className="w-3 h-3" />
      {label}
    </span>
  );
};

const Panel = ({ children, className = '', isDark }) => (
  <div
    className={`
      border
      ${
        isDark
          ? 'bg-[#0B0B0B] border-white/10'
          : 'bg-white border-black/10'
      }
      ${className}
    `}
  >
    {children}
  </div>
);

export const AdminManagementPage = ({
  currentUser,
  onBack
}) => {
  const { isDark } = useTheme();

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);

  const [form, setForm] = useState(INITIAL_FORM);

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  const isMainAdmin =
    Boolean(currentUser?.isMainAdmin);

  const adminCount = admins.length;

  const activeCount = useMemo(
    () =>
      admins.filter(
        (admin) =>
          admin.status === 'ACTIVE'
      ).length,
    [admins]
  );

  const inactiveCount = useMemo(
    () =>
      admins.filter(
        (admin) =>
          admin.status !== 'ACTIVE'
      ).length,
    [admins]
  );

  const loadAdmins = async () => {
    const token = getToken();

    if (!token) {
      setError(
        'Authentication token not found.'
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        '/api/admins',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            'Unable to load administrators.'
          )
        );
      }

      setAdmins(
        (data.admins || [])
          .map(normalizeAdmin)
      );
    } catch (err) {
      setError(
        err.message ||
        'Unable to load administrators.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const openCreateForm = () => {
    setEditingAdmin(null);
    setForm(INITIAL_FORM);
    setError('');
    setSuccess('');
    setShowForm(true);
  };

  const openEditForm = (admin) => {
    setEditingAdmin(admin);

    setForm({
      name: admin.name || '',
      email: admin.email || '',
      password: '',
      department:
        admin.department ||
        admin.departmentCode ||
        'ENGINEERING',
      role:
        admin.role ||
        admin.roleCode ||
        'SECURITY_ADMIN',
      status:
        admin.status || 'ACTIVE'
    });

    setError('');
    setSuccess('');
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingAdmin(null);
    setForm(INITIAL_FORM);
  };

  const handleChange = (
    event
  ) => {
    const {
      name,
      value
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      setError(
        'Authentication token not found.'
      );
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        departmentCode:
          form.department,
        roleCode:
          form.role,
        status:
          form.status
      };

      if (!editingAdmin) {
        payload.password =
          form.password;
      } else if (
        form.password.trim()
      ) {
        payload.password =
          form.password;
      }

      const url = editingAdmin
        ? `/api/admins/${editingAdmin.id}`
        : '/api/admins';

      const method = editingAdmin
        ? 'PATCH'
        : 'POST';

      const response =
        await fetch(url, {
          method,
          headers: {
            'Content-Type':
              'application/json',
            Authorization:
              `Bearer ${token}`
          },
          body:
            JSON.stringify(payload)
        });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            editingAdmin
              ? 'Unable to update administrator.'
              : 'Unable to create administrator.'
          )
        );
      }

      const savedAdmin =
        normalizeAdmin(
          data.admin
        );

      setAdmins((previous) => {
        if (!editingAdmin) {
          return [
            savedAdmin,
            ...previous
          ];
        }

        return previous.map(
          (admin) =>
            admin.id ===
            savedAdmin.id
              ? savedAdmin
              : admin
        );
      });

      setSuccess(
        editingAdmin
          ? 'Administrator updated successfully.'
          : 'Administrator created successfully.'
      );

      setForm(INITIAL_FORM);
      setEditingAdmin(null);
      setShowForm(false);
    } catch (err) {
      setError(
        err.message ||
        'Unable to save administrator.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    const token = getToken();

    if (!token) {
      setError(
        'Authentication token not found.'
      );
      return;
    }

    try {
      setError('');
      setSuccess('');

      const response =
        await fetch(
          `/api/admins/${deleteTarget.id}`,
          {
            method: 'DELETE',
            headers: {
              Authorization:
                `Bearer ${token}`
            }
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            'Unable to delete administrator.'
          )
        );
      }

      setAdmins(
        (previous) =>
          previous.filter(
            (admin) =>
              admin.id !==
              deleteTarget.id
          )
      );

      setDeleteTarget(null);

      setSuccess(
        'Administrator deleted successfully.'
      );
    } catch (err) {
      setError(
        err.message ||
        'Unable to delete administrator.'
      );
    }
  };

  const canManageAdmin =
    isMainAdmin;

  return (
    <div
      className={`
        min-h-full
        pb-10
        ${
          isDark
            ? 'text-white'
            : 'text-[#111111]'
        }
      `}
    >
      <section
        className={`
          relative
          overflow-hidden
          border
          p-6 sm:p-8 lg:p-10
          ${
            isDark
              ? 'bg-[#0B0B0B] border-white/10'
              : 'bg-[#F7F4EC] border-black/10'
          }
        `}
      >
        <div className="absolute right-0 top-0 w-40 h-40 border-l border-b border-[#D4AF37]/20 pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div>
            <button
              onClick={onBack}
              className={`
                inline-flex items-center gap-2
                mb-6
                text-[9px]
                font-mono
                uppercase
                tracking-[0.15em]
                text-gray-500
                hover:text-[#D4AF37]
                transition-colors
              `}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Security Operations
            </button>

            <div className="flex items-center gap-3 mb-4">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />

              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#D4AF37]">
                Identity Administration
              </span>
            </div>

            <h1 className="font-serif-display text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-[0.95]">
              Admin
              <span className="block italic text-[#D4AF37]">
                Management
              </span>
            </h1>

            <p
              className={`
                mt-6
                max-w-2xl
                text-sm
                leading-7
                ${
                  isDark
                    ? 'text-gray-400'
                    : 'text-gray-600'
                }
              `}
            >
              Manage administrator accounts,
              authentication credentials,
              roles and account access.
            </p>
          </div>

          {canManageAdmin && (
            <button
              onClick={openCreateForm}
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                px-5 py-3
                bg-[#D4AF37]
                border border-[#D4AF37]
                text-black
                text-[10px]
                font-mono
                font-semibold
                uppercase
                tracking-[0.12em]
                transition-all duration-300
                hover:bg-transparent
                hover:text-[#D4AF37]
              "
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Administrator
            </button>
          )}
        </div>
      </section>

      {error && (
        <div className="mt-5 border border-red-500/30 bg-red-500/5 px-5 py-4 text-xs text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-5 border border-emerald-500/30 bg-emerald-500/5 px-5 py-4 text-xs text-emerald-400">
          {success}
        </div>
      )}

      <section className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Panel
          isDark={isDark}
          className="p-5"
        >
          <span className="block text-[9px] font-mono uppercase tracking-[0.18em] text-gray-500">
            Total Administrators
          </span>

          <span className="block mt-4 font-serif-display text-3xl text-[#D4AF37]">
            {adminCount}
          </span>
        </Panel>

        <Panel
          isDark={isDark}
          className="p-5"
        >
          <span className="block text-[9px] font-mono uppercase tracking-[0.18em] text-gray-500">
            Active
          </span>

          <span className="block mt-4 font-serif-display text-3xl text-emerald-400">
            {activeCount}
          </span>
        </Panel>

        <Panel
          isDark={isDark}
          className="p-5"
        >
          <span className="block text-[9px] font-mono uppercase tracking-[0.18em] text-gray-500">
            Inactive
          </span>

          <span className="block mt-4 font-serif-display text-3xl text-red-400">
            {inactiveCount}
          </span>
        </Panel>
      </section>

      <section className="mt-5">
        <Panel
          isDark={isDark}
          className="overflow-hidden"
        >
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="block text-[9px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] mb-2">
                  Administrator Directory
                </span>

                <h2 className="font-serif-display text-2xl sm:text-3xl font-light">
                  Administrator Accounts
                </h2>

                <p className="mt-2 text-xs text-gray-500">
                  Only security and system administrator
                  accounts are shown here.
                </p>
              </div>

              <div className="text-right">
                <span className="block text-[9px] font-mono uppercase text-gray-500">
                  Accounts
                </span>

                <span className="font-serif-display text-2xl">
                  {adminCount}
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="px-6 sm:px-8 pb-8">
              <div className="min-h-[180px] flex items-center justify-center border border-dashed border-white/10">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                  Loading administrators...
                </span>
              </div>
            </div>
          ) : admins.length === 0 ? (
            <div className="px-6 sm:px-8 pb-8">
              <div
                className={`
                  min-h-[180px]
                  flex items-center justify-center
                  border border-dashed
                  ${
                    isDark
                      ? 'border-white/10'
                      : 'border-black/10'
                  }
                `}
              >
                <div className="text-center">
                  <Shield className="w-6 h-6 mx-auto text-gray-500" />

                  <div className="mt-3 text-[10px] font-mono uppercase tracking-wider text-gray-500">
                    No administrators found
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left">
                <thead>
                  <tr
                    className={`
                      border-y
                      text-[9px]
                      font-mono
                      uppercase
                      tracking-[0.15em]
                      ${
                        isDark
                          ? 'border-white/10 text-gray-500'
                          : 'border-black/10 text-gray-500'
                      }
                    `}
                  >
                    <th className="px-6 py-4">
                      Administrator
                    </th>

                    <th className="px-4 py-4">
                      Department
                    </th>

                    <th className="px-4 py-4">
                      Role
                    </th>

                    <th className="px-4 py-4">
                      Status
                    </th>

                    <th className="px-4 py-4">
                      Access
                    </th>

                    <th className="px-6 py-4 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {admins.map(
                    (admin) => {
                      const initials =
                        admin.name
                          ?.split(' ')
                          .map(
                            (part) =>
                              part[0]
                          )
                          .join('')
                          .slice(0, 2)
                          .toUpperCase() ||
                        'AD';

                      const isMain =
                        Boolean(
                          admin.isMainAdmin
                        );

                      return (
                        <tr
                          key={admin.id}
                          className={`
                            border-b
                            transition-colors
                            ${
                              isDark
                                ? 'border-white/5 hover:bg-white/[0.025]'
                                : 'border-black/5 hover:bg-[#F7F4EC]/60'
                            }
                          `}
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="
                                w-10 h-10
                                flex items-center justify-center
                                border border-[#D4AF37]/40
                                bg-[#D4AF37]/5
                                text-[#D4AF37]
                                text-[10px]
                                font-mono
                                font-bold
                              ">
                                {initials}
                              </div>

                              <div>
                                <div className="text-sm font-medium">
                                  {admin.name}
                                </div>

                                <div className="mt-1 text-[10px] font-mono text-gray-500">
                                  {admin.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-5">
                            <span className="text-xs text-gray-400">
                              {admin.department}
                            </span>
                          </td>

                          <td className="px-4 py-5">
                            <RoleBadge
                              role={
                                admin.role
                              }
                            />
                          </td>

                          <td className="px-4 py-5">
                            <StatusBadge
                              status={
                                admin.status
                              }
                              isDark={
                                isDark
                              }
                            />
                          </td>

                          <td className="px-4 py-5">
                            {isMain ? (
                              <span className="inline-flex px-2.5 py-1 border border-[#D4AF37]/30 bg-[#D4AF37]/5 text-[#D4AF37] text-[9px] font-mono uppercase tracking-wider">
                                Main Admin
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono uppercase tracking-wider text-gray-500">
                                Administrator
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-5">
                            <div className="flex items-center justify-end gap-2">
                              {canManageAdmin &&
                                !isMain && (
                                  <>
                                    <button
                                      onClick={() =>
                                        openEditForm(
                                          admin
                                        )
                                      }
                                      className={`
                                        w-9 h-9
                                        flex items-center justify-center
                                        border
                                        text-gray-400
                                        hover:text-[#D4AF37]
                                        hover:border-[#D4AF37]/40
                                        transition-colors
                                        ${
                                          isDark
                                            ? 'border-white/10'
                                            : 'border-black/10'
                                        }
                                      `}
                                      title="Edit administrator"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={() =>
                                        setDeleteTarget(
                                          admin
                                        )
                                      }
                                      className="
                                        w-9 h-9
                                        flex items-center justify-center
                                        border border-red-500/20
                                        text-red-400
                                        hover:bg-red-500/5
                                        transition-colors
                                      "
                                      title="Delete administrator"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}

                              {canManageAdmin &&
                                isMain && (
                                  <span className="text-[9px] font-mono uppercase tracking-wider text-gray-600">
                                    Protected
                                  </span>
                                )}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeForm}
          />

          <div
            className={`
              relative
              w-full
              max-w-2xl
              max-h-[90vh]
              overflow-y-auto
              border
              ${
                isDark
                  ? 'bg-[#0B0B0B] border-white/10'
                  : 'bg-white border-black/10'
              }
            `}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <div>
                <span className="block text-[9px] font-mono uppercase tracking-[0.2em] text-[#D4AF37]">
                  {editingAdmin
                    ? 'Administrator Update'
                    : 'Administrator Provisioning'}
                </span>

                <h3 className="mt-1 font-serif-display text-2xl font-light">
                  {editingAdmin
                    ? 'Edit Administrator'
                    : 'Add Administrator'}
                </h3>
              </div>

              <button
                onClick={closeForm}
                className="w-9 h-9 flex items-center justify-center border border-white/10 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-5"
            >
              <div>
                <label className="block mb-2 text-[9px] font-mono uppercase tracking-wider text-gray-500">
                  Full Name
                </label>

                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={
                    handleChange
                  }
                  required
                  className={`
                    w-full
                    px-4 py-3
                    border
                    outline-none
                    text-sm
                    ${
                      isDark
                        ? 'bg-white/[0.02] border-white/10 text-white focus:border-[#D4AF37]/50'
                        : 'bg-white border-black/10 text-[#111111] focus:border-[#D4AF37]/60'
                    }
                  `}
                  placeholder="Administrator name"
                />
              </div>

              <div>
                <label className="block mb-2 text-[9px] font-mono uppercase tracking-wider text-gray-500">
                  Corporate Email
                </label>

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={
                    handleChange
                  }
                  required
                  className={`
                    w-full
                    px-4 py-3
                    border
                    outline-none
                    text-sm
                    ${
                      isDark
                        ? 'bg-white/[0.02] border-white/10 text-white focus:border-[#D4AF37]/50'
                        : 'bg-white border-black/10 text-[#111111] focus:border-[#D4AF37]/60'
                    }
                  `}
                  placeholder="admin@company.com"
                />
              </div>

              <div>
                <label className="block mb-2 text-[9px] font-mono uppercase tracking-wider text-gray-500">
                  {editingAdmin
                    ? 'New Password'
                    : 'Password'}
                </label>

                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />

                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={
                      handleChange
                    }
                    required={
                      !editingAdmin
                    }
                    minLength={8}
                    className={`
                      w-full
                      pl-11 pr-4 py-3
                      border
                      outline-none
                      text-sm
                      ${
                        isDark
                          ? 'bg-white/[0.02] border-white/10 text-white focus:border-[#D4AF37]/50'
                          : 'bg-white border-black/10 text-[#111111] focus:border-[#D4AF37]/60'
                      }
                    `}
                    placeholder={
                      editingAdmin
                        ? 'Leave blank to keep current password'
                        : 'Minimum 8 characters'
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block mb-2 text-[9px] font-mono uppercase tracking-wider text-gray-500">
                    Department
                  </label>

                  <select
                    name="department"
                    value={
                      form.department
                    }
                    onChange={
                      handleChange
                    }
                    className={`
                      w-full
                      px-4 py-3
                      border
                      outline-none
                      text-sm
                      ${
                        isDark
                          ? 'bg-[#0B0B0B] border-white/10 text-white'
                          : 'bg-white border-black/10 text-[#111111]'
                      }
                    `}
                  >
                    {DEPARTMENTS.map(
                      (department) => (
                        <option
                          key={
                            department
                          }
                          value={
                            department
                          }
                        >
                          {department}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-[9px] font-mono uppercase tracking-wider text-gray-500">
                    Role
                  </label>

                  <select
                    name="role"
                    value={form.role}
                    onChange={
                      handleChange
                    }
                    className={`
                      w-full
                      px-4 py-3
                      border
                      outline-none
                      text-sm
                      ${
                        isDark
                          ? 'bg-[#0B0B0B] border-white/10 text-white'
                          : 'bg-white border-black/10 text-[#111111]'
                      }
                    `}
                  >
                    {ROLES.map(
                      (role) => (
                        <option
                          key={role}
                          value={role}
                        >
                          {role ===
                          'SYSTEM_ADMIN'
                            ? 'System Admin'
                            : 'Security Admin'}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-[9px] font-mono uppercase tracking-wider text-gray-500">
                    Status
                  </label>

                  <select
                    name="status"
                    value={
                      form.status
                    }
                    onChange={
                      handleChange
                    }
                    disabled={
                      Boolean(
                        editingAdmin?.isMainAdmin
                      )
                    }
                    className={`
                      w-full
                      px-4 py-3
                      border
                      outline-none
                      text-sm
                      disabled:opacity-50
                      ${
                        isDark
                          ? 'bg-[#0B0B0B] border-white/10 text-white'
                          : 'bg-white border-black/10 text-[#111111]'
                      }
                    `}
                  >
                    <option value="ACTIVE">
                      Active
                    </option>
                    <option value="DISABLED">
                      Inactive
                    </option>
                  </select>
                </div>
              </div>

              <div
                className={`
                  border
                  p-4
                  ${
                    isDark
                      ? 'border-white/10 bg-white/[0.02]'
                      : 'border-black/10 bg-[#F7F4EC]'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <Shield className="w-4 h-4 text-[#D4AF37] mt-0.5" />

                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#D4AF37]">
                      Authentication
                    </div>

                    <p className="mt-1 text-[10px] leading-relaxed text-gray-500">
                      The password is hashed by the
                      backend before storage. The
                      administrator will use this
                      email and password for website
                      authentication followed by MFA.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className={`
                    px-5 py-3
                    border
                    text-[10px]
                    font-mono
                    uppercase
                    tracking-wider
                    text-gray-500
                    hover:text-white
                    transition-colors
                    ${
                      isDark
                        ? 'border-white/10'
                        : 'border-black/10'
                    }
                  `}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="
                    inline-flex
                    items-center
                    gap-2
                    px-5 py-3
                    bg-[#D4AF37]
                    border border-[#D4AF37]
                    text-black
                    text-[10px]
                    font-mono
                    font-semibold
                    uppercase
                    tracking-wider
                    disabled:opacity-50
                  "
                >
                  <Plus className="w-3.5 h-3.5" />

                  {saving
                    ? 'Saving...'
                    : editingAdmin
                      ? 'Update Administrator'
                      : 'Create Administrator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() =>
              setDeleteTarget(null)
            }
          />

          <div
            className={`
              relative
              w-full
              max-w-md
              border
              p-6
              ${
                isDark
                  ? 'bg-[#0B0B0B] border-white/10'
                  : 'bg-white border-black/10'
              }
            `}
          >
            <div className="w-10 h-10 flex items-center justify-center border border-red-500/30 bg-red-500/5 text-red-400">
              <Trash2 className="w-4 h-4" />
            </div>

            <h3 className="mt-5 font-serif-display text-2xl font-light">
              Delete Administrator
            </h3>

            <p className="mt-3 text-xs leading-relaxed text-gray-500">
              Are you sure you want to permanently
              delete{' '}
              <span className="text-white">
                {deleteTarget.name}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() =>
                  setDeleteTarget(null)
                }
                className="
                  px-5 py-3
                  border border-white/10
                  text-[10px]
                  font-mono
                  uppercase
                  tracking-wider
                  text-gray-500
                "
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                className="
                  px-5 py-3
                  bg-red-500
                  border border-red-500
                  text-white
                  text-[10px]
                  font-mono
                  font-semibold
                  uppercase
                  tracking-wider
                "
              >
                Delete Administrator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
import React, { useState, useEffect, useMemo } from 'react';
import {
  Tags,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  Edit2,
  Trash2,
  Power,
  ArrowUpDown,
  Sparkles,
  Music,
  Mic,
  Trophy,
  Wrench,
  Drama,
  Palette,
  PartyPopper,
  Presentation,
  Gamepad2,
  Film,
  Compass,
  Heart,
  Camera,
  Flame,
  Bike,
  Coffee,
  Tent,
  Layers,
  AlertCircle,
  HelpCircle,
  CalendarDays,
  CheckCircle2,
} from 'lucide-react';
import {
  getAdminEventCategories,
  createAdminEventCategory,
  updateAdminEventCategory,
  deleteAdminEventCategory,
} from '@/api/admin.api';
import {
  EventCategoryRecord,
  EventCategoryCreateInput,
  EventCategoryUpdateInput,
} from '@/types/event.types';

// Map icon string name to Lucide Icon component
export const ICON_MAP: Record<string, React.ElementType> = {
  Sparkles,
  Music,
  Mic,
  Trophy,
  Wrench,
  Drama,
  Palette,
  PartyPopper,
  Presentation,
  Gamepad2,
  Film,
  Compass,
  Heart,
  Camera,
  Flame,
  Bike,
  Coffee,
  Tent,
  Layers,
};

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

interface EventCategoriesTabProps {
  onCategoryCountChange?: (count: number) => void;
}

export default function EventCategoriesTab({ onCategoryCountChange }: EventCategoriesTabProps) {
  const [categories, setCategories] = useState<EventCategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EventCategoryRecord | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<EventCategoryRecord | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [formData, setFormData] = useState<EventCategoryCreateInput>({
    name: '',
    slug: '',
    icon: 'Sparkles',
    description: '',
    is_active: true,
    display_order: 10,
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchCategories = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await getAdminEventCategories();
      setCategories(res.categories || []);
      if (onCategoryCountChange) {
        onCategoryCountChange(res.categories?.length || 0);
      }
    } catch (err: any) {
      console.error('Failed to fetch event categories:', err);
      showToast(err.response?.data?.message || 'Failed to load categories', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchesSearch =
        search.trim() === '' ||
        cat.name.toLowerCase().includes(search.toLowerCase()) ||
        cat.slug.toLowerCase().includes(search.toLowerCase()) ||
        (cat.description && cat.description.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && cat.is_active) ||
        (statusFilter === 'INACTIVE' && !cat.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [categories, search, statusFilter]);

  // Statistics
  const totalCount = categories.length;
  const activeCount = categories.filter((c) => c.is_active).length;
  const inactiveCount = totalCount - activeCount;
  const totalEventsLinked = categories.reduce((sum, c) => sum + (c.event_count || 0), 0);

  // Slug auto-generation helper
  const handleNameChange = (name: string, isCreate: boolean) => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-');

    if (isCreate) {
      setFormData((prev) => ({
        ...prev,
        name,
        slug: prev.slug === '' || prev.slug === slug.slice(0, -1) ? slug : prev.slug,
      }));
    } else {
      setFormData((prev) => ({ ...prev, name }));
    }
  };

  const openCreateModal = () => {
    const nextOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.display_order)) + 1 : 1;
    setFormData({
      name: '',
      slug: '',
      icon: 'Sparkles',
      description: '',
      is_active: true,
      display_order: nextOrder,
    });
    setCreateModalOpen(true);
  };

  const openEditModal = (cat: EventCategoryRecord) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon || 'Sparkles',
      description: cat.description || '',
      is_active: cat.is_active,
      display_order: cat.display_order,
    });
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Category name is required', 'error');
      return;
    }

    setActionLoading(true);
    try {
      if (editingCategory) {
        await updateAdminEventCategory(editingCategory.id, formData);
        showToast(`Category "${formData.name}" updated successfully!`);
        setEditingCategory(null);
      } else {
        await createAdminEventCategory(formData);
        showToast(`Category "${formData.name}" created successfully!`);
        setCreateModalOpen(false);
      }
      await fetchCategories();
    } catch (err: any) {
      showToast(err.response?.data?.detail || err.response?.data?.message || 'Failed to save category', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (cat: EventCategoryRecord) => {
    setActionLoading(true);
    try {
      await updateAdminEventCategory(cat.id, { is_active: !cat.is_active });
      showToast(`Category "${cat.name}" is now ${!cat.is_active ? 'Active' : 'Inactive'}`);
      await fetchCategories();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return;
    setActionLoading(true);
    try {
      const res = await deleteAdminEventCategory(deletingCategory.id);
      showToast(res.message || 'Category action completed');
      setDeletingCategory(null);
      await fetchCategories();
    } catch (err: any) {
      showToast(err.response?.data?.detail || err.response?.data?.message || 'Failed to delete category', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const renderIcon = (iconName?: string, className = 'h-5 w-5') => {
    const IconComp = (iconName && ICON_MAP[iconName]) || Sparkles;
    return <IconComp className={className} />;
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600">
              <Tags className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                Event Categories Governance
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Super Admin control over event discovery taxonomy, dynamic slugs, icons, and display priorities.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchCategories(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-orange-600/30 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Category</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
          <span className="text-xs font-medium text-gray-500">Total Categories</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">{totalCount}</span>
            <span className="text-xs text-gray-400 font-mono">Taxonomy</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-2xs bg-emerald-50/20">
          <span className="text-xs font-medium text-emerald-800">Active in Discovery</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-700">{activeCount}</span>
            <span className="text-xs text-emerald-600 font-medium">Visible to Users</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs bg-gray-50/50">
          <span className="text-xs font-medium text-gray-600">Inactive / Archived</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-700">{inactiveCount}</span>
            <span className="text-xs text-gray-500">Hidden from portal</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-2xs bg-blue-50/20">
          <span className="text-xs font-medium text-blue-800">Linked Live Events</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-blue-700">{totalEventsLinked}</span>
            <span className="text-xs text-blue-600 font-medium">Events Published</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories by name, slug..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-gray-400" />
          <div className="flex bg-gray-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({categories.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                statusFilter === 'INACTIVE'
                  ? 'bg-white text-gray-800 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Inactive ({inactiveCount})
            </button>
          </div>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="h-8 w-8 text-orange-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">Loading event categories...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">No categories found</p>
            <p className="text-xs text-gray-400 mt-1">
              {search ? 'Try adjusting your search query' : 'Create your first dynamic event category'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-100 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-16 text-center">Order</th>
                  <th className="py-3.5 px-4">Category Name & Slug</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Events Linked</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredCategories.map((cat) => (
                  <tr
                    key={cat.id}
                    className={`hover:bg-gray-50/70 transition-colors ${
                      !cat.is_active ? 'bg-gray-50/40 text-gray-400' : ''
                    }`}
                  >
                    {/* Order Badge */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-gray-100 font-mono font-bold text-gray-700 text-xs">
                        {cat.display_order}
                      </span>
                    </td>

                    {/* Category Title + Icon + Slug */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl shrink-0 ${
                            cat.is_active
                              ? 'bg-orange-50 text-orange-600 border border-orange-100'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {renderIcon(cat.icon, 'h-4 w-4')}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                            <span>{cat.name}</span>
                            {cat.slug === 'dining' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                Dining Vertical
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[11px] text-gray-400">
                            slug: <span className="text-gray-600 font-medium">{cat.slug}</span>
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4 max-w-xs truncate text-gray-500">
                      {cat.description || (
                        <span className="italic text-gray-300">No description provided</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(cat)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                          cat.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100'
                            : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                        }`}
                        title="Click to toggle active status"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            cat.is_active ? 'bg-emerald-500' : 'bg-gray-400'
                          }`}
                        />
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    {/* Events count */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          (cat.event_count || 0) > 0
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        <CalendarDays className="h-3.5 w-3.5" />
                        {cat.event_count || 0}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition cursor-pointer"
                          title="Edit Category"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleToggleActive(cat)}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            cat.is_active
                              ? 'text-gray-500 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={cat.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <Power className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => setDeletingCategory(cat)}
                          className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Delete / Deactivate"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create or Edit Category */}
      {(createModalOpen || editingCategory) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                  {editingCategory ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                <h3 className="font-bold text-base text-gray-900">
                  {editingCategory ? 'Edit Category' : 'Create New Event Category'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setCreateModalOpen(false);
                  setEditingCategory(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 pt-4 text-xs">
              {/* Category Name */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value, !editingCategory)}
                  placeholder="e.g. Esports & Gaming Tournaments"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs font-medium"
                />
              </div>

              {/* Category Slug */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  URL Slug * (Unique identifier)
                </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      slug: e.target.value.toLowerCase().replace(/[^\w-]/g, ''),
                    }))
                  }
                  placeholder="e.g. esports-gaming"
                  className="w-full px-3 py-2.5 font-mono rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Used by partners, ticket filters, and search indexing (lowercase, hyphens).
                </p>
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1.5">
                  Category Icon
                </label>
                <div className="grid grid-cols-6 gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200 max-h-32 overflow-y-auto">
                  {AVAILABLE_ICONS.map((iconKey) => {
                    const isSelected = formData.icon === iconKey;
                    return (
                      <button
                        type="button"
                        key={iconKey}
                        onClick={() => setFormData((prev) => ({ ...prev, icon: iconKey }))}
                        className={`p-2 rounded-lg flex flex-col items-center justify-center transition cursor-pointer ${
                          isSelected
                            ? 'bg-orange-600 text-white shadow-xs'
                            : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
                        }`}
                        title={iconKey}
                      >
                        {renderIcon(iconKey, 'h-4 w-4')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Short description of events under this category..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs"
                />
              </div>

              {/* Display Order & Active Checkbox */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.display_order ?? 0}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        display_order: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs font-mono"
                  />
                </div>

                <div className="flex flex-col justify-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.is_active ?? true}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                      }
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 h-4 w-4"
                    />
                    <span className="font-semibold text-gray-800 text-xs">
                      Active in Portal
                    </span>
                  </label>
                  <span className="text-[10px] text-gray-400 mt-0.5">
                    Uncheck to hide from discovery
                  </span>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setCreateModalOpen(false);
                    setEditingCategory(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  <span>{editingCategory ? 'Update Category' : 'Create Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2 bg-rose-50 rounded-xl">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-gray-900">
                Delete or Deactivate?
              </h3>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to delete category{' '}
              <span className="font-bold text-gray-900">"{deletingCategory.name}"</span>?
            </p>

            {(deletingCategory.event_count || 0) > 0 ? (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  {deletingCategory.event_count} live event(s) are linked to this category!
                </p>
                <p className="mt-1 text-[11px] text-amber-700">
                  To safeguard data integrity, this category will be deactivated rather than deleted from history.
                </p>
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-gray-400">
                No events are currently linked. This category will be permanently removed.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : (deletingCategory.event_count || 0) > 0 ? 'Deactivate Category' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


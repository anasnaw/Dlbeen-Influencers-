import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Clapperboard,
  BarChart3,
  Settings,
  Plus,
  Search,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Cloud,
  AlertCircle,
  Clock3,
  Target,
  Heart,
  UserPlus,
  Pencil,
  Filter,
  RefreshCw,
  PlayCircle,
  Wallet,
  Menu,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { User } from 'firebase/auth';
import {
  BRANDS,
  FORMATS,
  EMPTY,
  n,
  fmt,
  progress,
  summarize,
  monthLabel,
  currentMonth,
  demoData,
  validateRow,
  type Data,
  type RecordRow,
  type Entity,
  type Filters,
} from './lib/model';
import driveInfo from './lib/drive-info.json';
import { exportReport, generateReportBlob } from './lib/export-report';
import {
  initAuth,
  googleSignIn,
  googleSignOut,
  getAccessToken,
  readAllFromGoogleSheets,
  upsertRowToGoogleSheet,
  bulkSyncDataToGoogleSheets,
  uploadFileToGoogleDriveFolder,
  SPREADSHEET_ID,
  FOLDER_ID,
} from './lib/google-workspace';
import { Btn, Picker, Badge, Avatar, Empty, Metric, ToastMessage } from './components/Common';
import { GoogleAuthButton } from './components/GoogleAuthButton';
import { WorkspaceConfirmModal } from './components/WorkspaceConfirmModal';
import { ConnectionSettings } from './components/ConnectionSettings';
import { EditorModal } from './components/EditorModal';
import { InfluencerDrawer } from './components/InfluencerDrawer';

// Navigation configuration
const navigation = [
  { id: 'overview', name: 'Overview', icon: LayoutDashboard },
  { id: 'influencers', name: 'Influencers', icon: Users },
  { id: 'agreements', name: 'Monthly agreements', icon: CalendarDays },
  { id: 'content', name: 'Content tracking', icon: Clapperboard },
  { id: 'reports', name: 'Reports', icon: BarChart3 },
  { id: 'settings', name: 'Settings & Drive', icon: Settings },
];

const titles: Record<string, string> = {
  overview: 'Partnership overview',
  influencers: 'Influencer directory',
  agreements: 'Monthly agreements',
  content: 'Content tracking',
  reports: 'Partnership reports',
  settings: 'Google Drive & Sheets setup',
};

export default function App() {
  const [view, setView] = useState('overview');
  const [data, setData] = useState<Data>(EMPTY);
  const [demo, setDemo] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState<{ updatedAt: string | null; endpoint: string | null }>({
    updatedAt: null,
    endpoint: null,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [reportNotes, setReportNotes] = useState('');
  const [exporting, setExporting] = useState<string | false>(false);
  const [editor, setEditor] = useState<{ entity: Entity; row?: RecordRow } | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Google Workspace Auth & Direct Sync State
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [syncingSheets, setSyncingSheets] = useState(false);

  // Workspace Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    targetName: string;
    targetType: 'sheet' | 'drive';
    confirmLabel: string;
    action: () => Promise<void>;
    isLoading?: boolean;
  }>({
    isOpen: false,
    title: '',
    description: '',
    targetName: '',
    targetType: 'sheet',
    confirmLabel: 'Confirm',
    action: async () => {},
    isLoading: false,
  });

  const [filters, setFilters] = useState<Filters>({
    month: 'all',
    brand: 'all',
    influencer: 'all',
    currency: 'IQD',
  });

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  // Subscribe to Firebase Google Auth state changes
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        showToast(`Connected to Google as ${res.user.email}`, 'success');
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to sign in with Google.', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await googleSignOut();
      setGoogleUser(null);
      setGoogleToken(null);
      showToast('Signed out of Google Workspace', 'info');
    } catch (e: any) {
      showToast(e.message || 'Error signing out', 'error');
    }
  };

  // Pull latest data directly from Google Sheets
  const handlePullFromSheets = async () => {
    const token = googleToken || getAccessToken();
    if (!token) {
      showToast('Please sign in with Google to sync from Google Sheets.', 'error');
      return;
    }
    setSyncingSheets(true);
    try {
      const sheetsData = await readAllFromGoogleSheets(token);
      setData(sheetsData);
      // Synchronize backend local cache
      await fetch('/api/sync-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: sheetsData }),
      });
      showToast(
        `Synced ${sheetsData.influencers.length} influencers, ${sheetsData.agreements.length} agreements, and ${sheetsData.content.length} deliverables from Google Sheets!`,
        'success'
      );
    } catch (e: any) {
      console.error('Error syncing from Google Sheets:', e);
      showToast(e.message || 'Failed to sync from Google Sheets.', 'error');
    } finally {
      setSyncingSheets(false);
    }
  };

  // Push local database to Google Sheets with explicit confirmation
  const handlePushToSheets = () => {
    const token = googleToken || getAccessToken();
    if (!token) {
      showToast('Please sign in with Google to push to Google Sheets.', 'error');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Push Local Database to Google Sheets',
      description:
        'This will synchronize all currently stored influencer profiles, monthly agreements, and content deliverables to the official Dlbeen Google Sheets database (Profiles, Agreements, and Content tabs).',
      targetName: `Google Spreadsheet: Dlbeen Influencers Database (${SPREADSHEET_ID})`,
      targetType: 'sheet',
      confirmLabel: 'Push to Google Sheets',
      action: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await bulkSyncDataToGoogleSheets(token, active);
          showToast('Successfully synchronized all records to Google Sheets!', 'success');
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        } catch (e: any) {
          showToast(e.message || 'Failed to sync to Google Sheets.', 'error');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  // Refresh data from API
  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const connRes = await fetch('/api/connection');
      if (connRes.ok) {
        const connData = await connRes.json();
        setConfigured(!!connData.configured);
        setConnectionDetails({
          updatedAt: connData.updatedAt || null,
          endpoint: connData.endpoint || null,
        });
      }

      const res = await fetch('/api/data');
      if (!res.ok) {
        throw new Error('Failed to load records from the server.');
      }
      const json = await res.json();
      if (json.ok && json.data) {
        setData(json.data);
      }
    } catch (e: any) {
      setLoadError(e.message || 'Error loading records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Active dataset (sample vs live)
  const active = useMemo(() => {
    if (demo) {
      return demoData(filters.month === 'all' ? currentMonth() : filters.month);
    }
    return data;
  }, [data, demo, filters.month]);

  const stats = useMemo(() => summarize(active, filters), [active, filters]);

  const findI = (id: unknown) =>
    active.influencers.find((i) => i.id === id) || { id: '', name: 'Unknown influencer' };

  const setFilter = (key: keyof Filters, value: string) =>
    setFilters({ ...filters, [key]: value });

  const openEditor = (entity: Entity, row?: RecordRow) => setEditor({ entity, row });

  const changeView = (v: string) => {
    setView(v);
    setSearch('');
    setMobileMenuOpen(false);
  };

  const saveRow = async (entity: Entity, row: RecordRow) => {
    validateRow(entity, row, active);
    if (demo) {
      throw new Error('Sample mode is read-only. Switch to Live Database to save records.');
    }
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity, row, expectedUpdatedAt: row.updated_at || '' }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to save record.');
    }

    const savedRow = json.row || row;

    // Direct Google Sheets sync if user is signed in
    const token = googleToken || getAccessToken();
    if (token) {
      try {
        await upsertRowToGoogleSheet(token, entity, savedRow);
        showToast(`Saved and synced to Google Sheets (${entity})`, 'success');
      } catch (err: any) {
        console.warn('Google Sheets sync warning:', err);
        showToast(`Saved locally (Google Sheets sync note: ${err.message})`, 'info');
      }
    } else {
      showToast(json.savedToDrive ? 'Saved directly to Google Drive Sheet' : 'Saved locally in system database', 'success');
    }

    await refresh();
  };

  const renewal = async (a: RecordRow, v: string) => {
    try {
      await saveRow('agreements', { ...a, renewal: v });
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  async function download(format: 'pdf' | 'xlsx', toDrive = false) {
    if (toDrive) {
      const token = googleToken || getAccessToken();
      if (token) {
        const fileName = `Dlbeen_Campaign_Report_${filters.month}_${filters.currency}.${format}`;
        setConfirmModal({
          isOpen: true,
          title: `Save ${format.toUpperCase()} Report to Google Drive`,
          description: `Generate and upload this ${filters.month} campaign performance report to the designated Dlbeen Google Drive Reports folder.`,
          targetName: `Google Drive Folder: Dlbeen Campaign Reports (${FOLDER_ID})`,
          targetType: 'drive',
          confirmLabel: 'Upload to Google Drive',
          action: async () => {
            setConfirmModal((prev) => ({ ...prev, isLoading: true }));
            try {
              const reportFile = await generateReportBlob(active, filters, reportNotes, format, demo);
              await uploadFileToGoogleDriveFolder(token, {
                fileName: reportFile.fileName,
                mimeType: reportFile.mimeType,
                content: reportFile.blob,
                description: `Dlbeen influencer performance report for ${filters.month} (${filters.currency}). Notes: ${reportNotes.slice(0, 100)}`,
              });
              showToast(`Report successfully uploaded to Google Drive! (${reportFile.fileName})`, 'success');
              setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            } catch (e: any) {
              showToast(e.message || 'Google Drive upload failed.', 'error');
            } finally {
              setConfirmModal((prev) => ({ ...prev, isLoading: false }));
            }
          },
        });
        return;
      }

      // Fallback: If not signed into Google, check server-side Apps Script connection
      if (!configured) {
        showToast('Sign in with Google in Settings to save reports directly to Google Drive.', 'error');
        changeView('settings');
        return;
      }

      setExporting(format + 'drive');
      try {
        const res = await fetch('/api/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format, filters, notes: reportNotes }),
        });
        const p: any = await res.json();
        if (!res.ok) throw new Error(p.error || 'Drive export failed.');
        showToast('Report saved in Google Drive Reports folder', 'success');
      } catch (e: any) {
        showToast(e.message, 'error');
      } finally {
        setExporting(false);
      }
    } else {
      setExporting(format);
      try {
        await exportReport(active, filters, reportNotes, format, demo);
        showToast(`Downloaded ${format.toUpperCase()} report successfully`, 'success');
      } catch (e: any) {
        showToast(e.message, 'error');
      } finally {
        setExporting(false);
      }
    }
  }

  // Filtered rows for each view
  const creatorRows = active.influencers.filter((i) =>
    [i.name, i.handle, i.city, i.niche].join(' ').toLowerCase().includes(search.toLowerCase())
  );

  const agreementRows = stats.agreements.filter((a) =>
    [findI(a.influencer_id).name, a.campaign, a.brand]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const contentRows = stats.content.filter((c) =>
    [c.title, c.format, c.status].join(' ').toLowerCase().includes(search.toLowerCase())
  );

  // 6-month historical trend
  const trend = useMemo(() => {
    return Array.from({ length: 6 }, (_, j) => {
      const date = new Date((filters.month === 'all' ? currentMonth() : filters.month) + '-02T12:00:00');
      date.setMonth(date.getMonth() - (5 - j));
      const m = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Baghdad',
        year: 'numeric',
        month: '2-digit',
      }).format(date).slice(0, 7);
      const summary = summarize(active, { ...filters, month: m });
      return {
        month: date.toLocaleDateString('en-GB', { month: 'short' }),
        fee: summary.fee,
        agreed: summary.agreed,
        delivered: summary.credited,
      };
    });
  }, [active, filters]);

  const drow = detail ? findI(detail) : null;

  // Common filters bar
  const commonFilters = (
    <div className="filters">
      <span className="filter-title">
        <Filter size={14} /> View by
      </span>
      <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'All Months' },
          { id: '2026-08', label: 'Aug 2026' },
          { id: '2026-07', label: 'Jul 2026' },
          { id: '2026-06', label: 'Jun 2026' },
          { id: '2026-05', label: 'May 2026' },
          { id: '2026-04', label: 'Apr 2026' },
        ].map((m) => (
          <button
            key={m.id}
            type="button"
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              borderRadius: '16px',
              border: '1px solid',
              borderColor: filters.month === m.id ? '#2563eb' : '#dce4ef',
              background: filters.month === m.id ? '#2563eb' : '#fff',
              color: filters.month === m.id ? '#fff' : '#475569',
              fontWeight: filters.month === m.id ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onClick={() => setFilter('month', m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <input
        aria-label="Agreement month"
        type="month"
        value={filters.month === 'all' ? '' : filters.month}
        onChange={(e) => setFilter('month', e.target.value || 'all')}
        className="select-control"
      />
      <Picker
        label="Brand filter"
        value={filters.brand}
        onChange={(v) => setFilter('brand', v)}
        options={[{ value: 'all', label: 'All brands' }, ...BRANDS.map((b) => ({ value: b, label: b }))]}
      />
      <Picker
        label="Currency filter"
        value={filters.currency}
        onChange={(v) => setFilter('currency', v)}
        options={[
          { value: 'IQD', label: 'IQD (Iraqi Dinar)' },
          { value: 'USD', label: 'USD (US Dollar)' },
        ]}
      />
      <Picker
        label="Influencer filter"
        value={filters.influencer}
        onChange={(v) => setFilter('influencer', v)}
        options={[
          { value: 'all', label: 'All influencers' },
          ...active.influencers.map((i) => ({ value: i.id, label: String(i.name) })),
        ]}
      />
      {filters.month !== 'all' && (
        <Btn className="btn-subtle" onClick={() => setFilter('month', 'all')}>
          Show all months
        </Btn>
      )}
      <span className="filter-note">Currencies remain strictly separate</span>
    </div>
  );

  // Partnership table for overview and reports
  const partnershipTable = (rows: RecordRow[], report = false) => (
    <div className="panel table-panel">
      <div className="panel-head">
        <div>
          <h2>{report ? 'Influencer partnership results' : 'Active monthly agreements'}</h2>
          <p>
            {report
              ? 'Results for the selected filters. Only Published items count toward delivered deliverables.'
              : 'Agreed deliverables vs completed publishing.'}
          </p>
        </div>
        {!report && (
          <Btn primary onClick={() => openEditor('agreements')}>
            <Plus size={16} /> New agreement
          </Btn>
        )}
      </div>
      {rows.length ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Influencer</th>
                <th>Brand & Campaign</th>
                <th>Stories</th>
                <th>Reels</th>
                <th>Posts</th>
                <th>Deliverables progress</th>
                <th>Fee ({filters.currency})</th>
                <th>Renewal</th>
                {!report && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const i = findI(a.influencer_id);
                const pr = progress(a, active.content);
                return (
                  <tr key={a.id}>
                    <td>
                      <button
                        className="person text-button"
                        onClick={() => setDetail(String(a.influencer_id))}
                      >
                        <Avatar row={i} />
                        <div>
                          <strong>{String(i.name)}</strong>
                          <small>{String(i.handle || i.city || '')}</small>
                        </div>
                      </button>
                    </td>
                    <td>
                      <span className="brand-pill">{String(a.brand)}</span>
                      <small style={{ display: 'block', marginTop: 3 }}>
                        {String(a.campaign || 'General campaign')}
                      </small>
                    </td>
                    <td>
                      {pr.rows[0].done} / {pr.rows[0].agreed}
                    </td>
                    <td>
                      {pr.rows[1].done} / {pr.rows[1].agreed}
                    </td>
                    <td>
                      {pr.rows[2].done} / {pr.rows[2].agreed}
                    </td>
                    <td>
                      <div className="progress-cell">
                        <div>
                          <span>
                            {pr.credited} / {pr.agreed}
                          </span>
                          <span>{pr.percent}%</span>
                        </div>
                        <div
                          style={{
                            height: 6,
                            background: '#eaf0f8',
                            borderRadius: 4,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${pr.percent}%`,
                              height: '100%',
                              background: '#2c73e5',
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{fmt(n(a.fee))}</strong>
                      <small style={{ display: 'block' }}>{String(a.payment_status || 'Pending')}</small>
                    </td>
                    <td>
                      <Picker
                        label="Renewal decision"
                        value={String(a.renewal || 'Maybe')}
                        onChange={(v) => void renewal(a, v)}
                        options={['Yes', 'Maybe', 'No']}
                        className="select-small"
                      />
                    </td>
                    {!report && (
                      <td>
                        <button
                          className="icon-btn"
                          aria-label={'Edit agreement for ' + i.name}
                          onClick={() => openEditor('agreements', a)}
                        >
                          <Pencil size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          icon={CalendarDays}
          title="No agreements recorded"
          text="Create a monthly contract commitment to track deliverables and fees."
          action={
            <Btn primary onClick={() => openEditor('agreements')}>
              <Plus size={16} /> Create agreement
            </Btn>
          }
        />
      )}
    </div>
  );

  const isConnected = !!googleUser || configured;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f7fb' }}>
      {/* Toast Notification */}
      {toast && <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Workspace Explicit Confirmation Modal */}
      <WorkspaceConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        targetName={confirmModal.targetName}
        targetType={confirmModal.targetType}
        confirmLabel={confirmModal.confirmLabel}
        isLoading={confirmModal.isLoading}
        onConfirm={confirmModal.action}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Sidebar Desktop */}
      <aside
        className={`sidebar-inner ${mobileMenuOpen ? 'mobile-open' : ''}`}
        style={{
          width: 250,
          borderRight: '1px solid #e4eaf3',
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div className="brand-lockup">
          <img src="/brand/logo.jpg" alt="Dlbeen Group Logo" />
          <div>
            <strong>DLBEEN</strong>
            <small>Influencer System</small>
          </div>
        </div>

        <nav style={{ flex: 1 }}>
          <div className="nav-label">WORKSPACE</div>
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = view === item.id;
            return (
              <button
                key={item.id}
                className={`nav-button ${isActive ? 'active' : ''}`}
                onClick={() => changeView(item.id)}
              >
                <Icon size={19} />
                <span>{item.name}</span>
                {item.id === 'influencers' && (
                  <span className="nav-count">{active.influencers.length}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="side-bottom">
          <div className="side-storage">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: isOnline ? '#10b981' : '#ef4444', boxShadow: isOnline ? '0 0 0 2px #d1fae5' : 'none' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: isOnline ? '#065f46' : '#991b1b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {isOnline ? 'System Online' : 'System Offline'}
              </span>
            </div>
            <strong>
              <Cloud size={17} color={isConnected ? '#10b981' : '#3b82f6'} />
              <span>{isConnected ? 'Workspace Connected' : 'Google Workspace'}</span>
            </strong>
            <p>
              {googleUser
                ? `Connected as ${googleUser.email?.split('@')[0]}`
                : configured
                ? 'Syncing with Google Sheets & Drive.'
                : 'Sign in to sync with Google Sheets & Drive.'}
            </p>
            <Btn
              className="btn-subtle"
              style={{ padding: 0, marginTop: 6, fontSize: 13 }}
              onClick={() => changeView('settings')}
            >
              {isConnected ? 'Workspace settings →' : 'Connect Google Workspace →'}
            </Btn>
          </div>

          <div className="account">
            <div className="account-avatar">DG</div>
            <div>
              <strong>Dlbeen Group</strong>
              <small style={{ color: '#8898aa' }}>Marketing Division</small>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="shell" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              className="mobile-trigger btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ display: 'none' }}
              aria-label="Toggle menu"
            >
              <Menu size={18} />
            </button>
            <div className="breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Dlbeen Influencers System</span>
              <span>/</span>
              <b>{titles[view] || view}</b>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 600,
                  background: isOnline ? '#ecfdf5' : '#fef2f2',
                  border: `1px solid ${isOnline ? '#a7f3d0' : '#fecaca'}`,
                  color: isOnline ? '#065f46' : '#991b1b',
                  marginLeft: 4,
                }}
                title={isOnline ? 'System is online on Google Cloud Run' : 'Offline'}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: isOnline ? '#10b981' : '#ef4444',
                    boxShadow: isOnline ? '0 0 0 2px #d1fae5' : 'none',
                  }}
                />
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          <div className="top-right" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Google Workspace Quick Action Pill */}
            {googleUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Btn
                  onClick={handlePullFromSheets}
                  disabled={syncingSheets}
                  style={{
                    fontSize: '12px',
                    padding: '4px 10px',
                    minHeight: '34px',
                    background: '#f0fdf4',
                    borderColor: '#bbf7d0',
                    color: '#166534',
                  }}
                  title="Pull latest records from Google Sheets"
                >
                  <RefreshCw size={13} className={syncingSheets ? 'animate-spin' : ''} />
                  <span>{syncingSheets ? 'Syncing…' : 'Sync Sheets'}</span>
                </Btn>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '3px 10px 3px 6px',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '20px',
                    fontSize: '12px',
                  }}
                  title={`Google Account: ${googleUser.email}`}
                >
                  {googleUser.photoURL ? (
                    <img
                      src={googleUser.photoURL}
                      alt={googleUser.displayName || 'Google Account'}
                      style={{ width: '22px', height: '22px', borderRadius: '50%' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: '#dcfce7',
                        color: '#15803d',
                        fontWeight: 700,
                        fontSize: '11px',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      {googleUser.email?.charAt(0).toUpperCase() || 'G'}
                    </div>
                  )}
                  <span style={{ fontWeight: 500, color: '#334155' }}>
                    {googleUser.displayName?.split(' ')[0] || googleUser.email?.split('@')[0]}
                  </span>
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: '#22c55e',
                      boxShadow: '0 0 0 2px #dcfce7',
                    }}
                    title="Live Google Sheets & Drive Connected"
                  />
                </div>
              </div>
            ) : (
              <GoogleAuthButton
                onClick={handleGoogleSignIn}
                loading={authLoading}
                label="Sign in with Google"
                style={{ minHeight: '34px', fontSize: '13px', padding: '0 12px' }}
              />
            )}

            {/* Sample vs Live mode toggle */}
            <Btn
              className={demo ? 'btn subtle' : 'btn'}
              onClick={() => {
                setDemo(!demo);
                showToast(!demo ? 'Viewing sample fictional workspace' : 'Switched to live database', 'info');
              }}
            >
              <PlayCircle size={15} />
              {demo ? 'Sample data (on)' : 'Live data'}
            </Btn>

            {/* Refresh button */}
            <Btn onClick={() => void refresh()} disabled={loading} aria-label="Refresh data">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </Btn>

            {/* Direct Google Sheet link */}
            {driveInfo.spreadsheetUrl && (
              <a
                className="btn"
                href={driveInfo.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open database in Google Sheets"
              >
                <FileSpreadsheet size={15} />
                <span>Google Sheet</span>
                <ExternalLink size={12} />
              </a>
            )}

            {/* Direct Google Drive folder link */}
            {driveInfo.folderUrl && (
              <a
                className="btn"
                href={driveInfo.folderUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open Dlbeen folder in Google Drive"
              >
                <FolderOpen size={15} />
                <span>Drive Folder</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </header>

        {/* Content area */}
        <main className="content-wrap">
          {/* Sample workspace notice */}
          {demo && (
            <div className="notice warning">
              <PlayCircle size={18} />
              <p>
                <b>Sample workspace active.</b> These creators, contracts and metrics are fictional
                examples for testing. Click "Live data" in the top bar to work with your real records.
              </p>
              <Btn onClick={() => setDemo(false)}>Switch to live data</Btn>
            </div>
          )}

          {/* Drive disconnected notice (only in live mode when neither OAuth nor Webhook is connected) */}
          {!demo && !isConnected && view !== 'settings' && (
            <div className="notice">
              <Cloud size={18} color="#2563eb" />
              <p>
                <b>System is online & active.</b> Sign in with Google to enable two-way cloud sync with your online Google Sheet (<i>Dlbeen Influencers System</i>) and export campaign reports directly to Google Drive.
              </p>
              <Btn primary onClick={handleGoogleSignIn} disabled={authLoading}>
                Sign in with Google
              </Btn>
            </div>
          )}

          {/* Load error */}
          {loadError && (
            <div className="notice error">
              <AlertCircle size={18} />
              <p>{loadError}</p>
              <Btn onClick={() => void refresh()}>Retry</Btn>
            </div>
          )}

          {/* Filters (on Overview, Agreements, Content, Reports) */}
          {['overview', 'agreements', 'content', 'reports'].includes(view) && commonFilters}

          {/* VIEW: OVERVIEW */}
          {view === 'overview' && (
            <>
              {/* Executive Metrics */}
              <div className="metrics">
                <Metric
                  label="Active partnerships"
                  value={stats.agreements.length}
                  icon={Users}
                  sub={`${new Set(stats.agreements.map((a) => a.influencer_id)).size} influencers in ${
                    filters.month === 'all' ? 'all months' : monthLabel(filters.month)
                  }`}
                />
                <Metric
                  label="Delivery against commitment"
                  value={`${stats.credited} / ${stats.agreed}`}
                  icon={Clapperboard}
                  sub={
                    stats.remaining > 0
                      ? `${stats.remaining} items remaining to deliver`
                      : 'All agreed formats published'
                  }
                />
                <Metric
                  label="Committed investment"
                  value={fmt(stats.fee)}
                  icon={Wallet}
                  sub={`${filters.currency} · ${stats.agreements.filter((a) => a.payment_status === 'Paid').length} paid`}
                />
                <Metric
                  label="Reported reach (sum)"
                  value={fmt(stats.reach)}
                  icon={TrendingUp}
                  sub={`${stats.published.length} published items · ${fmt(stats.views)} total views`}
                />
              </div>

              {/* Grid 2: Progress Ring & Historical Trend Chart */}
              <div className="grid-two">
                {/* Delivery Progress ring panel */}
                <div className="panel">
                  <div className="panel-head">
                    <div>
                      <h2>Deliverable breakdown by format</h2>
                      <p>Delivery is capped separately per format. Overdelivery in one format does not satisfy another.</p>
                    </div>
                  </div>
                  <div className="panel-body">
                    <div className="delivery-ring">
                      <div
                        className="ring"
                        style={{
                          background: `conic-gradient(#0752ed ${stats.percent}%, #edf3ff 0)`,
                        }}
                      >
                        <strong>{stats.percent}%</strong>
                      </div>
                      <div className="ring-label">
                        <b>{stats.credited} credited</b>
                        <span>of {stats.agreed} agreed formats</span>
                      </div>
                    </div>

                    <div className="delivery-lines">
                      {FORMATS.map((fmtName, idx) => {
                        const key = ['stories', 'reels', 'posts'][idx];
                        const agreed = stats.agreements.reduce((sum, a) => sum + n(a[key]), 0);
                        const done = stats.published.filter((c) => c.format === fmtName).length;
                        const pct = agreed ? Math.min(100, Math.round((done / agreed) * 100)) : 0;
                        return (
                          <div key={fmtName} className="delivery-line">
                            <span>
                              {fmtName} ({done} / {agreed})
                            </span>
                            <div style={{ flex: 1, margin: '0 16px', background: '#eaf0f8', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: '#0752ed' }} />
                            </div>
                            <b>{pct}%</b>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Historical 6-month investment trend */}
                <div className="panel">
                  <div className="panel-head">
                    <div>
                      <h2>6-month investment trend</h2>
                      <p>Committed fees in {filters.currency}</p>
                    </div>
                  </div>
                  <div className="panel-body">
                    <div className="chart" style={{ height: 230 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf1f6" />
                          <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: '#e4eaf3' }} fontSize={12} stroke="#7b8ca5" />
                          <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#7b8ca5" tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                          <Tooltip
                            formatter={(value: any) => [`${fmt(Number(value))} ${filters.currency}`, 'Committed fee']}
                            contentStyle={{ borderRadius: 8, border: '1px solid #dce4ef', fontSize: 13 }}
                          />
                          <Bar dataKey="fee" fill="#0752eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active partnerships table */}
              {partnershipTable(stats.agreements)}

              {/* Attention panel */}
              <div className="panel" style={{ marginTop: 24 }}>
                <div className="panel-head">
                  <h2>Operational review</h2>
                  <p>Immediate action items for partnership management</p>
                </div>
                <div className="panel-body">
                  <div className="attention-list">
                    <div className="attention">
                      <Clock3 />
                      <div>
                        <strong>{stats.overdue.length} overdue agreements</strong>
                        <p>
                          {stats.overdue.length
                            ? 'Agreements past due date with unfulfilled deliverable commitments.'
                            : 'No overdue agreements for this period.'}
                        </p>
                      </div>
                    </div>
                    <div className="attention">
                      <BarChart3 />
                      <div>
                        <strong>{stats.published.length - stats.coverage} published items missing metrics</strong>
                        <p>
                          Ensure creators provide screenshots of Reach, Likes, Comments, Shares, and Saves for complete ER
                          calculations.
                        </p>
                      </div>
                    </div>
                    <div className="attention">
                      <Users />
                      <div>
                        <strong>
                          {stats.agreements.filter((a) => a.renewal === 'Maybe' || !a.renewal).length} pending renewals
                        </strong>
                        <p>Evaluate creator delivery and engagement before confirming next month's renewals.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* VIEW: INFLUENCERS */}
          {view === 'influencers' && (
            <>
              <div className="toolbar">
                <div className="search">
                  <Search size={17} />
                  <input
                    aria-label="Search influencers"
                    placeholder="Search by name, handle, city, niche…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <span>{creatorRows.length} creators</span>
                <Btn primary onClick={() => openEditor('influencers')}>
                  <Plus size={16} /> Add influencer
                </Btn>
              </div>

              {creatorRows.length ? (
                <div className="creator-grid">
                  {creatorRows.map((i) => (
                    <div
                      key={i.id}
                      className="creator-card cursor-pointer"
                      onClick={() => setDetail(String(i.id))}
                    >
                      <div className="creator-top">
                        <Avatar row={i} large />
                        <Badge value={i.status} />
                      </div>
                      <h3>{String(i.name)}</h3>
                      <div className="handle">
                        {String(i.handle || '')} · {String(i.platform || 'Instagram')}
                      </div>
                      <div className="creator-meta">
                        <span>{String(i.city || 'Iraq')}</span>
                        <span>•</span>
                        <span>{String(i.niche || 'Lifestyle')}</span>
                      </div>
                      <div className="creator-stats">
                        <div>
                          <b>{i.followers ? fmt(n(i.followers)) : '—'}</b>
                          <span>Followers</span>
                        </div>
                        <div>
                          <b>{i.engagement_rate != null && i.engagement_rate !== '' ? `${i.engagement_rate}%` : '—'}</b>
                          <span>Profile ER</span>
                        </div>
                      </div>
                      <div className="creator-footer">
                        <small>{String(i.owner ? `Owner: ${i.owner}` : 'Dlbeen Team')}</small>
                        <Btn
                          className="btn-subtle"
                          style={{ padding: '4px 8px', fontSize: 13 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetail(String(i.id));
                          }}
                        >
                          View profile →
                        </Btn>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  icon={Users}
                  title="No influencers found"
                  text="Try adjusting your search query, or register a new influencer profile."
                  action={
                    <Btn primary onClick={() => openEditor('influencers')}>
                      <Plus size={16} /> Add influencer
                    </Btn>
                  }
                />
              )}
            </>
          )}

          {/* VIEW: AGREEMENTS */}
          {view === 'agreements' && (
            <>
              <div className="toolbar">
                <div className="search">
                  <Search size={17} />
                  <input
                    aria-label="Search agreements"
                    placeholder="Search by influencer, brand, campaign…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <span>{agreementRows.length} agreements</span>
                <Btn primary onClick={() => openEditor('agreements')}>
                  <Plus size={16} /> New agreement
                </Btn>
              </div>

              {partnershipTable(agreementRows)}
            </>
          )}

          {/* VIEW: CONTENT */}
          {view === 'content' && (
            <>
              <div className="toolbar">
                <div className="search">
                  <Search size={17} />
                  <input
                    aria-label="Search content"
                    placeholder="Search by title, format, status…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <span>{contentRows.length} content items</span>
                <Btn primary onClick={() => openEditor('content')}>
                  <Plus size={16} /> Log content
                </Btn>
              </div>

              <div className="panel table-panel">
                <div className="panel-head">
                  <div>
                    <h2>Logged content deliverables</h2>
                    <p>Track every published story frame, reel, or post with measured creator performance.</p>
                  </div>
                </div>

                {contentRows.length ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Content deliverable</th>
                          <th>Influencer & Brand</th>
                          <th>Status</th>
                          <th>Reach & Views</th>
                          <th>Engagements</th>
                          <th>Followers gained</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contentRows.map((c) => {
                          const a = active.agreements.find((agr) => agr.id === c.agreement_id);
                          const i = findI(a?.influencer_id);
                          const hasFullER = ['likes', 'comments', 'shares', 'saves'].every(
                            (k) => c[k] !== '' && c[k] != null
                          );
                          const totalEng = n(c.likes) + n(c.comments) + n(c.shares) + n(c.saves);

                          return (
                            <tr key={c.id}>
                              <td>
                                <strong>{String(c.title)}</strong>
                                <small style={{ display: 'block', marginTop: 3 }}>
                                  {String(c.format)} · {String(c.published_at || c.due_date || 'Date not set')}
                                </small>
                                {c.post_url && (
                                  <a
                                    className="link"
                                    style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    href={String(c.post_url)}
                                  >
                                    <span>Open link</span>
                                    <ExternalLink size={11} />
                                  </a>
                                )}
                              </td>
                              <td>
                                <strong>{String(i.name)}</strong>
                                <small style={{ display: 'block', color: '#687992' }}>{String(a?.brand || '—')}</small>
                              </td>
                              <td>
                                <Badge value={c.status} />
                              </td>
                              <td>
                                <strong>{c.reach !== '' && c.reach != null ? fmt(n(c.reach)) : '—'}</strong>
                                <small style={{ display: 'block', color: '#687992' }}>
                                  {c.views !== '' && c.views != null ? `${fmt(n(c.views))} views` : 'No views logged'}
                                </small>
                              </td>
                              <td>
                                <strong>{hasFullER ? fmt(totalEng) : 'Incomplete'}</strong>
                                <small style={{ display: 'block', color: '#687992' }}>
                                  {fmt(n(c.likes))} likes · {fmt(n(c.comments))} comments
                                </small>
                              </td>
                              <td>
                                <strong>{c.followers_gained !== '' && c.followers_gained != null ? `+${fmt(n(c.followers_gained))}` : '—'}</strong>
                              </td>
                              <td>
                                <button
                                  className="icon-btn"
                                  aria-label={'Edit content ' + c.title}
                                  onClick={() => openEditor('content', c)}
                                >
                                  <Pencil size={15} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    icon={Clapperboard}
                    title="No content logged yet"
                    text="Log one story frame, reel or post per deliverable to track live link and metrics."
                    action={
                      <Btn primary onClick={() => openEditor('content')}>
                        <Plus size={16} /> Log content
                      </Btn>
                    }
                  />
                )}
              </div>
            </>
          )}

          {/* VIEW: REPORTS */}
          {view === 'reports' && (
            <>
              {/* Branded Banner */}
              <div className="report-banner">
                <div>
                  <div className="eyebrow">PARTNERSHIP PERFORMANCE</div>
                  <h2>{filters.month === 'all' ? 'All-time' : monthLabel(filters.month)} Report</h2>
                  <p>
                    {filters.brand === 'all' ? 'All brands' : filters.brand} · {filters.currency} ·{' '}
                    {stats.agreements.length} agreements
                  </p>
                </div>
                <div className="actions">
                  <Btn disabled={!!exporting} onClick={() => void download('pdf')}>
                    <FileText size={16} />
                    {exporting === 'pdf' ? 'Generating PDF…' : 'Download PDF'}
                  </Btn>
                  <Btn primary disabled={!!exporting} onClick={() => void download('xlsx')}>
                    <FileSpreadsheet size={16} />
                    {exporting === 'xlsx' ? 'Generating Excel…' : 'Export Excel'}
                  </Btn>
                </div>
              </div>

              {/* Executive Metrics */}
              <div className="metrics">
                <Metric
                  label="Agreed investment"
                  value={fmt(stats.fee)}
                  icon={Wallet}
                  sub={`${filters.currency} · committed fees`}
                />
                <Metric
                  label="Engagement rate"
                  value={stats.er === null ? '—' : `${stats.er.toFixed(2)}%`}
                  icon={Heart}
                  sub={`${stats.coverage} / ${stats.published.length} items have full ER metrics`}
                />
                <Metric
                  label="Cost per engagement"
                  value={stats.cpe === null ? '—' : fmt(stats.cpe)}
                  icon={Target}
                  sub={`${filters.currency} · based on reported engagements`}
                />
                <Metric
                  label="Attributed followers"
                  value={'+' + fmt(stats.followers)}
                  icon={UserPlus}
                  sub={
                    stats.cpf === null
                      ? 'Add follower results to calculate cost'
                      : `${fmt(stats.cpf)} ${filters.currency} per follower`
                  }
                />
              </div>

              {/* Stat grid */}
              <div className="panel" style={{ marginBottom: 24 }}>
                <div className="report-stat-grid">
                  {[
                    ['Reported reach (sum)', fmt(stats.reach)],
                    ['Views', fmt(stats.views)],
                    ['Likes', fmt(stats.add('likes'))],
                    ['Comments', fmt(stats.add('comments'))],
                    ['Shares', fmt(stats.add('shares'))],
                    ['Saves', fmt(stats.add('saves'))],
                    ['Link clicks', fmt(stats.add('clicks'))],
                    ['Attributed orders', fmt(stats.add('orders'))],
                  ].map(([lbl, val]) => (
                    <div key={lbl}>
                      <span>{lbl}</span>
                      <b>{val}</b>
                    </div>
                  ))}
                </div>
                <div className="report-method">
                  Reach is a sum across content and may include repeat viewers. Engagement rate = (likes + comments + shares + saves) ÷ reach, using only fully measured items. Follower gains, orders and revenue are manually attributed; blank metrics mean unreported. Report totals use the selected agreement month and currency. Fees are committed investment, including unpaid agreements.
                </div>
              </div>

              {/* Partnership Table */}
              {partnershipTable(stats.agreements, true)}

              {/* Manager's notes & Google Drive Save */}
              <div className="grid-two" style={{ marginTop: 24 }}>
                <div className="panel">
                  <div className="panel-head">
                    <h2>Manager’s notes</h2>
                  </div>
                  <div className="panel-body">
                    <textarea
                      className="notes-area"
                      aria-label="Report notes"
                      placeholder="Key wins, what to improve, and recommendations for next month…"
                      value={reportNotes}
                      onChange={(e) => setReportNotes(e.target.value)}
                    />
                    <p className="preview-note" style={{ marginTop: 9 }}>
                      Included in your PDF and Excel exports. Save the report to Google Drive to store these notes in your Reports folder.
                    </p>
                    <div className="actions" style={{ marginTop: 18 }}>
                      <Btn
                        disabled={!!exporting || demo || !isConnected}
                        onClick={() => void download('pdf', true)}
                      >
                        <Cloud size={16} />
                        Save PDF to Drive
                      </Btn>
                      <Btn
                        disabled={!!exporting || demo || !isConnected}
                        onClick={() => void download('xlsx', true)}
                      >
                        <Cloud size={16} />
                        Save Excel to Drive
                      </Btn>
                    </div>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-head">
                    <h2>Needs your attention</h2>
                  </div>
                  <div className="panel-body">
                    <div className="attention-list">
                      <div className="attention">
                        <Clock3 />
                        <div>
                          <strong>{stats.overdue.length} overdue agreements</strong>
                          <p>
                            {stats.overdue.length
                              ? 'Check outstanding formats and confirm revised dates.'
                              : 'No overdue agreements in the selected view.'}
                          </p>
                        </div>
                      </div>
                      <div className="attention">
                        <BarChart3 />
                        <div>
                          <strong>{stats.published.length - stats.coverage} items missing ER metrics</strong>
                          <p>Request reach, likes, comments, shares and saves.</p>
                        </div>
                      </div>
                      <div className="attention">
                        <Users />
                        <div>
                          <strong>
                            {stats.agreements.filter((a) => a.renewal === 'Maybe' || !a.renewal).length} renewal decisions to review
                          </strong>
                          <p>Compare delivery, audience fit and cost per result.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* VIEW: SETTINGS & GOOGLE DRIVE */}
          {view === 'settings' && (
            <ConnectionSettings
              configured={configured}
              connectionDetails={connectionDetails}
              onConnected={async () => {
                await refresh();
                showToast('Google Drive connection successfully verified and active!', 'success');
              }}
              googleUser={googleUser}
              googleToken={googleToken}
              authLoading={authLoading}
              onGoogleSignIn={handleGoogleSignIn}
              onGoogleSignOut={handleGoogleSignOut}
              onPullFromSheets={handlePullFromSheets}
              onPushToSheets={handlePushToSheets}
              syncingSheets={syncingSheets}
              onShowToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Editor Modal */}
      {editor && (
        <EditorModal
          editor={editor}
          data={active}
          month={filters.month === 'all' ? currentMonth() : filters.month}
          onClose={() => setEditor(null)}
          onSave={saveRow}
          configured={isConnected && !demo}
          onNotify={showToast}
        />
      )}

      {/* Influencer Profile Slide-Over Drawer */}
      {detail && drow && (
        <InfluencerDrawer
          row={drow}
          active={active}
          onClose={() => setDetail(null)}
          onEdit={() => {
            openEditor('influencers', drow);
            setDetail(null);
          }}
        />
      )}
    </div>
  );
}

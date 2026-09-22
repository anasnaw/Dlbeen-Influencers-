import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  FileSpreadsheet,
  FolderOpen,
  ExternalLink,
  Download,
  Copy,
  Link2,
  Loader2,
  RefreshCw,
  Upload,
  LogOut,
  FileText,
  ShieldCheck,
  FolderCheck,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { GoogleAuthButton } from './GoogleAuthButton';
import {
  SPREADSHEET_ID,
  FOLDER_ID,
  SPREADSHEET_URL,
  FOLDER_URL,
  listGoogleDriveFolderFiles,
} from '../lib/google-workspace';
import driveInfo from '../lib/drive-info.json';
import { Btn } from './Common';

interface ConnectionSettingsProps {
  configured: boolean;
  connectionDetails: { updatedAt: string | null; endpoint: string | null };
  onConnected: () => Promise<void>;
  googleUser: User | null;
  googleToken: string | null;
  authLoading: boolean;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  onPullFromSheets: () => Promise<void>;
  onPushToSheets: () => void;
  syncingSheets: boolean;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function ConnectionSettings({
  configured,
  connectionDetails,
  onConnected,
  googleUser,
  googleToken,
  authLoading,
  onGoogleSignIn,
  onGoogleSignOut,
  onPullFromSheets,
  onPushToSheets,
  syncingSheets,
  onShowToast,
}: ConnectionSettingsProps) {
  const [endpoint, setEndpoint] = useState('');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [disconnecting, setDisconnecting] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [driveFiles, setDriveFiles] = useState<Array<{ id: string; name: string; mimeType: string; webViewLink?: string; createdTime?: string }>>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  useEffect(() => {
    if (googleToken) {
      setLoadingFiles(true);
      listGoogleDriveFolderFiles(googleToken)
        .then((files) => setDriveFiles(files))
        .catch((err) => console.warn('Could not list drive files:', err))
        .finally(() => setLoadingFiles(false));
    } else {
      setDriveFiles([]);
    }
  }, [googleToken]);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: endpoint.trim(), secret: secret.trim() }),
      });
      const p: any = await r.json();
      if (!r.ok) throw new Error(p.error || 'Failed to connect to Google Drive.');
      setSecret('');
      await onConnected();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!confirm('Are you sure you want to disconnect? The system will revert to local storage.')) return;
    setDisconnecting(true);
    try {
      await fetch('/api/connection', { method: 'DELETE' });
      await onConnected();
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="settings-grid">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Google Workspace Live OAuth & Cloud Sync Panel */}
        <div className="panel">
          <div className="panel-head" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <h2>Google Workspace Integration</h2>
              <p>Direct two-way synchronization with Google Sheets and direct report export to Google Drive.</p>
            </div>
            <Cloud size={28} color={googleUser ? '#059669' : '#3b82f6'} />
          </div>

          <div className="panel-body">
            {googleUser ? (
              <div>
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '12px',
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {googleUser.photoURL ? (
                      <img
                        src={googleUser.photoURL}
                        alt={googleUser.displayName || 'Google User'}
                        style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid #22c55e' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: '#dcfce7',
                          color: '#15803d',
                          fontWeight: 700,
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: '18px',
                        }}
                      >
                        {googleUser.email?.charAt(0).toUpperCase() || 'G'}
                      </div>
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '15px', color: '#166534' }}>
                          {googleUser.displayName || 'Google Account Connected'}
                        </strong>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: '#dcfce7',
                            color: '#15803d',
                            border: '1px solid #86efac',
                          }}
                        >
                          LIVE SYNC ACTIVE
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#374151', margin: '2px 0 0' }}>
                        {googleUser.email}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onGoogleSignOut}
                    className="btn"
                    style={{ fontSize: '13px', padding: '6px 12px', minHeight: '34px' }}
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>

                {/* Scopes and Resource Details */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '12px',
                    marginBottom: '20px',
                  }}
                >
                  <div
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '14px',
                      background: '#f8fafc',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f766e', fontWeight: 600, fontSize: '13px' }}>
                      <FileSpreadsheet size={16} />
                      Google Sheets Database
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0 10px' }}>
                      Spreadsheet ID: <code style={{ fontSize: '11px', background: '#e2e8f0', padding: '1px 4px', borderRadius: '4px' }}>{SPREADSHEET_ID}</code>
                    </p>
                    <a
                      href={SPREADSHEET_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                      style={{ fontSize: '12px', minHeight: '32px', padding: '4px 10px' }}
                    >
                      <ExternalLink size={13} /> Open Spreadsheet
                    </a>
                  </div>

                  <div
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '14px',
                      background: '#f8fafc',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1d4ed8', fontWeight: 600, fontSize: '13px' }}>
                      <FolderCheck size={16} />
                      Google Drive Reports Folder
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0 10px' }}>
                      Folder ID: <code style={{ fontSize: '11px', background: '#e2e8f0', padding: '1px 4px', borderRadius: '4px' }}>{FOLDER_ID}</code>
                    </p>
                    <a
                      href={FOLDER_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                      style={{ fontSize: '12px', minHeight: '32px', padding: '4px 10px' }}
                    >
                      <ExternalLink size={13} /> Open Drive Folder
                    </a>
                  </div>
                </div>

                {/* Direct Sync Controls */}
                <div
                  style={{
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                      Two-Way Cloud Synchronization
                    </h4>
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
                      Pull latest rows from Google Sheets or push your current local records.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Btn
                      onClick={onPullFromSheets}
                      disabled={syncingSheets}
                      style={{ fontSize: '13px' }}
                    >
                      <RefreshCw size={14} className={syncingSheets ? 'animate-spin' : ''} />
                      {syncingSheets ? 'Syncing…' : 'Pull from Sheets'}
                    </Btn>
                    <Btn
                      primary
                      onClick={onPushToSheets}
                      disabled={syncingSheets}
                      style={{ fontSize: '13px' }}
                    >
                      <Upload size={14} />
                      Push to Sheets
                    </Btn>
                  </div>
                </div>

                {/* Drive Folder Files browser */}
                <div style={{ marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                      Saved Reports in Google Drive Folder ({driveFiles.length})
                    </h4>
                    <Btn
                      className="btn-subtle"
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                      onClick={() => {
                        if (googleToken) {
                          setLoadingFiles(true);
                          listGoogleDriveFolderFiles(googleToken)
                            .then(setDriveFiles)
                            .finally(() => setLoadingFiles(false));
                        }
                      }}
                    >
                      <RefreshCw size={12} className={loadingFiles ? 'animate-spin' : ''} />
                      Refresh list
                    </Btn>
                  </div>

                  {loadingFiles ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                      <Loader2 className="animate-spin" size={18} style={{ display: 'inline', marginRight: '6px' }} />
                      Loading reports from Google Drive…
                    </div>
                  ) : driveFiles.length > 0 ? (
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {driveFiles.map((file) => (
                        <div
                          key={file.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '13px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FileText size={16} color="#0284c7" />
                            <div>
                              <strong style={{ color: '#1e293b' }}>{file.name}</strong>
                              {file.createdTime && (
                                <small style={{ display: 'block', color: '#94a3b8', fontSize: '11px' }}>
                                  Uploaded: {new Date(file.createdTime).toLocaleString()}
                                </small>
                              )}
                            </div>
                          </div>
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn"
                              style={{ fontSize: '12px', padding: '4px 8px', minHeight: '28px' }}
                            >
                              <ExternalLink size={12} /> View in Drive
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '18px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        textAlign: 'center',
                        color: '#64748b',
                        fontSize: '13px',
                        border: '1px dashed #cbd5e1',
                      }}
                    >
                      No exported reports found in this folder yet. Use the Reports tab to generate and upload PDF or Excel reports.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '24px',
                    textAlign: 'center',
                  }}
                >
                  <ShieldCheck size={36} color="#2563eb" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ fontSize: '17px', color: '#0f172a', marginBottom: '6px' }}>
                    Connect Your Google Account
                  </h3>
                  <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '440px', margin: '0 auto 18px' }}>
                    Sign in with Google to enable seamless two-way syncing with the official Dlbeen Google Sheets database and direct report export to your Google Drive folder.
                  </p>
                  <GoogleAuthButton
                    onClick={onGoogleSignIn}
                    loading={authLoading}
                    label="Sign in with Google"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Existing Apps Script Webhook Method (for background scripts / optional webhook usage) */}
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Alternative Connection: Google Apps Script Web App</h2>
              <p>For automated background triggers or server-side headless execution.</p>
            </div>
            <Cloud size={24} color={configured ? '#10b981' : '#64748b'} />
          </div>

          <div className="panel-body">
            {configured && (
              <div className="notice" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: 24 }}>
                <CheckCircle2 size={18} />
                <div>
                  <strong>Active Web App Hook</strong>
                  <p style={{ fontSize: 13, marginTop: 2 }}>
                    Last verified: {connectionDetails.updatedAt ? new Date(connectionDetails.updatedAt).toLocaleString() : 'Active'}
                  </p>
                </div>
                <Btn className="btn-subtle" onClick={disconnect} disabled={disconnecting}>
                  Disconnect
                </Btn>
              </div>
            )}

            {/* Step 1 */}
            <div className="setup-step">
              <span className="step-num">1</span>
              <div>
                <h3>Open the database in Google Sheets</h3>
                <p>The Dlbeen database spreadsheet is already structured with Profiles, Agreements, and Content tabs.</p>
                {driveInfo.spreadsheetUrl && (
                  <a className="btn" style={{ marginTop: 10 }} href={driveInfo.spreadsheetUrl} target="_blank" rel="noopener noreferrer">
                    <FileSpreadsheet size={16} /> Open Dlbeen Google Sheet <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>

            {/* Step 2 */}
            <div className="setup-step">
              <span className="step-num">2</span>
              <div>
                <h3>Add the connection script</h3>
                <p>
                  In your Google Sheet, open <b>Extensions → Apps Script</b>. Paste the prepared <b>Code.gs</b> script, click <b>Run → initializeSystem</b>, and complete Google authorization.
                </p>
                <div className="actions" style={{ marginTop: 10 }}>
                  <a className="btn" href="/integration/SETUP.html" target="_blank" rel="noopener noreferrer">
                    <FileText size={16} /> Setup visual guide
                  </a>
                  <a className="btn" href="/integration/Code.gs" download>
                    <Download size={16} /> Download Code.gs
                  </a>
                  <Btn onClick={() => setShowCode(!showCode)}>
                    <Copy size={16} /> {showCode ? 'Hide script' : 'View Code.gs here'}
                  </Btn>
                </div>
                {showCode && (
                  <div style={{ marginTop: 14 }}>
                    <iframe
                      src="/integration/Code.gs"
                      style={{
                        width: '100%',
                        height: 240,
                        border: '1px solid #dce4ef',
                        borderRadius: 8,
                        background: '#f8fafc',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Step 3 */}
            <div className="setup-step">
              <span className="step-num">3</span>
              <div>
                <h3>Deploy as Web App & enter connection keys</h3>
                <p>
                  In Apps Script, click <b>Deploy → New deployment → Web app</b>. Set <b>Execute as: Me</b> and <b>Who has access: Anyone</b>. Then in Google Sheets, choose <b>Dlbeen → Show connection key</b>.
                </p>
              </div>
            </div>

            {/* Connection Form */}
            <form onSubmit={connect} style={{ marginTop: 16 }}>
              {error && <div className="form-error">{error}</div>}
              <div className="form-grid">
                <label className="field full">
                  <span>Google Web App URL</span>
                  <input
                    type="url"
                    required
                    placeholder="https://script.google.com/macros/s/…/exec"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    autoComplete="off"
                  />
                  <small>Must end in /exec</small>
                </label>

                <label className="field full">
                  <span>Secret Connection Key</span>
                  <input
                    type="password"
                    required
                    minLength={16}
                    placeholder="From Extensions → Dlbeen → Show connection key in Google Sheets"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    autoComplete="off"
                  />
                  <small>Securely stored and used to sign requests to the web app</small>
                </label>
              </div>

              <Btn type="submit" primary disabled={busy} className="mt-4">
                {busy ? <Loader2 className="animate-spin" size={16} /> : <Link2 size={16} />}
                {busy ? 'Testing Google Drive connection…' : 'Test & save connection'}
              </Btn>
            </form>
          </div>
        </div>
      </div>

      {/* Right Column: System info & rules */}
      <div>
        <div className="panel">
          <div className="panel-head">
            <h2>Your Google Drive System Folder</h2>
          </div>
          <div className="panel-body">
            <img
              src="/brand/wordmark.jpg"
              alt="Dlbeen Group"
              style={{ width: '100%', marginBottom: 18, borderRadius: 8 }}
            />
            <p style={{ fontSize: 14, color: '#7387a3' }}>
              The database spreadsheet, creator profile photos, generated PDF/Excel reports, and setup files are stored together in your Google Drive.
            </p>
            {driveInfo.folderUrl && (
              <a
                className="btn"
                style={{ marginTop: 16 }}
                href={driveInfo.folderUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FolderOpen size={16} /> Open system folder <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>

        <div className="panel" style={{ marginTop: 24 }}>
          <div className="panel-head">
            <h2>Dlbeen Influencer System Rules</h2>
          </div>
          <div className="panel-body">
            <div className="attention-list">
              {[
                ['One row per deliverable', 'Each story frame, reel, or post has its own content record and performance metrics.'],
                ['Month-by-month agreements', 'Agreements are tracked month-by-month so historical performance is preserved.'],
                ['Currencies never mixed', 'IQD and USD commitments and ROI are calculated strictly in their respective currencies.'],
                ['True engagement calculations', 'Engagement rates are calculated only on deliverables with complete reach and engagement counts.'],
              ].map(([t, d]) => (
                <div key={t}>
                  <strong style={{ fontSize: 14 }}>{t}</strong>
                  <p style={{ fontSize: 13, color: '#8191a7', marginTop: 3 }}>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

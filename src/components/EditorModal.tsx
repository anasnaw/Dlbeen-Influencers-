import React, { useState } from 'react';
import { Upload, X, Loader2, Check } from 'lucide-react';
import {
  BRANDS,
  PLATFORMS,
  FORMATS,
  type Data,
  type RecordRow,
  type Entity,
} from '../lib/model';
import { Btn, Picker, Avatar } from './Common';

export type Field = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  hint?: string;
  required?: boolean;
  full?: boolean;
};

export const influencerFields: Field[] = [
  { key: 'name', label: 'Influencer name', required: true },
  { key: 'handle', label: 'Handle / username', hint: '@username' },
  { key: 'platform', label: 'Primary platform', required: true, options: PLATFORMS as any },
  { key: 'profile_url', label: 'Profile link', hint: 'https://instagram.com/…' },
  { key: 'phone', label: 'Phone number / WhatsApp' },
  { key: 'email', label: 'Email address', type: 'email' },
  { key: 'city', label: 'City / Region', hint: 'Erbil, Sulaymaniyah, Baghdad, Duhok…' },
  { key: 'language', label: 'Content language', hint: 'Kurdish, Arabic, English…' },
  { key: 'niche', label: 'Primary niche', hint: 'Beauty, Skincare, Haircare, Lifestyle…' },
  { key: 'followers', label: 'Followers count', type: 'number' },
  { key: 'engagement_rate', label: 'Engagement rate %', type: 'number', hint: 'e.g. 4.2' },
  { key: 'audience_local_pct', label: 'Local Iraq audience %', type: 'number', hint: 'e.g. 80' },
  { key: 'owner', label: 'Account manager / owner', hint: 'Team member responsible' },
  { key: 'status', label: 'Relationship status', required: true, options: ['Active', 'Prospect', 'Paused', 'Archived'] },
  { key: 'notes', label: 'Internal notes', type: 'textarea', full: true },
];

export const agreementFields: Field[] = [
  { key: 'month', label: 'Agreement month', type: 'month', required: true },
  { key: 'brand', label: 'Brand', required: true, options: BRANDS as any },
  { key: 'campaign', label: 'Campaign name', hint: 'e.g. Autumn Routine, Hair Serum Launch' },
  { key: 'goal', label: 'Campaign goal', options: ['Awareness', 'Sales / Orders', 'Product Launch', 'Event', 'Education'] },
  { key: 'stories', label: 'Stories agreed', type: 'number', required: true, hint: 'Each story frame logged separately' },
  { key: 'reels', label: 'Reels agreed', type: 'number', required: true },
  { key: 'posts', label: 'Posts agreed', type: 'number', required: true },
  { key: 'fee', label: 'Agreed fee amount', type: 'number', required: true },
  { key: 'currency', label: 'Currency', required: true, options: ['IQD', 'USD'] },
  { key: 'payment_status', label: 'Payment status', options: ['Pending', 'Paid', 'Overdue'] },
  { key: 'due_date', label: 'Deliverables due date', type: 'date', required: true },
  { key: 'renewal', label: 'Renewal recommendation', options: ['Yes', 'Maybe', 'No'] },
  { key: 'contract_url', label: 'Contract / Brief URL', hint: 'Google Drive file link' },
  { key: 'usage_rights', label: 'Usage rights terms', hint: 'e.g. Organic reposting 90 days' },
  { key: 'notes', label: 'Agreement notes', type: 'textarea', full: true },
];

export const contentFields: Field[] = [
  { key: 'title', label: 'Content title / description', required: true, full: true },
  { key: 'format', label: 'Deliverable format', required: true, options: FORMATS as any },
  { key: 'status', label: 'Publishing status', required: true, options: ['Planned', 'Draft', 'In review', 'Revision needed', 'Approved', 'Published'] },
  { key: 'due_date', label: 'Scheduled / Due date', type: 'date' },
  { key: 'published_at', label: 'Actual published date', type: 'date', hint: 'Required for published content' },
  { key: 'post_url', label: 'Live post / Story archive link', hint: 'Required for published items' },
  { key: 'reach', label: 'Unique reach', type: 'number', hint: 'From creator insights' },
  { key: 'views', label: 'Total video / story views', type: 'number' },
  { key: 'likes', label: 'Likes count', type: 'number' },
  { key: 'comments', label: 'Comments count', type: 'number' },
  { key: 'shares', label: 'Shares count', type: 'number' },
  { key: 'saves', label: 'Saves count', type: 'number' },
  { key: 'followers_gained', label: 'Attributed new followers', type: 'number' },
  { key: 'clicks', label: 'Bio link / Story sticker clicks', type: 'number' },
  { key: 'leads', label: 'Inquiries / Leads', type: 'number' },
  { key: 'orders', label: 'Attributed orders / promo code sales', type: 'number' },
  { key: 'revenue', label: 'Attributed sales revenue', type: 'number' },
  { key: 'metric_date', label: 'Date insights were logged', type: 'date' },
  { key: 'notes', label: 'Deliverable notes', type: 'textarea', full: true },
];

interface EditorModalProps {
  editor: { entity: Entity; row?: RecordRow };
  onClose: () => void;
  data: Data;
  month: string;
  onSave: (entity: Entity, row: RecordRow) => Promise<void>;
  configured: boolean;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function EditorModal({
  editor,
  onClose,
  data,
  month,
  onSave,
  configured,
  onNotify,
}: EditorModalProps) {
  const [draft, setDraft] = useState<RecordRow>(() => {
    if (editor.row) return { ...editor.row };
    const id = `${editor.entity.slice(0, 3)}-${crypto.randomUUID().slice(0, 8)}`;
    const base: RecordRow = { id };
    if (editor.entity === 'influencers') {
      return { ...base, platform: 'Instagram', status: 'Active', language: 'Kurdish / Arabic' };
    }
    if (editor.entity === 'agreements') {
      return {
        ...base,
        month,
        brand: BRANDS[0],
        currency: 'IQD',
        renewal: 'Maybe',
        payment_status: 'Pending',
        stories: 2,
        reels: 1,
        posts: 0,
        due_date: `${month}-25`,
        influencer_id: data.influencers[0]?.id || '',
      };
    }
    return {
      ...base,
      format: 'Story',
      status: 'Planned',
      agreement_id: data.agreements[0]?.id || '',
    };
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const put = (key: string, val: any) => setDraft((prev) => ({ ...prev, [key]: val }));

  const fields =
    editor.entity === 'influencers'
      ? influencerFields
      : editor.entity === 'agreements'
      ? agreementFields
      : contentFields;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(editor.entity, draft);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Validation error');
    } finally {
      setSaving(false);
    }
  }

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('Choose an image smaller than 2 MB.');
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new Error('Please select a JPG, PNG or WebP image.');
      }
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, mime: file.type, base64 }),
      });
      const p: any = await res.json();
      if (!res.ok) throw new Error(p.error || 'Upload failed');
      const photoId = p.id.startsWith('data:') ? p.id : `drive:${p.id}`;
      put('photo_url', photoId);
      onNotify('Profile photo uploaded successfully', 'success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="panel form-modal" style={{ width: '100%', maxWidth: 760, maxHeight: '90vh' }}>
        <div className="form-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>
              {editor.row?.id ? 'Edit' : 'New'}{' '}
              {editor.entity === 'influencers'
                ? 'influencer'
                : editor.entity === 'agreements'
                ? 'monthly agreement'
                : 'content deliverable'}
            </h2>
            <p>
              {editor.entity === 'content'
                ? 'Log single story frames, reels or posts. Leave unmeasured metrics blank.'
                : 'Saved into the Dlbeen database and synced to Google Sheets.'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            style={{ background: 'transparent', border: 0, cursor: 'pointer', color: '#687992' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
          <div className="form-scroll">
            {error && <div className="form-error">{error}</div>}

            <div className="form-grid">
              {/* Photo upload for influencers */}
              {editor.entity === 'influencers' && (
                <div className="field full">
                  <span>Profile Photo</span>
                  <div className="upload-line">
                    <Avatar row={draft} large />
                    <label className="btn" style={{ cursor: 'pointer' }}>
                      <Upload size={16} />
                      {uploading ? 'Uploading…' : 'Upload photo'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        hidden
                        disabled={uploading}
                        onChange={(e) => void upload(e.target.files?.[0])}
                      />
                    </label>
                  </div>
                  <small>JPG, PNG or WebP · up to 2 MB</small>
                </div>
              )}

              {/* Influencer selector for agreements */}
              {editor.entity === 'agreements' && (
                <div className="field full">
                  <span>Influencer *</span>
                  <Picker
                    label="Agreement influencer"
                    value={String(draft.influencer_id || '')}
                    onChange={(v) => put('influencer_id', v)}
                    options={data.influencers
                      .filter((i) => i.status !== 'Archived')
                      .map((i) => ({ value: i.id, label: String(i.name) }))}
                  />
                  {!data.influencers.length && <small style={{ color: '#b91c1c' }}>Add an influencer first.</small>}
                </div>
              )}

              {/* Agreement selector for content */}
              {editor.entity === 'content' && (
                <div className="field full">
                  <span>Monthly Agreement *</span>
                  <Picker
                    label="Content agreement"
                    value={String(draft.agreement_id || '')}
                    onChange={(v) => put('agreement_id', v)}
                    options={data.agreements.map((a) => ({
                      value: a.id,
                      label: `${data.influencers.find((i) => i.id === a.influencer_id)?.name || 'Unknown'} · ${a.brand} · ${a.month}`,
                    }))}
                  />
                  {!data.agreements.length && <small style={{ color: '#b91c1c' }}>Create an agreement first.</small>}
                </div>
              )}

              {/* Standard dynamic fields */}
              {fields.map((f) => (
                <div key={f.key} className={`field ${f.full ? 'full' : ''}`}>
                  <span>
                    {f.label}
                    {f.required ? ' *' : ''}
                  </span>
                  {f.options ? (
                    <Picker
                      label={f.label}
                      value={String(draft[f.key] || '')}
                      onChange={(v) => put(f.key, v)}
                      options={f.options}
                    />
                  ) : f.type === 'textarea' ? (
                    <textarea
                      maxLength={10000}
                      value={String(draft[f.key] || '')}
                      onChange={(e) => put(f.key, e.target.value)}
                    />
                  ) : (
                    <input
                      type={f.type || 'text'}
                      value={String(draft[f.key] ?? '')}
                      required={f.required}
                      min={f.type === 'number' ? 0 : undefined}
                      step={['engagement_rate', 'audience_local_pct', 'fee', 'revenue'].includes(f.key) ? '0.01' : '1'}
                      max={['engagement_rate', 'audience_local_pct'].includes(f.key) ? 100 : undefined}
                      onChange={(e) => put(f.key, e.target.value)}
                    />
                  )}
                  {f.hint && <small>{f.hint}</small>}
                </div>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <Btn onClick={onClose} disabled={saving}>
              Cancel
            </Btn>
            <Btn type="submit" primary disabled={saving || uploading}>
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
              {saving ? 'Saving…' : 'Save record'}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}

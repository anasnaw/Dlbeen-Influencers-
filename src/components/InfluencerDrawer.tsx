import React from 'react';
import { X, Pencil, ExternalLink } from 'lucide-react';
import {
  fmt,
  n,
  progress,
  monthLabel,
  type Data,
  type RecordRow,
} from '../lib/model';
import { Btn, Badge, Avatar } from './Common';

interface InfluencerDrawerProps {
  row: RecordRow;
  active: Data;
  onClose: () => void;
  onEdit: () => void;
}

export function InfluencerDrawer({
  row,
  active,
  onClose,
  onEdit,
}: InfluencerDrawerProps) {
  const agreements = active.agreements.filter((a) => a.influencer_id === row.id);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        zIndex: 998,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="detail-sheet"
        style={{
          width: 530,
          background: '#fff',
          height: '100%',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Influencer Profile</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: '#687992' }}>
            <X size={20} />
          </button>
        </div>
        <small style={{ color: '#8898aa', display: 'block', marginTop: 4 }}>
          Contact info, performance analytics, and collaboration history.
        </small>

        <div className="detail-hero">
          <Avatar row={row} large />
          <div>
            <h2>{String(row.name)}</h2>
            <div className="handle">
              {String(row.handle || '')} · {String(row.platform || 'Instagram')}
            </div>
            <div style={{ marginTop: 8 }}>
              <Badge value={row.status} />
            </div>
          </div>
        </div>

        <div className="actions">
          <Btn primary onClick={onEdit}>
            <Pencil size={15} /> Edit profile
          </Btn>
          {row.profile_url && (
            <a className="btn" href={String(row.profile_url)} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={15} /> Social profile
            </a>
          )}
        </div>

        <dl className="detail-grid">
          {[
            ['Phone / WhatsApp', row.phone],
            ['Email', row.email],
            ['City / Region', row.city],
            ['Language', row.language],
            ['Followers', row.followers ? fmt(n(row.followers)) : '—'],
            ['Profile ER', row.engagement_rate != null && row.engagement_rate !== '' ? `${row.engagement_rate}%` : '—'],
            ['Local audience %', row.audience_local_pct != null && row.audience_local_pct !== '' ? `${row.audience_local_pct}%` : '—'],
            ['Niche', row.niche],
            ['Account owner', row.owner],
            ['Last updated', row.updated_at ? String(row.updated_at).slice(0, 10) : '—'],
          ].map(([k, v]) => (
            <div key={String(k)}>
              <dt>{k}</dt>
              <dd>{String(v || 'Not specified')}</dd>
            </div>
          ))}
        </dl>

        <div className="detail-section">
          <h3>Internal Notes</h3>
          <p>{String(row.notes || 'No notes added for this creator yet.')}</p>
        </div>

        <div className="detail-section">
          <h3>Collaboration History</h3>
          {agreements.length ? (
            agreements
              .sort((a, b) => String(b.month).localeCompare(String(a.month)))
              .map((a) => {
                const pr = progress(a, active.content);
                return (
                  <div className="agreement-row" key={a.id}>
                    <div>
                      <b>{monthLabel(String(a.month))}</b>
                      <Badge value={a.renewal} />
                    </div>
                    <p>
                      {String(a.brand)} · {pr.credited}/{pr.agreed} delivered · {fmt(n(a.fee))} {String(a.currency)}
                    </p>
                  </div>
                );
              })
          ) : (
            <p>No monthly agreements recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

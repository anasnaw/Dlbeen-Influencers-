import React, { useState, useEffect } from 'react';
import { Users, Check, AlertCircle, X } from 'lucide-react';
import type { RecordRow } from '../lib/model';

export function Picker({
  value,
  onChange,
  options,
  label,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  options: (string | { value: string; label: string })[];
  label: string;
  className?: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`select-control border border-[#d7dfeb] px-3 py-1.5 text-sm bg-white rounded-lg focus:outline-none focus:border-[#2672ed] ${className}`}
    >
      {options.map((opt) => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const lbl = typeof opt === 'string' ? opt : opt.label;
        return (
          <option key={val} value={val}>
            {lbl}
          </option>
        );
      })}
    </select>
  );
}

export function Btn({
  children,
  onClick,
  primary = false,
  disabled = false,
  className = '',
  style,
  type = 'button',
  title,
}: {
  children: React.ReactNode;
  onClick?: (e?: any) => void;
  primary?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={style}
      title={title}
      className={`btn ${primary ? 'primary' : ''} ${className}`}
    >
      {children}
    </button>
  );
}

export function Badge({ value }: { value: unknown }) {
  const v = String(value || 'Not set');
  const color = ['Yes', 'Paid', 'Published', 'Active', 'Approved'].includes(v)
    ? 'green'
    : ['Maybe', 'Pending', 'In review', 'Draft', 'Prospect'].includes(v)
    ? 'amber'
    : ['No', 'Overdue', 'Revision needed', 'Paused', 'Archived'].includes(v)
    ? 'red'
    : 'blue';
  return <span className={`badge ${color}`}>{v}</span>;
}

export function Avatar({ row, large = false }: { row: RecordRow; large?: boolean }) {
  const [broken, setBroken] = useState(false);
  const raw = String(row?.photo_url || '');
  const src = raw.startsWith('drive:') ? `/api/image?id=${raw.slice(6)}` : raw;
  const initial = String(row?.name || '?').trim().charAt(0).toUpperCase();

  if (src && !broken) {
    return (
      <img
        src={src}
        alt={String(row.name || 'Avatar')}
        className={`avatar ${large ? 'large' : ''}`}
        onError={() => setBroken(true)}
      />
    );
  }
  return <div className={`avatar ${large ? 'large' : ''}`}>{initial}</div>;
}

export function Empty({
  icon: Icon = Users,
  title,
  text,
  action,
}: {
  icon?: any;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Icon />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function Metric({
  label,
  value,
  sub,
  icon: Icon,
  featured = false,
}: {
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
  icon: any;
  featured?: boolean;
}) {
  return (
    <div className={`metric ${featured ? 'featured' : ''}`}>
      <div className="metric-label">
        <span>{label}</span>
        <span className="metric-icon">
          <Icon size={17} />
        </span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-foot">{sub}</div>
    </div>
  );
}

export function ToastMessage({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg = type === 'success' ? '#176538' : type === 'error' ? '#991b1b' : '#1e3a8a';
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: bg,
        color: '#fff',
        padding: '12px 20px',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        fontSize: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{ background: 'transparent', border: 0, color: '#fff', cursor: 'pointer', marginLeft: 8 }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

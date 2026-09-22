export type Platform = 'Instagram' | 'TikTok' | 'Facebook' | 'YouTube' | 'Snapchat';

export type Brand = 'DS Labs' | 'Dlbeen Care' | 'Fidia' | 'Potafast' | 'Miradent' | 'Amani' | 'Other';

export type Format = 'Story' | 'Reel' | 'Post';

export type Currency = 'IQD' | 'USD';

export type InfluencerStatus = 'Active' | 'Prospect' | 'Paused' | 'Archived';

export type PaymentStatus = 'Paid' | 'Pending' | 'Overdue';

export type RenewalStatus = 'Yes' | 'No' | 'Maybe';

export type ContentStatus =
  | 'Planned'
  | 'Draft'
  | 'In review'
  | 'Revision needed'
  | 'Approved'
  | 'Published';

export type RecordRow = { id: string; [key: string]: string | number | null };

export interface InfluencerRecord extends RecordRow {
  id: string;
  name: string;
  handle: string;
  platform: Platform;
  profile_url: string;
  photo_url: string;
  phone: string;
  email: string;
  city: string;
  language: string;
  niche: string;
  followers: number;
  engagement_rate: number;
  audience_local_pct: number;
  owner: string;
  status: InfluencerStatus;
  notes: string;
  updated_at: string;
}

export interface AgreementRecord extends RecordRow {
  id: string;
  influencer_id: string;
  month: string; // YYYY-MM
  brand: Brand;
  campaign: string;
  goal: string;
  stories: number;
  reels: number;
  posts: number;
  fee: number;
  currency: Currency;
  payment_status: PaymentStatus;
  due_date: string; // YYYY-MM-DD
  renewal: RenewalStatus;
  contract_url: string;
  usage_rights: string;
  exclusivity: string;
  notes: string;
  updated_at: string;
}

export interface ContentRecord extends RecordRow {
  id: string;
  agreement_id: string;
  title: string;
  format: Format;
  status: ContentStatus;
  due_date: string;
  published_at: string;
  post_url: string;
  reach: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  followers_gained: number | null;
  clicks: number | null;
  leads: number | null;
  orders: number | null;
  revenue: number | null;
  metric_date: string;
  evidence_url: string;
  notes: string;
  updated_at: string;
}

export interface Data {
  influencers: RecordRow[];
  agreements: RecordRow[];
  content: RecordRow[];
}

export type Entity = 'influencers' | 'agreements' | 'content';

export interface Filters {
  month: string;
  brand: string;
  influencer: string;
  currency: string;
}

export interface FormatProgress {
  format: string;
  agreed: number;
  done: number;
}

export interface ProgressResult {
  rows: FormatProgress[];
  agreed: number;
  done: number;
  credited: number;
  remaining: number;
  percent: number;
}

export interface SummaryResult {
  agreements: RecordRow[];
  content: RecordRow[];
  published: RecordRow[];
  fee: number;
  engagements: number;
  reach: number;
  followers: number;
  views: number;
  remaining: number;
  agreed: number;
  credited: number;
  overdue: RecordRow[];
  add: (key: string) => number;
  coverage: number;
  er: number | null;
  cpe: number | null;
  cpf: number | null;
  roas: number | null;
  percent: number;
}

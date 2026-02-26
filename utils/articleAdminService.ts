import Constants from 'expo-constants';
import { Article, ArticleCategory, ArticleLanguage } from '@/types/articles';
import { calculateReadingTime } from '@/utils/articleService';
import { sanitizeArticleHtml } from '@/utils/articleHtml';

const SESSION_TTL_MS = 30 * 60 * 1000;

const extra = (Constants.expoConfig?.extra || (Constants as any).manifest?.extra || {}) as {
  supabaseUrl?: string;
  articleAdminUrl?: string;
};
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || '';
const ARTICLE_ADMIN_URL =
  process.env.EXPO_PUBLIC_ARTICLE_ADMIN_URL ||
  extra.articleAdminUrl ||
  (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/article-admin` : '');

interface AdminSession {
  pin: string;
  expiresAt: number;
}

interface AdminResult {
  ok?: boolean;
  error?: string;
}

interface ArticleRow {
  id: string;
  title: string;
  language: ArticleLanguage;
  author_id: string;
  author_name: string;
  category: ArticleCategory;
  body: string;
  audio_url?: string | null;
  published: boolean;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
  reading_time_estimate?: number;
  view_count?: number;
  bookmark_count?: number;
  draft?: boolean;
  notification_sent?: boolean;
}

let adminSession: AdminSession | null = null;

function sessionIsActive(): boolean {
  return !!adminSession && adminSession.expiresAt > Date.now();
}

function refreshSessionExpiry(): void {
  if (!adminSession) return;
  adminSession.expiresAt = Date.now() + SESSION_TTL_MS;
}

function setSession(pin: string): void {
  adminSession = {
    pin,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
}

function clearSession(): void {
  adminSession = null;
}

function getSessionPin(): string {
  if (!sessionIsActive()) {
    clearSession();
    throw new Error('ARTICLE_ADMIN_SESSION_EXPIRED');
  }
  refreshSessionExpiry();
  return adminSession!.pin;
}

function assertConfigured(): void {
  if (!ARTICLE_ADMIN_URL) {
    throw new Error('ARTICLE_ADMIN_URL_MISSING');
  }
}

function rowToArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    title: row.title || '',
    language: row.language || 'dari',
    authorId: row.author_id,
    authorName: row.author_name || '',
    category: row.category || 'iman',
    body: row.body || '',
    audioUrl: row.audio_url || undefined,
    published: row.published || false,
    publishedAt: row.published_at ? new Date(row.published_at) : undefined,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    readingTimeEstimate: row.reading_time_estimate || 1,
    viewCount: row.view_count || 0,
    bookmarkCount: row.bookmark_count || 0,
    draft: row.draft || false,
    notificationSent: row.notification_sent || false,
  };
}

async function callArticleAdmin<T>(
  action: string,
  payload?: Record<string, unknown>,
  options?: { pin?: string; skipSession?: boolean }
): Promise<T> {
  assertConfigured();

  const pin = options?.pin || (options?.skipSession ? '' : getSessionPin());
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (pin) {
    headers['x-admin-pin'] = pin;
  }

  const response = await fetch(ARTICLE_ADMIN_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...payload }),
  });

  const responseText = await response.text().catch(() => '');
  let parsed: T;
  try {
    parsed = responseText ? (JSON.parse(responseText) as T) : ({} as T);
  } catch {
    parsed = {} as T;
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      throw new Error('ARTICLE_ADMIN_UNAUTHORIZED');
    }

    const errorMessage =
      (parsed as AdminResult)?.error ||
      (typeof parsed === 'string' ? parsed : '') ||
      response.statusText ||
      'ARTICLE_ADMIN_REQUEST_FAILED';
    throw new Error(errorMessage);
  }

  if (!options?.skipSession) {
    refreshSessionExpiry();
  }

  return parsed;
}

export interface ArticleComposerPayload {
  title: string;
  language: ArticleLanguage;
  category: ArticleCategory;
  body: string;
  authorId: string;
  authorName: string;
  published?: boolean;
}

export interface PublishResult {
  published: boolean;
  sent: number;
  failed: number;
  skipped?: boolean;
}

export function isAdminSessionActive(): boolean {
  return sessionIsActive();
}

export function clearAdminSession(): void {
  clearSession();
}

export async function verifyPin(pin: string): Promise<boolean> {
  const normalizedPin = pin.trim();
  if (!normalizedPin) return false;

  try {
    const result = await callArticleAdmin<{ ok: boolean }>('verify_pin', { pin: normalizedPin }, {
      pin: normalizedPin,
      skipSession: true,
    });

    if (!result.ok) {
      return false;
    }

    setSession(normalizedPin);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message === 'ARTICLE_ADMIN_UNAUTHORIZED') {
      return false;
    }
    throw error;
  }
}

export async function listArticles(): Promise<Article[]> {
  const result = await callArticleAdmin<{ articles: ArticleRow[] }>('list_articles');
  return (result.articles || []).map(rowToArticle);
}

export async function createArticleByAdmin(payload: ArticleComposerPayload): Promise<Article> {
  const body = sanitizeArticleHtml(payload.body);
  const readingTime = calculateReadingTime(body);

  const result = await callArticleAdmin<{ article: ArticleRow }>('create_article', {
    title: payload.title.trim(),
    language: payload.language,
    category: payload.category,
    body,
    author_id: payload.authorId,
    author_name: payload.authorName,
    published: payload.published === true,
    reading_time_estimate: readingTime,
  });

  return rowToArticle(result.article);
}

export async function updateArticleByAdmin(articleId: string, payload: ArticleComposerPayload): Promise<Article> {
  const body = sanitizeArticleHtml(payload.body);
  const readingTime = calculateReadingTime(body);

  const result = await callArticleAdmin<{ article: ArticleRow }>('update_article', {
    id: articleId,
    title: payload.title.trim(),
    language: payload.language,
    category: payload.category,
    body,
    author_id: payload.authorId,
    author_name: payload.authorName,
    reading_time_estimate: readingTime,
  });

  return rowToArticle(result.article);
}

export async function deleteArticleByAdmin(articleId: string): Promise<void> {
  await callArticleAdmin<{ ok: boolean }>('delete_article', { id: articleId });
}

export async function publishArticleByAdmin(articleId: string): Promise<PublishResult> {
  const result = await callArticleAdmin<PublishResult>('publish_article', { id: articleId });
  return {
    published: !!result.published,
    sent: Number(result.sent || 0),
    failed: Number(result.failed || 0),
    skipped: !!result.skipped,
  };
}

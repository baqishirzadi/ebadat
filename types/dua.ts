/**
 * Dua Request & Islamic Consultation Types
 */

export type DuaCategory = 'dua' | 'advice' | 'personal' | 'other';

export type RequestStatus = 'pending' | 'answered' | 'closed';

export type UserGender = 'male' | 'female' | 'unspecified';

export interface DuaRequest {
  id: string;
  userId: string;
  category: DuaCategory;
  message: string;
  gender?: UserGender;
  isAnonymous: boolean;
  status: RequestStatus;
  createdAt: Date;
  answeredAt?: Date;
  response?: string;
  reviewerId?: string;
  reviewerName?: string;
}

export interface UserMetadata {
  id: string;
  deviceToken?: string;
  notificationEnabled: boolean;
  createdAt: Date;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'reviewer' | 'admin';
  isActive: boolean;
}

export interface CategoryInfo {
  id: DuaCategory;
  nameDari: string;
  namePashto: string;
  icon: string;
  description: string;
}

export const DUA_CATEGORIES: CategoryInfo[] = [
  {
    id: 'dua',
    nameDari: 'دعای خیر',
    namePashto: 'دعا',
    icon: 'favorite',
    description: 'درخواست دعای خیر و طلب رحمت',
  },
  {
    id: 'advice',
    nameDari: 'مشورت شرعی',
    namePashto: 'شرعي مشوره',
    icon: 'school',
    description: 'راهنمایی و مشورت طبق فقه حنفی',
  },
  {
    id: 'personal',
    nameDari: 'مسائل شخصی',
    namePashto: 'شخصي مسایل',
    icon: 'person',
    description: 'مسائل و مشکلات شخصی',
  },
  {
    id: 'other',
    nameDari: 'سایر',
    namePashto: 'نور',
    icon: 'help',
    description: 'سایر درخواست‌ها',
  },
];

export const STATUS_INFO: Record<RequestStatus, { nameDari: string; namePashto: string; color: string }> = {
  pending: {
    nameDari: 'در انتظار',
    namePashto: 'پاتې',
    color: '#F59E0B',
  },
  answered: {
    nameDari: 'پاسخ داده شده',
    namePashto: 'ځواب شوی',
    color: '#10B981',
  },
  closed: {
    nameDari: 'بسته شده',
    namePashto: 'تړل شوی',
    color: '#6B7280',
  },
};

export const GENDER_INFO: Record<UserGender, { nameDari: string; namePashto: string }> = {
  male: {
    nameDari: 'برادر',
    namePashto: 'ورور',
  },
  female: {
    nameDari: 'خواهر',
    namePashto: 'خور',
  },
  unspecified: {
    nameDari: 'نامشخص',
    namePashto: 'نامعلوم',
  },
};

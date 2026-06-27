import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export interface DevUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

export const DEV_USERS: DevUser[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    username: "ahnaf",
    displayName: "Ahnaf Karim",
    avatarUrl: "https://i.pravatar.cc/300?u=ahnaf",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    username: "mim",
    displayName: "Mim Tabassum",
    avatarUrl: "https://i.pravatar.cc/300?u=mim",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    username: "rifat",
    displayName: "Rifat Hasan",
    avatarUrl: "https://i.pravatar.cc/300?u=rifat",
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    username: "tania",
    displayName: "Tania Akter",
    avatarUrl: "https://i.pravatar.cc/300?u=tania",
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    username: "shuvo",
    displayName: "Shuvo Ahmed",
    avatarUrl: "https://i.pravatar.cc/300?u=shuvo",
  },
  {
    id: "00000000-0000-4000-8000-000000000006",
    username: "nusrat",
    displayName: "Nusrat Jahan",
    avatarUrl: "https://i.pravatar.cc/300?u=nusrat",
  },
  {
    id: "00000000-0000-4000-8000-000000000007",
    username: "tanvir",
    displayName: "Tanvir Islam",
    avatarUrl: "https://i.pravatar.cc/300?u=tanvir",
  },
  {
    id: "00000000-0000-4000-8000-000000000008",
    username: "shara",
    displayName: "Shara Rahman",
    avatarUrl: "https://i.pravatar.cc/300?u=shara",
  },
];

export const DEV_USER_STORAGE_KEY = "himewo_dev_user_id";

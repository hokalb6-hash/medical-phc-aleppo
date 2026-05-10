export type AppRole = "super_admin" | "center_manager" | "center_user";

export type Profile = {
  id: string;
  full_name: string;
  role: AppRole;
  center_id: string | null;
};

export type MedicalCenter = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type Clinic = {
  id: string;
  center_id: string;
  name: string;
  clinic_type: string;
  is_active: boolean;
  created_at: string;
};

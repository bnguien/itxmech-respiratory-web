export type DoctorProfile = {
  id: string;
  full_name: string;
  professional_title: string | null;
  specialty: string | null;
  department: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export interface AuthenticatedDoctor {
  email: string;
  profile: DoctorProfile | null;
}

export type Database = {
  public: {
    Tables: {
      doctor_profiles: {
        Row: DoctorProfile;
        Insert: Omit<DoctorProfile, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DoctorProfile, "id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { AuthenticatedDoctor, DoctorProfile } from "@/types/auth";

interface DoctorProfileContextValue extends AuthenticatedDoctor {
  setProfile: (profile: DoctorProfile) => void;
}

const DoctorProfileContext = createContext<DoctorProfileContextValue | null>(null);

export function DoctorProfileProvider({
  doctor,
  children,
}: {
  doctor: AuthenticatedDoctor;
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState(doctor.profile);
  const value = useMemo(
    () => ({ email: doctor.email, profile, setProfile }),
    [doctor.email, profile],
  );

  return (
    <DoctorProfileContext.Provider value={value}>
      {children}
    </DoctorProfileContext.Provider>
  );
}

export function useDoctorProfile() {
  const value = useContext(DoctorProfileContext);

  if (!value) {
    throw new Error("useDoctorProfile must be used within DoctorProfileProvider");
  }

  return value;
}

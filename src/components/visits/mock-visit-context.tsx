"use client";
import { createContext, useContext, useMemo, useState } from "react";
import type { Visit } from "@/types/clinical";

type MockVisitContextValue = {
  completedVisits: Visit[];
  addCompletedVisit: (visit: Visit) => void;
};
const MockVisitContext = createContext<MockVisitContextValue | null>(null);

export function MockVisitProvider({ children }: { children: React.ReactNode }) {
  const [completedVisits, setCompletedVisits] = useState<Visit[]>([]);
  const value = useMemo(
    () => ({
      completedVisits,
      addCompletedVisit: (visit: Visit) =>
        setCompletedVisits((current) => [
          visit,
          ...current.filter((item) => item.id !== visit.id),
        ]),
    }),
    [completedVisits],
  );
  return (
    <MockVisitContext.Provider value={value}>
      {children}
    </MockVisitContext.Provider>
  );
}

export function useMockVisits() {
  const value = useContext(MockVisitContext);
  if (!value)
    throw new Error("useMockVisits must be used inside MockVisitProvider");
  return value;
}

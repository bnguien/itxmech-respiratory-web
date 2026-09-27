import { alerts, devices, patients, recordings } from "@/constants/mock-data";

export const clinicalService = {
  getPatients: () => patients,
  getPatient: (id: string) => patients.find((item) => item.id === id),
  getRecordings: () => recordings,
  getRecording: (id: string) => recordings.find((item) => item.id === id),
  getAlerts: () => alerts,
  getDevices: () => devices,
};

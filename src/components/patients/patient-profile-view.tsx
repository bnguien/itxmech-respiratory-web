"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PatientDetail } from "@/components/patients/patient-detail";
import { ArchivePatientModal } from "@/components/patients/archive-patient-modal";
import { PatientDetailSkeleton } from "@/components/ui/skeleton";
import type { Patient } from "@/types/clinical";
import type { PatientRecord } from "@/types/patient";
import { PatientDateField, PatientGenderField, PatientNameField } from "@/components/ui/patient-form-fields";

const genderLabels = { male: "Nam", female: "Nữ", other: "Khác" } as const;

function toPatient(record: PatientRecord): Patient {
  const birth = new Date(`${record.date_of_birth}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  )
    age -= 1;
  return {
    id: record.id,
    code: record.patient_code,
    name: record.full_name,
    age,
    gender: genderLabels[record.gender],
    phone: record.phone || "Chưa cập nhật",
    diagnosis: record.background_diagnosis || "Chưa ghi nhận",
    spo2: 0,
    sound: "Normal",
    confidence: 0,
    needsAttention: false,
    visits: [],
  };
}

export function PatientProfileView({ id }: { id: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/patients/${id}`, { cache: "no-store" });
    const payload = (await response.json()) as {
      data?: PatientRecord;
      error?: { message?: string };
    };
    if (response.status === 404) {
      router.replace("/patients");
      return;
    }
    if (!response.ok || !payload.data)
      setError(payload.error?.message || "Không thể tải hồ sơ bệnh nhân.");
    else setRecord(payload.data);
    setLoading(false);
  }, [id, router]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function archive() {
    setArchiving(true);
    const response = await fetch(`/api/patients/${id}/archive`, { method: "POST" });
    if (response.ok) {
      router.push("/patients");
      router.refresh();
      return;
    }
    const payload = (await response.json()) as { error?: { message?: string } };
    setError(payload.error?.message || "Không thể lưu trữ hồ sơ bệnh nhân.");
    setArchiving(false);
  }
  async function restore() {
    setRestoring(true);
    const response = await fetch(`/api/patients/${id}/restore`, { method: "POST" });
    if (response.ok) {
      await load();
      setRestoring(false);
      return;
    }
    const payload = (await response.json()) as { error?: { message?: string } };
    setError(payload.error?.message || "Không thể khôi phục hồ sơ bệnh nhân.");
    setRestoring(false);
  }
  if (loading) return <PatientDetailSkeleton />;
  if (error || !record)
    return (
      <div className="p-8 text-sm text-red-600">
        {error || "Không tìm thấy bệnh nhân."}
      </div>
    );
  return (
    <>
      <PatientDetail
        patient={toPatient(record)}
        patientRecordings={[]}
        isArchived={Boolean(record.archived_at)}
        onEdit={record.archived_at ? undefined : () => setEditing(true)}
        onArchive={record.archived_at ? undefined : () => setConfirmingArchive(true)}
        onRestore={record.archived_at ? () => void restore() : undefined}
        restoring={restoring}
        hasClinicalData={false}
      />
      {editing && (
        <EditPatientModal
          patient={record}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setRecord(updated);
            setEditing(false);
          }}
        />
      )}
      {confirmingArchive && <ArchivePatientModal patientName={record.full_name} isArchiving={archiving} onClose={() => setConfirmingArchive(false)} onConfirm={() => void archive()} />}
    </>
  );
}

export function EditPatientModal({
  patient,
  onClose,
  onSaved,
}: {
  patient: PatientRecord;
  onClose: () => void;
  onSaved: (patient: PatientRecord) => void;
}) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/patients/${patient.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: form.get("full_name"),
        date_of_birth: form.get("date_of_birth"),
        gender: form.get("gender"),
        phone: form.get("phone"),
        background_diagnosis: form.get("background_diagnosis"),
      }),
    });
    const payload = (await response.json()) as {
      data?: PatientRecord;
      error?: { message?: string; details?: Array<{ message: string }> };
    };
    setSaving(false);
    if (!response.ok || !payload.data)
      setError(
        payload.error?.details?.[0]?.message ||
          payload.error?.message ||
          "Không thể cập nhật hồ sơ.",
      );
    else onSaved(payload.data);
  }
  return (
    <div onClick={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }} className="fixed inset-0 z-[70] flex items-center justify-center bg-[#173A5E]/45 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-xl space-y-4 rounded-3xl bg-white p-6 shadow-2xl"
      >
        <h2 className="text-lg font-bold">Chỉnh sửa hồ sơ bệnh nhân</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 text-xs font-semibold text-[#5A7799]">
            Họ và tên
            <PatientNameField defaultValue={patient.full_name} />
          </label>
          <label className="text-xs font-semibold text-[#5A7799]">
            Ngày sinh
            <PatientDateField required name="date_of_birth" defaultValue={patient.date_of_birth} />
          </label>
          <label className="text-xs font-semibold text-[#5A7799]">
            Giới tính
            <PatientGenderField name="gender" defaultValue={patient.gender} />
          </label>
          <label className="col-span-2 text-xs font-semibold text-[#5A7799]">
            Số điện thoại
            <input
              name="phone"
              defaultValue={patient.phone || ""}
              className="field mt-1"
            />
          </label>
          <label className="col-span-2 text-xs font-semibold text-[#5A7799]">
            Chẩn đoán nền
            <input
              name="background_diagnosis"
              defaultValue={patient.background_diagnosis || ""}
              className="field mt-1"
            />
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Hủy
          </button>
          <button disabled={saving} className="btn-primary">
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </div>
  );
}

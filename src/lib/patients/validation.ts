import type { PatientGender, PatientInput } from "@/types/patient";

export interface ValidationIssue {
  field: string;
  message: string;
}

const genders = new Set<PatientGender>(["male", "female", "other"]);
const allowedFields = new Set([
  "full_name",
  "date_of_birth",
  "gender",
  "phone",
  "background_diagnosis",
]);

function optionalText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  return value.trim() || null;
}

export function validatePatientInput(
  value: unknown,
  partial = false,
): { data?: Partial<PatientInput>; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      issues: [{ field: "body", message: "Dữ liệu gửi lên không hợp lệ." }],
    };
  }

  const input = value as Record<string, unknown>;
  const unknownField = Object.keys(input).find(
    (key) => !allowedFields.has(key),
  );
  if (unknownField) {
    issues.push({
      field: unknownField,
      message: "Trường dữ liệu này không được phép cập nhật.",
    });
  }

  const data: Partial<PatientInput> = {};
  if (!partial || "full_name" in input) {
    if (typeof input.full_name !== "string" || !input.full_name.trim()) {
      issues.push({ field: "full_name", message: "Vui lòng nhập họ và tên." });
    } else {
      data.full_name = input.full_name.trim();
    }
  }

  if (!partial || "date_of_birth" in input) {
    if (
      typeof input.date_of_birth !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(input.date_of_birth)
    ) {
      issues.push({
        field: "date_of_birth",
        message: "Vui lòng nhập ngày sinh hợp lệ.",
      });
    } else {
      const parsed = new Date(`${input.date_of_birth}T00:00:00Z`);
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== input.date_of_birth) {
        issues.push({
          field: "date_of_birth",
          message: "Ngày sinh không hợp lệ.",
        });
      } else if (parsed > today) {
        issues.push({
          field: "date_of_birth",
          message: "Ngày sinh không được ở trong tương lai.",
        });
      } else {
        data.date_of_birth = input.date_of_birth;
      }
    }
  }

  if (!partial || "gender" in input) {
    if (
      typeof input.gender !== "string" ||
      !genders.has(input.gender as PatientGender)
    ) {
      issues.push({
        field: "gender",
        message: "Vui lòng chọn giới tính hợp lệ.",
      });
    } else {
      data.gender = input.gender as PatientGender;
    }
  }

  for (const field of ["phone", "background_diagnosis"] as const) {
    if (field in input) {
      if (input[field] !== null && typeof input[field] !== "string") {
        issues.push({
          field,
          message:
            field === "phone"
              ? "Số điện thoại không hợp lệ."
              : "Chẩn đoán nền không hợp lệ.",
        });
      } else {
        data[field] = optionalText(input[field]);
      }
    }
  }

  if (partial && Object.keys(input).length === 0) {
    issues.push({
      field: "body",
      message: "Vui lòng cung cấp dữ liệu cần cập nhật.",
    });
  }

  return { data: issues.length ? undefined : data, issues };
}

export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface VisitValidationIssue {
  field: string;
  message: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateVisitUpdate(value: unknown): {
  data?: { clinical_note: string; version: number };
  issues: VisitValidationIssue[];
} {
  if (!isObject(value)) {
    return {
      issues: [{ field: "body", message: "Dữ liệu gửi lên không hợp lệ." }],
    };
  }
  const issues: VisitValidationIssue[] = [];
  const allowed = new Set(["clinical_note", "version"]);
  const unknown = Object.keys(value).find((field) => !allowed.has(field));
  if (unknown)
    issues.push({
      field: unknown,
      message: "Trường dữ liệu này không được phép cập nhật.",
    });
  if (typeof value.clinical_note !== "string")
    issues.push({
      field: "clinical_note",
      message: "Ghi chú lâm sàng phải là chuỗi.",
    });
  if (!Number.isInteger(value.version) || Number(value.version) < 1)
    issues.push({ field: "version", message: "Version phải là số nguyên từ 1." });

  return {
    data: issues.length
      ? undefined
      : {
          clinical_note: value.clinical_note as string,
          version: value.version as number,
        },
    issues,
  };
}

export function validateVisitVersion(value: unknown): {
  version?: number;
  issues: VisitValidationIssue[];
} {
  if (!isObject(value))
    return {
      issues: [{ field: "body", message: "Dữ liệu gửi lên không hợp lệ." }],
    };
  const unknown = Object.keys(value).find((field) => field !== "version");
  if (unknown)
    return {
      issues: [{ field: unknown, message: "Trường dữ liệu này không hợp lệ." }],
    };
  if (!Number.isInteger(value.version) || Number(value.version) < 1)
    return {
      issues: [
        { field: "version", message: "Version phải là số nguyên từ 1." },
      ],
    };
  return { version: value.version as number, issues: [] };
}

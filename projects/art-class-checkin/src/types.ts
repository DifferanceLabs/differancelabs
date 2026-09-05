export type Role = "staff" | "admin";
export type Status = "Expected" | "Present" | "Released" | "Absent";
export type Verification = "Known to staff" | "Photo ID checked";
export interface StudentData {
  name: string;
  guardianName: string;
  guardianPhone: string;
  emergencyName: string;
  emergencyPhone: string;
  safetyNote: string;
  archived: boolean;
}
export interface AdultData {
  name: string;
  phone: string;
  photoPath?: string | null;
}
export interface ClassData {
  name: string;
  instructor: string;
  studentIds: string[];
  archived: boolean;
}
export interface Entity<T> {
  id: string;
  data: T;
  version: number;
}
export interface Permission {
  id: string;
  student_id: string;
  adult_id: string;
  approved: boolean;
  relationship: string;
  note: string;
  changed_at: string;
  version: number;
}
export interface ClassSession {
  id: string;
  class_id: string;
  date: string;
  snapshot: { name: string; instructor: string; timezone: string };
  created_at: string;
  created_by: string;
  present_count?: number;
}
export interface Payment {
  confirmed: boolean;
  method?: string;
  amountCents?: number | null;
  paymentDate?: string | null;
  note?: string;
  confirmedBy?: string;
  confirmedAt?: string | null;
  recordedAt?: string;
  source?: string;
  paperStaffInitials?: string;
}
export interface Release {
  adultId: string;
  name: string;
  phone?: string;
  relationship?: string;
  permissionId?: string;
  verification: Verification;
  staff?: string;
  recordedBy?: string;
  paperStaffInitials?: string;
  authorization?: unknown;
  authorizationNote?: string;
}
export interface RosterRow {
  id: string;
  session_id: string;
  student_id: string;
  student_snapshot: StudentData;
  status: Status;
  arrival_at: string | null;
  departure_at: string | null;
  release: Release | null;
  attendance_version: number;
  payment_version: number;
  payment: Payment;
}
export interface AuditEvent {
  id: string;
  sequence: number;
  kind: string;
  actor: string;
  actual_at: string;
  recorded_at: string;
  source: string;
  reason?: string;
  before_value: unknown;
  after_value: unknown;
  roster_id?: string;
  subject_id?: string;
}
export interface HistoryRow extends RosterRow {
  session: ClassSession;
  events: AuditEvent[];
}
export interface Bootstrap {
  user: { email: string; role: Role };
  settings: {
    id: string;
    kind: "demo" | "live";
    business_name: string;
    timezone: string;
    schema_version: number;
  };
  students: Entity<StudentData>[];
  adults: Entity<AdultData>[];
  permissions: Permission[];
  classes: Entity<ClassData>[];
  sessions: ClassSession[];
  staff: { email: string; role: string }[];
}
export interface Snapshot {
  demo?: boolean;
  session: ClassSession;
  roster: RosterRow[];
  students: Entity<StudentData>[];
  adults: Entity<AdultData>[];
  permissions: Permission[];
  business: string;
  printedAt: string;
  backupId?: string;
  printedBy?: string;
}
export interface SaveResult {
  ok: true;
  id: string;
  operationId: string;
  recordedAt: string;
  value: unknown;
}

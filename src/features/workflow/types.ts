/**
 * Data model for the autonomous customer-experience platform.
 * Every record has a unique id; related records reference each other by id.
 */

export type WorkflowStatus =
  | "pending"
  | "in_progress"
  | "waiting_for_customer"
  | "waiting_for_external_system"
  | "blocked"
  | "escalated"
  | "completed"
  | "failed";

export type WorkflowType = "relocation" | "temp_internet" | "outage_recovery" | "billing_check" | "ai_usta" | "proactive_fault" | "speed_optimize";

export type StepStatus = "pending" | "in_progress" | "waiting" | "done" | "failed" | "skipped";

export interface WorkflowStep {
  key: string;
  label: string;
  status: StepStatus;
  note?: string;
  at?: number;
}

export interface DecisionOption {
  id: string;
  label: string;
  desc?: string;
  primary?: boolean;
  terms?: string[];
}

export interface Decision {
  key: string;
  prompt: string;
  detail?: string;
  options: DecisionOption[];
  askedAt: number;
}

export interface DecisionRecord {
  key: string;
  optionId: string;
  label: string;
  by: Actor;
  at: number;
}

export interface Handoff {
  id: string;
  team: string;
  reason: string;
  at: number;
  context: string[];
}

export interface Outcome {
  resolved: boolean;
  summary: string;
  results: string[];
}

export interface Workflow {
  id: string;
  customerId: string;
  subscriptionId: string;
  type: WorkflowType;
  title: string;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  nextStep: string | null;
  createdAt: number;
  updatedAt: number;
  decision: Decision | null;
  decisions: DecisionRecord[];
  blocker: string | null;
  eta: string | null;
  outcome: Outcome | null;
  handoff: Handoff | null;
  relatedIds: string[];
  workOrderIds: string[];
  dedupeKey: string;
  retries: number;
  data: Record<string, string | number | boolean | null>;
}

export type WorkOrderKind =
  | "relocation"
  | "infra_followup"
  | "external_operator"
  | "installation"
  | "deprovision"
  | "device_delivery"
  | "field_repair"
  | "billing_review"
  | "remote_diagnostic";

export type WorkOrderStatus = "open" | "in_progress" | "waiting_external" | "done" | "cancelled";

export interface WorkOrder {
  id: string;
  workflowId: string;
  kind: WorkOrderKind;
  title: string;
  team: string;
  status: WorkOrderStatus;
  dedupeKey: string;
  createdAt: number;
  updatedAt: number;
}

export interface Appointment {
  id: string;
  workflowId: string;
  workOrderId: string | null;
  slotId: string;
  label: string;
  status: "booked" | "done";
  at: number;
}

/** Temporary internet for relocation waits (TürkNet Box). The free Hibrit İnternet is a separate service (HybridService). */
export type TempKind = "temp_mobile";
export type TempStatus = "offered" | "accepted" | "declined" | "ordered" | "shipped" | "active" | "ended";

export interface TemporaryInternetRequest {
  id: string;
  workflowId: string;
  parentWorkflowId: string;
  kind: TempKind;
  status: TempStatus;
  price: string;
  device: string;
  createdAt: number;
  updatedAt: number;
}

export interface ConnectivityStatus {
  fixed: "up" | "down" | "degraded" | "not_installed";
  mobile: "off" | "standby" | "active";
  mode: "fixed" | "temp_mobile" | "hybrid_backup";
  hybridEnabled: boolean;
  lastCheckAt: number;
  metric: { optic: number; drops: number; speed?: number };
  history: { at: number; label: string }[];
}

export interface BillingRecord {
  id: string;
  period: string;
  amount: number;
  due: string;
  status: "unpaid" | "paid";
  /** What the app currently shows as outstanding debt. */
  shownDebt: number;
}

export interface PaymentRecord {
  id: string;
  billId: string;
  amount: number;
  at: string;
  channel: string;
  ref: string;
  status: "success" | "pending" | "refund_review";
}

export interface CustomerNotification {
  id: string;
  workflowId: string | null;
  title: string;
  body: string;
  at: number;
  /** push = phone notification; quiet = shown only inside the app / history. */
  level?: "push" | "quiet";
}

/** TürkNet Box: hypothetical SIM-based temporary internet device (mock, no real operator). */
export interface BoxDevice {
  id: string;
  tempWfId: string;
  model: string;
  sim: "shipping" | "ready" | "active" | "returning";
  power: "on" | "off";
  usedGb: number;
  quotaGb: number;
  toggles: number;
  signal: string;
  updatedAt: number;
}

/** Simulated SMS (no real SMS is sent). */
export interface SmsMessage {
  id: string;
  workflowId: string;
  body: string;
  link: string;
  at: number;
  opened: boolean;
}

export type Actor = "system" | "customer" | "external" | "agent" | "presenter" | "team";

export interface AuditEvent {
  id: string;
  workflowId: string | null;
  at: number;
  actor: Actor;
  kind: "step" | "decision" | "notify" | "external" | "escalation" | "error" | "info" | "workorder" | "plan";
  message: string;
  why?: string;
}

export interface ScheduledOp {
  id: string;
  key: string;
  op: string;
  workflowId: string;
  dueAt: number;
  payload?: string;
}

/** Outcomes the mock external systems return. Set by the scenario panel. */
export interface DemoConfig {
  addressCheck: "eligible" | "eligible_external" | "no_port" | "no_response";
  externalResponse: "ready" | "no_response";
  outageType: "line" | "regional";
  /** Hibrit İnternet demo world: compatible backup device + active SIM present. */
  hybridDevice: boolean;
  /** Enough mobile coverage at the customer address. */
  hybridCoverage: boolean;
  /** Result of the next activation attempt. */
  hybridActivation: "success" | "fail";
  reconciliation: "settled" | "duplicate";
  aiFix: "fixed" | "not_fixed";
  /** GIGA Teknik digital repair: finds nothing (customer-side checks follow) or finds an issue (remote fix first). */
  ustaDiag: "clear" | "issue" | "regional" | "incomplete";
  /** Estimated duration (hours) of a regional outage found by digital repair. */
  regionalEtaH: number;
  proactive: "remote_fix" | "field" | "wifi_help" | "wifi_live";
  /** Field-team matching for the relocation appointment: first team accepts, or first declines and a second team takes it. */
  teamMatch: "first" | "second";
  /** Is the TürkNet app installed on the phone that receives the SMS link? */
  appInstalled: boolean;
  /** Customer already owns a compatible Hibrit Box (no device shipment for relocation temp internet). */
  ownsBox: boolean;
  /** Result of the next simulated automatic collection. */
  autoPayResult: "success" | "fail";
}

/* ---------------- Canlı destek (simulated live chat after a GIGA handoff) ---------------- */
export interface LiveChatMessage {
  id: string;
  from: "agent" | "customer" | "giga";
  text: string;
  at: number;
  /** Agent message offering an action the customer can accept. */
  offer?: "field_visit";
}

export interface LiveChat {
  workflowId: string;
  agent: string;
  startedAt: number;
  messages: LiveChatMessage[];
}

/* ---------------- Akıllı Otomatik Ödeme (simulated mandate) ---------------- */
export interface AutoPayMethod {
  kind: "card" | "bank";
  /** Masked label only; full numbers are never stored or shown. */
  label: string;
}

export interface AutoPayState {
  status: "off" | "active";
  method: AutoPayMethod | null;
  /** Ask before collecting when the bill is clearly higher than usual. */
  askIfUnusual: boolean;
  setupAt: number | null;
  /** Latest simulated collection cycle. */
  cycle: {
    amount: number;
    usual: number;
    due: string;
    status: "notified" | "held_for_approval" | "paid" | "failed" | "skipped";
    at: number;
  } | null;
  log: { at: number; text: string }[];
}

/* ---------------- Hibrit İnternet (free outage backup, included in the subscription) ---------------- */
export interface OutageState {
  wfId: string;
  /** Simulated start; the presenter moves it to change the elapsed time. */
  startedAt: number;
  lastUpdateAt: number;
  /** Customer-facing repair status line. */
  repairNote: string;
  /** Estimated total outage duration in hours (from start), when known. Over 24 h opens the Hibrit İnternet offer early. */
  etaH?: number | null | undefined;
  restoredAt: number | null;
  /** Restored card dismissed by the customer. */
  dismissed: boolean;
  /** The one-time "outage reached 24 h" push was sent. */
  notified24?: boolean;
}

export type HybridStatus =
  | "unavailable" // no outage or outage under 24 h
  | "offered" // outage over 24 h, customer may activate
  | "checking" // device / SIM / coverage check running
  | "ready" // checks passed, waiting for customer consent
  | "no_device"
  | "no_coverage"
  | "activating"
  | "failed"
  | "active"
  | "ended";

export interface HybridChecks {
  device: boolean;
  sim: boolean;
  coverage: boolean;
}

export interface DeviceRequest {
  id: string;
  status: "requested" | "preparing" | "on_the_way" | "delivered" | "cancelled";
  trackingNo: string;
  createdAt: number;
  updatedAt: number;
}

export interface HybridService {
  status: HybridStatus;
  checks: HybridChecks | null;
  attempts: number;
  activatedAt: number | null;
  endedAt: number | null;
  declinedAt: number | null;
  device: DeviceRequest | null;
  /** Customer switched the active backup off from the app (can switch it on again). */
  pausedAt: number | null;
  /** Customer pre-approved: switch to the backup automatically once the 24-hour rule opens it. */
  autoFailover: boolean;
  /** Who switched the backup on: the pre-approved automatic switch or the customer by hand. */
  activatedBy?: "auto" | "customer" | null | undefined;
  /** Customer tapped "Hibrit Box'ı Aç" while the eligibility check was still running. */
  openRequested?: boolean | undefined;
  /** A customer on/off command for an already-activated backup is being applied (mock device command). */
  switching?: "on" | "off" | null | undefined;
}


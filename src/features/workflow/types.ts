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

export type WorkflowType = "relocation" | "temp_internet" | "outage_recovery" | "billing_check" | "ai_usta" | "proactive_fault";

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

export type TempKind = "temp_mobile" | "hybrid";
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
  metric: { optic: number; drops: number };
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
  reconciliation: "settled" | "duplicate";
  aiFix: "fixed" | "not_fixed";
  proactive: "remote_fix" | "field";
}

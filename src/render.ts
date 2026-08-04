import type {
  ExamFinding,
  Measurement,
  PlanItem,
  Problem,
  ReviewOfSystemsFinding,
  SoapNote,
  Vitals,
} from "./types.js";

const PLAN_CATEGORY_LABELS: Record<PlanItem["category"], string> = {
  medication: "Medication",
  order: "Order",
  referral: "Referral",
  followUp: "Follow-up",
  patientEducation: "Patient Education",
};

function formatMeasurement(measurement: Measurement | undefined): string | undefined {
  if (!measurement) {
    return undefined;
  }
  return `${measurement.value} ${measurement.unit}`;
}

function renderVitals(vitals: Vitals | undefined): string[] {
  if (!vitals) {
    return [];
  }

  const lines: string[] = [];
  const bp = vitals.bloodPressure;
  if (bp?.systolic || bp?.diastolic) {
    const systolic = bp.systolic ? `${bp.systolic.value}` : "?";
    const diastolic = bp.diastolic ? `${bp.diastolic.value}` : "?";
    const unit = bp.systolic?.unit ?? bp.diastolic?.unit ?? "";
    lines.push(`- Blood Pressure: ${systolic}/${diastolic} ${unit}`.trimEnd());
  }
  const rest: Array<[string, Measurement | undefined]> = [
    ["Heart Rate", vitals.heartRate],
    ["Temperature", vitals.temperature],
    ["Respiratory Rate", vitals.respiratoryRate],
    ["SpO2", vitals.spo2],
    ["Height", vitals.height],
    ["Weight", vitals.weight],
  ];
  for (const [label, measurement] of rest) {
    const formatted = formatMeasurement(measurement);
    if (formatted) {
      lines.push(`- ${label}: ${formatted}`);
    }
  }
  return lines;
}

function renderReviewOfSystems(findings: ReviewOfSystemsFinding[] | undefined): string[] {
  if (!findings || findings.length === 0) {
    return [];
  }
  return findings.map((f) => {
    const detail = f.finding ? ` — ${f.finding}` : "";
    return `- ${f.system} (${f.status})${detail}`;
  });
}

function renderExamFindings(findings: ExamFinding[] | undefined): string[] {
  if (!findings || findings.length === 0) {
    return [];
  }
  return findings.map((f) => `- ${f.bodySystem}: ${f.finding}`);
}

function renderProblem(problem: Problem): string {
  const coded = problem.codedConcept
    ? ` [${problem.codedConcept.display} — ${problem.codedConcept.system} ${problem.codedConcept.code}]`
    : "";
  return `- ${problem.description} (${problem.status})${coded}`;
}

function renderPlanItem(item: PlanItem): string {
  return `- **${PLAN_CATEGORY_LABELS[item.category]}:** ${item.detail}`;
}

/**
 * Renders a valid {@link SoapNote} as a clean, human-readable markdown note
 * with standard SOAP section headers. Intended for direct inclusion in
 * documentation, PDF export pipelines, or anywhere a clinician/reviewer
 * needs to read a note without touching its JSON representation.
 *
 * Does not validate its input — call {@link validate} or {@link assertValid}
 * first if the note's shape isn't already trusted.
 */
export function renderNote(note: SoapNote): string {
  const sections: string[] = [];

  sections.push(`# SOAP Note`);
  sections.push(
    `*Encounter: ${note.metadata.encounterType} · Author: ${note.metadata.authorRole} · ${note.metadata.timestamp}*`,
  );

  sections.push(`## Subjective`);
  sections.push(`**Chief Complaint:** ${note.subjective.chiefComplaint}`);
  if (note.subjective.historyOfPresentIllness) {
    sections.push(`**History of Present Illness:**\n${note.subjective.historyOfPresentIllness}`);
  }
  const ros = renderReviewOfSystems(note.subjective.reviewOfSystems);
  if (ros.length > 0) {
    sections.push(`**Review of Systems:**\n${ros.join("\n")}`);
  }

  sections.push(`## Objective`);
  const vitalsLines = renderVitals(note.objective.vitals);
  if (vitalsLines.length > 0) {
    sections.push(`**Vitals:**\n${vitalsLines.join("\n")}`);
  }
  const examLines = renderExamFindings(note.objective.examFindings);
  if (examLines.length > 0) {
    sections.push(`**Exam Findings:**\n${examLines.join("\n")}`);
  }

  sections.push(`## Assessment`);
  sections.push(
    note.assessment.length > 0
      ? note.assessment.map(renderProblem).join("\n")
      : "_No problems documented._",
  );

  sections.push(`## Plan`);
  sections.push(
    note.plan.length > 0 ? note.plan.map(renderPlanItem).join("\n") : "_No plan items documented._",
  );

  return sections.join("\n\n") + "\n";
}

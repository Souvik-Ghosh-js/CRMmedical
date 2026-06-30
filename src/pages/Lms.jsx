import CrudModule from '../components/CrudModule'

// Learning Management System (LMS) — GMP training register used in pharma
// operations to manage employee/SOP training, exams, certifications and
// retraining due-date alerts. Each record is a training assignment tied to a
// learner and a curriculum item (SOP, GMP topic, equipment, safety, etc.) and
// tracks the full lifecycle: Assigned → In Progress → Exam → Completed →
// Certified, plus periodic re-qualification driven by a "next due" date.
const config = {
  collection: 'lmsTrainingRecords',
  title: 'Learning Management (LMS)',
  subtitle: 'Employee & SOP training, exams, certifications and retraining due alerts',
  icon: '🎓',
  numberPrefix: 'TRN',
  searchKeys: ['employeeName', 'employeeId', 'courseTitle', 'sopNumber', 'trainer', 'department'],
  filters: [
    { key: 'trainingType', label: 'Type', options: ['SOP / Procedure', 'GMP / cGMP', 'Induction / Onboarding', 'Safety / EHS', 'Equipment / Process', 'Data Integrity', 'Job-Specific', 'Refresher / Retraining'] },
    { key: 'status', label: 'Status', options: ['Assigned', 'In Progress', 'Exam Pending', 'Completed', 'Certified', 'Overdue', 'Failed', 'Waived'] },
    { key: 'criticality', label: 'Criticality', options: ['Low', 'Medium', 'High', 'GxP-Critical'] },
    { key: 'deliveryMethod', label: 'Method', options: ['Classroom', 'On-the-Job (OJT)', 'Read & Understand', 'eLearning', 'Assessment / Exam'] },
  ],
  columns: [
    { key: 'code', label: 'ID' },
    { key: 'employeeName', label: 'Employee' },
    { key: 'department', label: 'Department' },
    { key: 'courseTitle', label: 'Course / SOP' },
    { key: 'trainingType', label: 'Type', badge: (r) => {
      const map = { 'SOP / Procedure': 'blue', 'GMP / cGMP': 'brand', 'Induction / Onboarding': 'slate', 'Safety / EHS': 'amber', 'Equipment / Process': 'slate', 'Data Integrity': 'brand', 'Job-Specific': 'slate', 'Refresher / Retraining': 'amber' }
      return [map[r.trainingType] || 'slate', r.trainingType || '—']
    } },
    { key: 'criticality', label: 'Criticality', badge: (r) => {
      const map = { 'GxP-Critical': 'rose', High: 'amber', Medium: 'blue', Low: 'slate' }
      return [map[r.criticality] || 'slate', r.criticality || '—']
    } },
    { key: 'status', label: 'Status', badge: (r) => {
      if (r.status === 'Certified' || r.status === 'Completed') return ['green', r.status]
      if (r.status === 'Overdue' || r.status === 'Failed') return ['rose', r.status]
      if (r.status === 'Waived') return ['slate', r.status]
      if (r.status === 'Exam Pending' || r.status === 'In Progress') return ['blue', r.status]
      return ['amber', r.status || '—']
    } },
    { key: 'examScore', label: 'Score %', align: 'right' },
    { key: 'completionDate', label: 'Completed', type: 'date' },
    { key: 'nextDueDate', label: 'Next Due', type: 'date' },
  ],
  fields: [
    { key: 'employeeName', label: 'Employee Name', required: true, full: true },
    { key: 'employeeId', label: 'Employee ID' },
    { key: 'jobRole', label: 'Job Role / Designation' },
    { key: 'department', label: 'Department', type: 'select', options: ['Production', 'QA', 'QC', 'Warehouse', 'Engineering', 'Regulatory', 'Packaging', 'R&D', 'Microbiology', 'HR'] },
    { key: 'courseTitle', label: 'Course / SOP Title', required: true, full: true },
    { key: 'sopNumber', label: 'SOP / Document No.' },
    { key: 'sopVersion', label: 'SOP Version / Rev' },
    { key: 'trainingType', label: 'Training Type', type: 'select', required: true, options: ['SOP / Procedure', 'GMP / cGMP', 'Induction / Onboarding', 'Safety / EHS', 'Equipment / Process', 'Data Integrity', 'Job-Specific', 'Refresher / Retraining'], default: 'SOP / Procedure' },
    { key: 'deliveryMethod', label: 'Delivery Method', type: 'select', options: ['Classroom', 'On-the-Job (OJT)', 'Read & Understand', 'eLearning', 'Assessment / Exam'], default: 'Read & Understand' },
    { key: 'criticality', label: 'Criticality', type: 'select', options: ['Low', 'Medium', 'High', 'GxP-Critical'], default: 'Medium' },
    { key: 'status', label: 'Status', type: 'select', options: ['Assigned', 'In Progress', 'Exam Pending', 'Completed', 'Certified', 'Overdue', 'Failed', 'Waived'], default: 'Assigned' },
    { key: 'trainer', label: 'Trainer / Assessor' },
    { key: 'assignedDate', label: 'Assigned Date', type: 'date' },
    { key: 'dueDate', label: 'Target Due Date', type: 'date' },
    { key: 'completionDate', label: 'Completion Date', type: 'date' },
    { key: 'examRequired', label: 'Exam Required', type: 'select', options: ['Yes', 'No'], default: 'No' },
    { key: 'examScore', label: 'Exam Score (%)', type: 'number' },
    { key: 'passMark', label: 'Pass Mark (%)', type: 'number', default: 80 },
    { key: 'attempts', label: 'Exam Attempts', type: 'number' },
    { key: 'certificateNo', label: 'Certificate No.' },
    { key: 'retrainingFrequency', label: 'Retraining Frequency', type: 'select', options: ['One-time', 'Annual', 'Biennial', 'On Revision', 'On Change Control'], default: 'One-time' },
    { key: 'nextDueDate', label: 'Next Retraining Due', type: 'date' },
    { key: 'remarks', label: 'Remarks / Comments', type: 'textarea', full: true },
  ],
  stats: (rows) => [
    { label: 'Total Assignments', value: rows.length },
    { label: 'Pending / In Progress', value: rows.filter((r) => ['Assigned', 'In Progress', 'Exam Pending'].includes(r.status)).length },
    { label: 'Certified', value: rows.filter((r) => r.status === 'Certified' || r.status === 'Completed').length },
    { label: 'Retraining Due / Overdue', value: rows.filter((r) => r.status === 'Overdue' || (r.nextDueDate && new Date(r.nextDueDate) < new Date() && r.status !== 'Waived')).length },
  ],
}

export default function Lms() {
  return <CrudModule config={config} />
}

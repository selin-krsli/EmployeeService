/** Shared palette for department pie chart and list chips. */
export const DEPARTMENT_CHART_COLORS = [
  '#1b4f8a',
  '#1f9d6b',
  '#e8a317',
  '#d64550',
  '#0e8fb0',
  '#7c3aed',
  '#0891b2',
  '#be185d',
  '#4f46e5',
  '#64748b',
] as const;

const NAME_COLOR_OVERRIDES: Record<string, string> = {
  'insan kaynakları': '#ea580c',
};

/** Stable color for a department across dashboard and employee list. */
export function departmentColor(departmentId: number, departmentName?: string): string {
  if (departmentName) {
    const key = departmentName.trim().toLocaleLowerCase('tr-TR');
    const override = NAME_COLOR_OVERRIDES[key];
    if (override) {
      return override;
    }
  }

  const index = Math.abs(departmentId) % DEPARTMENT_CHART_COLORS.length;
  return DEPARTMENT_CHART_COLORS[index];
}

/** Department as returned by the API (`DepartmentDto`). */
export interface Department {
  id: number;
  name: string;
}

/** Request payload for creating and updating a department. */
export interface DepartmentInput {
  name: string;
}

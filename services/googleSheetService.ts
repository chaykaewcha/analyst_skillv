
import { SCRIPT_URL } from "../constants";
import { Student, SaveData } from "../types";

export const getStudentById = async (studentId: string): Promise<Student | null> => {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=getStudent&studentId=${studentId}`);
    const data = await response.json();
    if (data.status === 'success') {
      return data.student;
    }
    return null;
  } catch (error) {
    console.error("Error fetching student:", error);
    return null;
  }
};

export const saveAnalysisToSheet = async (data: SaveData): Promise<boolean> => {
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'saveAnalysis',
        data: data
      })
    });
    const result = await response.json();
    return result.status === 'success';
  } catch (error) {
    console.error("Error saving analysis:", error);
    return false;
  }
};

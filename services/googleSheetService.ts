
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

// ปรับปรุง function signature ให้รับ videoBase64 และ mimeType และเปลี่ยน return type
export const saveAnalysisToSheet = async (data: SaveData, videoBase64?: string, mimeType?: string): Promise<{ success: boolean; videoUrl?: string }> => {
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'saveAnalysis',
        data: data,
        // ส่งข้อมูลวิดีโอไปถ้ามี
        videoFile: videoBase64 ? {
          base64: videoBase64,
          mimeType: mimeType
        } : null
      })
    });
    const result = await response.json();
    // คืนค่า URL วิดีโอถ้ามีใน response
    return { success: result.status === 'success', videoUrl: result.videoUrl };
  } catch (error) {
    console.error("Error saving analysis:", error);
    return { success: false };
  }
};

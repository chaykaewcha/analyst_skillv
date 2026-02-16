
import { GoogleGenAI, Type } from "@google/genai";
import { API_KEYS } from "../constants";
import { SportType, TestType } from "../types";

const getRandomApiKey = () => {
  return API_KEYS[Math.floor(Math.random() * API_KEYS.length)];
};

export const analyzeSportsVideo = async (
  videoBase64: string,
  sport: SportType,
  testType: TestType,
  studentName: string
) => {
  const apiKey = getRandomApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `คุณคือผู้เชี่ยวชาญด้านกีฬาและครูพละระดับมัธยมศึกษา
วิเคราะห์วิดีโอการฝึกทักษะกีฬา: ${sport} (${testType}) ของนักเรียนชื่อ ${studentName}
ประเมิน 5 ด้าน (คะแนนเต็มด้านละ 10 คะแนน):
1. ท่าทาง (Posture)
2. เทคนิค (Technique)
3. ความคล่องแคล่ว (Agility)
4. ความสม่ำเสมอต่อเนื่อง (Consistency)
5. ประสิทธิภาพ (Efficiency)

ให้คะแนนรวมเต็ม 50 และคำนวณค่าเฉลี่ย
กรุณาตอบเป็น JSON ภาษาไทยที่มีโครงสร้างตามที่กำหนดไว้เท่านั้น`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: "video/mp4",
              data: videoBase64,
            },
          },
          { text: prompt },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          posture: { type: Type.NUMBER, description: "คะแนนท่าทาง" },
          technique: { type: Type.NUMBER, description: "คะแนนเทคนิค" },
          agility: { type: Type.NUMBER, description: "คะแนนความคล่องแคล่ว" },
          consistency: { type: Type.NUMBER, description: "คะแนนความสม่ำเสมอ" },
          efficiency: { type: Type.NUMBER, description: "คะแนนประสิทธิภาพ" },
          totalScore: { type: Type.NUMBER, description: "คะแนนรวม" },
          averageScore: { type: Type.NUMBER, description: "คะแนนเฉลี่ย" },
          strengths: { type: Type.STRING, description: "จุดเด่น" },
          weaknesses: { type: Type.STRING, description: "จุดควรปรับปรุง" },
          suggestions: { type: Type.STRING, description: "คำแนะนำเพิ่มเติม" },
        },
        required: [
          "posture",
          "technique",
          "agility",
          "consistency",
          "efficiency",
          "totalScore",
          "averageScore",
          "strengths",
          "weaknesses",
          "suggestions",
        ],
      },
    },
  });

  return JSON.parse(response.text || "{}");
};

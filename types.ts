
export enum SportType {
  Volleyball = 'วอลเลย์บอล',
  Futsal = 'ฟุตซอล',
  Takraw = 'ตะกร้อ',
  Badminton = 'แบดมินตัน',
  Athletics = 'กรีฑา',
  TableTennis = 'เทเบิลเทนนิส'
}

export enum TestType {
  PreTest = 'ก่อนเรียน',
  PostTest = 'หลังเรียน'
}

export interface Student {
  studentId: string;
  fullName: string;
  gradeClass: string;
  number: string;
}

export interface AnalysisResult {
  posture: number;
  technique: number;
  agility: number;
  consistency: number;
  efficiency: number;
  totalScore: number;
  averageScore: number;
  strengths: string;
  weaknesses: string;
  suggestions: string;
  sport: SportType;
  testType: TestType;
}

export interface SaveData extends Student, AnalysisResult {
  timestamp: string;
  videoLink: string;
}

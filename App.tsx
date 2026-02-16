
import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis } from 'recharts';
import { 
  Search, 
  Upload, 
  Activity, 
  Clock, 
  User, 
  BookOpen, 
  Award, 
  AlertCircle,
  CheckCircle2,
  Trophy,
  Loader2,
  Video
} from 'lucide-react';

import { SportType, TestType, Student, AnalysisResult, SaveData } from './types';
import { getStudentById, saveAnalysisToSheet } from './services/googleSheetService';
import { analyzeSportsVideo } from './services/geminiService';

const App: React.FC = () => {
  const [studentId, setStudentId] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const [selectedSport, setSelectedSport] = useState<SportType>(SportType.Volleyball);
  const [testType, setTestType] = useState<TestType>(TestType.PreTest);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!studentId.trim()) return;

    setIsSearching(true);
    const result = await getStudentById(studentId);
    setIsSearching(false);

    if (result) {
      setStudent(result);
      Swal.fire({
        title: 'พบข้อมูลนักเรียน!',
        html: `
          <div class="text-left bg-blue-50 p-4 rounded-lg border border-blue-100">
            <p><strong>ชื่อ-สกุล:</strong> ${result.fullName}</p>
            <p><strong>ชั้น/เลขที่:</strong> ${result.gradeClass} เลขที่ ${result.number}</p>
            <p><strong>เลขประจำตัว:</strong> ${result.studentId}</p>
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#0ea5e9'
      });
    } else {
      Swal.fire({
        title: 'ไม่พบข้อมูล!',
        text: 'กรุณาตรวจสอบเลขประจำตัวอีกครั้ง',
        icon: 'error',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#f43f5e'
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 30 * 1024 * 1024) {
        Swal.fire('ขนาดไฟล์เกินกำหนด!', 'กรุณาอัพโหลดวิดีโอขนาดไม่เกิน 30MB', 'warning');
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const startAnalysis = async () => {
    if (!student || !videoFile) return;

    setIsAnalyzing(true);
    setCountdown(45); // Estimated analysis time
    
    const interval = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(videoFile);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        
        const result = await analyzeSportsVideo(
          base64,
          selectedSport,
          testType,
          student.fullName
        );

        setAnalysisResult(result);
        clearInterval(interval);
        setIsAnalyzing(false);

        // Save to sheet
        const saveData: SaveData = {
          ...student,
          ...result,
          sport: selectedSport,
          testType: testType,
          timestamp: new Date().toLocaleString('th-TH'),
          videoLink: 'Uploaded Video File' // Simplified for demo
        };

        await saveAnalysisToSheet(saveData);

        Swal.fire({
          title: 'วิเคราะห์สำเร็จ!',
          text: 'ข้อมูลถูกบันทึกลงระบบเรียบร้อยแล้ว',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      };
    } catch (error) {
      clearInterval(interval);
      setIsAnalyzing(false);
      Swal.fire('เกิดข้อผิดพลาด!', 'ไม่สามารถวิเคราะห์วิดีโอได้ กรุณาลองใหม่', 'error');
    }
  };

  const radarData = analysisResult ? [
    { subject: 'ท่าทาง', A: analysisResult.posture, fullMark: 10 },
    { subject: 'เทคนิค', A: analysisResult.technique, fullMark: 10 },
    { subject: 'ความคล่องแคล่ว', A: analysisResult.agility, fullMark: 10 },
    { subject: 'ความสม่ำเสมอ', A: analysisResult.consistency, fullMark: 10 },
    { subject: 'ประสิทธิภาพ', A: analysisResult.efficiency, fullMark: 10 },
  ] : [];

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-sky-500 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between">
          <div className="mb-6 md:mb-0">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center justify-center md:justify-start">
              <Activity className="mr-3 w-8 h-8 md:w-10 md:h-10" />
              Tun Sports Analyzer
            </h1>
            <p className="text-blue-100 text-lg">ระบบวิเคราะห์ทักษะกีฬา โรงเรียนเตรียมอุดมศึกษาน้อมเกล้า</p>
          </div>
          <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/30 hidden md:block">
            <p className="text-sm font-medium">กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 -mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Student Search & Form */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Search Student */}
            <section className="bg-white rounded-3xl shadow-xl p-6 border border-slate-100 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Search className="w-16 h-16 text-blue-900" />
              </div>
              <h2 className="text-xl font-bold mb-4 flex items-center text-slate-800">
                <User className="mr-2 text-blue-500" /> ค้นหานักเรียน
              </h2>
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">เลขประจำตัวนักเรียน</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="ใส่เลขประจำตัว..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                    <button 
                      type="submit"
                      disabled={isSearching}
                      className="absolute right-2 top-2 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-slate-300"
                    >
                      {isSearching ? <Loader2 className="animate-spin w-5 h-5" /> : <Search className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </form>

              {student && (
                <div className="mt-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-emerald-200 rounded-full flex items-center justify-center text-emerald-700">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 leading-tight">{student.fullName}</p>
                      <p className="text-sm text-slate-500">ชั้น {student.gradeClass} เลขที่ {student.number}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Config & Upload */}
            <section className="bg-white rounded-3xl shadow-xl p-6 border border-slate-100">
              <h2 className="text-xl font-bold mb-6 flex items-center text-slate-800">
                <BookOpen className="mr-2 text-sky-500" /> ข้อมูลการทดสอบ
              </h2>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">เลือกชนิดกีฬา</label>
                  <select 
                    value={selectedSport}
                    onChange={(e) => setSelectedSport(e.target.value as SportType)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.values(SportType).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">ประเภทการทดสอบ</label>
                  <div className="flex gap-2">
                    {Object.values(TestType).map(t => (
                      <button
                        key={t}
                        onClick={() => setTestType(t)}
                        className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                          testType === t 
                            ? 'bg-blue-500 text-white shadow-md' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">อัพโหลดวิดีโอ (สูงสุด 30MB)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                      videoFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    <input 
                      type="file" 
                      accept="video/*" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileChange}
                    />
                    {videoFile ? (
                      <div className="text-emerald-600">
                        <CheckCircle2 className="mx-auto mb-2 w-10 h-10" />
                        <p className="text-sm font-medium truncate px-4">{videoFile.name}</p>
                      </div>
                    ) : (
                      <div className="text-slate-400">
                        <Upload className="mx-auto mb-2 w-10 h-10" />
                        <p className="text-sm">คลิกเพื่อเลือกวิดีโอ</p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={startAnalysis}
                  disabled={!student || !videoFile || isAnalyzing}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none mt-2 flex items-center justify-center"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="animate-spin mr-2" />
                      กำลังวิเคราะห์... ({countdown}s)
                    </>
                  ) : (
                    'เริ่มวิเคราะห์ด้วย AI'
                  )}
                </button>
              </div>
            </section>
          </div>

          {/* Right Column: Results & Analysis */}
          <div className="lg:col-span-2 space-y-6">
            
            {!analysisResult && !isAnalyzing && (
              <div className="bg-white rounded-3xl shadow-xl p-12 text-center border border-slate-100 flex flex-col items-center justify-center min-h-[500px]">
                <div className="bg-blue-50 p-6 rounded-full mb-6">
                  <Video className="w-16 h-16 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">พร้อมวิเคราะห์ทักษะแล้ว</h3>
                <p className="text-slate-500 max-w-md">กรุณาเลือกนักเรียนและอัพโหลดวิดีโอการเล่นกีฬา เพื่อให้ AI ช่วยประเมินทักษะพื้นฐานตามเกณฑ์มาตรฐาน</p>
              </div>
            )}

            {isAnalyzing && (
              <div className="bg-white rounded-3xl shadow-xl p-12 text-center border border-slate-100 flex flex-col items-center justify-center min-h-[500px]">
                <div className="relative mb-8">
                  <div className="w-32 h-32 border-8 border-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-3xl font-bold text-blue-600">{countdown}</span>
                  </div>
                  <div className="absolute inset-0 w-32 h-32 border-8 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4 animate-pulse">กำลังประมวลผลวิดีโอ...</h3>
                <div className="space-y-2 max-w-sm">
                  <p className="text-slate-500 text-sm">Gemini AI กำลังวิเคราะห์ท่าทางและเทคนิคของคุณ</p>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full animate-progress-fast transition-all duration-1000" style={{ width: `${((45-countdown)/45)*100}%` }}></div>
                  </div>
                </div>
              </div>
            )}

            {analysisResult && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                {/* Score Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                    <Trophy className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10" />
                    <p className="text-blue-100 mb-1">คะแนนรวม</p>
                    <h4 className="text-5xl font-black">{analysisResult.totalScore}<span className="text-lg font-normal text-blue-200">/50</span></h4>
                  </div>
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl flex items-center space-x-4">
                    <div className="bg-emerald-100 p-4 rounded-2xl">
                      <Award className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">ค่าเฉลี่ย</p>
                      <h4 className="text-2xl font-bold text-slate-800">{analysisResult.averageScore.toFixed(1)}</h4>
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl flex items-center space-x-4">
                    <div className="bg-orange-100 p-4 rounded-2xl">
                      <Clock className="w-8 h-8 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">สถานะ</p>
                      <h4 className="text-xl font-bold text-slate-800">วิเคราะห์เสร็จสิ้น</h4>
                    </div>
                  </div>
                </div>

                {/* Main Results Display */}
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                  <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                    <h2 className="font-bold text-slate-800 flex items-center">
                      <Activity className="mr-2 text-blue-500" /> รายละเอียดการประเมิน
                    </h2>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{selectedSport} - {testType}</span>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Radar Chart */}
                    <div className="h-[300px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 10]} />
                          <Radar
                            name="Skill"
                            dataKey="A"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fill="#3b82f6"
                            fillOpacity={0.4}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Feedback Items */}
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="bg-emerald-100 p-2 rounded-lg mt-1 shrink-0">
                          <Trophy className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">จุดเด่น</p>
                          <p className="text-slate-600 text-sm leading-relaxed">{analysisResult.strengths}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="bg-rose-100 p-2 rounded-lg mt-1 shrink-0">
                          <AlertCircle className="w-5 h-5 text-rose-600" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">จุดควรปรับปรุง</p>
                          <p className="text-slate-600 text-sm leading-relaxed">{analysisResult.weaknesses}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="bg-blue-100 p-2 rounded-lg mt-1 shrink-0">
                          <Award className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">คำแนะนำเพิ่มเติม</p>
                          <p className="text-slate-600 text-sm leading-relaxed italic">{analysisResult.suggestions}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Scores Bar */}
                  <div className="bg-slate-50 p-6 grid grid-cols-5 gap-2">
                    {[
                      { label: 'ท่าทาง', val: analysisResult.posture },
                      { label: 'เทคนิค', val: analysisResult.technique },
                      { label: 'คล่องตัว', val: analysisResult.agility },
                      { label: 'ต่อเนื่อง', val: analysisResult.consistency },
                      { label: 'ประสิทธิภาพ', val: analysisResult.efficiency }
                    ].map((item, idx) => (
                      <div key={idx} className="text-center">
                        <p className="text-[10px] md:text-xs text-slate-500 mb-1 uppercase font-bold">{item.label}</p>
                        <div className="bg-white border border-slate-200 rounded-lg py-2">
                          <span className="text-lg font-black text-slate-800">{item.val}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {videoPreview && (
                  <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-100">
                    <h3 className="font-bold mb-4 text-slate-800 flex items-center">
                      <Video className="mr-2 text-blue-500" /> วิดีโอต้นฉบับ
                    </h3>
                    <video 
                      src={videoPreview} 
                      controls 
                      className="w-full aspect-video rounded-2xl shadow-inner border border-slate-100"
                    />
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </main>
      
      <footer className="mt-12 text-center text-slate-400 text-sm">
        <p>© 2024 Triam Udom Suksa Nomklao School. Sports Science powered by Gemini AI.</p>
      </footer>
    </div>
  );
};

export default App;

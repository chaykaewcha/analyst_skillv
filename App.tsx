
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
  Video,
  ExternalLink
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
  const [statusText, setStatusText] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [savedVideoUrl, setSavedVideoUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup for video preview URL
  useEffect(() => {
    return () => {
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [videoPreview]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!studentId.trim()) return;

    setIsSearching(true);
    const result = await getStudentById(studentId);
    setIsSearching(false);

    if (result) {
      setStudent(result);
      setAnalysisResult(null); 
      setSavedVideoUrl(null); 
      // Revoke old video preview URL if exists before setting new one (though setVideoFile does this)
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
        setVideoPreview(null);
      }
      setVideoFile(null); // Clear video file as well
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
    if (videoPreview) { // Revoke previous object URL if a new file is selected
      URL.revokeObjectURL(videoPreview);
    }
    if (file) {
      if (file.size > 30 * 1024 * 1024) {
        Swal.fire('ขนาดไฟล์เกินกำหนด!', 'กรุณาอัพโหลดวิดีโอขนาดไม่เกิน 30MB', 'warning');
        setVideoFile(null);
        setVideoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = ""; // Clear file input
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setAnalysisResult(null); 
      setSavedVideoUrl(null); 
    } else {
      setVideoFile(null);
      setVideoPreview(null);
    }
  };

  const startAnalysis = async () => {
    if (!student || !videoFile) return;

    setIsAnalyzing(true);
    setStatusText('Gemini AI กำลังวิเคราะห์ทักษะในวิดีโอ...'); 
    setCountdown(45); 
    
    const interval = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(videoFile);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        
        // 1. วิเคราะห์ด้วย Gemini AI
        const result = await analyzeSportsVideo(
          base64,
          selectedSport,
          testType,
          student.fullName
        );

        setStatusText('กำลังอัปโหลดวิดีโอไปยัง Google Drive และบันทึกข้อมูล...'); 

        // 2. เตรียมข้อมูลบันทึก
        const saveData: SaveData = {
          ...student,
          ...result,
          sport: selectedSport,
          testType: testType,
          timestamp: new Date().toLocaleString('th-TH'),
          videoLink: 'กำลังสร้างลิงก์...' 
        };

        // 3. บันทึกลง Sheet (ซึ่งจะทำการอัปโหลดวิดีโอใน GAS และรับ URL กลับมา)
        const saveResponse = await saveAnalysisToSheet(saveData, base64, videoFile.type); 
        
        clearInterval(interval);
        setIsAnalyzing(false);

        if (saveResponse.success) { 
          setAnalysisResult(result);
          setSavedVideoUrl(saveResponse.videoUrl || null); 
          Swal.fire({
            title: 'สำเร็จ!',
            text: 'วิเคราะห์ทักษะและบันทึกลิงก์วิดีโอลง Google Sheet เรียบร้อยแล้ว',
            icon: 'success',
            confirmButtonColor: '#0ea5e9'
          }).then(() => {
            // --- เคลียร์ค่าต่างๆ หลังบันทึกสำเร็จ ---
            setStudentId('');
            setStudent(null);
            setSelectedSport(SportType.Volleyball); // กลับไปค่าเริ่มต้น
            setTestType(TestType.PreTest);         // กลับไปค่าเริ่มต้น
            if (videoPreview) {
              URL.revokeObjectURL(videoPreview); // ต้อง revoke ก่อน
            }
            setVideoFile(null);
            setVideoPreview(null);
            setAnalysisResult(null);
            setSavedVideoUrl(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = ""; // เคลียร์ค่าใน input type="file"
            }
            setStatusText(''); // เคลียร์สถานะ
            // --- จบการเคลียร์ค่า ---
          });
        } else {
          Swal.fire({
            title: 'บันทึกไม่สำเร็จ!',
            text: `เกิดข้อผิดพลาดในการบันทึกข้อมูลหรืออัปโหลดวิดีโอ: ${saveResponse.videoUrl || 'ไม่ทราบข้อผิดพลาด'}`, // Improved error message
            icon: 'warning',
            confirmButtonColor: '#f43f5e'
          });
        }
      };
    } catch (error) {
      clearInterval(interval);
      setIsAnalyzing(false);
      Swal.fire('เกิดข้อผิดพลาด!', 'ไม่สามารถประมวลผลวิดีโอได้ กรุณาลองใหม่อีกครั้ง', 'error');
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
    <div className="min-h-screen pb-12 text-slate-900">
      <header className="bg-gradient-to-r from-blue-700 to-sky-500 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between">
          <div className="mb-6 md:mb-0">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center justify-center md:justify-start">
              <Activity className="mr-3 w-8 h-8 md:w-10 md:h-10" />
              Tun Sports Analyzer
            </h1>
            <p className="text-blue-100 text-lg">โรงเรียนเตรียมอุดมศึกษาน้อมเกล้า</p>
          </div>
          <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/30 hidden md:block">
            <p className="text-sm font-medium">กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 -mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ส่วนฟอร์มและการค้นหา */}
          <div className="lg:col-span-1 space-y-6">
            <section className="bg-white rounded-3xl shadow-xl p-6 border border-slate-100">
              <h2 className="text-xl font-bold mb-4 flex items-center text-slate-800">
                <User className="mr-2 text-blue-500" /> ข้อมูลนักเรียน
              </h2>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="ป้อนเลขประจำตัว..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={isSearching}
                    className="absolute right-2 top-2 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-slate-300"
                  >
                    {isSearching ? <Loader2 className="animate-spin w-5 h-5" /> : <Search className="w-5 h-5" />}
                  </button>
                </div>
              </form>

              {student && (
                <div className="mt-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-emerald-500 p-2 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 leading-tight">{student.fullName}</p>
                      <p className="text-sm text-slate-500">ชั้น {student.gradeClass} เลขที่ {student.number}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="bg-white rounded-3xl shadow-xl p-6 border border-slate-100">
              <h2 className="text-xl font-bold mb-6 flex items-center text-slate-800">
                <BookOpen className="mr-2 text-sky-500" /> ตั้งค่าการวิเคราะห์
              </h2>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">วิชา/ชนิดกีฬา</label>
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
                  <label className="block text-sm font-medium text-slate-600 mb-2">อัปโหลดคลิปทักษะ (ไม่เกิน 30MB)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                      videoFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    <input type="file" accept="video/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                    {videoFile ? (
                      <div className="text-emerald-600">
                        <Video className="mx-auto mb-2 w-10 h-10" />
                        <p className="text-sm font-medium truncate px-4">{videoFile.name}</p>
                        <p className="text-[10px] mt-1 italic">แตะเพื่อเปลี่ยนไฟล์</p>
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
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-2xl font-bold shadow-lg hover:shadow-blue-200 transition-all disabled:opacity-50 mt-2 flex items-center justify-center"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="animate-spin mr-2" />
                      กำลังดำเนินการ... ({countdown}s)
                    </>
                  ) : (
                    'วิเคราะห์ทักษะและบันทึกผล'
                  )}
                </button>
              </div>
            </section>
          </div>

          {/* ส่วนแสดงผลลัพธ์ */}
          <div className="lg:col-span-2 space-y-6">
            {!analysisResult && !isAnalyzing && (
              <div className="bg-white rounded-3xl shadow-xl p-12 text-center border border-slate-100 flex flex-col items-center justify-center min-h-[500px]">
                <div className="bg-blue-50 p-6 rounded-full mb-6">
                  <Video className="w-16 h-16 text-blue-300" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">พร้อมรับการประเมิน</h3>
                <p className="text-slate-500 max-w-md">อัปโหลดวิดีโอเพื่อเริ่มต้นการวิเคราะห์ทักษะด้วยระบบ AI ข้อมูลจะถูกบันทึกลงในฐานข้อมูลของโรงเรียนโดยอัตโนมัติ</p>
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
                <h3 className="text-2xl font-bold text-slate-800 mb-4">{statusText}</h3> 
                <p className="text-slate-500 text-sm italic">"กรุณาอย่าปิดหน้าต่างนี้จนกว่าการบันทึกจะเสร็จสมบูรณ์"</p>
              </div>
            )}

            {analysisResult && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                {/* สรุปคะแนน */}
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
                      <h4 className="text-xl font-bold text-slate-800">บันทึกสำเร็จ</h4>
                    </div>
                  </div>
                </div>

                {/* รายละเอียดการวิเคราะห์ */}
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                  <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                    <h2 className="font-bold text-slate-800 flex items-center">
                      <Activity className="mr-2 text-blue-500" /> ผลการประเมินทักษะ
                    </h2>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">{selectedSport}</span>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="h-[300px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 10]} />
                          <Radar name="คะแนน" dataKey="A" stroke="#3b82f6" strokeWidth={3} fill="#3b82f6" fillOpacity={0.4} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-6">
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <p className="font-bold text-emerald-800 flex items-center mb-1"><Trophy className="w-4 h-4 mr-1" /> จุดเด่น</p>
                        <p className="text-slate-700 text-sm leading-relaxed">{analysisResult.strengths}</p>
                      </div>
                      <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                        <p className="font-bold text-rose-800 flex items-center mb-1"><AlertCircle className="w-4 h-4 mr-1" /> จุดควรปรับปรุง</p>
                        <p className="text-slate-700 text-sm leading-relaxed">{analysisResult.weaknesses}</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <p className="font-bold text-blue-800 flex items-center mb-1"><Award className="w-4 h-4 mr-1" /> คำแนะนำ</p>
                        <p className="text-slate-700 text-sm italic leading-relaxed">"{analysisResult.suggestions}"</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* คะแนนย่อย */}
                  <div className="bg-slate-50 p-6 grid grid-cols-5 gap-3 border-t border-slate-100">
                    {[
                      { label: 'ท่าทาง', val: analysisResult.posture },
                      { label: 'เทคนิค', val: analysisResult.technique },
                      { label: 'คล่องตัว', val: analysisResult.agility },
                      { label: 'ต่อเนื่อง', val: analysisResult.consistency },
                      { label: 'ประสิทธิภาพ', val: analysisResult.efficiency }
                    ].map((item, idx) => (
                      <div key={idx} className="text-center">
                        <p className="text-[10px] md:text-xs text-slate-500 mb-1 font-bold uppercase">{item.label}</p>
                        <div className="bg-white border border-slate-200 rounded-xl py-3 shadow-sm">
                          <span className="text-xl font-black text-slate-800">{item.val}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ตัวอย่างวิดีโอ */}
                {videoPreview && (
                  <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-slate-800 flex items-center">
                        <Video className="mr-2 text-blue-500" /> คลิปวิดีโอที่ใช้ในการวิเคราะห์
                      </h3>
                      {savedVideoUrl && savedVideoUrl !== 'อัปโหลดล้มเหลว' && savedVideoUrl !== 'ไม่มีวิดีโอ' && (
                        <a 
                          href={savedVideoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-600 text-sm flex items-center font-medium"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" /> ดูบน Google Drive
                        </a>
                      )}
                    </div>
                    <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner">
                      <video src={videoPreview} controls className="w-full h-full" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      
      <footer className="mt-12 text-center text-slate-400 text-sm border-t border-slate-200 pt-8 pb-12 max-w-6xl mx-auto">
        <p>© 2024 โรงเรียนเตรียมอุดมศึกษาน้อมเกล้า - ระบบวิเคราะห์ทักษะกีฬาด้วยเทคโนโลยี AI พัฒนาระบบโดย นายชุมพร แก้วชา</p>
      </footer>
    </div>
  );
};

export default App;
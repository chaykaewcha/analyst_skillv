
// ใส่ Google Sheet ID ของคุณที่นี่
const SPREADSHEET_ID = '19VOWqY5NGRa9TP7LoDINr_1vDtKP95RjvCxk6TJTzgU';

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getStudent') {
    return handleGetStudent(e.parameter.studentId);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const action = payload.action;
  
  if (action === 'saveAnalysis') {
    return handleSaveAnalysis(payload.data);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleGetStudent(studentId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Student');
  
  if (!sheet) {
    return createJsonResponse({ status: 'error', message: 'Sheet "Student" not found' });
  }
  
  const data = sheet.getDataRange().getValues();
  // สมมติว่า Column A = เลขประจำตัว, B = ชื่อ-สกุล, C = ชั้น, D = เลขที่
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString() === studentId.toString()) {
      return createJsonResponse({
        status: 'success',
        student: {
          studentId: data[i][0],
          fullName: data[i][1],
          gradeClass: data[i][2],
          number: data[i][3]
        }
      });
    }
  }
  
  return createJsonResponse({ status: 'error', message: 'Student not found' });
}

function handleSaveAnalysis(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('ผลวิเคราะห์');
  
  if (!sheet) {
    sheet = ss.insertSheet('ผลวิเคราะห์');
    const headers = [
      'วันที่-เวลา', 'เลขประจำตัว', 'ชื่อ-นามสกุล', 'ชั้น/เลขที่', 
      'วิชา', 'ประเภทการทดสอบ', 'คะแนนรวม', 'ค่าเฉลี่ย', 
      'จุดเด่น', 'จุดควรปรับปรุง', 'คำแนะนำ', 'ลิงก์วิดีโอ'
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f3f3f3');
  }
  
  const row = [
    data.timestamp,
    data.studentId,
    data.fullName,
    `${data.gradeClass}/${data.number}`,
    data.sport,
    data.testType,
    data.totalScore,
    data.averageScore,
    data.strengths,
    data.weaknesses,
    data.suggestions,
    data.videoLink
  ];
  
  sheet.appendRow(row);
  return createJsonResponse({ status: 'success' });
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

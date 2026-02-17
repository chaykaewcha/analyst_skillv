
// ใส่ Google Sheet ID ของคุณที่นี่
const SPREADSHEET_ID = '1uSd_IzIstzRHrf_Dpy0HSpE3c3W35QKlIxGLAtKle10';
// ใส่ Google Drive Folder ID สำหรับเก็บวิดีโอของคุณที่นี่
const VIDEO_FOLDER_ID = '1iTo3_SFfLF41mOUavxZCPa3eNY_5qdVy'; // <-- ใช้ Folder ID ที่ผู้ใช้ให้มาตามที่แจ้ง

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getStudent') {
    return handleGetStudent(e.parameter.studentId);
  }
  
  return createJsonResponse({ status: 'error', message: 'Unknown GET action' })
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    Logger.log('Received POST payload: %s', JSON.stringify(payload)); // Log payload
    const action = payload.action;
    
    if (action === 'saveAnalysis') {
      return handleSaveAnalysis(payload.data, payload.videoFile);
    }
    
    return createJsonResponse({ status: 'error', message: 'Unknown POST action' })
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log('Error in doPost: %s', err.toString()); // Log error
    return createJsonResponse({ status: 'error', message: 'Error in doPost: ' + err.toString() });
  }
}

function handleGetStudent(studentId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Student');
    
    if (!sheet) {
      return createJsonResponse({ status: 'error', message: 'Sheet "Student" not found' });
    }
    
    const data = sheet.getDataRange().getValues();
    const sId = studentId.toString().trim();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim() === sId) {
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
  } catch (err) {
    Logger.log('Error in handleGetStudent: %s', err.toString()); // Log error
    return createJsonResponse({ status: 'error', message: 'Error in handleGetStudent: ' + err.toString() });
  }
}

function handleSaveAnalysis(data, videoFile) {
  try {
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
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#E2EFDA');
      sheet.setFrozenRows(1);
    }

    let finalVideoUrl = 'ไม่มีวิดีโอ';
    
    // อัปโหลดวิดีโอไปยัง Google Drive หากมีข้อมูลวิดีโอถูกส่งมา
    if (videoFile && videoFile.base64 && videoFile.mimeType) {
      Logger.log('Video file received. MimeType: %s, Base64 length: %s', videoFile.mimeType, videoFile.base64.length);
      try {
        const folder = DriveApp.getFolderById(VIDEO_FOLDER_ID);
        const timestamp = new Date().getTime();
        const fileName = `${data.studentId}_${data.sport}_${data.testType}_${timestamp}.mp4`;
        
        const decodedVideo = Utilities.base64Decode(videoFile.base64);
        const blob = Utilities.newBlob(decodedVideo, videoFile.mimeType, fileName);
        
        const file = folder.createFile(blob);
        Logger.log('Video file created in Drive: %s', fileName);
        
        // ตั้งค่าการเข้าถึงให้ทุกคนที่มีลิงก์สามารถดูได้
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        finalVideoUrl = file.getUrl();
        Logger.log('Generated video URL: %s', finalVideoUrl); // Log the final URL
      } catch (uploadErr) {
        Logger.log('Video Upload Error: %s', uploadErr.toString()); // Log upload error
        finalVideoUrl = 'อัปโหลดล้มเหลว: ' + uploadErr.toString();
      }
    }
    
    const rowData = [
      data.timestamp || new Date().toLocaleString('th-TH'),
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
      finalVideoUrl // บันทึกลิงก์วิดีโอในคอลัมน์นี้
    ];
    
    Logger.log('Row data to append: %s', JSON.stringify(rowData)); // Log row data
    sheet.appendRow(rowData);
    Logger.log('Row appended to sheet.');
    
    return createJsonResponse({ 
      status: 'success', 
      videoUrl: finalVideoUrl, // ส่ง URL กลับไปให้ Frontend
      message: 'บันทึกข้อมูลและอัปโหลดวิดีโอสำเร็จ'
    });
    
  } catch (err) {
    Logger.log('Error in handleSaveAnalysis: %s', err.toString()); // Log error
    return createJsonResponse({ status: 'error', message: 'Save Analysis Error: ' + err.toString() });
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

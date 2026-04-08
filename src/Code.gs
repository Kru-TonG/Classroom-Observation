// --- CONFIGURATION ---
// *** กรุณาแทนที่ด้วย ID ของคุณ ***
const SHEET_ID = '1BsbkeeC7yvmrSOb2dEGZa968KYjTOiYEuutr9HjEJPc'; // <--- แทนที่ด้วย ID ของคุณ
const FOLDER_ID = '1qhVbifSxL9YaaHW4COy09WX2UdIUVDct'; // <--- แทนที่ด้วย ID ของคุณ
// *** ---------------- ***

const ss = SpreadsheetApp.openById(SHEET_ID);
const sheet = ss.getSheetByName('evaluations');
const uploadFolder = DriveApp.getFolderById(FOLDER_ID);

function doGet(e) {
  // ... (ส่วนนี้ไม่ต้องเปลี่ยนแปลง)
  try {
    if (e.parameter.action) {
      if (e.parameter.action === 'getData') {
        const dataRange = sheet.getDataRange();
        if (dataRange.getNumRows() > 1) {
            const data = dataRange.getValues();
            data.shift(); 
            return ContentService
                .createTextOutput(JSON.stringify({ status: 'success', data: data }))
                .setMimeType(ContentService.MimeType.JSON);
        } else {
             return ContentService
                .createTextOutput(JSON.stringify({ status: 'success', data: [] }))
                .setMimeType(ContentService.MimeType.JSON);
        }
      }
        return ContentService
          .createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid action requested' }))
          .setMimeType(ContentService.MimeType.JSON);
    } 
    
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle("ระบบนิเทศและประเมินการสอน")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  } catch (error) {
    Logger.log(error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


    function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    // --- FIXED TIMEZONE ISSUE ---
    // บังคับให้ timestamp เป็นเวลาไทย และไม่สนใจเรื่องเวลา
    const timestamp = new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"});
    
    // ... a lot of code ...
    
    // --- จัดการไฟล์ทั้งหมดก่อน ---
    let pdfFileUrl = '';
    let imageUrl1 = '';
    let imageUrl2 = '';

    if (data.pdfFile && data.pdfFile.base64) {
      pdfFileUrl = saveBase64FileToDrive(data.pdfFile, "pdf_");
    }
    if (data.imageFile1 && data.imageFile1.base64) {
      imageUrl1 = saveBase64FileToDrive(data.imageFile1, "img1_");
    }
    if (data.imageFile2 && data.imageFile2.base64) {
      imageUrl2 = saveBase64FileToDrive(data.imageFile2, "img2_");
    }

    // --- จัดการ Header ---
    if (sheet.getLastRow() === 0) {
        sheet.appendRow([
            "Timestamp", "Type", "EvalDate", "TeacherName", "SubjectArea/Topic", 
            "Course/Class", "Score", "Percentage", "Quality", 
            "Evaluator", "Suggestion1/Suggestion", "Suggestion2", "Suggestion3", 
            "Suggestion4", "PdfUrl", "ImageUrl1", "ImageUrl2"
        ]);
    }
    
    // --- บันทึกข้อมูล Form A (การสอนจริง) ---
    if (data.formA && data.formA.score !== undefined) {
        const rowDataA = [
          timestamp, 
          data.formA.type || 'A', 
          data.formA.evalDate, 
          data.formA.teacherName, 
          data.formA.subjectArea, 
          data.formA.course, 
          data.formA.score, 
          data.formA.percentage, 
          data.formA.quality, 
          data.formA.evaluator, 
          data.formA.suggestion1, 
          data.formA.suggestion2, 
          data.formA.suggestion3, 
          data.formA.suggestion4, 
          pdfFileUrl,
          imageUrl1,
          imageUrl2
        ];
        sheet.appendRow(rowDataA);
    }

    // --- บันทึกข้อมูล Form B (แผนการสอน) ---
    if (data.formB && data.formB.score !== undefined) {
        // กรณีไม่มี formA (เช่นแท็บหัวหน้ากลุ่มสาระ) ให้ดึงข้อมูลพื้นฐานจาก formB หรือข้อมูลร่วม
        const evalDate = data.formB.evalDate || (data.formA ? data.formA.evalDate : '');
        const teacherName = data.formB.teacherName || (data.formA ? data.formA.teacherName : '');
        const evaluator = data.formB.evaluator || (data.formA ? data.formA.evaluator : '');

        const rowDataB = [
          timestamp, 
          data.formB.type || 'B', 
          evalDate, 
          teacherName, 
          data.formB.topic, 
          data.formB.class, 
          data.formB.score, 
          data.formB.percentage, 
          data.formB.quality, 
          evaluator, 
          data.formB.suggestion, '', '', '', 
          pdfFileUrl,
          '',
          ''
        ];
        sheet.appendRow(rowDataB);
    }

    // --- ส่งสถานะสำเร็จกลับไป ---
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: 'success', 
        message: 'Data saved successfully.', 
        pdfFileUrl: pdfFileUrl, 
        imageUrl1: imageUrl1, 
        imageUrl2: imageUrl2 
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log(error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function saveBase64FileToDrive(fileData, prefix = '') {
  // ... (ส่วนนี้ไม่ต้องเปลี่ยนแปลง)
  const { base64, type, name } = fileData;
  const decoded = Utilities.base64Decode(base64.split(',')[1]);
  const uniqueName = prefix + new Date().getTime() + "_" + name;
  const blob = Utilities.newBlob(decoded, type, uniqueName);
  const file = uploadFolder.createFile(blob);
  return file.getUrl();
}
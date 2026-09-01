import * as XLSX from 'xlsx';
import { getCategoryLabel } from '../services/inspectionService';

export function exportToExcel({ devices, inspections, stats, academicYear, round, roomFilter }) {
  const wb = XLSX.utils.book_new();

  // --- Sheet 1: สรุปภาพรวม (Summary) ---
  const summaryData = [
    ["รายงานสรุปการตรวจเช็คอุปกรณ์ Tablet โครงการ Anywhere Anytime"],
    [`ปีการศึกษา: ${academicYear}`, `รอบการตรวจที่: ${round}`, `กรองห้อง: ${roomFilter || 'ทั้งหมด'}`],
    [`วันที่ส่งออกรายงาน: ${new Date().toLocaleDateString('th-TH')}`],
    [],
    ["รายการสถิติ", "จำนวน (เครื่อง)", "คิดเป็นเปอร์เซ็นต์"],
    ["จำนวน Tablet ทั้งหมด", stats.totalDevices, "100%"],
    ["ตรวจเช็คเรียบร้อยแล้ว", stats.checkedCount, `${stats.progressPercent}%`],
    ["ยังไม่ได้ตรวจเช็ค", stats.uncheckedCount, `${100 - stats.progressPercent}%`],
    ["ใช้งานได้ปกติ", stats.normalCount, `${stats.normalPercent}%`],
    ["ชำรุด/มีปัญหา", stats.damagedCount, `${stats.damagedPercent}%`],
    [],
    ["สรุปรายการชำรุดแยกตามหมวดหมู่"],
    ["หมวดหมู่อุปกรณ์", "จำนวนที่ชำรุด (ชิ้น)"],
    ["1. Tablet", stats.damagedBreakdown.tablet],
    ["2. ปากกา S Pen", stats.damagedBreakdown.spen],
    ["3. คีย์บอร์ด", stats.damagedBreakdown.keyboard],
    ["4. สายชาร์จ Tablet (สีขาว)", stats.damagedBreakdown.cable_white],
    ["5. สายชาร์จคีย์บอร์ด (สีดำ)", stats.damagedBreakdown.cable_black],
    ["6. Adapter", stats.damagedBreakdown.adapter],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "สรุปภาพรวม");

  // --- Sheet 2: รายการอุปกรณ์ชำรุด (Damaged List) ---
  const damagedRows = [
    ["ลำดับ", "เลข BOX", "เลข BOX KB", "Serial No.", "ชื่อ-นามสกุล", "ระดับชั้น/ห้อง", "อุปกรณ์ที่ชำรุด", "รายละเอียดอาการชำรุด", "วันที่ตรวจ"]
  ];

  if (stats.damagedDetailsList && stats.damagedDetailsList.length > 0) {
    stats.damagedDetailsList.forEach((item, idx) => {
      damagedRows.push([
        idx + 1,
        item.box_no,
        item.box_kb_no,
        item.serial_no,
        item.owner,
        item.grade_room,
        item.item_name,
        item.note,
        item.inspected_at ? new Date(item.inspected_at).toLocaleDateString('th-TH') : '-'
      ]);
    });
  } else {
    damagedRows.push(["-", "-", "-", "-", "ไม่มีรายการอุปกรณ์ชำรุด", "-", "-", "-", "-"]);
  }

  const wsDamaged = XLSX.utils.aoa_to_sheet(damagedRows);
  XLSX.utils.book_append_sheet(wb, wsDamaged, "รายการอุปกรณ์ชำรุด");

  // --- Sheet 3: รายชื่อและผลการตรวจทั้งหมด (All Master Records) ---
  const masterHeader = [
    "ลำดับ", "ประเภท", "คำนำหน้า", "เลข BOX", "เลข BOX KB", "Serial No.", "ชื่อ", "นามสกุล", "ชั้น", "ห้อง",
    "สถานะตรวจ", "1.Tablet", "2.S Pen", "3.คีย์บอร์ด", "4.สาย Tablet", "5.สาย KB", "6.Adapter", "หมายเหตุชำรุด"
  ];
  
  const masterRows = [masterHeader];

  devices.forEach((dev, idx) => {
    const ins = inspections[dev.serial_no];
    const items = ins ? ins.items : null;
    
    let statusText = ins ? "ตรวจแล้ว" : "ยังไม่ได้ตรวจ";
    let tStat = items ? (items.tablet?.status === 'damaged' ? 'ชำรุด' : 'ปกติ') : '-';
    let sStat = items ? (items.spen?.status === 'damaged' ? 'ชำรุด' : 'ปกติ') : '-';
    let kStat = items ? (items.keyboard?.status === 'damaged' ? 'ชำรุด' : 'ปกติ') : '-';
    let cwStat = items ? (items.cable_white?.status === 'damaged' ? 'ชำรุด' : 'ปกติ') : '-';
    let cbStat = items ? (items.cable_black?.status === 'damaged' ? 'ชำรุด' : 'ปกติ') : '-';
    let aStat = items ? (items.adapter?.status === 'damaged' ? 'ชำรุด' : 'ปกติ') : '-';

    let notes = [];
    if (items) {
      Object.keys(items).forEach(k => {
        if (items[k].status === 'damaged' && items[k].note) {
          notes.push(`${getCategoryLabel(k)}: ${items[k].note}`);
        }
      });
    }

    masterRows.push([
      idx + 1,
      dev.type === 'teacher' ? 'ครู' : 'นักเรียน',
      dev.prefix || 'นาย',
      dev.box_no,
      dev.box_kb_no,
      dev.serial_no,
      dev.first_name,
      dev.last_name,
      dev.grade,
      dev.room,
      statusText,
      tStat, sStat, kStat, cwStat, cbStat, aStat,
      notes.join('; ')
    ]);
  });

  const wsMaster = XLSX.utils.aoa_to_sheet(masterRows);
  XLSX.utils.book_append_sheet(wb, wsMaster, "ข้อมูลการตรวจทั้งหมด");

  // Save File
  const fileName = `Anywhere_Tablet_Report_${academicYear}_Round${round}_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function triggerPrintReport() {
  window.print();
}

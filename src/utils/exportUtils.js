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
    ["รายการสถิติ", "จำนวน (หน่วย)", "คิดเป็นเปอร์เซ็นต์"],
    ["จำนวนชุดอุปกรณ์ทั้งหมด", `${stats.totalDevices} ชุด`, "100%"],
    ["ตรวจเช็คเรียบร้อยแล้ว", `${stats.checkedCount} ชุด`, `${stats.progressPercent}%`],
    ["ยังไม่ได้ตรวจเช็ค", `${stats.uncheckedCount} ชุด`, `${100 - stats.progressPercent}%`],
    ["ใช้งานได้ปกติ", `${stats.normalCount} ชุด`, `${stats.normalPercent}%`],
    ["อุปกรณ์ชำรุด", `${stats.damagedCount} รายการ`, `${stats.damagedPercent}%`],
    ["อุปกรณ์สูญหาย", `${stats.lostCount || 0} รายการ`, `${stats.lostPercent || 0}%`],
    [],
    ["สรุปรายการชำรุด/สูญหายแยกตามหมวดหมู่"],
    ["หมวดหมู่อุปกรณ์", "จำนวนชำรุด/สูญหาย (รายการ)"],
    ["1. Tablet", stats.damagedBreakdown.tablet],
    ["2. ปากกา S Pen", stats.damagedBreakdown.spen],
    ["3. คีย์บอร์ด", stats.damagedBreakdown.keyboard],
    ["4. สายชาร์จ Tablet (สีขาว)", stats.damagedBreakdown.cable_white],
    ["5. สายชาร์จคีย์บอร์ด (สีดำ)", stats.damagedBreakdown.cable_black],
    ["6. Adapter", stats.damagedBreakdown.adapter],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "สรุปภาพรวม");

  // --- Sheet 2: รายการอุปกรณ์ชำรุด/สูญหาย (Damaged & Lost List) ---
  const damagedRows = [
    ["ลำดับ", "เลข BOX", "เลข BOX KB", "Serial No.", "ชื่อ-นามสกุล", "ระดับชั้น/ห้อง", "สถานะ", "อุปกรณ์ที่ชำรุด/สูญหาย", "รายละเอียดอาการ", "วันที่ตรวจ"]
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
        item.status_label || (item.status_type === 'lost' ? 'สูญหาย' : 'ชำรุด'),
        item.item_name,
        item.note,
        item.inspected_at ? new Date(item.inspected_at).toLocaleDateString('th-TH') : '-'
      ]);
    });
  }

  const wsDamaged = XLSX.utils.aoa_to_sheet(damagedRows);
  XLSX.utils.book_append_sheet(wb, wsDamaged, "อุปกรณ์พบปัญหา");

  // --- Sheet 3: รายการอุปกรณ์ทั้งหมด (All Devices) ---
  const allRows = [
    ["ลำดับ", "ประเภท", "คำนำหน้า", "ชื่อ", "นามสกุล", "ระดับชั้น", "ห้อง", "Serial No.", "เลข BOX", "เลข BOX KB", "สถานะการตรวจ", "หมายเหตุ", "ครูผู้ตรวจเช็ค", "วันที่ตรวจ"]
  ];

  devices.forEach((dev, idx) => {
    const ins = inspections[dev.serial_no];
    const items = ins ? (ins.items || {}) : {};

    const damagedList = [];
    const lostList = [];

    ['tablet', 'spen', 'keyboard', 'cable_white', 'cable_black', 'adapter'].forEach(cat => {
      if (items[cat]) {
        if (items[cat].status === 'damaged') {
          damagedList.push(`${getCategoryLabel(cat)}${items[cat].note ? `: ${items[cat].note}` : ''}`);
        } else if (items[cat].status === 'lost') {
          lostList.push(`${getCategoryLabel(cat)}${items[cat].note ? `: ${items[cat].note}` : ''}`);
        }
      }
    });

    const isChecked = !!ins;
    const isDamaged = damagedList.length > 0;
    const isLost = lostList.length > 0;

    const statusLabel = !isChecked 
      ? 'ยังไม่ได้ตรวจ' 
      : isLost 
      ? 'สูญหาย' 
      : isDamaged 
      ? 'ชำรุด' 
      : 'ปกติ';

    const issueDetails = [
      ...lostList.map(l => `[สูญหาย] ${l}`),
      ...damagedList.map(d => `[ชำรุด] ${d}`)
    ].join(', ');

    allRows.push([
      idx + 1,
      dev.type === 'teacher' ? 'ครูผู้สอน' : 'นักเรียน',
      dev.prefix || 'นาย',
      dev.first_name,
      dev.last_name,
      dev.type === 'teacher' ? 'ครู' : dev.grade,
      dev.type === 'teacher' ? '-' : dev.room,
      dev.serial_no,
      dev.box_no,
      dev.box_kb_no,
      statusLabel,
      issueDetails || '-',
      ins ? (ins.inspector || 'ครูผู้ตรวจเช็ค') : '-',
      ins && ins.inspected_at ? new Date(ins.inspected_at).toLocaleDateString('th-TH') : '-'
    ]);
  });

  const wsAll = XLSX.utils.aoa_to_sheet(allRows);
  XLSX.utils.book_append_sheet(wb, wsAll, "ข้อมูลอุปกรณ์ทั้งหมด");

  XLSX.writeFile(wb, `รายงานการตรวจเช็ค_ปี${academicYear}_รอบที่${round}.xlsx`);
}

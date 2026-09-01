// Sample initial dataset generating ~450 tablet devices for Anywhere Anytime Project (ม.4 - ม.6 ชั้นละ 4 ห้อง และ ครู)
export const INITIAL_ACADEMIC_YEAR = "2569";
export const INITIAL_INSPECTION_ROUND = 1;

export const DEFAULT_ROOM_PINS = {
  "ม.4/1": "1401",
  "ม.4/2": "1402",
  "ม.4/3": "1403",
  "ม.4/4": "1404",
  "ม.5/1": "1501",
  "ม.5/2": "1502",
  "ม.5/3": "1503",
  "ม.5/4": "1504",
  "ม.6/1": "1601",
  "ม.6/2": "1602",
  "ม.6/3": "1603",
  "ม.6/4": "1604",
  "ครู": "9999",
};

const femaleNames = [
  "ชลธิชา", "ธัญญารัตน์", "ปรียาภรณ์", "ศิริพร", "สุพรรษา", "อารียา", "กนกวรรณ", 
  "กมลชนก", "ขวัญข้าว", "จิดาภา", "ชลดา", "ณิชาภัทร", "ปรียา", "สุภา", "นภา", 
  "วารุนี", "ศิริวรรณ", "อารีย์", "รัตนา", "พัชรี", "มยุรี", "จิตรา", "ชุติมา", 
  "สุจิตรา", "วรรณา", "สิริมา", "ดวงพร"
];

const maleNames = [
  "กิตติพงษ์", "ณัฐวุฒิ", "ธนกฤต", "ภานุพงศ์", "วรวุฒิ", "ศุภกิตติ์", "อภิสิทธิ์",
  "จิรายุ", "ชาญณรงค์", "ทศพล", "นพดล", "ปัณณทัต", "พงศกร", "ยศกร", "รชต", 
  "วิศรุต", "ศรัณย์", "อนันต์", "สมชาย", "วิชัย", "ประเสริฐ", "สมศักดิ์", "กิตติ", 
  "เกรียงไกร", "ชัยยุทธ", "ธนพล", "ธีระ", "บุญส่ง", "อดิศร", "มนตรี", "พิเชษฐ์", 
  "สมพงษ์"
];

const lastNames = [
  "ใจดี", "มีสุข", "สมบูรณ์", "รักชาติ", "มั่นคง", "เพิ่มพูน", "เจริญรุ่งเรือง", "วัฒนากุล", "วงษ์สุวรรณ", "สุวรรณมณี",
  "ศรีสุข", "รุ่งเรือง", "พานิช", "เลิศปัญญา", "วิเศษสุข", "มณีรัตน์", "เกียรติศักดิ์", "บุญมี", "จันทร์หอม", "อินทร์แก้ว"
];

export function generateSampleDevices() {
  const devices = [];
  let counter = 1;

  // Grades M.4, M.5, M.6 (3 grades x 4 rooms x ~35 students = 420 students)
  const grades = ["ม.4", "ม.5", "ม.6"];
  const rooms = ["1", "2", "3", "4"];

  for (const grade of grades) {
    for (const room of rooms) {
      const studentCount = 35;
      for (let s = 1; s <= studentCount; s++) {
        const isFemale = (s % 2 === 0);
        const fn = isFemale ? femaleNames[(counter + s) % femaleNames.length] : maleNames[(counter + s) % maleNames.length];
        const prefix = isFemale ? (s % 6 === 0 ? "นาง" : "นางสาว") : "นาย";
        const ln = lastNames[(counter * s) % lastNames.length];
        const boxPad = String(counter).padStart(3, '0');
        
        devices.push({
          id: `DEV-${counter}`,
          type: 'student',
          prefix: prefix,
          box_no: `BOX-STU-${boxPad}`,
          box_kb_no: `KB-STU-${boxPad}`,
          serial_no: `R52T${100000 + counter}X`,
          first_name: fn,
          last_name: ln,
          grade: grade,
          room: room,
          academic_year: "2569",
          created_at: new Date().toISOString()
        });
        counter++;
      }
    }
  }

  // 30 Teachers
  const teacherNames = [
    { prefix: "นาย", fn: "สมชาย", ln: "วิชาการ" }, { prefix: "นางสาว", fn: "ปรียา", ln: "การเรียนรู้" },
    { prefix: "นาย", fn: "วิชัย", ln: "วิทยาศาสตร์" }, { prefix: "นาง", fn: "สุภา", ln: "คณิตศาสตร์" },
    { prefix: "นาย", fn: "ประเสริฐ", ln: "ภาษาไทย" }, { prefix: "นางสาว", fn: "นภา", ln: "สังคมศึกษา" },
    { prefix: "นาย", fn: "สมศักดิ์", ln: "พลศึกษา" }, { prefix: "นาง", fn: "วารุนี", ln: "ศิลปะ" },
    { prefix: "นาย", fn: "กิตติ", ln: "เทคโนโลยี" }, { prefix: "นางสาว", fn: "ศิริวรรณ", ln: "การงานอาชีพ" },
    { prefix: "นาย", fn: "เกรียงไกร", ln: "ภาษาอังกฤษ" }, { prefix: "นางสาว", fn: "อารีย์", ln: "แนะแนว" },
    { prefix: "นาย", fn: "ชัยยุทธ", ln: "บริหาร" }, { prefix: "นาง", fn: "รัตนา", ln: "การเงิน" },
    { prefix: "นาย", fn: "ธนพล", ln: "โสตทัศนูปกรณ์" }, { prefix: "นางสาว", fn: "พัชรี", ln: "ห้องพยาบาล" },
    { prefix: "นาย", fn: "ธีระ", ln: "คอมพิวเตอร์" }, { prefix: "นาง", fn: "มยุรี", ln: "ห้องดนตรี" },
    { prefix: "นาย", fn: "บุญส่ง", ln: "เกษตรกรรม" }, { prefix: "นางสาว", fn: "จิตรา", ln: "ปะกอบวิชาชีพ" },
    { prefix: "นาย", fn: "อดิศร", ln: "ปกครอง" }, { prefix: "นาง", fn: "ชุติมา", ln: "วิจัย" },
    { prefix: "นาย", fn: "มนตรี", ln: "พัฒนาผู้เรียน" }, { prefix: "นางสาว", fn: "สุจิตรา", ln: "ทะเบียน" },
    { prefix: "นาย", fn: "พิเชษฐ์", ln: "ประกันคุณภาพ" }, { prefix: "นาง", fn: "วรรณา", ln: "นิเทศ" },
    { prefix: "นาย", fn: "สมพงษ์", ln: "บริการ" }, { prefix: "นางสาว", fn: "สิริมา", ln: "สวัสดิการ" },
    { prefix: "นาย", fn: "อนันต์", ln: "อาคารสถานที่" }, { prefix: "นาง", fn: "ดวงพร", ln: "สารสนเทศ" }
  ];

  for (let t = 0; t < teacherNames.length; t++) {
    const boxPad = String(counter).padStart(3, '0');
    devices.push({
      id: `DEV-${counter}`,
      type: 'teacher',
      prefix: teacherNames[t].prefix,
      box_no: `BOX-TCH-${boxPad}`,
      box_kb_no: `KB-TCH-${boxPad}`,
      serial_no: `R52T${100000 + counter}X`,
      first_name: teacherNames[t].fn,
      last_name: teacherNames[t].ln,
      grade: 'ครู',
      room: '-',
      academic_year: "2569",
      created_at: new Date().toISOString()
    });
    counter++;
  }

  return devices;
}

export function generateSampleInspections(devices) {
  const inspections = {};
  devices.forEach((dev, idx) => {
    const hasDamage = (idx % 12 === 3);
    const hasMinorDamage = (idx % 25 === 7);

    const key = `2569-R1-${dev.serial_no}`;
    inspections[key] = {
      id: key,
      academic_year: "2569",
      round: 1,
      serial_no: dev.serial_no,
      device_id: dev.id,
      inspector: "ครูที่ปรึกษา",
      inspected_at: new Date(Date.now() - (idx % 30) * 86400000).toISOString(),
      items: {
        tablet: { status: hasDamage ? "damaged" : "normal", note: hasDamage ? "หน้าจอมีรอยขีดข่วนกระแทกแรง" : "" },
        spen: { status: hasMinorDamage ? "damaged" : "normal", note: hasMinorDamage ? "หัวปากกาสึกปลายปุ่มกดหลุด" : "" },
        keyboard: { status: "normal", note: "" },
        cable_white: { status: (idx % 40 === 5) ? "damaged" : "normal", note: (idx % 40 === 5) ? "สายชาร์จฉีกขาด" : "" },
        cable_black: { status: "normal", note: "" },
        adapter: { status: (idx % 50 === 9) ? "damaged" : "normal", note: (idx % 50 === 9) ? "ขาปลั๊กงอ ชาร์จไฟไม่เข้า" : "" }
      }
    };
  });
  return inspections;
}

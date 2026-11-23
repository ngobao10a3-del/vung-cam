import type { ClueDefinition, DeductionGroup } from "../types/investigation";

export const CHAPTER1_CLUES: ClueDefinition[] = [
  {
    id: "C-01",
    title: "Bản tin nhiệt 02:15",
    category: "document",
    summary: "Bản tin mô tả chính xác trang phục của người chơi.",
    detailContent:
      "Bản tin được in lúc 02:15, dự đoán người chơi sẽ báo cáo danh tính qua radio. Thời điểm xuất hiện của bản tin sớm hơn sự kiện được mô tả.",
    relatedRuleIds: ["R-02", "R-04"],
  },
  {
    id: "C-02",
    title: "Sổ trực của Trần Minh",
    category: "document",
    summary: "Ghi chép về những nhân viên biến mất và vùng mù của ánh đèn.",
    detailContent:
      "Ba nhân viên biến mất khoảng mười phút sau khi bản tin gọi tên họ. Trần Minh ghi rằng có thể tránh vùng quét bằng cách đứng ngoài góc chiếu trực tiếp. Cuối trang có cảnh báo sương mù phản ứng với nguồn sáng nhân tạo.",
    relatedRuleIds: ["R-01", "R-03", "R-10"],
  },
  {
    id: "C-03",
    title: "Hồ sơ nhân sự",
    category: "document",
    summary: "Hồ sơ xác nhận tình trạng của trạm trưởng.",
    detailContent:
      "Danh sách nhân sự ghi nhận trạm trưởng Lê Văn Hùng đã mất tích trước thời điểm người chơi đến trạm. Việc đọc hồ sơ xác nhận thông tin này và làm thay đổi quy tắc liên quan đến điện thoại nội bộ.",
    relatedRuleIds: ["R-04", "R-09"],
  },
  {
    id: "C-04",
    title: "Sơ đồ tải điện và thấu kính",
    category: "blueprint",
    summary: "Mô tả quan hệ giữa công suất điện và phạm vi quét.",
    detailContent:
      "Sơ đồ cho thấy chế độ OVERLOAD làm tăng công suất phát của thấu kính, khiến ánh sáng quét xuyên qua các khu vực. Chế độ LOW giảm nhiễu và cho phép thiết bị quan sát hoạt động ổn định.",
    relatedRuleIds: ["R-05", "R-07"],
  },
  {
    id: "C-05",
    title: "Bản ghi cassette cuối cùng",
    category: "audio_transcript",
    summary: "Đoạn ghi âm đề cập đến tiếng gọi giả và khóa cửa buồng đèn.",
    detailContent:
      "Bản ghi cảnh báo rằng giọng nói của nhân viên mất tích có thể bị bắt chước. Một đoạn khác đề cập đến cơ chế khóa buồng đèn chỉ hoạt động khi radio ở trạng thái tạm dừng.",
    relatedRuleIds: ["R-06", "R-08"],
  },
  {
    id: "C-06",
    title: "Camera hành lang",
    category: "cctv",
    summary: "Hình ảnh ghi lại chuyển động của sương mù.",
    detailContent:
      "Đoạn camera cho thấy sương mù di chuyển về phía nguồn sáng đèn pin khi nguồn điện ở chế độ LOW hoặc khi sương đã xâm nhập vào trạm.",
    relatedRuleIds: ["R-01", "R-10"],
  },
  {
    id: "C-07",
    title: "Bảng hiệu chỉnh bộ lọc",
    category: "blueprint",
    summary: "Tài liệu về bộ lọc đỏ và chế độ đảo pha.",
    detailContent:
      "Tài liệu xác nhận ánh sáng quét màu trắng có khả năng ghi nhận sinh vật sống. Bộ lọc đỏ với bước sóng trên 620nm có thể vô hiệu hóa quá trình ghi nhận. Thấu kính còn có chế độ đảo pha nhưng chưa được thử nghiệm hoàn chỉnh.",
    relatedRuleIds: ["R-03"],
  },
  {
    id: "C-08",
    title: "Bản nháp viết tay bị giấu",
    category: "document",
    summary: "Bằng chứng về nguồn gốc các quy tắc giả.",
    detailContent:
      "Bản nháp cho thấy trạm trưởng đã bị ảnh hưởng một phần trước sự cố năm 1998 và cố ý viết các quy tắc giả nhằm dụ người đến trạm để lộ danh tính hoặc kích hoạt thấu kính.",
    relatedRuleIds: ["R-04", "R-05", "R-06"],
  },
];

export const CHAPTER1_DEDUCTION_GROUPS: DeductionGroup[] = [
  {
    id: "DG-R01",
    ruleId: "R-01",
    requiredClueIds: ["C-02", "C-06"],
    resultingStatus: "verified",
    deductionNote: "Sương mù là mối nguy bên ngoài trạm; không nên mở cửa khi sương đang tiến đến.",
  },
  {
    id: "DG-R02",
    ruleId: "R-02",
    requiredClueIds: ["C-01"],
    resultingStatus: "verified",
    deductionNote: "Bản tin có thể mô tả người chơi trước khi sự kiện xảy ra. Không trả lời radio khi bản tin đang phát.",
  },
  {
    id: "DG-R03",
    ruleId: "R-03",
    requiredClueIds: ["C-02", "C-07"],
    resultingStatus: "verified",
    deductionNote: "Ánh sáng quét có thể ghi nhận sinh vật sống. Cần lắp bộ lọc đỏ trước khi vào vùng chiếu.",
  },
  {
    id: "DG-R04",
    ruleId: "R-04",
    requiredClueIds: ["C-01", "C-08"],
    resultingStatus: "debunked_fake",
    deductionNote: "Yêu cầu khai báo danh tính là một cái bẫy được tạo ra có chủ đích.",
  },
  {
    id: "DG-R05",
    ruleId: "R-05",
    requiredClueIds: ["C-04", "C-08"],
    resultingStatus: "debunked_fake",
    deductionNote: "Chế độ OVERLOAD làm tăng nguy cơ quét xuyên khu vực, không phải biện pháp an toàn.",
  },
  {
    id: "DG-R06",
    ruleId: "R-06",
    requiredClueIds: ["C-05", "C-08"],
    resultingStatus: "debunked_fake",
    deductionNote: "Tiếng gõ và giọng nói có thể bị thực thể bắt chước để dụ người chơi mở tủ.",
  },
  {
    id: "DG-R07",
    ruleId: "R-07",
    requiredClueIds: ["C-04"],
    resultingStatus: "conditional_confirmed",
    deductionNote: "Thiết bị quan sát chỉ hoạt động ổn định khi nguồn điện ở chế độ LOW.",
  },
  {
    id: "DG-R08",
    ruleId: "R-08",
    requiredClueIds: ["C-05"],
    resultingStatus: "conditional_confirmed",
    deductionNote: "Cơ chế cửa buồng đèn yêu cầu radio ở trạng thái tạm dừng.",
  },
  {
    id: "DG-R09",
    ruleId: "R-09",
    requiredClueIds: ["C-03"],
    resultingStatus: "verified",
    deductionNote: "Hồ sơ xác nhận trạm trưởng mất tích; hướng dẫn nghe điện thoại phải được xem xét lại.",
  },
  {
    id: "DG-R10",
    ruleId: "R-10",
    requiredClueIds: ["C-02", "C-06"],
    resultingStatus: "conditional_confirmed",
    deductionNote: "Khi sương mù hoạt động, nguồn sáng nhân tạo có thể thu hút nó.",
  },
];

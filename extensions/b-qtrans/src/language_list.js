// Mã ngôn ngữ vBook dùng: "zh", "en", "vi". vBook tự thêm mục "Tự động" khi support_auto_detect bật.
// Khai "auto", "zh-Hans"… hay tên model/văn phong thì vBook kẹt hoặc lỗi trước khi gọi tiện ích (2026-09-18:
// trang Khám phá/chi tiết quay vòng mãi ở chế độ Tự động). Model và văn phong chọn trong Settings của tiện ích.
var languages = [
    { id: "zh", name: "Tiếng Trung" },
    { id: "en", name: "Tiếng Anh" },
    { id: "vi", name: "Tiếng Việt" }
];

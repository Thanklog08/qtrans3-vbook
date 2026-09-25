load('config.js');

// Ô tìm kiếm của site gửi /truyen?keyword=… Trang kết quả không vẽ thanh phân trang nhưng ?page= vẫn chạy
// (23–24 truyện/trang, hết thì trả trang rỗng), nên còn đủ một trang thì đoán có trang kế.
function execute(key, page) {
    if (!page) page = '1';
    var response = fetch(BASE_URL + "/truyen?keyword=" + encodeURIComponent(key) + "&page=" + page);
    if (!response.ok) return null;
    var doc = response.html();
    var data = parseList(doc);
    var next = nextPage(doc, page);
    if (!next && data.length >= 20) next = String(parseInt(page) + 1);
    return Response.success(data, next);
}

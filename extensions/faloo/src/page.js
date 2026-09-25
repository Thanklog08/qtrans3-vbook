load('config.js');

// Mục lục đầy đủ ở một trang: /booklist_<mã>.html.
function execute(url) {
    var id = bookId(url);
    if (!id) return null;
    return Response.success([BASE_URL + "/booklist_" + id + ".html"]);
}

load('config.js');
load('gbk.js');

// search_0_<trang>.html?t=1&k=<từ khoá GBK> (t=1 theo tên truyện). Từ khoá UTF-8 cho kết quả sai.
function execute(key, page) {
    if (!page) page = '1';
    var doc = getDoc(BASE_URL + "/search_0_" + page + ".html?t=1&k=" + gbkEncode(key));
    if (!doc) return null;
    return Response.success(parseList(doc), nextPage(doc, page));
}

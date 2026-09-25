load('config.js');

function execute(url, page) {
    if (!page) page = '1';
    url = String(url);
    // Link tác giả của site chứa chữ Hán chưa mã hoá (search_0_1.html?t=2&k=幽兰翰墨); site chỉ hiểu GBK.
    if (/[^\x00-\x7f]/.test(url)) {
        load('gbk.js');
        url = url.replace(/([?&]k=)([^&]*)/, function (all, p, k) { return p + gbkEncode(k); });
    }
    var doc = getDoc(withPage(url, page));
    if (!doc) return null;
    return Response.success(parseList(doc), nextPage(doc, page));
}

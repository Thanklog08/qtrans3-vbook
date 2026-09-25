load('config.js');

// Mục lục chia khối .volume; khối chương trả phí có .icon_vip ở tên khối.
function execute(url) {
    var doc = getDoc(url);
    if (!doc) return null;
    var id = bookId(url);
    var re = new RegExp("/" + id + "_\\d+\\.html$");
    var data = [], seen = {};
    doc.select(".volume").forEach(function (vol) {
        var vip = vol.select(".volume_name .icon_vip").size() > 0;
        vol.select(".v_nodeList a[href]").forEach(function (a) {
            var href = fixUrl(a.attr("href") + "");
            if (!re.test(href) || seen[href]) return;
            seen[href] = true;
            var item = { name: (a.text() + "").trim(), url: href, host: BASE_URL };
            if (vip) item.pay = true;
            data.push(item);
        });
    });
    return Response.success(data);
}

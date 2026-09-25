load('config.js');

function execute(url) {
    var response = fetch(fixUrl(url));
    if (!response.ok) return null;
    var doc = response.html();
    var box = doc.select("#chapter-c");
    if (box.size() === 0) return null;
    box = box.first();
    box.select("script, style, ins, iframe, div, a").remove();
    // Mỗi dòng có ký tự CR (&#13;) thừa.
    var html = (box.html() + "").replace(/\r|&#13;/g, "").replace(/(<br\s*\/?>\s*){3,}/g, "<br><br>");
    return Response.success(html);
}

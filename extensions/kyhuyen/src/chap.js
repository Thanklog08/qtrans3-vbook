load('config.js');

function execute(url) {
    var response = fetch(fixUrl(url));
    if (!response.ok) return null;
    var doc = response.html();
    var article = doc.select("article").first();
    if (!article) return null;
    // Giữa bài có quảng cáo (script/style/div) và watermark ẩn đầu đoạn:
    // <a href="https://kyhuyen.com"><span class="d-none">kyhuyen com</span></a>. Câu truyện…
    article.select("script, style, noscript, iframe, ins, div, .d-none, a").remove();
    var html = article.html()
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<p>\s*\.\s*/g, "<p>")
        .replace(/<p>\s*<\/p>/g, "")
        .replace(/ƣ/g, "ư")
        .replace(/ⓚ|к/g, "k")
        .replace(/ⓒ/g, "c");
    return Response.success(html);
}
